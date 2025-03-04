# OnchainWiki 🤖

A Telegram bot that combines wallet management, cryptocurrency price tracking and an AI-powered blockchain education assistant.

## Features

- **Wallet Management**
  - Create Ethereum wallets from telegram ID
  - Receive crypto assets
  - Check balances
  - Send tokens and NFTs
  - View wallet portfolio

- **Price Tracking**
  - Get real-time cryptocurrency prices
  - Support for multiple tokens

- **OnchainWiki Education Assistant**
  - Blockchain and cryptocurrency explanations
  - Technical guidance for developers
  - Web3 resources for begineers and experts
  - DeFi concepts and protocols
  - Onchain Security best practices
  - Learning resources
  - And more...

## Commands

- `/start` - Welcome message and command list
- `/createwallet` - Create user Ethereum wallet
- `/send <amount> <token>  <to address>` - Send tokens
- `/price <name>` - Get token price from name of token
- `/balance` - Check your wallet balance
- `/address` - Get your wallet address
- `/ask <question>` - Ask OnchainWiki about blockchain.
- Direct messages are also handled by OnchainWiki

## Setup

1. Install dependencies:
```bash
npm install telegraf @google/generative-ai dotenv
```

2. Create a `.env` file:
```
TELEGRAM_BOT_TOKEN=your_telegram_token
MODEL_API_KEY=your_model_api_key
```

3. Run the bot:
```bash
npm start
```

## Environment Variables

- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token from BotFather
- `MODEL_API_KEY` - Your preffered model API key

## Tech Stack

- TypeScript
- Telegraf.js
- Google Gemini AI
- Hardhat


## Created By

EmClickzLabs