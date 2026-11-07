// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProjectSplitter} from "../src/ProjectSplitter.sol";
import {Test} from "./utils/Test.sol";

contract MockToken {
    uint8 public immutable decimals;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(uint8 d) {
        decimals = d;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) public virtual returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// Calls back into the splitter while it is paying out a claim.
contract ReentrantToken is MockToken {
    ProjectSplitter public target;
    bytes32 public projectId;
    bytes4 public reentryError;
    bool public reentered;

    constructor() MockToken(6) {}

    function arm(ProjectSplitter t, bytes32 id) external {
        target = t;
        projectId = id;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (address(target) != address(0) && !reentered) {
            reentered = true;
            try target.claim(projectId, address(this)) {} catch (bytes memory err) {
                reentryError = bytes4(err);
            }
        }
        return super.transfer(to, amount);
    }
}

contract ProjectSplitterTest is Test {
    ProjectSplitter internal splitter;
    MockToken internal usdt;

    address internal constant OWNER = address(0xA11CE0);
    address internal constant ALICE = address(0xA1);
    address internal constant BOB = address(0xB0B);
    address internal constant PAYER = address(0xCAFE);
    bytes32 internal constant PROJECT = keccak256("acme.eth:launch");

    function setUp() public {
        usdt = new MockToken(6);
        address[] memory tokens = new address[](1);
        tokens[0] = address(usdt);
        splitter = new ProjectSplitter(tokens);
        usdt.mint(PAYER, 1_000_000e6);
        vm.prank(PAYER);
        usdt.approve(address(splitter), type(uint256).max);
    }

    function _shares3(uint16 a, uint16 b, uint16 c) internal pure returns (ProjectSplitter.Share[] memory s) {
        s = new ProjectSplitter.Share[](3);
        s[0] = ProjectSplitter.Share(OWNER, a);
        s[1] = ProjectSplitter.Share(ALICE, b);
        s[2] = ProjectSplitter.Share(BOB, c);
    }

    function _create(uint16 a, uint16 b, uint16 c) internal {
        vm.prank(OWNER);
        splitter.createProject(PROJECT, _shares3(a, b, c));
    }

    function _pay(bytes32 invoiceId, uint256 amount) internal {
        vm.prank(PAYER);
        splitter.payProjectInvoice(PROJECT, invoiceId, address(usdt), amount);
    }

    function _claimable(address account) internal view returns (uint256) {
        return splitter.claimable(PROJECT, account, address(usdt));
    }

    function test_ExactSplitWithRoundNumbers() public {
        _create(5000, 3000, 2000);
        _pay("inv_1", 10e6);
        assertEq(_claimable(OWNER), 5e6, "owner");
        assertEq(_claimable(ALICE), 3e6, "alice");
        assertEq(_claimable(BOB), 2e6, "bob");
        assertEq(usdt.balanceOf(address(splitter)), 10e6, "held");
    }

    function test_DustIsCreditedToOwner() public {
        _create(3333, 3333, 3334);
        _pay("inv_dust", 100);
        // 33 + 33 + 33 = 99, the remaining 1 unit goes to the owner.
        assertEq(_claimable(OWNER), 34, "owner gets dust");
        assertEq(_claimable(ALICE), 33, "alice");
        assertEq(_claimable(BOB), 33, "bob");
    }

    function testFuzz_CreditsAlwaysSumToAmount(uint96 rawAmount, uint16 rawA, uint16 rawB) public {
        uint256 amount = uint256(rawAmount) % 1_000_000e6 + 1;
        uint16 a = uint16(uint256(rawA) % 9_998) + 1;
        uint16 b = uint16(uint256(rawB) % (9_999 - a)) + 1;
        uint16 c = 10_000 - a - b;
        _create(a, b, c);
        _pay("inv_fuzz", amount);
        assertEq(_claimable(OWNER) + _claimable(ALICE) + _claimable(BOB), amount, "sum of credits");
    }

    function test_RevertWhen_InvoicePaidTwice() public {
        _create(5000, 3000, 2000);
        _pay("inv_once", 1e6);
        vm.expectRevert(abi.encodeWithSelector(ProjectSplitter.AlreadyPaid.selector, bytes32("inv_once")));
        _pay("inv_once", 1e6);
    }

    function test_RevertWhen_BpsDoNotSumTo10000() public {
        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(ProjectSplitter.InvalidShares.selector));
        splitter.createProject(PROJECT, _shares3(5000, 3000, 1999));
    }

    function test_RevertWhen_DuplicateAccount() public {
        ProjectSplitter.Share[] memory s = new ProjectSplitter.Share[](2);
        s[0] = ProjectSplitter.Share(ALICE, 5000);
        s[1] = ProjectSplitter.Share(ALICE, 5000);
        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(ProjectSplitter.DuplicateAccount.selector, ALICE));
        splitter.createProject(PROJECT, s);
    }

    function test_RevertWhen_ZeroAddressShare() public {
        ProjectSplitter.Share[] memory s = new ProjectSplitter.Share[](2);
        s[0] = ProjectSplitter.Share(address(0), 5000);
        s[1] = ProjectSplitter.Share(ALICE, 5000);
        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(ProjectSplitter.InvalidShares.selector));
        splitter.createProject(PROJECT, s);
    }

    function test_RevertWhen_NonOwnerUpdatesShares() public {
        _create(5000, 3000, 2000);
        vm.prank(ALICE);
        vm.expectRevert(abi.encodeWithSelector(ProjectSplitter.NotProjectOwner.selector));
        splitter.updateShares(PROJECT, _shares3(1000, 8000, 1000));
    }

    function test_RevertWhen_TokenNotAllowed() public {
        _create(5000, 3000, 2000);
        MockToken other = new MockToken(18);
        vm.prank(PAYER);
        vm.expectRevert(abi.encodeWithSelector(ProjectSplitter.TokenNotAllowed.selector, address(other)));
        splitter.payProjectInvoice(PROJECT, "inv_x", address(other), 1e18);
    }

    function test_ClaimHappyPath() public {
        _create(5000, 3000, 2000);
        _pay("inv_1", 10e6);
        vm.prank(ALICE);
        splitter.claim(PROJECT, address(usdt));
        assertEq(usdt.balanceOf(ALICE), 3e6, "alice paid");
        assertEq(_claimable(ALICE), 0, "alice balance cleared");
        assertEq(_claimable(BOB), 2e6, "bob untouched");
    }

    function test_RevertWhen_ClaimingTwice() public {
        _create(5000, 3000, 2000);
        _pay("inv_1", 10e6);
        vm.startPrank(ALICE);
        splitter.claim(PROJECT, address(usdt));
        vm.expectRevert(abi.encodeWithSelector(ProjectSplitter.NothingToClaim.selector));
        splitter.claim(PROJECT, address(usdt));
        vm.stopPrank();
    }

    function test_ReentrantClaimIsBlocked() public {
        ReentrantToken evil = new ReentrantToken();
        address[] memory tokens = new address[](1);
        tokens[0] = address(evil);
        ProjectSplitter s = new ProjectSplitter(tokens);
        vm.prank(OWNER);
        s.createProject(PROJECT, _shares3(5000, 3000, 2000));
        evil.mint(PAYER, 10e6);
        vm.startPrank(PAYER);
        evil.approve(address(s), type(uint256).max);
        s.payProjectInvoice(PROJECT, "inv_evil", address(evil), 10e6);
        vm.stopPrank();

        evil.arm(s, PROJECT);
        vm.prank(ALICE);
        s.claim(PROJECT, address(evil));

        assertTrue(evil.reentered(), "token attempted re-entry");
        assertTrue(evil.reentryError() == ProjectSplitter.Reentrancy.selector, "guard rejected re-entry");
        assertEq(evil.balanceOf(ALICE), 3e6, "alice paid exactly once");
    }

    function test_UpdatingSharesDoesNotAlterEarlierCredits() public {
        _create(5000, 3000, 2000);
        _pay("inv_1", 10e6);
        vm.prank(OWNER);
        splitter.updateShares(PROJECT, _shares3(1000, 1000, 8000));
        (, uint64 version) = splitter.projects(PROJECT);
        assertEq(version, 2, "version bumped");
        _pay("inv_2", 10e6);
        assertEq(_claimable(OWNER), 5e6 + 1e6, "owner");
        assertEq(_claimable(ALICE), 3e6 + 1e6, "alice");
        assertEq(_claimable(BOB), 2e6 + 8e6, "bob");
    }

    function test_SupportsEighteenDecimalTokens() public {
        MockToken weth = new MockToken(18);
        address[] memory tokens = new address[](1);
        tokens[0] = address(weth);
        ProjectSplitter s = new ProjectSplitter(tokens);
        vm.prank(OWNER);
        s.createProject(PROJECT, _shares3(5000, 3000, 2000));
        weth.mint(PAYER, 1e18);
        vm.startPrank(PAYER);
        weth.approve(address(s), type(uint256).max);
        s.payProjectInvoice(PROJECT, "inv_18", address(weth), 1e18);
        vm.stopPrank();
        assertEq(s.claimable(PROJECT, ALICE, address(weth)), 0.3e18, "alice 30%");
    }
}
