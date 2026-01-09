import { Request, Response, NextFunction } from 'express';
import { graphService } from '../services/GraphService';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse, CreateGraphRequest, UpdateGraphRequest } from '@kgs/shared';
import { io } from '../index';

export class GraphController {
  /**
   * Get all graphs for the user
   * GET /api/graphs?project_id=<id>
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const projectId = req.query.project_id ? parseInt(req.query.project_id as string) : undefined;

      const graphs = graphService.getGraphs(userId, projectId);

      const response: ApiResponse = {
        data: { graphs },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific graph
   * GET /api/graphs/:id
   */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const graphId = parseInt(req.params.id);
      const userId = req.user!.id;

      const graph = graphService.getGraphById(graphId, userId);

      if (!graph) {
        throw new AppError(404, 'NOT_FOUND', 'Graph not found');
      }

      const response: ApiResponse = {
        data: { graph },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new graph
   * POST /api/graphs
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = req.body as CreateGraphRequest;

      if (!data.project_id || !data.title) {
        throw new AppError(400, 'INVALID_INPUT', 'project_id and title are required');
      }

      const graph = graphService.createGraph(userId, data);

      // Emit WebSocket event
      io.to(`user:${userId}`).emit('graph:update', {
        graph_id: graph.id,
        user_id: userId,
        ontology_data: graph.ontology_data,
        timestamp: Date.now(),
      });

      const response: ApiResponse = {
        data: { graph },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a graph
   * PUT /api/graphs/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const graphId = parseInt(req.params.id);
      const userId = req.user!.id;
      const data = req.body as UpdateGraphRequest;

      const graph = graphService.updateGraph(graphId, userId, data);

      // Emit WebSocket event
      io.to(`user:${userId}`).emit('graph:update', {
        graph_id: graph.id,
        user_id: userId,
        ontology_data: graph.ontology_data,
        timestamp: Date.now(),
      });

      const response: ApiResponse = {
        data: { graph },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete (archive) a graph
   * DELETE /api/graphs/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const graphId = parseInt(req.params.id);
      const userId = req.user!.id;

      graphService.deleteGraph(graphId, userId);

      const response: ApiResponse = {
        data: { success: true },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get graph versions
   * GET /api/graphs/:id/versions
   */
  async versions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const graphId = parseInt(req.params.id);
      const userId = req.user!.id;

      const versions = graphService.getGraphVersions(graphId, userId);

      const response: ApiResponse = {
        data: { versions },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const graphController = new GraphController();
