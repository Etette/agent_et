import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { Telegraf } from 'telegraf';
import { Web3SumuraiBotController } from './controllers/BotController';
import dotenv from 'dotenv';

dotenv.config();

export class Server {
  private app: express.Application;
  private web3Sumurai: Telegraf;
  private web3SumuraiBotController: Web3SumuraiBotController;

  constructor() {
    this.app = express();
    this.web3Sumurai = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
    this.web3SumuraiBotController = new Web3SumuraiBotController(this.web3Sumurai);
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(helmet());
    this.app.use(morgan('dev'));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        botStatus: 'running...'
      });
    });

    // Setup webhook - single endpoint using secretPath
    const secretPath = `/webhook/${this.web3Sumurai.secretPathComponent()}`;
    
    // Use webhookCallback for this path
    this.app.use(secretPath, this.web3Sumurai.webhookCallback());
  }

  public async start(): Promise<void> {
    try {
      const port = process.env.PORT || 8443;
      
      // Set the webhook URL
    //   const webhookUrl = process.env.WEBHOOK_URL;
    //   if (webhookUrl) {
    //     await this.web3Sumurai.telegram.setWebhook(`${webhookUrl}/webhook/${this.web3Sumurai.secretPathComponent()}`);
    //     console.log('Webhook set:', `${webhookUrl}/webhook/${this.web3Sumurai.secretPathComponent()}`);
    //   }

    const webhookUrl = process.env.WEBHOOK_URL || '';
    if(!webhookUrl) {
        console.error('No WEBHOOK_URL provided in environment variables');
        process.exit(1);
    }

    if (webhookUrl) {
        const webhookPath = `/webhook/${this.web3Sumurai.secretPathComponent()}`;
        const fullWebhookUrl = `${webhookUrl}${webhookPath}`;
    
        console.log('Setting webhook to:', fullWebhookUrl);
    
        const webhookResponse = await this.web3Sumurai.telegram.setWebhook(fullWebhookUrl);
        console.log('Webhook response:', webhookResponse);
    
        // Get and log webhook info
        const webhookInfo = await this.web3Sumurai.telegram.getWebhookInfo();
        console.log('Webhook info:', webhookInfo);
    } else {
        console.error('No WEBHOOK_URL provided in environment variables');
    }
      
      // Initialize bot commands and handlers
      await this.web3SumuraiBotController.initialize();
      
      // Start server
      this.app.listen(port, () => {
        console.log(`🚀 Server is running on port ${port}`);
        const webhookInfo = this.web3Sumurai.telegram.getWebhookInfo();
        console.log('Webhook info:', webhookInfo.toString());
        console.log(`🤖 Bot webhook is active`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      console.log('Gracefully shutting down...');
      await this.web3Sumurai.stop('SIGTERM');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

// Start the server
const server = new Server();
server.start();