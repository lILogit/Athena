import { Response } from 'express';
import { SSEEvent } from '@kgs/shared';
import { logger } from '../utils/logger';

export class SSEStreamHandler {
  private res: Response;
  private closed: boolean = false;

  constructor(res: Response) {
    this.res = res;
    this.setupSSE();
  }

  /**
   * Setup SSE headers and connection
   */
  private setupSSE(): void {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Handle client disconnect
    this.res.on('close', () => {
      this.closed = true;
      logger.debug('SSE connection closed');
    });
  }

  /**
   * Send an SSE event
   */
  send(event: SSEEvent): boolean {
    if (this.closed) {
      return false;
    }

    try {
      const data = JSON.stringify(event);
      this.res.write(`data: ${data}\n\n`);
      return true;
    } catch (error) {
      logger.error('Error sending SSE event:', error);
      return false;
    }
  }

  /**
   * Send a token event
   */
  sendToken(content: string): boolean {
    return this.send({ type: 'token', content });
  }

  /**
   * Send entities event
   */
  sendEntities(entities: any[]): boolean {
    return this.send({ type: 'entities', entities });
  }

  /**
   * Send relationships event
   */
  sendRelationships(relationships: any[]): boolean {
    return this.send({ type: 'relationships', relationships });
  }

  /**
   * Send done event
   */
  sendDone(): boolean {
    return this.send({ type: 'done' });
  }

  /**
   * Send error event
   */
  sendError(message: string): boolean {
    return this.send({ type: 'error', message });
  }

  /**
   * End the SSE stream
   */
  end(): void {
    if (!this.closed) {
      this.sendDone();
      this.res.end();
      this.closed = true;
    }
  }
}
