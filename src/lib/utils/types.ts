import dotenv from 'dotenv';
dotenv.config();

export enum SupportedTokenString {
    USDT = 'tether',
    LSK = 'lisk',
    // WBTC = 'wrappedbtc',
}

export type SupportedToken = keyof typeof SupportedTokenString;

export interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
  };
}

export interface TokenPriceInfo {
  price: number;
  lastUpdated: number;
}

export interface WalletData {
    address: string;
    privateKey: string;
    username: string;
    createdAt: string;
}
  
  
export interface TokenBalance {
    symbol: SupportedToken;
    balance: string;
    valueUSD?: string;
    error?: string;
}
  
export interface BatchBalanceResult {
    address: string;
    balances: TokenBalance[];
    timestamp: number;
    totalValueUSD?: string;
}
  
export interface TokenConfig {
    address: string;
    decimals: number;
    symbol: SupportedToken;
}
  
export const TOKEN_CONFIGS: Record<SupportedToken, TokenConfig> = {
    USDT: {
      address: process.env.LISK_USDT || '', // Lisk USDT address
      decimals: 6,
      symbol: 'USDT'
    },
    LSK: {
      address: process.env.LISK_LSK || '', // Lisk LSK
      decimals: 18,
      symbol: 'LSK'
    }
//     WBTC: {
//       address: process.env.LISK_SEPOLIA || '', // Lisk Sepolia
//       decimals: 18,
//       symbol: 'WBTC'
//     }
};
