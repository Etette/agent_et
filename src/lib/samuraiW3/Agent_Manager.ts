import OpenAI from 'openai';
import { Context } from 'telegraf';
import { AI_CONFIG, ERROR_MESSAGES } from '../../config/ModelConfig';
import dotenv from 'dotenv';
dotenv.config();

export class AgentSamurai {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
            baseURL:process.env.OPENROUTER_BASE_URL,
            apiKey: process.env.DEEPSEEK_API_KEY,
        });
  }

  async getResponse(userMessage: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: AI_CONFIG.deepSeekConfig.model,
        messages: [
          {
            role: 'system',
            content: AI_CONFIG.systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0].message.content;
      // console.log(`response :  ${response.content}`);
      return response || ERROR_MESSAGES.DEFAULT;
      
    } catch (error) {
      console.error('Deepseek response error:', error);
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
      console.error('Deepseek handler error:', error);
      await ctx.reply(ERROR_MESSAGES.API_ERROR);
    }
  }
}