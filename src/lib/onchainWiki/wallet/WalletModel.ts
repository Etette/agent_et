import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
    username: string;
    user_id: string;
    address: string;
    privateKey: string;
    createdAt: string;
}

const WalletSchema = new Schema<IWallet>({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    user_id: { 
        type: String, 
        required: true, 
        unique: true
    },
    address: { 
        type: String, 
        required: true 
    },
    privateKey: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: String, 
        default: () => new Date().toISOString() 
    }
});

export const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema);