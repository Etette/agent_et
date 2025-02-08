// import { Telegraf, Context } from 'telegraf';
// import { message } from 'telegraf/filters';
// // import { WalletManager } from './lib/WalletManager';
// import { PriceManager } from './lib/PriceManager';
// import { ContractManager } from './lib/ContractManager';
// import { AIAgent } from './lib/agentEt/AgentManager';
// import { WalletManager2 } from './lib/samuraiW3/Wallet_Manager';
// import { WalletData, SupportedToken } from './lib/utils/types';
// import dotenv from 'dotenv';
// import express from 'express';

// dotenv.config();

// // Initialize bot and managers
// const web3Sumarai = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
// // const walletManager = new WalletManager();
// const walletManager = new WalletManager2();
// const priceManager = new PriceManager();
// const contractManager = new ContractManager();
// const aiAgent = new AIAgent();

// // Create Express app
// const app = express();
// app.use(express.json());

// // Webhook settings
// const WEBHOOK_DOMAIN = process.env.WEBHOOK_URL || '';
// const PORT = process.env.PORT || 80;
// const WEBHOOK_PATH = `/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;

// // State management for WalletBot
// const activeUserSessions = new Map<number, { state: string; data: any }>();

// // Start command (Combined)
// web3Sumarai.start(async (ctx) => await ctx.reply(
//     'Welcome to Web3Sumarai! 🚀\n\n' +
//     'This bot allows you to create Ethereum wallets, send tokens, check balances, get token prices, and learn about blockchain!\n\n' +
//     'Available commands:\n' +
//     '/createwallet - Create a new Ethereum wallet\n' +
//     '/send <amount> <token> to <address> - Send tokens\n' +
//     '/price <symbol> - Get token price\n' +
//     '/balance - Check your ETH wallet balance\n' +
//     '/address - Get your wallet address\n' +
//     '/ask <question> - Ask anything about blockchain/crypto\n' +
//     '/tokenbalance [tokens] - Check specific token balances\n' +
//     '/allbalances - View complete wallet summary\n' +
//     '/mywallet - View your wallet info\n' +
//     '/allwallets - View all wallets summary\n' +
//     '/updateusername - Update wallet username\n' +
//     '/deletewallet - Delete your wallet\n\n' +
//     'Powered by EmCLickzLabs'
// ));

// // Create wallet command (Combined)
// web3Sumarai.command('createwallet', async (ctx) => {
//     try {
//         const userId = ctx.from.id;
//         const username = ctx.from?.username || '';

//         if (!username) {
//             return ctx.reply('Please set a Telegram username first!');
//         }

//         const existingWallet = await walletManager.getUserSummary(username);
//         if (!existingWallet) {
//             await ctx.reply('Creating wallet...');
//             const wallet = await walletManager.createWallet(username);
//             if (wallet) {
//                 return await ctx.reply(
//                     `✅ Wallet created successfully!\n\n` +
//                     `Address: ${(wallet as WalletData).address}\n\n` +
//                     `⚠️ Your private key is ${(wallet as WalletData).privateKey}. \n\n Never share it with anyone!`
//                 );
//             }
//         }
//         return ctx.reply(`${username} already has a wallet!\nAddress: ${(existingWallet as WalletData).address}`);
//     } catch (error) {
//         console.error('Wallet creation error:', error);
//         await ctx.reply('Sorry, there was an error creating your wallet. Please try again later.');
//     }
// });

// // Send tokens command (From first bot)
// web3Sumarai.command('send', async (ctx) => {
//     try {
//         const username = ctx.from.username || '';
//         if (!username) {
//             return ctx.reply('Please set a Telegram username first!');
//         }

//         const args = ctx.message.text.split(' ').slice(1);
//         if (args.length !== 4 || args[2].toLowerCase() !== 'to') {
//             return ctx.reply('Usage: /send <amount> <token> to <address>');
//         }

//         const [amount, token, _, recipient] = args;
//         const wallet: WalletData = await walletManager.getWallet(username);

//         if (!wallet) {
//             return ctx.reply('Please create a wallet first using /createwallet');
//         }

//         const status = await ctx.reply('Processing transaction...');
//         const result = await contractManager.transferTokens(
//             wallet,
//             token,
//             recipient,
//             amount
//         );

//         await ctx.telegram.editMessageText(
//             status.chat.id,
//             status.message_id,
//             undefined,
//             `✅ Transaction successful!\n\nTx Hash: ${await result.hash}`
//         );
//     } catch (error) {
//         console.error('Transfer error:', error);
//         await ctx.reply('Sorry, there was an error processing your transfer. Please try again later.');
//     }
// });

// // Get price command (From first bot)
// web3Sumarai.command('price', async (ctx) => {
//     try {
//         const symbol = ctx.message.text.split(' ')[1]?.toLowerCase();
//         if (!symbol) {
//             return ctx.reply('Usage: /price <symbol>\nExample: /price ethereum');
//         }

//         const status = await ctx.reply(`Fetching ${symbol} price...`);
//         const price = await priceManager.getPrice(symbol);

//         if (!price) {
//             await ctx.telegram.editMessageText(
//                 status.chat.id,
//                 status.message_id,
//                 undefined,
//                 `❌ Price not found for ${symbol} token at the moment. \n  Please try again later.`
//             );
//             return;
//         }

//         await ctx.telegram.editMessageText(
//             status.chat.id,
//             status.message_id,
//             undefined,
//             `💰 Current price of ${symbol.toUpperCase()}: $${price.toFixed(2)}`
//         );
//     } catch (error) {
//         console.error('Price fetch error:', error);
//         await ctx.reply('Sorry, there was an error fetching the price. Please try again later.');
//     }
// });

// // View wallet command (From second bot)
// web3Sumarai.command('mywallet', async (ctx) => {
//     try {
//         const username = ctx.from.username || '';
//         if (!username) {
//             return ctx.reply('Please set a Telegram username first!');
//         }

//         const wallet = await walletManager.getUserSummary(username);
//         if (!wallet) {
//             return ctx.reply(`Wallet not found for ${username}. \n Please create one using /createwallet`);
//         }

//         await ctx.reply(
//             'Wallet Details:\n\n' +
//             `Username: ${wallet.username}\n` +
//             `Address: ${wallet.address}\n` +
//             `Created: ${wallet.createdAt}`
//         );
//     } catch (error) {
//         console.error('Error in wallet view:', error);
//         await ctx.reply('An error occurred. Please try again later.');
//     }
// });

// // View all wallets command (From second bot)
// web3Sumarai.command('allwallets', async (ctx) => {
//     try {
//         const wallets: any = await walletManager.getWalletSummary();
//         if (wallets.length === 0) {
//             await ctx.reply('No wallets found.');
//             return;
//         }

//         const allWallets = wallets.map((wallet: WalletData) =>
//             `Username: ${wallet.username}\n` +
//             `Address: ${wallet.address}\n` +
//             `Created: ${wallet.createdAt}\n`
//         ).join('\n' + '─'.repeat(30) + '\n');

//         await ctx.reply(`All Wallets:\n\n${allWallets}`);
//     } catch (error) {
//         console.error('Error in allwallets command:', error);
//         await ctx.reply('Error fetching wallets. Please try again later.');
//     }
// });

// // Update username command (From second bot)
// web3Sumarai.command('updateusername', async (ctx) => {
//     try {
//         const userId = ctx.from.id;
//         activeUserSessions.set(userId, {
//             state: 'AWAITING_CURRENT_USERNAME',
//             data: {}
//         });
//         await ctx.reply('Please enter your current username:');
//     } catch (error) {
//         console.error('Error in updateusername command:', error);
//         await ctx.reply('An error occurred. Please try again later.');
//     }
// });

// // Delete wallet command (From second bot)
// web3Sumarai.command('deletewallet', async (ctx) => {
//     try {
//         const userId = ctx.from.id;
//         activeUserSessions.set(userId, {
//             state: 'AWAITING_COMFIRMATION_FOR_DELETE',
//             data: {}
//         });
//         await ctx.reply('Please enter your username to confirm wallet delete:');
//     } catch (error) {
//         console.error('Error in deletewallet command:', error);
//         await ctx.reply('An error occurred. Please try again later.');
//     }
// });

// // Handle regular messages as AI questions (From first bot)
// web3Sumarai.on(message('text'), async (ctx) => {
//     const username = ctx.from.username || '';
//     const text = ctx.message.text;

//     // Ignore commands
//     if (text.startsWith('/')) {
//         return;
//     }
//     if (username) {
//         return aiAgent.handleQuestion(ctx);
//     }
//     return ctx.reply('Please set a Telegram username first!');
// });

// // Handle errors
// web3Sumarai.catch((err: any, ctx: Context) => {
//     console.error(`Error for ${ctx.updateType}:`, err);
// });

// // Set webhook instead of using polling
// async function setupWebhook() {
//     try {
//         // Set the webhook
//         const webhookUrl = `${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
//         await web3Sumarai.telegram.setWebhook(webhookUrl);
//         console.log(`Webhook set to: ${webhookUrl}`);

//         // Set up the webhook endpoint
//         app.post(WEBHOOK_PATH, (req, res) => {
//             web3Sumarai.handleUpdate(req.body, res);
//         });

//         // Optional health check endpoint
//         app.get('/health', (req, res) => {
//             res.send('Bot is running!');
//         });

//         // Start the server
//         app.listen(PORT, () => {
//             console.log(`Server is running on port ${PORT}`);
//         });
//     } catch (error) {
//         console.error('Error setting webhook:', error);
//         process.exit(1);
//     }
// }

// // Start the webhook server
// setupWebhook().catch(console.error);

// // Enable graceful stop
// process.once('SIGINT', async () => {
//     await web3Sumarai.telegram.deleteWebhook();
//     process.exit(0);
// });
// process.once('SIGTERM', async () => {
//     await web3Sumarai.telegram.deleteWebhook();
//     process.exit(0);
// });