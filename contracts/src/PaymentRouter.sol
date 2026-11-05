// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title Sintingale PaymentRouter
/// @notice Non-custodial: pulls the exact amount from the payer and forwards it to the
///         merchant's payout address in the same call. The router never holds a balance.
contract PaymentRouter {
    event MerchantRegistered(address indexed merchant, address payout);
    event Paid(
        bytes32 indexed invoiceId,
        address indexed merchant,
        address indexed payer,
        address token,
        uint256 amount
    );

    error ZeroAddress();
    error ZeroAmount();
    error UnregisteredMerchant();
    error AlreadyPaid();
    error TransferFailed();

    mapping(address merchant => address payout) public payoutOf;
    mapping(bytes32 invoiceId => bool) public paid;

    function registerMerchant(address payout) external {
        if (payout == address(0)) revert ZeroAddress();
        payoutOf[msg.sender] = payout;
        emit MerchantRegistered(msg.sender, payout);
    }

    /// @dev Requires a prior ERC-20 approval for `amount` and WBT for gas.
    function payInvoice(bytes32 invoiceId, address merchant, address token, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (token == address(0)) revert ZeroAddress();
        address payout = payoutOf[merchant];
        if (payout == address(0)) revert UnregisteredMerchant();
        if (paid[invoiceId]) revert AlreadyPaid();

        paid[invoiceId] = true;
        if (!IERC20(token).transferFrom(msg.sender, payout, amount)) revert TransferFailed();

        emit Paid(invoiceId, merchant, msg.sender, token, amount);
    }
}
