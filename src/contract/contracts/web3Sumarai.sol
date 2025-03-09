// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }
}

contract MockERC721 is ERC721 {
    uint256 public nextTokenId;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}

contract Web3Samurai is ReentrancyGuard, Ownable {
    mapping(string => address) public usernameToWallet;
    mapping(string => uint256) public lastActionTimestamp;

    uint256 public constant ACTION_COOLDOWN = 5 minutes;
    uint256 public constant MAX_TRANSFER_AMOUNT = 1000 * 10**18;

    event WalletCreated(address indexed userAddress, string username);
    event TokenTransferred(address indexed from, address indexed to, address tokenAddress, uint256 amount);
    event EtherTransferred(address indexed from, address indexed to, uint256 amount);
    event NFTTransferred(address indexed from, address indexed to, address indexed nftAddress, uint256 tokenId);

    constructor() Ownable(msg.sender) {}

    function createWallet(string memory username, address wallet) external returns (address) {
        require(wallet != address(0), "Invalid wallet address");
        require(usernameToWallet[username] == address(0), "Username already linked to a wallet");
        require(block.timestamp - lastActionTimestamp[username] >= ACTION_COOLDOWN, "Rate limited");

        usernameToWallet[username] = wallet;
        lastActionTimestamp[username] = block.timestamp;

        emit WalletCreated(wallet, username);
        return wallet;
    }

    function transferTokens(
        address tokenAddress,
        string memory fromUsername,
        address to,
        uint256 amount
    ) external nonReentrant returns (bool) {
        require(amount <= MAX_TRANSFER_AMOUNT, "Amount too large");
        require(block.timestamp - lastActionTimestamp[fromUsername] >= ACTION_COOLDOWN, "Rate limited");

        address from = usernameToWallet[fromUsername];
        require(from != address(0), "Wallet not found");

        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(from, to, amount), "Transfer failed");

        lastActionTimestamp[fromUsername] = block.timestamp;
        emit TokenTransferred(from, to, tokenAddress, amount);
        return true;
    }

    function transferEther(
        string memory fromUsername,
        address payable to,
        uint256 amount
    ) external payable nonReentrant {
        require(block.timestamp - lastActionTimestamp[fromUsername] >= ACTION_COOLDOWN, "Rate limited");
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient contract balance");

        address from = usernameToWallet[fromUsername];
        require(from != address(0), "Wallet not found");
        require(msg.sender == from, "Unauthorized");

        lastActionTimestamp[fromUsername] = block.timestamp;

        (bool success, ) = to.call{value: amount}("");
        require(success, "Ether transfer failed");

        emit EtherTransferred(from, to, amount);
    }

    function transferNFT(
        string memory fromUsername,
        address nftAddress,
        address to,
        uint256 tokenId
    ) external nonReentrant {
        require(block.timestamp - lastActionTimestamp[fromUsername] >= ACTION_COOLDOWN, "Rate limited");

        address from = usernameToWallet[fromUsername];
        require(from != address(0), "Wallet not found");
        require(msg.sender == from, "Unauthorized");

        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == from, "Not the owner of the NFT");

        nft.safeTransferFrom(from, to, tokenId);

        lastActionTimestamp[fromUsername] = block.timestamp;

        emit NFTTransferred(from, to, nftAddress, tokenId);
    }

    // Allow the contract owner to withdraw Ether from the contract
    function withdrawEther(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient contract balance");
        payable(owner()).transfer(amount);
    }

    // Fallback function to receive Ether
    receive() external payable {}
}
