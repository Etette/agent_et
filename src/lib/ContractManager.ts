import { ethers } from 'ethers';
import { WalletData } from './WalletManagerdeprecated';

export class ContractManager {
  private provider: ethers.Provider;
  private contractAddress: string;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.LISK_RPC
    );
    this.contractAddress = process.env.CONTRACT_ADDRESS || '';
  }

  async transferTokens(
    wallet: WalletData,
    token: string,
    recipient: string,
    amount: string
  ) {
    const signer = new ethers.Wallet(wallet.privateKey, this.provider);
    const contract = new ethers.Contract(
      this.contractAddress,
      ['function transferTokens(address,string,address,uint256)'],
      signer
    );

    const tx = await contract.transferTokens(
      token,
      wallet.username,
      recipient,
      ethers.parseEther(amount)
    );

    return await tx.wait();
  }

  async getBalance(address: string) {
    const ethBalance = await this.provider.getBalance(address);
    
    // You can add token balance checks here
    const tokens: string[] = [];

    return {
      eth: ethers.formatEther(ethBalance),
      tokens
    };
  }
}

