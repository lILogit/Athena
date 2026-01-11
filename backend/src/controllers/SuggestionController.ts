import { Request, Response, NextFunction } from 'express';
import { suggestionService } from '../services/SuggestionService';
import { graphService } from '../services/GraphService';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse, GraphArchetype } from '@kgs/shared';

export class SuggestionController {
  /**
   * Get AI-powered suggestions for a graph
   * POST /api/suggestions/graph/:id
   */
  async getGraphSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const graphId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { context } = req.body as { context?: string };

      const graph = graphService.getGraphById(graphId, userId);
      if (!graph) {
        throw new AppError(404, 'NOT_FOUND', 'Graph not found');
      }

      const suggestions = await suggestionService.getSuggestions(
        graph.archetype,
        graph.ontology_data.nodes,
        graph.ontology_data.edges,
        context
      );

      const response: ApiResponse = {
        data: { suggestions },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quick node types for an archetype (no AI call)
   * GET /api/suggestions/node-types/:archetype
   */
  async getNodeTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const archetype = req.params.archetype as GraphArchetype;

      if (!['general', 'knowledge-mining', 'explanation'].includes(archetype)) {
        throw new AppError(400, 'INVALID_ARCHETYPE', 'Invalid archetype');
      }

      const nodeTypes = suggestionService.getQuickNodeTypes(archetype);

      const response: ApiResponse = {
        data: { nodeTypes },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quick edge types for an archetype (no AI call)
   * GET /api/suggestions/edge-types/:archetype
   */
  async getEdgeTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const archetype = req.params.archetype as GraphArchetype;

      if (!['general', 'knowledge-mining', 'explanation'].includes(archetype)) {
        throw new AppError(400, 'INVALID_ARCHETYPE', 'Invalid archetype');
      }

      const edgeTypes = suggestionService.getQuickEdgeTypes(archetype);

      const response: ApiResponse = {
        data: { edgeTypes },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const suggestionController = new SuggestionController();
