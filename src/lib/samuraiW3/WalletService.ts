import mongoose from 'mongoose';
import { WalletModel} from './WalletModel';
import CypherX from '../utils/Encryption';
import { WalletData } from '../utils/types';

export class WalletService {
    private readonly encryptionKey: string;

    constructor(encryptionKey: string) {
        this.encryptionKey = encryptionKey;
    }

    async connect(mongoUri: string) {
        await mongoose.connect(mongoUri);
    }

    async saveWallet(walletData: WalletData) {
        const encryptedPrivateKey = CypherX.encrypt(walletData.privateKey, this.encryptionKey);
        
        const walletDocument = {
            username: walletData.username,
            address: walletData.address,
            privateKey: encryptedPrivateKey,
            createdAt: walletData.createdAt
        };

        await WalletModel.findOneAndUpdate(
            { username: walletData.username },
            walletDocument,
            { upsert: true, new: true }
        );
    }

    async getWallet(username: string): Promise<WalletData | null> {
        const wallet = await WalletModel.findOne({ username });
        
        if (!wallet) return null;

        return {
            username: wallet.username,
            address: wallet.address,
            privateKey: CypherX.decrypt(wallet.privateKey, this.encryptionKey),
            createdAt: wallet.createdAt
        };
    }

    async getUser(username: string): Promise<WalletData | null> {
        const wallet = await WalletModel.findOne({ username });
        
        if (!wallet) return null;

        return {
            username: wallet.username,
            address: wallet.address,
            privateKey: '', //CypherX.decrypt(wallet.privateKey, this.encryptionKey),
            createdAt: wallet.createdAt
        };
    }

    async getAllWallets(): Promise<WalletData[]> {
        const wallets = await WalletModel.find({});
        return wallets.map(wallet => ({
            username: wallet.username,
            address: wallet.address,
            privateKey: CypherX.decrypt(wallet.privateKey, this.encryptionKey),
            createdAt: wallet.createdAt
        }));
    }

    async getAllUsers(): Promise<WalletData[]> {
        const wallets = await WalletModel.find({});
        return wallets.map(wallet => ({
            username: wallet.username,
            address: wallet.address,
            privateKey: '', //CypherX.decrypt(wallet.privateKey, this.encryptionKey),
            createdAt: wallet.createdAt
        }));
    }

    async deleteWallet(username: string): Promise<boolean> {
        const result = await WalletModel.deleteOne({ username });
        return result.deletedCount > 0;
    }

    async updateWalletUsername(username: string, newUsername: string): Promise<boolean> {
        const result = await WalletModel.updateOne(
            { username },
            { $set: { username: newUsername } }
        );
        return result.modifiedCount > 0;
    }

    async close() {
        await mongoose.connection.close();
    }
}