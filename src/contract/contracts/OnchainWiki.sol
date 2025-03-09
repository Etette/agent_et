// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract OnchainWiki is Ownable, ReentrancyGuard {
    mapping(string => address) public usernameToWallet;
    mapping(string => bool) public userExists;
    
    event WalletBinded(address indexed wallet, string username);
    event UsernameUpdated(address indexed wallet, string oldUsername, string newUsername);
    event WalletUnbinded(address indexed wallet, string username);
    event FundsWithdrawn(address indexed wallet, uint256 amount);

    error ZeroAddress();
    error Unauthorized();
    error UserAlreadyOnchain();
    error UserNotOnchain();
    error InsufficientContractBalance();

    constructor() Ownable(msg.sender) {}

    receive() external payable {}
    
    function bindUserToWallet(string memory username, address wallet) external nonReentrant {
        if(wallet == address(0)) revert ZeroAddress();
        if(wallet != msg.sender) revert Unauthorized();
        if (usernameToWallet[username] == wallet || userExists[username]) revert UserAlreadyOnchain();     
        usernameToWallet[username] = wallet;
        userExists[username] = true;      
        emit WalletBinded(wallet, username);
    }

    function updateUsername(string memory oldUsername, string memory newUsername) external {
        if(!userExists[oldUsername]) revert UserNotOnchain();
        if(userExists[newUsername]) revert UserAlreadyOnchain();
        if(usernameToWallet[oldUsername] != msg.sender) revert Unauthorized();
        
        address wallet = usernameToWallet[oldUsername];
        usernameToWallet[oldUsername] = address(0);
        userExists[oldUsername] = false;
        usernameToWallet[newUsername] = wallet;
        userExists[newUsername] = true;

        emit UsernameUpdated(wallet, oldUsername, newUsername);
    }

    function deleteWalletBinding(string memory username) external {
        if(!userExists[username]) revert UserNotOnchain();
        if(usernameToWallet[username] != msg.sender) revert Unauthorized();

        address wallet = usernameToWallet[username];
        usernameToWallet[username] = address(0);
        userExists[username] = false;

        emit WalletUnbinded(wallet, username);
    }

    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        if(balance == 0) revert InsufficientContractBalance();    
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
        emit FundsWithdrawn(owner(), balance);
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

// Address - 0x125615A6DE05A9E465498e130Abc8700827C5340