import express from 'express';
import { OnchainWiki } from './onchainWiki';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

let bot: OnchainWiki | null = null;

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(
    operation: () => Promise<T>,
    retryCount = 0
): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        if (retryCount >= RETRY_CONFIG.maxRetries) {
            throw error;
        }

        // Only retry on timeout or network-related errors
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.type === 'system') {
            const delay = Math.min(
                RETRY_CONFIG.initialDelay * Math.pow(2, retryCount),
                RETRY_CONFIG.maxDelay
            );

            console.log(`Retry attempt ${retryCount + 1} after ${delay}ms`);
            await sleep(delay);
            return withRetry(operation, retryCount + 1);
        }

        throw error;
    }
};

const startBot = async () => {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN2;
    
    if (!BOT_TOKEN) {
        throw new Error('TELEGRAM_BOT_TOKEN must be provided in environment variables!');
    }

    try {
        // Initialize bot
        bot = new OnchainWiki(BOT_TOKEN);

        // Start the bot with retry logic
        await withRetry(async () => {
            if (bot) {
                await bot.start();
            } else {
                throw new Error('Bot is not initialized');
            }
            console.log('Bot started successfully in polling mode');
        });

        // Basic health check endpoint
        app.get('/', (req, res) => {
            res.send('OnchainWiki Bot is running!');
        });

        // Bot info endpoint
        app.get('/bot-info', async (req, res) => {
            try {
                res.json({
                    status: 'running',
                    mode: 'polling',
                    retryConfig: RETRY_CONFIG
                });
            } catch (error) {
                res.status(500).json({ error: (error as Error).message });
            }
        });

        return bot;
    } catch (error) {
        console.error('Fatal error starting bot:', error);
        throw error;
    }
};

// Enhanced error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack,
        code: (error as any).code,
        type: (error as any).type
    });
});

process.on('unhandledRejection', (error: any) => {
    console.error('Unhandled Rejection:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        type: error.type
    });
});

// Start the application
const main = async () => {
    try {
        // Start the Express server
        app.listen(port, () => {
            console.log(`Express server listening on port ${port}`);
        });

        // Start the bot with retry logic
        await startBot();
        
        console.log('Application started successfully');

    } catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
};

main().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});

// Graceful shutdown handler
const shutdown = async (signal: string) => {
    console.log(`${signal} signal received.`);
    try {
        if (bot) {
            if (typeof bot.stop === 'function') {
                await withRetry(async () => {
                    if (bot) {
                        await bot.stop();
                    }
                    console.log('Bot stopped gracefully');
                });
            }
        }
        console.log('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));