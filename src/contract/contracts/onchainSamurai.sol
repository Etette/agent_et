// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract OnchainSamurai is Ownable, ReentrancyGuard {
    mapping(string => address) public usernameToWallet;
    mapping(string => bool) public userExists;
    
    // uint256 public gasCoverage;
    // bool public gasCoverageEnabled;
    
    event WalletBinded(address indexed wallet, string username);
    event UsernameUpdated(address indexed wallet, string oldUsername, string newUsername);
    event WalletUnbinded(address indexed wallet, string username);
    event FundsWithdrawn(address indexed wallet, uint256 amount);
    // event GasCoverageUpdated(uint256 newAmount);
    // event GasCoverageStateChanged(bool enabled);

    error ZeroAddress();
    error Unauthorized();
    error UserAlreadyOnchain();
    error UserNotOnchain();
    error InsufficientContractBalance();
    // error InvalidGasCoverage();

    constructor() Ownable(msg.sender) {
        // gasCoverage = 1000 gwei;
        // gasCoverageEnabled = false;
    }

    receive() external payable {}
    
    function bindUserToWallet(string memory username, address wallet) external nonReentrant {
        if(wallet == address(0)) revert ZeroAddress();
        if(wallet != msg.sender) revert Unauthorized();
        if (usernameToWallet[username] == wallet || userExists[username]) revert UserAlreadyOnchain();
        // if (gasCoverageEnabled) {
        //     if (address(this).balance < gasCoverage) revert InsufficientContractBalance(); 
        //     (bool success, ) = payable(msg.sender).call{value: gasCoverage}("");
        //     require(success, "Gas coverage transfer failed");
        // }     
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

    // Admin functions
    // function setGasCoverage(uint256 newAmount) external onlyOwner {
    //     if(newAmount == 0) revert InvalidGasCoverage();
    //     gasCoverage = newAmount;
    //     emit GasCoverageUpdated(newAmount);
    // }

    // function toggleGasCoverage() external onlyOwner {
    //     gasCoverageEnabled = !gasCoverageEnabled;
    //     emit GasCoverageStateChanged(gasCoverageEnabled);
    // }

    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        if(balance == 0) revert InsufficientContractBalance();    
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
        emit FundsWithdrawn(owner(), balance);
    }

    // View functions
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // function isGasCoverageEnabled() external view returns (bool) {
    //     return gasCoverageEnabled;
    // }

    // function getGasCoverageAmount() external view returns (uint256) {
    //     return gasCoverage;
    // }
}

// Aaddress - 0x087Ed808A49Af5Af4ab1B459CAC8cB1f2F1f1536 - v2