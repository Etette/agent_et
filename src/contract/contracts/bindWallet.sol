// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract WalletBinding is Ownable {
    mapping(string => address) public userIdToWallet;
    mapping(string => bool) public userExists;

    event WalletCreated(address indexed wallet, string user_id);
    event WalletDeleted(address indexed wallet, string user_id);

    constructor() Ownable(msg.sender) {}

    function bindUserToWallet(string memory user_id, address wallet) external {
        if(wallet == address(0)) revert("Zero address");
        if(wallet != msg.sender) revert("Unauthorized");
        if (userIdToWallet[user_id] == wallet || userExists[user_id]) revert("User already onchain");
        
        userIdToWallet[user_id] = wallet;
        userExists[user_id] = true;

        emit WalletCreated(wallet, user_id);
    }

    function deleteWalletBinding(string memory user_id) external {
        if(!userExists[user_id]) revert("User not onchain");
        if(userIdToWallet[user_id] != msg.sender) revert("Not authorized to burn this binding");

        address wallet = userIdToWallet[user_id];
        userIdToWallet[user_id] = address(0);
        userExists[user_id] = false;

        emit WalletDeleted(wallet, user_id);
    }

    function onchainUserExists(string memory user_id) external view returns (bool) {
        return userExists[user_id];
    }

    function getUserAddress(string memory user_id) external view returns (address) {
        return userIdToWallet[user_id];
    }
}