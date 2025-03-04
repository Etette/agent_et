import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { PriceManager } from './lib/PriceManager';
import { WalletData, SupportedToken, TEST_SupportedToken } from './lib/utils/types';
import dotenv from 'dotenv';
import { OnchainWikiWalletManager } from './lib/onchainWiki/wallet/Wallet_Manager';
import { OnchainWikiContractManager} from './lib/onchainWiki/contract/Contract_Manager';
// import { AgentSamurai } from './lib/samuraiW3/Agent_Manager';
import { AgentManger } from './lib/agentEt/AgentManager';
dotenv.config();

export class OnchainWiki {
    private onchainwiki: Telegraf;
    private walletManager: OnchainWikiWalletManager;
    private priceManager: PriceManager;
    private contractManager: OnchainWikiContractManager;
    private samuraiAI: AgentManger; //AgentSamurai;
    private activeUserSessions: Map<number, {
        state: string;
        data: any;
    }>;

    constructor(onchainwikiToken: string) {
        this.onchainwiki = new Telegraf(onchainwikiToken, {
            handlerTimeout: 90000,
        });
        
        this.walletManager = new OnchainWikiWalletManager();
        this.priceManager = new PriceManager();
        this.contractManager = new OnchainWikiContractManager();
        this.samuraiAI = new AgentManger();
        this.activeUserSessions = new Map();

        this.setupCommands();
        this.setupMessageHandlers();
    }

    public async handleUpdate(update: any): Promise<void> {
        await this.onchainwiki.handleUpdate(update);
    }

    public async setWebhook(url: string): Promise<any> {
        return this.onchainwiki.telegram.setWebhook(url);
    }

    public async getWebhookInfo(): Promise<any> {
        return this.onchainwiki.telegram.getWebhookInfo();
    }

    private setupCommands() {
        // Start command with combined welcome message
        this.onchainwiki.command('start', async (ctx) => {
            try {
                await ctx.reply(
                    'Hi Welcome, I am OnchainWiki! 🚀\n\n' +
                    'Available commands:\n' +
                    '/createwallet - Create a new Ethereum wallet\n' +
                    '/importwallet - import existing Ethereum wallet. \nN/B: Private Key required\n' +
                    '/info - View your wallet information \n' +
                    // '/send <amount> <token> to <address> - Send tokens to your pal \n' +
                    // '/pal - verify user is onchain \n' +
                    '/price <token name> - Get token price \n' +
                    '/assets - Check your crypto portfolio \n' +
                    '/asset [token] - Check specific token balance \n' +
                    // '/allwallets - View all wallets summary\n' +
                    // '/updateusername - Update wallet username\n' +
                    // '/deletewallet - Delete your wallet\n' +
                    'Current supported tokens: USDT, LSK, NGN \n\n' +
                    'Ask me any blockchain/crypto related questions as chat!\n' +
                    '\nPowered By: EmCLickzLabs'
                );
            } catch (error) {
                console.error('Error in start command:', error);
                await ctx.reply('An error occurred. Please try again later.');
            }
        });

        // Create wallet command
        this.onchainwiki.command('createwallet', async (ctx) => {
            try {
                const username = ctx.from.username || '';
                const user_id = ctx.from.id.toString();
                if (!user_id) {
                    return ctx.reply('Please set a Telegram username first!');
                }

                const existingWallet = await this.walletManager.getUserSummary(user_id);
                if (existingWallet) {
                    return ctx.reply(`${username} already has a wallet!\nAddress: ${existingWallet.address}`);
                }

                await ctx.reply('Creating wallet...');
                const wallet = await this.walletManager.createWallet(user_id.toString(), username);
                
                await ctx.reply(
                    '✅ Wallet created successfully!\n\n' +
                    `Address: ${(wallet as WalletData).address}\n` +
                    `Private Key: ${(wallet as WalletData).privateKey}\n\n` +
                    '⚠️ Please save your private key securely! It won\'t be shown again.'
                );
            } catch (error) {
                console.error('Error in wallet creation:', error);
                await ctx.reply('An error occurred while creating your wallet. Please try again later.');
            }
        });

        this.onchainwiki.command('importwallet', async (ctx) => {
            try {
                const userId = ctx.from?.id;
                const username = ctx.from?.username;
                
                if (!userId || !username) {
                    return ctx.reply('Please set a Telegram username first!');
                }
        
                const existingWallet = await this.walletManager.getUserSummary(username);
                if (existingWallet) {
                    return ctx.reply(`${username} You already have a wallet!\nAddress: ${existingWallet.address}`);
                }
        
                this.activeUserSessions.set(userId, {
                    state: 'AWAITING_PRIVATE_KEY',
                    data: {}
                });
        
                await ctx.reply(
                    '🔐 Please enter your private key.\n\n' +
                    '⚠️ Warning: Never share your private key with anyone!\n' +
                    'For security, delete your message containing the private key after import.',
                    // { reply_to_message_id: ctx.message.message_id as any }
                );
            } catch (error) {
                console.error('Error in import wallet command:', error);
                await ctx.reply('An error occurred. Please try again later.');
            }
        });

        this.onchainwiki.command('info', async (ctx) => {
            try {
                const user = ctx.from?.id.toString();
                if (!user) {
                    return ctx.reply('Please set a Telegram username first!');
                }

                const wallet = await this.walletManager.getUserSummary(user);
                if (!wallet) {
                    return ctx.reply('Please create a wallet first using /createwallet');
                }

                const balances = await this.contractManager.getBatchTokenBalances(wallet.address);
                const ethBalance = await this.contractManager.getEthBalance(wallet.address);
                
                const message = [
                    '💼 Wallet Information',
                    `\nUsername: ${wallet.username}`,
                    `Address: ${wallet.address}`,
                    `Created: ${wallet.createdAt}`,
                    '\nToken Balances:\n',
                    `ETH: ${ethBalance}`,
                    ...balances.balances.map((balance: any) => 
                        `${balance.symbol}: ${balance.balance}${
                            balance.valueUSD ? ` (≈ $${balance.valueUSD})` : ''
                        }`
                    ),
                    '\n',
                    `📊 Total Portfolio Value: $${balances.totalValueUSD}`,
                    `\n🕒 Last Viewed: ${new Date(balances.timestamp).toLocaleString()}`,
                    `\nPowered By: EmCLickzLabs`
                ].join('\n');

                await ctx.reply(message);
            } catch (error) {
                console.error('Error in info command:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                await ctx.reply(`Error retrieving wallet info: ${errorMessage}`);
            }
        });

        // Send tokens command
    this.onchainwiki.command('send', async (ctx) => {
        try {
            const username = ctx.from?.username || '';
            if (!username) {
                return ctx.reply('Please set a Telegram username first!');
            }

            const args = ctx.message.text.split(' ').slice(1);
            if (args.length !== 4 || args[2].toLowerCase() !== 'to') {
                return ctx.reply('Usage: /send <amount> <token> to <address>\nExample: /send 1.5 ETH to 0x123...\nSupported tokens: ETH, USDT, LSK');
            }

        const [amount, tokenSymbol, _, recipient] = args;
        const token = tokenSymbol.toUpperCase() as SupportedToken;

        const wallet: WalletData = await this.walletManager.getWallet(username);
        if (!wallet) {
            return ctx.reply('Please create a wallet first using /createwallet');
        }

        // Check if token is supported
        // if (token !== 'ETH' && !['USDT', 'LSK'].includes(token)) {
        //     return ctx.reply('Unsupported token. Currently supported tokens: ETH, USDT, LSK');
        // }

        const status = await ctx.reply('Processing transaction...');

        try {
            const result = await this.contractManager.transferToken(
                wallet,
                token,
                recipient,
                amount
            );

            await ctx.telegram.editMessageText(
                status.chat.id,
                status.message_id,
                undefined,
                `✅ Transaction successful!\n\n` +
                `Amount: ${amount} ${token}\n` +
                `To: ${recipient}\n` +
                `Tx Hash: ${result}\n\n` +
                `View transaction: https://blockscout.lisk.com/tx/${result}`
            );
        } catch (error) {
            let errorMessage = 'An error occurred while processing the transfer.';
            
            if (error instanceof Error) {
                if (error.message.includes('insufficient')) {
                    errorMessage = `Insufficient ${token} balance for this transfer.`;
                } else if (error.message.includes('gas')) {
                    errorMessage = 'Insufficient ETH for gas fees. Please ensure you have enough ETH to cover transaction fees.';
                }
            }

            await ctx.telegram.editMessageText(
                status.chat.id,
                status.message_id,
                undefined,
                `❌ Transaction failed!\n\nReason: ${errorMessage}`
            );
        }
    } catch (error) {
        console.error('Error in token transfer:', error);
        await ctx.reply('An error occurred while processing the transfer. Please try again later.');
        }
    });

        // Price command
        this.onchainwiki.command('price', async (ctx) => {
            try {
                const symbol = ctx.message.text.split(' ')[1]?.toLowerCase();
                if (!symbol) {
                    return ctx.reply('Usage: /price <symbol>\nUsage: /price lisk');
                }

                const status = await ctx.reply(`Fetching ${symbol} price...`);
                const price = await this.priceManager.getPrice(symbol);

                if (!price) {
                    await ctx.telegram.editMessageText(
                        status.chat.id,
                        status.message_id,
                        undefined,
                        `❌ Price not found for this ${symbol.toUpperCase()}`
                    );
                    return;
                }

                await ctx.telegram.editMessageText(
                    status.chat.id,
                    status.message_id,
                    undefined,
                    `💰 Current price of ${symbol.toUpperCase()}: $${price.toFixed(2)}`
                );
            } catch (error) {
                console.error('Error in price fetch:', error);
                await ctx.reply('An error occurred while fetching the price. Please try again later.');
            }
        });

        // Balance commands
        this.setupBalanceCommands();

        // Wallet management commands
        this.setupWalletManagementCommands();

        // AI commands
        this.setupAICommands();

        // setUp send command
    }

    private setupBalanceCommands() {
        // Check all assets balance
        this.onchainwiki.command('assets', async (ctx) => {
            try {
                const user = ctx.from?.id.toString();
                if (!user) {
                    return ctx.reply('Please set a Telegram username first!');
                }

                const wallet = await this.walletManager.getUserSummary(user);
                if (!wallet) {
                    return ctx.reply('Please create a wallet first using /createwallet');
                }

                const status = await ctx.reply('Fetching balance...');
                const balance = await this.contractManager.getBalance(wallet.address);

                await ctx.telegram.editMessageText(
                    status.chat.id,
                    status.message_id,
                    undefined,
                    `💼 ${ctx.from?.first_name} ${ctx.from?.last_name} Onchain Portfolio:\n\nASSETS: \nETH: ${balance.eth} \n${balance.tokens.join('\n')}\nPowered By: EmCLickzLabs`
                );
            } catch (error) {
                console.error('Error in balance check:', error);
                await ctx.reply('An error occurred while checking your balance. Please try again later.');
            } 
        });

        // Check token balance
        this.onchainwiki.command('asset', async (ctx) => {
            try {
                const user = ctx.from?.id.toString();
                if (!user) {
                    return ctx.reply('Please set a Telegram username first!');
                }

                const wallet = await this.walletManager.getUserSummary(user);
                if (!wallet) {
                    return ctx.reply('Please create a wallet first using /createwallet');
                }

                const args = ctx.message.text.split(' ').slice(1);
                const requestedTokens = args.map(arg => arg.toUpperCase());
                const status = await ctx.reply(`Fetching ${Array.from(requestedTokens.values()).join(', ')} token balances...`);

                const result = await this.contractManager.getBatchTokenBalances(
                    wallet.address,
                    requestedTokens.length ? requestedTokens as TEST_SupportedToken[] : undefined
                );

                const formattedBalances = this.formatBalanceResult(result);
                await ctx.telegram.editMessageText(
                    status.chat.id,
                    status.message_id,
                    undefined,
                    formattedBalances
                );
            } catch (error) {
                console.error('Error in asset balance check:', error);
                await ctx.reply('An error occurred while checking asset balances. Please try again later.');
            } 
            // finally {
            //     await this.walletManager.close();
            // }
        });

        // View all wallets
        this.onchainwiki.command('allwallets', async (ctx) => {
            try {
                const wallets = await this.walletManager.getWalletSummary();
                if (wallets.length === 0) {
                    await ctx.reply('No wallets found.');
                    return;
                }

                const allWallets = wallets.map((wallet: any) => 
                    `Username: ${wallet.username}\n` +
                    `Address: ${wallet.address}\n` +
                    `Created: ${wallet.createdAt}\n`
                ).join('\n' + '─'.repeat(30) + '\n');

                await ctx.reply(`All Wallets:\n\n${allWallets}` + `\nPowered By: EmCLickzLabs`);
            } catch (error) {
                console.error('Error in allwallets command:', error);
                await ctx.reply('Error fetching wallets. Please try again later.');
            }
            // finally {
            //     await this.walletManager.close();
            // }
        });
    }

    private setupWalletManagementCommands() {
        // Update username
        this.onchainwiki.command('updateusername', async (ctx) => {
            try {
                const userId = ctx.from?.id;
                if (!userId) return;
                
                this.activeUserSessions.set(userId, {
                    state: 'AWAITING_CURRENT_USERNAME',
                    data: {}
                });
                await ctx.reply('Please enter your current username:');
            } catch (error) {
                console.error('Error in updateusername command:', error);
                await ctx.reply('An error occurred. Please try again later.');
            }
            // finally {
            //     await this.walletManager.close();
            // }
        });

        // Delete wallet
        this.onchainwiki.command('deletewallet', async (ctx) => {
            try {
                const userId = ctx.from?.id;
                if (!userId) return;
                
                this.activeUserSessions.set(userId, {
                    state: 'AWAITING_USERNAME_FOR_DELETE',
                    data: {}
                });
                await ctx.reply('Please enter the username of the wallet you want to delete:');
            } catch (error) {
                console.error('Error in deletewallet command:', error);
                await ctx.reply('An error occurred. Please try again later.');
            }
            // finally {
            //     await this.walletManager.close();
            // }
        });
    }

    private setupAICommands() {
        // AI question command
        this.onchainwiki.command('ask', async (ctx) => {
            const question = ctx.message.text.split('/ask ')[1];
            if (!question) {
                return ctx.reply('Usage: /ask <your question>');
            }
            return this.samuraiAI.handleQuestion(ctx);
        });
    }

    private setupMessageHandlers() {
        this.onchainwiki.on(message('text'), async (ctx) => {
            try {
                const userId = ctx.from?.id;
                if (!userId) return;

                const userSession = this.activeUserSessions.get(userId);
                const text = ctx.message.text;

                // If no active session and not a command, treat as AI question
                if (!userSession && !text.startsWith('/')) {
                    return this.samuraiAI.handleQuestion(ctx);
                }

                if (!userSession) {
                    return;
                }

                switch (userSession.state) {
                    // case 'AWAITING_CURRENT_USERNAME':
                    //     userSession.data.currentUsername = text;
                    //     userSession.state = 'AWAITING_NEW_USERNAME';
                    //     await ctx.reply('Please enter your new username:');
                    //     break;

                    // case 'AWAITING_NEW_USERNAME':
                    //     await this.handleUsernameUpdate(ctx, userSession);
                    //     break;

                    case 'AWAITING_USERNAME_FOR_DELETE':
                        await this.handleWalletDeletion(ctx, userSession);
                        break;
                    
                        case 'AWAITING_PRIVATE_KEY':
                        await this.handlePrivateKeyImport(ctx, text);
                        break;
                    
                    case 'CHOOSING_ADDRESS':
                        await this.handleAddressChoice(ctx, text, userSession);
                        break;

                    default:
                        await ctx.reply('Please use one of the available commands:\n/start');
                }
            } catch (error) {
                console.error('Error in message handler:', error);
                await ctx.reply('An error occurred. Please try again later.');
            }
            // finally {
            //     await this.walletManager.close();
            // }
        });
    }

    // private async handleUsernameUpdate(ctx: Context, session: any) {
    //     try {
    //         const newUsername = (ctx.message as any).text;
    //         await this.walletManager.updateWalletUsername(
    //             session.data.currentUsername,
    //             newUsername
    //         );

    //         await ctx.reply(
    //             '✅ Username updated successfully!\n\n' +
    //             `New username: ${newUsername}` +
    //             `\nPowered By: EmCLickzLabs`
    //         );
            
    //         if (ctx.from) {
    //             this.activeUserSessions.delete(ctx.from.id);
    //         }
    //     } catch (error) {
    //         console.error('Error in username update:', error);
    //         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    //         await ctx.reply(`Error updating username: ${errorMessage}`);
    //     }
        // finally {
        //     await this.walletManager.close();
        // }
    // }

    private async handleWalletDeletion(ctx: Context, session: any) {
        try {
            const username = ctx.from?.username;
            if (!username) {
                await ctx.reply('Please set a Telegram username first!');
                return;
            }

            // await this.walletManager.deleteWallet(username);
            await ctx.reply('✅ Wallet deleted successfully! \n`\nPowered By: EmCLickzLabs`');
            
            if (ctx.from) {
                this.activeUserSessions.delete(ctx.from.id);
            }
        } catch (error) {
            console.error('Error in wallet deletion:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await ctx.reply(`Error deleting wallet: ${errorMessage}`);
        }
        // finally {
        //     await this.walletManager.close();
        // }
    }

    private async handlePrivateKeyImport(ctx: Context, privateKey: string) {
        try {
            const user_id = ctx.from?.id || null;
            const username = ctx.from?.username;
            
            if (!user_id || !username) {
                return ctx.reply('Please set a Telegram username first!');
            }
    
            // Delete the message containing the private key for security
            await ctx.deleteMessage();
    
            const statusMsg = await ctx.reply('Importing wallet...');
    
            try {
                // Validate private key format
                if (!privateKey.match(/^[0-9a-fA-F]{64}$/)) {
                    throw new Error('Invalid private key format');
                }
    
                // Get all addresses associated with the private key
                const addresses = await this.walletManager.getAddressesFromPrivateKey(privateKey);
    
                if (addresses.length === 1) {
                    // If only one address, import it directly
                    await this.importWalletWithAddress(ctx, username, user_id.toString(), privateKey, addresses[0]);
                } else {
                    // If multiple addresses, let user choose
                    this.activeUserSessions.set(user_id, {
                        state: 'CHOOSING_ADDRESS',
                        data: {
                            privateKey,
                            addresses
                        }
                    });
    
                    const addressList = addresses.map((addr, i) => 
                        `${i + 1}. ${addr}`
                    ).join('\n');
    
                    await ctx.telegram.editMessageText(
                        statusMsg.chat.id,
                        statusMsg.message_id,
                        undefined,
                        'Multiple addresses found for this private key. Please choose one by entering its number:\n\n' +
                        addressList
                    );
                }
            } catch (error) {
                throw new Error('Invalid private key');
            }
        } catch (error) {
            console.error('Error in private key import:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await ctx.reply(`Error importing wallet: ${errorMessage}`);
            
            if (ctx.from) {
                this.activeUserSessions.delete(ctx.from.id);
            }
        }
    }

    private async handleAddressChoice(ctx: Context, choice: string, session: any) {
        try {
            const userId = ctx.from?.id;
            const username = ctx.from?.username;
            
            if (!userId || !username) {
                return ctx.reply('Please set a Telegram username first!');
            }
    
            const index = parseInt(choice) - 1;
            if (isNaN(index) || index < 0 || index >= session.data.addresses.length) {
                return ctx.reply('Invalid choice. Please select a valid number from the list.');
            }
    
            const selectedAddress = session.data.addresses[index];
            await this.importWalletWithAddress(ctx, username, userId.toString(), session.data.privateKey, selectedAddress);
            
        } catch (error) {
            console.error('Error in address choice:', error);
            await ctx.reply('An error occurred while selecting the address. Please try again.');
        } finally {
            if (ctx.from) {
                this.activeUserSessions.delete(ctx.from.id);
            }
        }
    }

    private formatBalanceResult(result: any): string {
        const formattedBalances = result.balances.map((balance: any) => {
            if (balance.error) {
                return `${balance.symbol}: Error - ${balance.error}`;
            }
            return `${balance.symbol}: ${balance.balance}${
                balance.valueUSD ? ` (≈ $${balance.valueUSD})` : ''
            }`;
        });

        return [
            '💰 Assets',
            `\nWallet: ${result.address.slice(0, 6)}...${result.address.slice(-4)}`,
            '\n',
            ...formattedBalances,
            '\n',
            `Total Value: $${result.totalValueUSD}`,
            `\nTimestamp: ${new Date(result.timestamp).toLocaleString()}`,
            `\nPowered By: EmCLickzLabs`
        ].join('\n');
    }
    private async importWalletWithAddress(
        ctx: Context, 
        username: string,
        user_id: string,
        privateKey: string, 
        address: string
    ) {
        const wallet = await this.walletManager.importExisitingWallet(username, user_id, privateKey, address);
        
        await ctx.reply(
            '✅ Wallet imported successfully!\n\n' +
            `Address: ${wallet.address}\n\n` +
            '⚠️ Please make sure you have saved your private key securely!' +
            `\nPowered By: EmCLickzLabs`
        );
    }

    public async start() {
        try {
            // Test connection before starting
            await this.onchainwiki.telegram.getMe();
            console.log('Successfully connected to Telegram API');
            
            // Connect to MongoDB through WalletManager
            await this.walletManager.connect();
            console.log('Successfully connected to MongoDB');           
            // Start the onchainwiki
            console.log('Starting OnchainWiki...');
            await this.onchainwiki.launch();
            console.log('OnchainWiki started successfully');
            
            
            // Enable graceful stop
            process.once('SIGINT', () => this.stop());
            process.once('SIGTERM', () => this.stop());
        } catch (error) {
            console.error('Failed to start onchainwiki:', error);
            throw error;
        }
    }

    public async stop() {
        try {
            // Stop the onchainwiki
            this.onchainwiki.stop('stopping OnchainWiki...');
            
            // Close all manager connections
            await this.walletManager.close();
            
            console.log('OnchainWiki stopped successfully');
        } catch (error) {
            console.error('Error during shutdown:', error);
            throw error;
        }
    }
}