import Anthropic from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL, CLARIFICATION_SYSTEM_PROMPT } from '../config/claude';
import { Message } from '@kgs/shared';
import { logger } from '../utils/logger';

export class ClaudeService {
  /**
   * Send a message and get a complete response
   */
  async sendMessage(
    messages: Message[],
    systemPrompt: string = CLARIFICATION_SYSTEM_PROMPT
  ): Promise<string> {
    try {
      const anthropicMessages = messages.map(msg => ({
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      }));

      const response = await (anthropic as any).messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      const textContent = response.content.find((block: any) => block.type === 'text');
      return textContent?.type === 'text' ? textContent.text : '';
    } catch (error) {
      logger.error('ClaudeService.sendMessage error:', error);
      throw new Error('Failed to get response from Claude API');
    }
  }

  /**
   * Send a message and stream the response
   * Returns an async generator that yields text chunks
   */
  async *streamMessage(
    messages: Message[],
    systemPrompt: string = CLARIFICATION_SYSTEM_PROMPT
  ): AsyncGenerator<string, void, unknown> {
    try {
      const anthropicMessages = messages.map(msg => ({
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      }));

      const stream = await (anthropic as any).messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      logger.error('ClaudeService.streamMessage error:', error);
      throw new Error('Failed to stream response from Claude API');
    }
  }

  /**
   * Extract structured data from text using Claude
   */
  async extractStructuredData<T = any>(
    prompt: string,
    expectedFormat: string = 'JSON'
  ): Promise<T> {
    try {
      const response = await (anthropic as any).messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = response.content.find((block: any) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      const text = textContent.text.trim();

      // Try to parse JSON from response
      // Claude sometimes wraps JSON in markdown code blocks
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      return JSON.parse(jsonText) as T;
    } catch (error) {
      logger.error('ClaudeService.extractStructuredData error:', error);
      throw new Error('Failed to extract structured data from Claude API');
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries - 1;

        // Don't retry on certain errors
        if (error.status === 401 || error.status === 400) {
          throw error;
        }

        if (isLastAttempt) {
          logger.error('Max retries reached', { error, attempt });
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn('Retrying operation', { attempt, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Retry logic failed unexpectedly');
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();
