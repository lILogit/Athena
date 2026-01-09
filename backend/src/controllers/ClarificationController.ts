import { Request, Response, NextFunction } from 'express';
import { clarificationService } from '../services/ClarificationService';
import { graphService } from '../services/GraphService';
import { ontologyBuilder } from '../services/nlp/OntologyBuilder';
import { claudeService } from '../services/ClaudeService';
import { SSEStreamHandler } from '../sse/streamHandler';
import { entityExtractor } from '../services/nlp/EntityExtractor';
import { relationExtractor } from '../services/nlp/RelationExtractor';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import {
  StartClarificationRequest,
  ClarificationMessageRequest,
  FinalizeClarificationRequest,
  ApiResponse,
} from '@kgs/shared';

export class ClarificationController {
  /**
   * Start a new clarification session
   * POST /api/clarify/start
   */
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { initial_input, project_id } = req.body as StartClarificationRequest;

      if (!initial_input || !project_id) {
        throw new AppError(400, 'INVALID_INPUT', 'initial_input and project_id are required');
      }

      const userId = req.user!.id;
      const session = await clarificationService.startSession(userId, initial_input);

      const response: ApiResponse = {
        data: {
          session_id: session.id,
          ai_response: session.clarification_state.messages[1]?.content || '',
          extracted_entities: session.clarification_state.extractedEntities,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a message in the clarification dialog
   * Streams the AI response via SSE
   * POST /api/clarify/message
   */
  async message(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { session_id, message } = req.body as ClarificationMessageRequest;

      if (!session_id || !message) {
        throw new AppError(400, 'INVALID_INPUT', 'session_id and message are required');
      }

      const userId = req.user!.id;
      const session = clarificationService.getSession(session_id, userId);

      if (!session) {
        throw new AppError(404, 'NOT_FOUND', 'Session not found');
      }

      // Setup SSE stream
      const stream = new SSEStreamHandler(res);

      try {
        const timestamp = Math.floor(Date.now() / 1000);

        // Add user message
        session.clarification_state.messages.push({
          role: 'user',
          content: message,
          timestamp,
        });

        // Stream AI response
        const fullResponse: string[] = [];

        for await (const chunk of claudeService.streamMessage(
          session.clarification_state.messages
        )) {
          fullResponse.push(chunk);
          stream.sendToken(chunk);
        }

        // Add AI message to session
        const aiResponse = fullResponse.join('');
        session.clarification_state.messages.push({
          role: 'assistant',
          content: aiResponse,
          timestamp: Math.floor(Date.now() / 1000),
        });

        // Extract entities and relationships in the background
        const conversationText = session.clarification_state.messages
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n\n');

        // Extract entities
        const newEntities = await entityExtractor.extractEntities(conversationText);
        session.clarification_state.extractedEntities = entityExtractor.mergeEntities(
          session.clarification_state.extractedEntities,
          newEntities
        );

        // Extract relationships
        const entityLabels = session.clarification_state.extractedEntities.map(e => e.label);
        const newRelationships = await relationExtractor.extractRelationships(
          conversationText,
          entityLabels
        );
        session.clarification_state.extractedRelationships = relationExtractor.mergeRelationships(
          session.clarification_state.extractedRelationships,
          newRelationships
        );

        // Send extracted entities
        stream.sendEntities(session.clarification_state.extractedEntities);

        // Send extracted relationships
        stream.sendRelationships(session.clarification_state.extractedRelationships);

        // Update session in database
        const db = require('../config/database').db;
        db.prepare(
          `UPDATE sessions SET clarification_state = ?, updated_at = ? WHERE id = ?`
        ).run(JSON.stringify(session.clarification_state), timestamp, session_id);

        stream.end();
      } catch (error) {
        logger.error('Error during SSE streaming:', error);
        stream.sendError('Failed to process message');
        stream.end();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Finalize clarification and create graph
   * POST /api/clarify/finalize
   */
  async finalize(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { session_id, title } = req.body as FinalizeClarificationRequest;

      if (!session_id) {
        throw new AppError(400, 'INVALID_INPUT', 'session_id is required');
      }

      const userId = req.user!.id;
      const session = clarificationService.getSession(session_id, userId);

      if (!session) {
        throw new AppError(404, 'NOT_FOUND', 'Session not found');
      }

      // Build ontology from conversation
      const ontologyData = await ontologyBuilder.buildFromConversation(
        session.clarification_state.messages
      );

      // Validate ontology
      const validation = ontologyBuilder.validateOntology(ontologyData);
      if (!validation.valid) {
        throw new AppError(400, 'INVALID_ONTOLOGY', 'Generated ontology is invalid', {
          errors: validation.errors,
        });
      }

      // Get project_id from the first user message or use default
      const projectId = 1; // TODO: Get from session context

      // Create graph
      const graph = graphService.createGraph(userId, {
        project_id: projectId,
        title: title || `Graph from ${new Date().toLocaleDateString()}`,
        description: `Created from clarification dialog`,
        ontology_data: ontologyData,
      });

      // Link session to graph
      clarificationService.linkSessionToGraph(session_id, userId, graph.id);

      const response: ApiResponse = {
        data: { graph },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get session details
   * GET /api/clarify/session/:id
   */
  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = parseInt(req.params.id);
      const userId = req.user!.id;

      const session = clarificationService.getSession(sessionId, userId);

      if (!session) {
        throw new AppError(404, 'NOT_FOUND', 'Session not found');
      }

      const response: ApiResponse = {
        data: { session },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const clarificationController = new ClarificationController();
