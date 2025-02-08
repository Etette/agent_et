import { Contract, ethers } from 'ethers';
import axios from 'axios';
import { SupportedToken, WalletData } from '../utils/types';
import dotenv from 'dotenv';
import { ERROR_MESSAGES } from '../../config/ModelConfig';
dotenv.config();

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

export class SamuraiContractManager {
    private provider: ethers.JsonRpcProvider;
    private tokenContracts: Map<SupportedToken, Contract>;
    private tokenAddresses: Record<SupportedToken, string>;
    private initialized: boolean = false;

    constructor() {
        // Validate RPC URL first
        const rpcUrl = process.env.LISK_RPC;
        if (!rpcUrl) {
            throw new Error(ERROR_MESSAGES.RPC_URL_ERROR);
        }
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Validate token addresses
        const addresses = {
            USDT: process.env.LISK_USDT,
            LSK: process.env.LISK_LSK,
            // WBTC: process.env.LISK_WBTC
        };

        // Check for missing addresses
        Object.entries(addresses).forEach(([token, address]) => {
            if (!address) {
                throw new Error(ERROR_MESSAGES.INVALID_TOKEN_ADDRESS  + `${token}`);
            }
            if (!ethers.isAddress(address)) {
                throw new Error(ERROR_MESSAGES.INVALID_TOKEN_ADDRESS + ` ${token}: ${address}`);
            }
        });

        this.tokenAddresses = addresses as Record<SupportedToken, string>;
        this.tokenContracts = new Map();
    }

    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Initialize contracts for each token with validation
            for (const [token, address] of Object.entries(this.tokenAddresses)) {
                const contract = new Contract(
                    address,
                    ERC20_ABI,
                    this.provider
                );

                // Validate contract by checking if it has required methods
                try {
                    await contract.decimals();
                    await contract.symbol();
                } catch (error) {
                    throw new Error(`Failed to validate contract for ${token} at ${address}`);
                }

                this.tokenContracts.set(token as SupportedToken, contract);
            }
            
            this.initialized = true;
            console.log('Samurai initialized initialized with addresses:', 
                Object.entries(this.tokenAddresses)
                    .map(([token, addr]) => `${token}: ${addr}`)
                    .join(', ')
            );
        } catch (error) {
            this.initialized = false;
            console.error('Error initializing ContractManager:', error);
            throw error;
        }
    }

    private async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    async getTokenBalance(token: SupportedToken, address: string): Promise<string> {
        await this.ensureInitialized();

        if (!ethers.isAddress(address)) {
            throw new Error(ERROR_MESSAGES.ADDRESS_ERROR + address);
        }

        const contract = this.tokenContracts.get(token);
        if (!contract) {
            throw new Error(ERROR_MESSAGES.INVALID_TOKEN_ADDRESS + token);
        }

        try {
            const decimals = await contract.decimals();
            const balance = await contract.balanceOf(address);
            return ethers.formatUnits(balance, decimals);
        } catch (error) {
            console.error(`Error fetching ${token} balance for ${address}:`, error);
            throw new Error(`Failed to fetch ${token} balance: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getTokenPriceUSD(token: SupportedToken): Promise<number> {
        const coinGeckoIds: Record<SupportedToken, string> = {
            USDT: 'tether',
            LSK: 'lisk',
            // WBTC: 'wrappedbtc'
        };

        const id = coinGeckoIds[token];
        if (!id) {
            throw new Error(`No price feed configured for ${token}`);
        }

        try {
            const response = await axios.get(
                `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
                { timeout: 5000 } // 5 second timeout
            );

            if (!response.data?.[id]?.usd) {
                throw new Error('Price data not available');
            }

            return response.data[id].usd;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to fetch ${token} price: ${error.message}`);
            }
            throw error;
        }
    }

    async getEthBalance(address: string) {
        // await this.ensureInitialized();
        if (!ethers.isAddress(address)) {
            throw new Error(ERROR_MESSAGES.INVALID_TOKEN_ADDRESS + address);
        }

        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error fetching ETH balance:', error);
            throw error instanceof Error ? error.message : String(error);
        }
    }

    async transferToken(
        wallet: WalletData,
        token: SupportedToken,
        recipientAddress: string,
        amount: string
    ): Promise<ethers.ContractTransaction> {
        await this.ensureInitialized();

        // Validate recipient address
        if (!ethers.isAddress(recipientAddress)) {
            throw new Error(ERROR_MESSAGES.ADDRESS_ERROR + recipientAddress);
        }

        // Validate amount is a number
        if (isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error(`Invalid amount: ${amount}`);
        }

        // Get token address
        const tokenAddress = this.tokenAddresses[token];
        if (!tokenAddress) {
            throw new Error(ERROR_MESSAGES.INVALID_TOKEN_ADDRESS + token);
        }

        try {
            // Create wallet instance using the provider from the class
            const signer = new ethers.Wallet(wallet.privateKey, this.provider);
            
            // Get contract from existing contracts map or create new one with signer
            let tokenContract = this.tokenContracts.get(token);
            if (!tokenContract) {
                throw new Error(`Contract not initialized for token: ${token}`);
            }
            // Connect the contract with signer for transactions
            tokenContract = tokenContract.connect(signer) as Contract;

            // Get token decimals
            const decimals = await tokenContract.decimals();
            
            // Convert amount to proper decimal places
            const parsedAmount = ethers.parseUnits(amount, decimals);
            
            // Check balance
            const balance = await tokenContract.balanceOf(wallet.address);
            if (balance < parsedAmount) {
                throw new Error('Insufficient token balance');
            }
            
            // Estimate gas
            const gasLimit = await tokenContract.transfer.estimateGas(
                recipientAddress,
                parsedAmount
            );
            
            // Get current gas price
            const gasPrice = await this.provider.getFeeData();
            
            // Send transaction
            const tx = await tokenContract.transfer(
                recipientAddress,
                parsedAmount,
                {
                    gasLimit: gasLimit * BigInt(12) / BigInt(10), // Add 20% buffer
                    maxFeePerGas: gasPrice.maxFeePerGas,
                    maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
                }
            );
            
            return tx as ethers.ContractTransaction;
        } catch (error) {
            console.error('Error in transferToken:', error);
            throw new Error(`Failed to transfer ${token}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async transferETH(
        wallet: WalletData,
        recipientAddress: string,
        amount: string
    ): Promise<ethers.ContractTransaction> {
        try {
            // Create wallet instance using the provider from the class
            const signer = new ethers.Wallet(wallet.privateKey, this.provider);
            
            // Convert amount to wei
            const parsedAmount = ethers.parseEther(amount);
            
            // Check balance
            const balance = await this.provider.getBalance(wallet.address);
            if (balance < parsedAmount) {
                throw new Error('Insufficient ETH balance');
            }
            
            // Get current gas price
            const gasPrice = await this.provider.getFeeData();
            
            // Estimate gas
            const gasLimit = await this.provider.estimateGas({
                to: recipientAddress,
                value: parsedAmount
            });
            
            // Send transaction
            const tx = await signer.sendTransaction({
                to: recipientAddress,
                value: parsedAmount,
                gasLimit: gasLimit * BigInt(12) / BigInt(10), // Add 20% buffer
                maxFeePerGas: gasPrice.maxFeePerGas,
                maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
            });
            
            return tx as ethers.ContractTransaction;
        } catch (error) {
            console.error('Error in transferETH:', error);
            throw new Error(`Failed to transfer ETH: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getSingleTokenBalance(address: string, token: SupportedToken) {
        try {
            const [balance, price] = await Promise.all([
                this.getTokenBalance(token, address),
                this.getTokenPriceUSD(token)
            ]);

            const valueUSD = parseFloat(balance) * price;

            return {
                symbol: token,
                balance: parseFloat(balance).toFixed(6),
                valueUSD: valueUSD.toFixed(2),
                error: null
            };
        } catch (error) {
            console.error(`Error getting balance for ${token}:`, error);
            return {
                symbol: token,
                balance: '0',
                valueUSD: '0',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async getBatchTokenBalances(address: string, tokens?: SupportedToken[]) {
        await this.ensureInitialized();

        if (!ethers.isAddress(address)) {
            throw new Error(ERROR_MESSAGES.INVALID_TOKEN_ADDRESS + address);
        }

        const tokensToCheck = tokens || Object.keys(this.tokenAddresses) as SupportedToken[];
        
        try {
            const balances = await Promise.all(
                tokensToCheck.map(token => this.getSingleTokenBalance(address, token))
            );

            const totalValueUSD = balances.reduce((total, balance) => 
                total + (balance.error ? 0 : parseFloat(balance.valueUSD)), 0
            );

            return {
                address,
                balances,
                totalValueUSD: totalValueUSD.toFixed(2),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error in batch balance check:', error);
            throw error;
        }
    }

    async getBalance(address: string) {
        await this.ensureInitialized();

        if (!ethers.isAddress(address)) {
            throw new Error(ERROR_MESSAGES.INVALID_TOKEN_ADDRESS + address);
        }

        try {
            const [ethBalance, tokenBalances] = await Promise.all([
                this.provider.getBalance(address),
                this.getBatchTokenBalances(address)
            ]);

            return {
                eth: ethers.formatEther(ethBalance),
                tokens: tokenBalances.balances.map(b => 
                    `${b.symbol}: ${b.balance}${b.valueUSD ? ` ($${b.valueUSD})` : ''}`
                )
            };
        } catch (error) {
            console.error('Error fetching balance:', error);
            throw error;
        }
    }

    async close() {
        try {
            await this.provider.destroy();
            this.initialized = false;
            this.tokenContracts.clear();
        } catch (error) {
            console.error('Error closing ContractManager:', error);
            throw error;
        }
    }
}