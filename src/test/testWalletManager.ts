import {WalletManager} from '../lib/WalletManager'
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config();

async function testWalletManager() {
    const manager = new WalletManager();
  
    try {
      // Create some test wallets
      // await manager.createWallet('user11');
      // await manager.createWallet('user22');
  
      // Get all wallets (including private keys - be careful with this!)
      // const allWallets = await manager.getAllWallets();
      // console.log('\nAll Wallets (including private keys):', allWallets);
  
      // Get wallet summary (safe to display)
      const summary = await manager.getWalletSummary();
      console.log('\nWallet Summary (no private keys):', summary);
  
      // Read raw encrypted data
      const encryptedData = manager.readEncryptedFile();
      console.log('\nRaw Encrypted Data:', encryptedData);
  
      // Create a backup
      // const backupPath = path.join(process.cwd(), 'data', 'backups');
      // if (!fs.existsSync(backupPath)) {
      //   fs.mkdirSync(backupPath, { recursive: true });
      // }
      // const backupFile = await manager.backupWallets(backupPath);
      const user_ = await manager.getUserSummary("user22")
      console.log('\n single user_:', user_);
  
      // Delete a wallet
    //   await manager.deleteWallet('testUser123');
      // const remainingWallets = await manager.getWalletSummary();
      // console.log('\nRemaining Wallets:', remainingWallets);
  
    } catch (error) {
      console.error('Test error:', error);
    }
  }
  
  // Uncomment to run the test
testWalletManager();
  