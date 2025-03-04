import { ethers } from "ethers";
import * as dotenv from "dotenv";
import artifacts from "../../contract/artifacts/contracts/OnchainWiki.sol/OnchainWiki.json";
import { WalletData } from "../utils/types";
dotenv.config();

const BINDER_CONTRACT_ADDRESS = process.env.BINDER_CONTRACT_ADDRESS as string; 
const CONTRACT_ABI = artifacts.abi;
const provider = new ethers.JsonRpcProvider(process.env.LISK_RPC_TESTNET);

export class OnchainWikiContractService {
  /**
   * Creates a signer using the walletData's privateKey.
   */
  private static getSigner(walletData: WalletData): ethers.Wallet {
    return new ethers.Wallet(walletData.privateKey, provider);
  }

  /**
   * Returns a contract instance connected with the caller's signer.
   */
  private static getContract(walletData: WalletData): ethers.Contract {
    const signer = OnchainWikiContractService.getSigner(walletData);
    return new ethers.Contract(BINDER_CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }

  /**
   * Binds the wallet to the username provided in walletData.
   */
  public static async bindUsernameToWallet(walletData: WalletData): Promise<Boolean> {
    const contract = OnchainWikiContractService.getContract(walletData);
    const signer = OnchainWikiContractService.getSigner(walletData);
    const signerAddress = await this.getSigner(walletData).getAddress();
    const tx = await contract.bindUserToWallet(walletData.username, signerAddress);
    await tx.wait();
    console.log("Wallet bound to username:", walletData.username);
    return true;
   
  }

  /**
   * Updates the username on-chain from the current one (in walletData) to a new one.
   */
  public static async updateUsername(walletData: WalletData, newUsername: string): Promise<Boolean> {
    const contract = OnchainWikiContractService.getContract(walletData);
    const tx = await contract.updateUsername(walletData.username, newUsername); // prev username potential error
    await tx.wait();
    console.log("Username updated from", walletData.username, "to", newUsername);
    return true
  }

  /**
   * Deletes the wallet binding for the username in walletData.
   */
  public static async unbindUsernameFromWallet(walletData: WalletData): Promise<Boolean> {
    const contract = OnchainWikiContractService.getContract(walletData);
    const tx = await contract.deleteWalletBinding(walletData.username);
    await tx.wait();
    console.log("Wallet binding deleted for username:", walletData.username);
    return true
  }

  /**
   * Retrieves the wallet address associated with a given username.
   * (Read-only: no signer required.)
   */
  public static async getWalletAddress(username: string): Promise<string> {
    const contract = new ethers.Contract(BINDER_CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    return await contract.usernameToWallet(username);
  }

  /**
   * Checks if a given username exists on-chain.
   * (Read-only: no signer required.)
   */
  public static async userExists(username: string): Promise<boolean> {
    const contract = new ethers.Contract(BINDER_CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    return await contract.userExists(username);
  }
}
