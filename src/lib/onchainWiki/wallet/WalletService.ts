import mongoose from 'mongoose';
import { WalletModel, IWallet } from './WalletModel';
import CypherX from '../../utils/Encryption';
import { WalletData } from '../../utils/types';

export class WalletService {
    private readonly encryptionKey: string;

    constructor(encryptionKey: string) {
        this.encryptionKey = encryptionKey;
    }

    async connect(mongoUri: string) {
        try {
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 60000, // Increase timeout to 60 seconds
                connectTimeoutMS: 60000,        // Connection timeout
                socketTimeoutMS: 60000,         // Socket timeout
                maxPoolSize: 10,                // Maximum number of connections in the pool
                retryWrites: true,              // Enable retry on write operations
            });

            // Set up connection error handlers
            mongoose.connection.on('error', (error) => {
                console.error('MongoDB connection error:', error);
            });

            mongoose.connection.on('disconnected', () => {
                console.log('MongoDB disconnected');
            });

            mongoose.connection.on('connected', () => {
                console.log('MongoDB connected successfully');
            });

        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            throw error;
        }
    }

    async saveWallet(walletData: WalletData) {
        try {
            const encryptedPrivateKey = CypherX.encrypt(walletData.privateKey, this.encryptionKey);
            
            const walletDocument = {
                username: walletData.username,
                user_id: walletData.user_id,
                address: walletData.address,
                privateKey: encryptedPrivateKey,
                createdAt: walletData.createdAt
            };

            const result = await WalletModel.findOneAndUpdate(
                { user_id: walletData.user_id },
                walletDocument,
                { upsert: true, new: true }
            );

            return result;
        } catch (error) {
            console.error('Error saving wallet:', error);
            throw error;
        }
    }

    async getWallet(user_id: string): Promise<WalletData | null> {
        try {
            const wallet = await WalletModel.findOne({ user_id });
            
            if (!wallet) return null;

            return {
                username: wallet.username,
                user_id: wallet.user_id,
                address: wallet.address,
                privateKey: CypherX.decrypt(wallet.privateKey, this.encryptionKey),
                createdAt: wallet.createdAt
            };
        } catch (error) {
            console.error('Error getting wallet:', error);
            throw error;
        }
    }

    async getUser(user_id: string): Promise<WalletData | null> {
        try {
            const wallet = await WalletModel.findOne({ user_id });
            
            if (!wallet) return null;

            return {
                username: wallet.username,
                user_id: wallet.user_id,
                address: wallet.address,
                privateKey: '',
                createdAt: wallet.createdAt
            };
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    async getAllWallets(): Promise<WalletData[]> {
        try {
            const wallets = await WalletModel.find({});
            return wallets.map(wallet => ({
                username: wallet.username,
                user_id: wallet.user_id,
                address: wallet.address,
                privateKey: CypherX.decrypt(wallet.privateKey, this.encryptionKey),
                createdAt: wallet.createdAt
            }));
        } catch (error) {
            console.error('Error getting all wallets:', error);
            throw error;
        }
    }

    async getAllUsers(): Promise<WalletData[]> {
        try {
            const wallets = await WalletModel.find({});
            return wallets.map(wallet => ({
                username: wallet.username,
                user_id: wallet.user_id,
                address: wallet.address,
                privateKey: 'null',
                createdAt: wallet.createdAt
            }));
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }

    async deleteWallet(username: string): Promise<boolean> {
        try {
            const result = await WalletModel.deleteOne({ username });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Error deleting wallet:', error);
            throw error;
        }
    }

    // async updateWalletUsername(username: string, newUsername: string): Promise<boolean> {
    //     try {
    //         const result = await WalletModel.updateOne(
    //             { username },
    //             { $set: { username: newUsername } }
    //         );
    //         return result.modifiedCount > 0;
    //     } catch (error) {
    //         console.error('Error updating wallet username:', error);
    //         throw error;
    //     }
    // }

    async close() {
        try {
            await mongoose.connection.close();
            console.log('MongoDB connection closed');
        } catch (error) {
            console.error('Error closing MongoDB connection:', error);
            throw error;
        }
    }
}