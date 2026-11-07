// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Minimal subset of forge-std so the tests need no external dependency.
interface Vm {
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function expectRevert(bytes calldata revertData) external;
    function expectRevert() external;
}

abstract contract Test {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 a, uint256 b, string memory err) internal pure {
        if (a != b) revert(string.concat(err, ": ", _str(a), " != ", _str(b)));
    }

    function assertTrue(bool v, string memory err) internal pure {
        if (!v) revert(err);
    }

    function _str(uint256 v) private pure returns (string memory) {
        if (v == 0) return "0";
        uint256 len;
        for (uint256 t = v; t != 0; t /= 10) len++;
        bytes memory b = new bytes(len);
        for (; v != 0; v /= 10) b[--len] = bytes1(uint8(48 + (v % 10)));
        return string(b);
    }
}
