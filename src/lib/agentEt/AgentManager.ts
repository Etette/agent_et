import { GoogleGenerativeAI } from '@google/generative-ai';
import { Context } from 'telegraf';
import { AI_CONFIG, ERROR_MESSAGES } from '../../config/ModelConfig';

export class AgentET {
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ 
      model: AI_CONFIG.geminiConfig.model,
    });
  }

  async getResponse(userMessage: string): Promise<string> {
    try {
      const prompt = `${AI_CONFIG.systemPrompt}\n\nUser Question: ${userMessage}`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text || ERROR_MESSAGES.DEFAULT;
    } catch (error) {
      console.error('AI response error:', error);
      throw new Error(ERROR_MESSAGES.API_ERROR);
    }
  }

  async handleQuestion(ctx: Context): Promise<void> {
    try {
      const message = ctx.message as any;
      const question = message?.text;
      if (!question) {
        await ctx.reply(ERROR_MESSAGES.EMPTY_QUESTION);
        return;
      }

      const statusMessage = await ctx.reply('Thinking...');
      const response = await this.getResponse(question);

      await ctx.telegram.editMessageText(
        statusMessage.chat.id,
        statusMessage.message_id,
        undefined,
        `🤖 ${response}`
      );
    } catch (error) {
      console.error('AI handler error:', error);
      await ctx.reply(ERROR_MESSAGES.API_ERROR);
    }
  }
}