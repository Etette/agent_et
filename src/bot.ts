// import { Telegraf, Context } from 'telegraf';
// import { message } from 'telegraf/filters';
// import { WalletManager } from './lib/WalletManager';
// import { PriceManager } from './lib/PriceManager';
// import { ContractManager } from './lib/ContractManager';
// import dotenv from 'dotenv';
// dotenv.config();

// const web3Sumaria = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
// const walletManager = new WalletManager();
// const priceManager = new PriceManager();
// const contractManager = new ContractManager();

// // Start command
// web3Sumaria.start(async (ctx) => await ctx.reply(
//     'Welcome to Web3Sumarai! 🚀\n\n' +
//     'This bot allows you to create Ethereum wallets, send tokens, check balances, and get token prices.\n\n' +
//     'Available commands:\n' +
//     '/createwallet - Create a new etherum wallet\n' +
//     '/send <amount> <token> <to address> - Send tokens\n' +
//     '/price <name> - Get token price\n' +
//     '/balance - Check your wallet balance' +
//     '/addresss - Get your wallet address' +
//     '\n\nPowered by EmCLickzLabs'
//   )
// );


// // Create wallet command
// web3Sumaria.command('createwallet', async (ctx) => {
//   try {
//     const username = ctx.message.from.username;
//     if (!username) {
//       return ctx.reply('Please set a Telegram username first!');
//     }

//     const existingWallet = await walletManager.getUserSummary(username);
//     if (!existingWallet) {
//       await ctx.reply('Creating wallet...');
//       const wallet = await walletManager.createWallet(username);
//       return await ctx.reply(
//       `✅ Wallet created successfully!\n\n` +
//       `Address: ${wallet.address}\n\n` +
//       `⚠️ Your private key is ${wallet.privateKey}. \n\n Never share it with anyone!`
//       );
//     }
//     return ctx.reply(`${username} already have a wallet!\nAddress: ${existingWallet.address}`);
//   } catch (error) {
//     console.error('Wallet creation error:', error);
//     await ctx.reply('Sorry, there was an error creating your wallet. Please try again later.');
//   }
// });

// // Send tokens command
// web3Sumaria.command('send', async (ctx) => {
//   try {
//     const username = ctx.message.from.username;
//     if (!username) {
//       return ctx.reply('Please set a Telegram username first!');
//     }

//     const args = ctx.message.text.split(' ').slice(1);
//     if (args.length !== 4 || args[2].toLowerCase() !== 'to') {
//       return ctx.reply('Usage: /send <amount> <token> to <address>');
//     }

//     const [amount, token, _, recipient] = args;
//     const wallet = await walletManager.getWallet(username);
    
//     if (!wallet) {
//       return ctx.reply('Please create a wallet first using /createwallet');
//     }

//     const status = await ctx.reply('Processing transaction...');
//     const result = await contractManager.transferTokens(
//       wallet,
//       token,
//       recipient,
//       amount
//     );

//     await ctx.telegram.editMessageText(
//       status.chat.id,
//       status.message_id,
//       undefined,
//       `✅ Transaction successful!\n\nTx Hash: ${await result.hash}`
//     );
//   } catch (error) {
//     console.error('Transfer error:', error);
//     await ctx.reply('Sorry, there was an error processing your transfer. Please try again later.');
//   }
// });

// // Get price command
// web3Sumaria.command('price', async (ctx) => {
//   try {
//     const symbol = ctx.message.text.split(' ')[1]?.toLowerCase();
//     if (!symbol) {
//       return ctx.reply('Usage: /price <symbol>\nExample: /price ethereum');
//     }

//     const status = await ctx.reply(`Fetching ${symbol} price...`);
//     const price = await priceManager.getPrice(symbol);

//     if (!price) {
//       await ctx.telegram.editMessageText(
//         status.chat.id,
//         status.message_id,
//         undefined,
//         '❌ Price not found for this token'
//       );
//       return;
//     }

//     await ctx.telegram.editMessageText(
//       status.chat.id,
//       status.message_id,
//       undefined,
//       `💰 Current price of ${symbol.toUpperCase()}: $${price.toFixed(2)}`
//     );
//   } catch (error) {
//     console.error('Price fetch error:', error);
//     await ctx.reply('Sorry, there was an error fetching the price. Please try again later.');
//   }
// });

// web3Sumaria.command('address', async (ctx) => {
//   try {
//     const username = ctx.message.from.username;
//     if (!username) {
//       return ctx.reply('Please set a Telegram username first!');
//     }

//     const wallet = await walletManager.getWallet(username);
//     if (!wallet) {
//       return ctx.reply('Please create a wallet first using /createwallet');
//     }   
//     const status = await ctx.reply('Getting your Address...');
//     const address = wallet.address;

//     await ctx.telegram.editMessageText(
//       status.chat.id,
//       status.message_id,
//       undefined,
//       `💼 Wallet Address:\n\n: ${address}`
//     );
//   } catch (error) {
//     console.error('Address fetch error:', error);
//     await ctx.reply('Sorry, there was an error fetching your address. Please try again later.');
//   }
// });

// // Check balance command
// // todo: add support for multiple tokens - USDT, ETH, LISK, etc.
// web3Sumaria.command('balance', async (ctx) => {
//   try {
//     const username = ctx.message.from.username;
//     if (!username) {
//       return ctx.reply('Please set a Telegram username first!');
//     }

//     const wallet = await walletManager.getWallet(username);
//     if (!wallet) {
//       return ctx.reply('Please create a wallet first using /createwallet');
//     }

//     const status = await ctx.reply('Fetching balance...');
//     const balance = await contractManager.getBalance(wallet.address);

//     await ctx.telegram.editMessageText(
//       status.chat.id,
//       status.message_id,
//       undefined,
//       `💼 Wallet Balance:\n\nETH: ${balance.eth}\nTokens: ${balance.tokens.join('\n')}`
//     );
//   } catch (error) {
//     console.error('Balance check error:', error);
//     await ctx.reply('Sorry, there was an error checking your balance. Please try again later.');
//   }
// });

// // Handle errors
// web3Sumaria.catch((err: any, ctx: Context) => {
//   console.error(`Error for ${ctx.updateType}:`, err);
// });

// // Start web3Sumaria
// web3Sumaria.launch().then(() => {
//   console.log('web3Sumaria is running...');
// });

// // Enable graceful stop
// process.once('SIGINT', () => web3Sumaria.stop('SIGINT'));
// process.once('SIGTERM', () => web3Sumaria.stop('SIGTERM'));


import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { WalletManager } from './lib/WalletManager';
import { PriceManager } from './lib/PriceManager';
import { ContractManager } from './lib/ContractManager';
import { AIAgent } from '../src/lib/AgentManager';
import dotenv from 'dotenv';
dotenv.config();

// Initialize bot and managers
const web3Sumaria = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const walletManager = new WalletManager();
const priceManager = new PriceManager();
const contractManager = new ContractManager();
const aiAgent = new AIAgent();

// Start command
web3Sumaria.start(async (ctx) => await ctx.reply(
    'Welcome to Web3Sumarai! 🚀\n\n' +
    'This bot allows you to create Ethereum wallets, send tokens, check balances, get token prices, and learn about blockchain!\n\n' +
    'Available commands:\n' +
    '/createwallet - Create a new ethereum wallet\n' +
    '/send <amount> <token> <to address> - Send tokens\n' +
    '/price <name> - Get token price\n' +
    '/balance - Check your wallet balance\n' +
    '/address - Get your wallet address\n' +
    '/ask <question> - Ask anything about blockchain/crypto\n\n' +
    'You can also just type your blockchain/crypto questions directly!\n\n' +
    'Powered by EmCLickzLabs'
));

// Create wallet command
web3Sumaria.command('createwallet', async (ctx) => {
  try {
    const username = ctx.message.from.username;
    if (!username) {
      return ctx.reply('Please set a Telegram username first!');
    }

    const existingWallet = await walletManager.getUserSummary(username);
    if (!existingWallet) {
      await ctx.reply('Creating wallet...');
      const wallet = await walletManager.createWallet(username);
      return await ctx.reply(
        `✅ Wallet created successfully!\n\n` +
        `Address: ${wallet.address}\n\n` +
        `⚠️ Your private key is ${wallet.privateKey}. \n\n Never share it with anyone!`
      );
    }
    return ctx.reply(`${username} already has a wallet!\nAddress: ${existingWallet.address}`);
  } catch (error) {
    console.error('Wallet creation error:', error);
    await ctx.reply('Sorry, there was an error creating your wallet. Please try again later.');
  }
});

// Send tokens command
web3Sumaria.command('send', async (ctx) => {
  try {
    const username = ctx.message.from.username;
    if (!username) {
      return ctx.reply('Please set a Telegram username first!');
    }

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length !== 4 || args[2].toLowerCase() !== 'to') {
      return ctx.reply('Usage: /send <amount> <token> to <address>');
    }

    const [amount, token, _, recipient] = args;
    const wallet = await walletManager.getWallet(username);
    
    if (!wallet) {
      return ctx.reply('Please create a wallet first using /createwallet');
    }

    const status = await ctx.reply('Processing transaction...');
    const result = await contractManager.transferTokens(
      wallet,
      token,
      recipient,
      amount
    );

    await ctx.telegram.editMessageText(
      status.chat.id,
      status.message_id,
      undefined,
      `✅ Transaction successful!\n\nTx Hash: ${await result.hash}`
    );
  } catch (error) {
    console.error('Transfer error:', error);
    await ctx.reply('Sorry, there was an error processing your transfer. Please try again later.');
  }
});

// Get price command
web3Sumaria.command('price', async (ctx) => {
  try {
    const symbol = ctx.message.text.split(' ')[1]?.toLowerCase();
    if (!symbol) {
      return ctx.reply('Usage: /price <symbol>\nExample: /price ethereum');
    }

    const status = await ctx.reply(`Fetching ${symbol} price...`);
    const price = await priceManager.getPrice(symbol);

    if (!price) {
      await ctx.telegram.editMessageText(
        status.chat.id,
        status.message_id,
        undefined,
        '❌ Price not found for this token'
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
    console.error('Price fetch error:', error);
    await ctx.reply('Sorry, there was an error fetching the price. Please try again later.');
  }
});

// Get address command
web3Sumaria.command('address', async (ctx) => {
  try {
    const username = ctx.message.from.username;
    if (!username) {
      return ctx.reply('Please set a Telegram username first!');
    }

    const wallet = await walletManager.getWallet(username);
    if (!wallet) {
      return ctx.reply('Please create a wallet first using /createwallet');
    }   
    const status = await ctx.reply('Getting your Address...');
    const address = wallet.address;

    await ctx.telegram.editMessageText(
      status.chat.id,
      status.message_id,
      undefined,
      `💼 Wallet Address:\n\n${address}`
    );
  } catch (error) {
    console.error('Address fetch error:', error);
    await ctx.reply('Sorry, there was an error fetching your address. Please try again later.');
  }
});

// Check balance command
web3Sumaria.command('balance', async (ctx) => {
  try {
    const username = ctx.message.from.username;
    if (!username) {
      return ctx.reply('Please set a Telegram username first!');
    }

    const wallet = await walletManager.getWallet(username);
    if (!wallet) {
      return ctx.reply('Please create a wallet first using /createwallet');
    }

    const status = await ctx.reply('Fetching balance...');
    const balance = await contractManager.getBalance(wallet.address);

    await ctx.telegram.editMessageText(
      status.chat.id,
      status.message_id,
      undefined,
      `💼 Wallet Balance:\n\nETH: ${balance.eth}\nTokens: ${balance.tokens.join('\n')}`
    );
  } catch (error) {
    console.error('Balance check error:', error);
    await ctx.reply('Sorry, there was an error checking your balance. Please try again later.');
  }
});

// AI question command
web3Sumaria.command('ask', async (ctx) => {
  const question = ctx.message.text.split('/ask ')[1];
  if (!question) {
    return ctx.reply('Usage: /ask <your question>');
  }
  return aiAgent.handleQuestion(ctx);
});

// Handle regular messages as AI questions
web3Sumaria.on(message('text'), async (ctx) => {
  const username = ctx.message.from.username;
  const text = ctx.message.text;
  
  // Ignore commands
  if (text.startsWith('/')) {
    return;
  }
  
  return aiAgent.handleQuestion(ctx);
});

// Handle errors
web3Sumaria.catch((err: any, ctx: Context) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Start bot
web3Sumaria.launch().then(() => {
  console.log('Web3Sumaria is running...');
})

// Enable graceful stop
process.once('SIGINT', () => web3Sumaria.stop('SIGINT'));
process.once('SIGTERM', () => web3Sumaria.stop('SIGTERM'));