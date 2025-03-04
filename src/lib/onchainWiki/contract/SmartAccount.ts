const { createSmartAccountClient, createBicoPaymasterClient, toNexusAccount } = require("@biconomy/abstractjs");
import { http, createPublicClient, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import artifacts from "../../../contract/artifacts/contracts/bindWallet.sol/WalletBinding.json";
import { WalletData } from "../../utils/types";
import { liskSepolia } from "../../utils/chains";

dotenv.config();

const BINDER_CONTRACT_ADDRESS = process.env.BINDER_CONTRACT_ADDRESS as string;
const CONTRACT_ABI = artifacts.abi;
const BUNDLER_URL = process.env.BUNDLER_URL as string;
const PAYMASTER_URL = process.env.PAYMASTER_URL as string;
const LISK_RPC_TESTNET = process.env.LISK_RPC_TESTNET as string;

export class OnchainWikiSmartAccount {
  private static async createNexusClient(walletData: WalletData) {
    const privateKey = walletData.privateKey.slice(2);
    const account = privateKeyToAccount(`0x${privateKey}`);

    return createSmartAccountClient({
      account: await toNexusAccount({
        signer: account,
        chain: liskSepolia,
        transport: http(),
      }),
      transport: http(BUNDLER_URL),
      paymaster: createBicoPaymasterClient({ paymasterUrl: PAYMASTER_URL }),
    });
  }

  public static async bindUserToWallet(walletData: WalletData): Promise<boolean> {
    try {
      const nexusClient = await this.createNexusClient(walletData);
      const signerAddress = await nexusClient.account.address;

      // Encode function data using viem
      const callData = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: "bindUserToWallet",
        args: [walletData.user_id, signerAddress],
      });

      const hash = await nexusClient.sendUserOperation({
        calls: [
          {
            to: BINDER_CONTRACT_ADDRESS,
            data: callData,
            value: 0n,
          },
        ],
      });

      console.log("Transaction hash:", hash);
      const receipt = await nexusClient.waitForUserOperationReceipt({ hash });
      console.log(`receipt: ${receipt.receipt}`);
      console.log("Wallet bound to username:", walletData.username);

      return true;
    } catch (error) {
      console.error("Error binding username to wallet:", error);
      return false;
    }
  }

  private static getPublicClient() {
    return createPublicClient({
      chain: liskSepolia,
      transport: http(LISK_RPC_TESTNET),
    });
  }

  public static async getUserAddress(user_id: string): Promise<string> {
    const publicClient = this.getPublicClient();
    const address_ = BINDER_CONTRACT_ADDRESS.slice(2);

    const result = await publicClient.readContract({
      address: `0x${address_}`,
      abi: CONTRACT_ABI,
      functionName: "getUserAddress",
      args: [user_id],
    });

    return result as string;
  }

  public static async userExists(user_id: string): Promise<boolean> {
    const publicClient = this.getPublicClient();
    const address_ = BINDER_CONTRACT_ADDRESS.slice(2);

    const result = await publicClient.readContract({
      address: `0x${address_}`,
      abi: CONTRACT_ABI,
      functionName: "onchainUserExists",
      args: [user_id],
    });

    return result as boolean;
  }
}