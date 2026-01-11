import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/ChatService';
import { historyService } from '../services/HistoryService';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse, ChatRequest, AIModel } from '@kgs/shared';

export class ChatController {
  /**
   * Send a chat message
   * POST /api/chat
   */
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { message, model, graphId, sessionId, includeHistory } = req.body as ChatRequest;

      if (!message || !message.trim()) {
        throw new AppError(400, 'INVALID_MESSAGE', 'Message is required');
      }

      // Validate model if provided
      const validModels: AIModel[] = ['claude-sonnet', 'claude-opus', 'claude-haiku'];
      if (model && !validModels.includes(model)) {
        throw new AppError(400, 'INVALID_MODEL', 'Invalid model selection');
      }

      const response = await chatService.chat(userId, {
        message: message.trim(),
        model: model || 'claude-sonnet',
        graphId,
        sessionId,
        includeHistory,
      });

      const apiResponse: ApiResponse = {
        data: response,
      };

      res.json(apiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stream a chat message response
   * POST /api/chat/stream
   */
  async streamMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { message, model, graphId, sessionId } = req.body as ChatRequest;

      if (!message || !message.trim()) {
        throw new AppError(400, 'INVALID_MESSAGE', 'Message is required');
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = chatService.streamChat(userId, {
        message: message.trim(),
        model: model || 'claude-sonnet',
        graphId,
        sessionId,
      });

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`);
      }

      // Get the final response
      const result = await stream.return(undefined as any);
      const finalData = result.value as object | undefined;
      res.write(`data: ${JSON.stringify({ type: 'done', ...(finalData || {}) })}\n\n`);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat sessions
   * GET /api/chat/sessions
   */
  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = chatService.getAllSessions();

      const apiResponse: ApiResponse = {
        data: { sessions },
      };

      res.json(apiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific chat session
   * GET /api/chat/sessions/:id
   */
  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;
      const session = chatService.getSession(sessionId);

      if (!session) {
        throw new AppError(404, 'NOT_FOUND', 'Chat session not found');
      }

      const apiResponse: ApiResponse = {
        data: { session },
      };

      res.json(apiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a chat session
   * DELETE /api/chat/sessions/:id
   */
  async deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;
      const deleted = chatService.deleteSession(sessionId);

      if (!deleted) {
        throw new AppError(404, 'NOT_FOUND', 'Chat session not found');
      }

      const apiResponse: ApiResponse = {
        data: { success: true },
      };

      res.json(apiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get graph change history
   * GET /api/chat/history/:graphId
   */
  async getGraphHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const graphId = parseInt(req.params.graphId);

      if (isNaN(graphId)) {
        throw new AppError(400, 'INVALID_ID', 'Invalid graph ID');
      }

      const history = historyService.getGraphHistory(graphId);

      const apiResponse: ApiResponse = {
        data: { history },
      };

      res.json(apiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get causal history tree
   * GET /api/chat/history/:graphId/causal
   */
  async getCausalHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const graphId = parseInt(req.params.graphId);

      if (isNaN(graphId)) {
        throw new AppError(400, 'INVALID_ID', 'Invalid graph ID');
      }

      const tree = historyService.buildCausalTree(graphId);

      const apiResponse: ApiResponse = {
        data: { tree },
      };

      res.json(apiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get AI recommendations based on history
   * POST /api/chat/recommendations/:graphId
   */
  async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const graphId = parseInt(req.params.graphId);
      const { model } = req.body as { model?: AIModel };

      if (isNaN(graphId)) {
        throw new AppError(400, 'INVALID_ID', 'Invalid graph ID');
      }

      // Import graphService here to avoid circular dependency
      const { graphService } = require('../services/GraphService');
      const graph = graphService.getGraphById(graphId, userId);

      if (!graph) {
        throw new AppError(404, 'NOT_FOUND', 'Graph not found');
      }

      const history = historyService.getGraphHistory(graphId);
      const recentChanges = history.changes.slice(-10);

      const recommendations = await chatService.generateRecommendations(
        graph,
        recentChanges,
        model || 'claude-sonnet'
      );

      const apiResponse: ApiResponse = {
        data: { recommendations },
      };

      res.json(apiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
