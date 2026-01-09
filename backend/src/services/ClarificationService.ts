import { db } from '../config/database';
import { Session, Message, ClarificationState, ExtractedEntity, ExtractedRelationship } from '@kgs/shared';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { claudeService } from './ClaudeService';
import { entityExtractor } from './nlp/EntityExtractor';
import { relationExtractor } from './nlp/RelationExtractor';

export class ClarificationService {
  /**
   * Start a new clarification session
   */
  async startSession(userId: number, initialInput: string): Promise<Session> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);

      // Get AI's first response
      const aiResponse = await claudeService.sendMessage([
        {
          role: 'user',
          content: initialInput,
          timestamp,
        },
      ]);

      // Initialize clarification state
      const clarificationState: ClarificationState = {
        messages: [
          {
            role: 'user',
            content: initialInput,
            timestamp,
          },
          {
            role: 'assistant',
            content: aiResponse,
            timestamp: Math.floor(Date.now() / 1000),
          },
        ],
        extractedEntities: [],
        extractedRelationships: [],
      };

      // Extract entities from initial conversation
      const conversationText = `User: ${initialInput}\n\nAssistant: ${aiResponse}`;
      const entities = await entityExtractor.extractEntities(conversationText);
      clarificationState.extractedEntities = entities;

      // Create session in database
      const result = db
        .prepare(
          `INSERT INTO sessions (user_id, clarification_state, created_at, updated_at)
           VALUES (?, ?, ?, ?)`
        )
        .run(userId, JSON.stringify(clarificationState), timestamp, timestamp);

      const sessionId = result.lastInsertRowid as number;

      logger.info('Clarification session started', { sessionId, userId });

      return this.getSession(sessionId, userId)!;
    } catch (error) {
      logger.error('ClarificationService.startSession error:', error);
      throw new AppError(500, 'SESSION_ERROR', 'Failed to start clarification session');
    }
  }

  /**
   * Add a message to the session
   */
  async addMessage(
    sessionId: number,
    userId: number,
    userMessage: string
  ): Promise<{ session: Session; aiResponse: string }> {
    try {
      const session = this.getSession(sessionId, userId);
      if (!session) {
        throw new AppError(404, 'NOT_FOUND', 'Session not found');
      }

      const timestamp = Math.floor(Date.now() / 1000);

      // Add user message
      session.clarification_state.messages.push({
        role: 'user',
        content: userMessage,
        timestamp,
      });

      // Get AI response
      const aiResponse = await claudeService.sendMessage(session.clarification_state.messages);

      // Add AI message
      session.clarification_state.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: Math.floor(Date.now() / 1000),
      });

      // Extract entities from conversation
      const conversationText = session.clarification_state.messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

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

      // Update session in database
      db.prepare(
        `UPDATE sessions SET clarification_state = ?, updated_at = ? WHERE id = ? AND user_id = ?`
      ).run(JSON.stringify(session.clarification_state), timestamp, sessionId, userId);

      logger.info('Message added to session', {
        sessionId,
        userId,
        entityCount: session.clarification_state.extractedEntities.length,
        relationshipCount: session.clarification_state.extractedRelationships.length,
      });

      return { session, aiResponse };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('ClarificationService.addMessage error:', error);
      throw new AppError(500, 'SESSION_ERROR', 'Failed to add message');
    }
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: number, userId: number): Session | null {
    try {
      const row = db
        .prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?')
        .get(sessionId, userId) as any;

      if (!row) return null;

      return {
        id: row.id,
        user_id: row.user_id,
        graph_id: row.graph_id,
        clarification_state: JSON.parse(row.clarification_state) as ClarificationState,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error) {
      logger.error('ClarificationService.getSession error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to fetch session');
    }
  }

  /**
   * Link session to a graph (after finalization)
   */
  linkSessionToGraph(sessionId: number, userId: number, graphId: number): void {
    try {
      const result = db
        .prepare('UPDATE sessions SET graph_id = ? WHERE id = ? AND user_id = ?')
        .run(graphId, sessionId, userId);

      if (result.changes === 0) {
        throw new AppError(404, 'NOT_FOUND', 'Session not found');
      }

      logger.info('Session linked to graph', { sessionId, graphId, userId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('ClarificationService.linkSessionToGraph error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to link session to graph');
    }
  }

  /**
   * Delete old sessions (cleanup)
   */
  cleanupOldSessions(olderThanHours: number = 24): number {
    try {
      const cutoffTime = Math.floor(Date.now() / 1000) - olderThanHours * 3600;

      const result = db
        .prepare('DELETE FROM sessions WHERE updated_at < ? AND graph_id IS NULL')
        .run(cutoffTime);

      logger.info('Old sessions cleaned up', { count: result.changes });

      return result.changes;
    } catch (error) {
      logger.error('ClarificationService.cleanupOldSessions error:', error);
      return 0;
    }
  }
}

export const clarificationService = new ClarificationService();
