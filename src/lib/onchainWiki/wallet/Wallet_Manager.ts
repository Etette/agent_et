import { ERROR_MESSAGES } from "../../../config/ModelConfig";
import CypherX from "../../utils/Encryption";
import { WalletData } from "../../utils/types";
import { WalletService } from "./WalletService";
import fs from 'fs';
import { ethers } from 'ethers';
import path from 'path';
import {OnchainWikiSmartAccount} from "../contract/SmartAccount"


export class OnchainWikiWalletManager {
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

    async createWallet(user_id: string, username: string) {
       try {
        const onchainUser = await OnchainWikiSmartAccount.userExists(user_id);
        console.log(`create wallet user check successfull`);
        const existingWallet = await this.Service.getUser(user_id);
        if (existingWallet?.address || onchainUser) {
            return ERROR_MESSAGES.WALLET_CREATED;
        }
        const wallet = ethers.Wallet.createRandom();
        if(!wallet) {
            return ERROR_MESSAGES.WALLET_ERROR;
        }
        const walletData: WalletData = {
            address: wallet.address,
            privateKey: wallet.privateKey,
            user_id,
            username,
            createdAt: new Date().toISOString()
        };
        console.log(`wallet created: address: ${wallet.address} \n pp: ${wallet.privateKey}`)
        console.log(`binding wallet onchain...`)

        const onchainWallet = await OnchainWikiSmartAccount.bindUserToWallet(walletData);
        if(!onchainWallet) {
            return ERROR_MESSAGES.WALLET_ERROR;
        }
        console.log(`successfully bind wallet onchain...`)

        await this.saveWallet(walletData);
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
        // uploaad file to storage here
    }

    async getWallet(user: string) {
        // Try MongoDB first
        const wallet = await this.Service.getWallet(user);
        if (wallet) return wallet;

        // Fallback to file
        const wallets = await this.getAllWallets();
        return wallets.find((w: any) => w.user === user) || null;
    }

    async getUserSummary(user: string) {
        const wallet = await this.getWallet(user);
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

    async getAddressesFromPrivateKey(privateKey: string): Promise<string[]> {
        try {
            const wallet = new ethers.Wallet(privateKey);
            return [wallet.address];
        } catch (error) {
            console.error('Error getting addresses from private key:', error);
            throw new Error(ERROR_MESSAGES.INVALID_PRIVATE_KEY);
        }
    }

    async importExisitingWallet(
        username: string,
        user_id: string,
        privateKey: string,
        address: string
    ): Promise<WalletData> {
    try {
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() !== address.toLowerCase()) {
            throw new Error(ERROR_MESSAGES.INVALID_PRIVATE_KEY);
        }

        const walletData: WalletData = {
            username,
            user_id,
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