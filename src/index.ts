import express from 'express';
import { OnchainWiki } from './onchainWiki';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());


const startBot = async () => {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN2;
    const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;
    const WEBHOOK_PATH = `/webhook/${BOT_TOKEN}`;
    
    if (!BOT_TOKEN) {
        throw new Error('TELEGRAM_BOT_TOKEN2 must be provided in environment variables!');
    }
    if (!WEBHOOK_DOMAIN) {
        throw new Error('WEBHOOK_DOMAIN must be provided in environment variables!');
    }

    try {
        const bot = new OnchainWiki(BOT_TOKEN);
        
        // Set up the webhook endpoint
        app.post(WEBHOOK_PATH, async (req, res) => {
            try {
                // Forward the update to the bot instance
                await bot.handleUpdate(req.body);
                res.sendStatus(200);
            } catch (error) {
                console.error('Error handling update:', error);
                res.sendStatus(500);
            }
        });

        // Set the webhook URL in Telegram
        const webhookUrl = `${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
        await bot.setWebhook(webhookUrl);
        console.log(`Webhook set to: ${webhookUrl}`);
        
        // Basic health check endpoint
        app.get('/', (req, res) => {
            res.send('OnchainSamurai Bot is running!');
        });

        // Webhook info endpoint for debugging
        app.get('/webhook-info', async (req, res) => {
            try {
                const info = await bot.getWebhookInfo();
                res.json(info);
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

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

// Start both the Express server and the bot
const main = async () => {
    try {
        // Start the Express server first
        app.listen(port,() => {
            console.log(`Express server listening on port ${port}`);
        });

        // Then set up the bot with webhook
        const bot = await startBot();

    } catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
};

// Start the application
main().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received.');
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received.');
    process.exit(0);
});