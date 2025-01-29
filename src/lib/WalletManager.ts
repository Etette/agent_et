import CypherX from "./Encryption";
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

export interface WalletData {
  address: string;
  privateKey: string;
  username: string;
  createdAt: string;
}


export class WalletManager {
    private readonly walletFile: string;
    private readonly encryptionKey: string;

  constructor() {
    this.walletFile = path.join(process.cwd(), 'data', 'wallets.enc');
    this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY || '';
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async createWallet(username: string) {
    const wallet = ethers.Wallet.createRandom();
    const walletData: any = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      username,
      createdAt: new Date().toISOString()
    };

    await this.saveWallet(walletData);
    return walletData;
  }

  async saveWallet(walletData: any) {
    let existingWallets = await this.getAllWallets();
    
    // Remove any existing wallet for this username
    existingWallets = existingWallets.filter((w : any) => w.username !== walletData.username);
    existingWallets.push(walletData);

    const encryptedData = CypherX.encrypt(JSON.stringify(existingWallets), this.encryptionKey);
    fs.writeFileSync(this.walletFile, encryptedData);
  }

  async getWallet(username: string) {
    const wallets = await this.getAllWallets();
    return wallets.find((w: any) => w.username === username) || null;
  }
  
  async getUserSummary(username: string) {
    const wallet = await this.getWallet(username);
    if (wallet) {
      return {
        address: wallet.address,
        username: wallet.username,
        createdAt: wallet.createdAt
      };
    }

    // Return user details without the private key
    return null;
   
  }

  // async getAddress() {
  //   const wallets = await this.getWalletSummary();
  //   return wallets.map((w : any) => w.address);
  // }

  async getAllWallets() {
    try {
      if (!fs.existsSync(this.walletFile)) {
        return [];
      }
      
      const encryptedData = fs.readFileSync(this.walletFile, 'utf8');
      const wallets = JSON.parse(CypherX.decrypt(encryptedData, this.encryptionKey));
      return wallets;
    } catch (error) {
      console.error('Error reading wallets:', error);
      return [];
    }
  }

  // New function to get wallet summary (without private keys)
  async getWalletSummary() {
    const wallets = await this.getAllWallets();
    return wallets.map((wallet: any) => ({
      address: wallet.address,
      username: wallet.username,
      createdAt: wallet.createdAt
    }));
  }

  // New function to read raw encrypted data
  readEncryptedFile() {
    try {
      if (!fs.existsSync(this.walletFile)) {
        return null;
      }
      return fs.readFileSync(this.walletFile, 'utf8');
    } catch (error) {
      console.error('Error reading encrypted file:', error);
      return null;
    }
  }

  async backupWallets(backupPath: string) {
    try {
      if (!fs.existsSync(this.walletFile)) {
        throw new Error('No wallet file exists to backup');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `wallets-backup-${timestamp}.enc`);
      
      fs.copyFileSync(this.walletFile, backupFile);
      return backupFile;
    } catch (error) {
      console.error('Backup error:', error);
      throw error;
    }
  }

  async deleteWallet(username: string) {
    try {
      let wallets = await this.getAllWallets();
      const initialLength = wallets.length;
      wallets = wallets.filter((w : any) => w.username !== username);
      
      if (wallets.length === initialLength) {
        throw new Error('Wallet not found');
      }

      const encryptedData = CypherX.encrypt(JSON.stringify(wallets), this.encryptionKey);
      fs.writeFileSync(this.walletFile, encryptedData);
      return true;
    } catch (error) {
      console.error('Delete wallet error:', error);
      throw error;
    }
  }

  async updateWalletUsername(username: string, newUsername: string, privateKey: string) {
    try {
        const wallets = await this.getAllWallets();
        const wallet = wallets.find((w: any) => w.username === username);

        if (!wallet) {
            throw new Error('Wallet not found');
        }

        // Verify the private key
        const walletInstance = new ethers.Wallet(wallet.privateKey);
        const testMessage = "verify_private_key";
        const signature = await walletInstance.signMessage(testMessage);

        const recoveredAddress = ethers.utils.verifyMessage(testMessage, signature);
        if (recoveredAddress !== wallet.address) {
            throw new Error('Invalid private key');
        }

        // Update the username
        wallet.username = newUsername;

        // Save the updated wallets
        const encryptedData = CypherX.encrypt(JSON.stringify(wallets), this.encryptionKey);
        fs.writeFileSync(this.walletFile, encryptedData);

        return wallet;
    } catch (error) {
        console.error('Error updating wallet username:', error);
        throw error;
    }
  }
}
