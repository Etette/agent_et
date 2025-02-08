import { ERROR_MESSAGES } from "../../config/ModelConfig";
import CypherX from "../utils/Encryption";
import { WalletData } from "../utils/types";
import { WalletService } from "./WalletService";
import fs from 'fs';
import { ethers } from 'ethers';
import path from 'path';


export class SamuraiWalletManager {
    private readonly walletFile: string;
    private readonly encryptionKey: string;
    private Service: WalletService;

    constructor() {
        this.walletFile = path.join(process.cwd(), 'data', 'wallets.enc');
        this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY || '';
        this.ensureDataDirectory();
        
        this.Service = new WalletService(this.encryptionKey);
    }

    async connect() {
        const mongoUri = process.env.MONGODB_URI || '';
        await this.Service.connect(mongoUri);
    }

    ensureDataDirectory() {
        const dir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    async createWallet(username: string) {
       try {
        const existingWallet = await this.Service.getUser(username);
        if (existingWallet?.address) {
            return ERROR_MESSAGES.WALLET_CREATED;
        }
        const wallet = await ethers.Wallet.createRandom();
        const walletData: WalletData = {
            address: wallet.address,
            privateKey: wallet.privateKey,
            username,
            createdAt: new Date().toISOString()
        };

        await this.saveWallet(walletData);
        // link username to wallet - update smart contract mapping
        return walletData;
        
       } catch (error) {
        console.error('Error creating wallet:', error);
        if (error instanceof Error) {
            return (ERROR_MESSAGES.WALLET_ERROR + error.message);
        }
        return ERROR_MESSAGES.WALLET_ERROR;
       }
    }

    async saveWallet(walletData: WalletData) {
        // Save to MongoDB using 
        await this.Service.saveWallet(walletData);

        // Backup to file
        let existingWallets = await this.getAllWallets();
        existingWallets = existingWallets.filter((w: any) => w.username !== walletData.username);
        existingWallets.push(walletData); // private key still exposed here

        const encryptedData = CypherX.encrypt(JSON.stringify(existingWallets), this.encryptionKey);
        fs.writeFileSync(this.walletFile, encryptedData);
    }

    async getWallet(username: string) {
        // Try MongoDB first
        const wallet = await this.Service.getWallet(username);
        if (wallet) return wallet;

        // Fallback to file
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
        return null;
    }

    async getAllWallets() {
        try {
            // Get wallets from MongoDB
            const Wallets = await this.Service.getAllWallets();
            if (Wallets.length > 0) {
                return Wallets;
            }

            // Fallback to file
            if (!fs.existsSync(this.walletFile)) {
                return [];
            }
            
            const encryptedData = fs.readFileSync(this.walletFile, 'utf8');
            return JSON.parse(CypherX.decrypt(encryptedData, this.encryptionKey));
        } catch (error) {
            console.error('Error reading wallets:', error);
            return [];
        }
    }

    async getWalletSummary() {
        const wallets = await this.Service.getAllUsers();
        return wallets.map((wallet: any) => ({
            address: wallet.address,
            username: wallet.username,
            createdAt: wallet.createdAt
        }));
    }

    async readEncryptedFile() {
        try {
            if (!fs.existsSync(this.walletFile)) {
                return null;
            }
            return await fs.readFileSync(this.walletFile, 'utf8');
        } catch (error) {
            console.error('Error reading encrypted file:', error);
            return null;
        }
    }

    async backupWallets(backupPath: string) {
        try {
            // Backup MongoDB data
            const wallets = await this.Service.getAllWallets();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupPath, `wallets-backup-${timestamp}.enc`);
            
            const encryptedData = CypherX.encrypt(JSON.stringify(wallets), this.encryptionKey);
            fs.writeFileSync(backupFile, encryptedData);
            
            return backupFile;
        } catch (error) {
            console.error('Backup error:', error);
            throw error;
        }
    }

    async deleteWallet(username: string) {
        try {
            // Delete from MongoDB
            const deleted = await this.Service.deleteWallet(username);
            
            if (!deleted) {
                throw new Error(ERROR_MESSAGES.WALLET_NOT_FOUND);
            }

            // Update file backup
            let wallets = await this.getAllWallets();
            wallets = wallets.filter((w: any) => w.username !== username);
            
            const encryptedData = CypherX.encrypt(JSON.stringify(wallets), this.encryptionKey);
            fs.writeFileSync(this.walletFile, encryptedData);
            
            return true;
        } catch (error) {
            console.error('Delete wallet error:', error);
            throw error;
        }
    }

    async updateWalletUsername(username: string, newUsername: string) {
        try {
            const wallet: WalletData = await this.getWallet(username);

            if (!wallet) {
                throw new Error(ERROR_MESSAGES.WALLET_NOT_FOUND);
            }

            // Verify the private key
            const walletInstance = new ethers.Wallet(wallet.privateKey);
            const verificationText = "verify_private_key";
            const signature = await walletInstance.signMessage(verificationText);

            const recoveredAddress = ethers.verifyMessage(verificationText, signature);
            if (recoveredAddress !== wallet.address) {
                throw new Error(ERROR_MESSAGES.INVALID_PRIVATE_KEY);
            }

            // Update in MongoDB
            await this.Service.updateWalletUsername(username, newUsername);
            // link new username to wallet  - update smart contract mapping

            // Update file backup
            const wallets = await this.getAllWallets();
            const walletToUpdate = wallets.find((w: any) => w.username === username);
            if (walletToUpdate) {
                walletToUpdate.username = newUsername;
                const encryptedData = CypherX.encrypt(JSON.stringify(wallets), this.encryptionKey);
                fs.writeFileSync(this.walletFile, encryptedData);
            }

            return { ...wallet, username: newUsername };
        } catch (error) {
            console.error('Error updating wallet username:', error);
            throw error;
        }
    }

    async getAddressesFromPrivateKey(privateKey: string): Promise<string[]> {
        try {
            // Create wallet instance from private key
            const wallet = new ethers.Wallet(privateKey);
        
            // For now, we'll just return the main address
            // You can extend this to return multiple addresses if needed
            return [wallet.address];
        } catch (error) {
            console.error('Error getting addresses from private key:', error);
            throw new Error('Invalid private key');
        }
    }

    async importExisitingWallet(
        username: string,
        privateKey: string,
        address: string
    ): Promise<WalletData> {
    try {
        // Validate the private key and address match
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() !== address.toLowerCase()) {
            throw new Error('Private key does not match the selected address');
        }

        const walletData: WalletData = {
            username,
            address: wallet.address,
            privateKey: privateKey,
            createdAt: new Date().toString()
        };

        await this.saveWallet(walletData);

        return walletData;
    } catch (error) {
        console.error('Error importing wallet:', error);
        throw error;
        }
    }

    async close() {
        await this.Service.close();
    }
}