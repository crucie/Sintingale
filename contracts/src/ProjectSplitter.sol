// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Sintingale ProjectSplitter
/// @notice Per-project revenue shares with pull-based claims.
///
/// Payments credit each share holder's claimable balance; nothing is pushed to
/// members inside the payment transaction. Share changes only affect later
/// payments. There is no owner, pauser or admin role: the token allow-list is
/// fixed at deployment and nobody can move a member's balance but the member.
contract ProjectSplitter {
    struct Share {
        address account;
        uint16 bps;
    }

    struct Project {
        address owner;
        uint64 version;
    }

    uint16 public constant TOTAL_BPS = 10_000;
    uint256 public constant MAX_SHARES = 50;

    event ProjectCreated(bytes32 indexed projectId, address indexed owner);
    event SharesUpdated(bytes32 indexed projectId, uint256 version);
    event Credited(bytes32 indexed projectId, bytes32 indexed invoiceId, address token, uint256 amount, uint256 version);
    event AccountCredited(
        bytes32 indexed projectId,
        bytes32 indexed invoiceId,
        address indexed account,
        address token,
        uint256 amount,
        uint16 bps,
        uint256 version
    );
    event Claimed(bytes32 indexed projectId, address indexed account, address token, uint256 amount);

    error ProjectExists();
    error UnknownProject();
    error NotProjectOwner();
    error InvalidShares();
    error DuplicateAccount(address account);
    error TokenNotAllowed(address token);
    error ZeroAmount();
    error AlreadyPaid(bytes32 invoiceId);
    error NothingToClaim();
    error TransferFailed();
    error Reentrancy();

    mapping(address token => bool) public allowedToken;
    mapping(bytes32 projectId => Project) public projects;
    mapping(bytes32 invoiceId => bool) public paid;

    mapping(bytes32 projectId => Share[]) private _shares;
    mapping(bytes32 projectId => mapping(address account => mapping(address token => uint256))) private _claimable;

    uint256 private _lock = 1;

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(address[] memory tokens) {
        for (uint256 i; i < tokens.length; ++i) {
            if (tokens[i] == address(0)) revert TokenNotAllowed(address(0));
            allowedToken[tokens[i]] = true;
        }
    }

    function createProject(bytes32 projectId, Share[] calldata shares) external {
        if (projects[projectId].owner != address(0)) revert ProjectExists();
        projects[projectId].owner = msg.sender;
        emit ProjectCreated(projectId, msg.sender);
        _setShares(projectId, shares);
    }

    /// @dev Applies to future payments only; existing credits are never recalculated.
    function updateShares(bytes32 projectId, Share[] calldata shares) external {
        address owner = projects[projectId].owner;
        if (owner == address(0)) revert UnknownProject();
        if (owner != msg.sender) revert NotProjectOwner();
        _setShares(projectId, shares);
    }

    function payProjectInvoice(bytes32 projectId, bytes32 invoiceId, address token, uint256 amount)
        external
        nonReentrant
    {
        Project storage project = projects[projectId];
        if (project.owner == address(0)) revert UnknownProject();
        if (!allowedToken[token]) revert TokenNotAllowed(token);
        if (amount == 0) revert ZeroAmount();
        if (paid[invoiceId]) revert AlreadyPaid(invoiceId);
        paid[invoiceId] = true;

        _safeTransferFrom(token, msg.sender, address(this), amount);

        uint256 version = project.version;
        Share[] storage shares = _shares[projectId];
        uint256 credited;
        for (uint256 i; i < shares.length; ++i) {
            uint256 part = (amount * shares[i].bps) / TOTAL_BPS;
            if (part == 0) continue;
            _claimable[projectId][shares[i].account][token] += part;
            credited += part;
            emit AccountCredited(projectId, invoiceId, shares[i].account, token, part, shares[i].bps, version);
        }
        uint256 dust = amount - credited;
        if (dust > 0) {
            _claimable[projectId][project.owner][token] += dust;
            emit AccountCredited(projectId, invoiceId, project.owner, token, dust, 0, version);
        }
        emit Credited(projectId, invoiceId, token, amount, version);
    }

    function claim(bytes32 projectId, address token) external nonReentrant {
        uint256 amount = _claimable[projectId][msg.sender][token];
        if (amount == 0) revert NothingToClaim();
        _claimable[projectId][msg.sender][token] = 0;
        _safeTransfer(token, msg.sender, amount);
        emit Claimed(projectId, msg.sender, token, amount);
    }

    function claimable(bytes32 projectId, address account, address token) external view returns (uint256) {
        return _claimable[projectId][account][token];
    }

    function getShares(bytes32 projectId) external view returns (Share[] memory) {
        return _shares[projectId];
    }

    function _setShares(bytes32 projectId, Share[] calldata shares) private {
        uint256 n = shares.length;
        if (n == 0 || n > MAX_SHARES) revert InvalidShares();
        uint256 total;
        for (uint256 i; i < n; ++i) {
            address account = shares[i].account;
            if (account == address(0) || shares[i].bps == 0) revert InvalidShares();
            for (uint256 j; j < i; ++j) {
                if (shares[j].account == account) revert DuplicateAccount(account);
            }
            total += shares[i].bps;
        }
        if (total != TOTAL_BPS) revert InvalidShares();

        delete _shares[projectId];
        for (uint256 i; i < n; ++i) {
            _shares[projectId].push(shares[i]);
        }
        uint64 version = ++projects[projectId].version;
        emit SharesUpdated(projectId, version);
    }

    /// @dev Supports tokens that return no value from transfer (e.g. legacy USDT).
    function _safeTransfer(address token, address to, uint256 amount) private {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
