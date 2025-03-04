import dotenv from "dotenv";
dotenv.config();

export const liskSepolia = {
    id: 4202,
    name: 'LiskSepolia',
    network: 'lisk-sepolia',
    nativeCurrency: {
      decimals: 18,
      name: 'LSK',
      symbol: 'LSK',
    },
    rpcUrls: {
      default: { http: [process.env.LISK_RPC_TESTNET!] },
      public: { http: [process.env.LISK_RPC_TESTNET!] },
    },
    blockExplorers: {
      default: { name: 'LiskExplorer', url: 'https://sepolia-explorer.lisk.com' },
    },
    testnet: true,
} as const;