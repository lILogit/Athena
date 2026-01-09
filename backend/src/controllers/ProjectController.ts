import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/ProjectService';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse, CreateProjectRequest, UpdateProjectRequest } from '@kgs/shared';

export class ProjectController {
  /**
   * Get all projects for the user
   * GET /api/projects
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const projects = projectService.getProjects(userId);

      const response: ApiResponse = {
        data: { projects },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific project
   * GET /api/projects/:id
   */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;

      const project = projectService.getProjectById(projectId, userId);

      if (!project) {
        throw new AppError(404, 'NOT_FOUND', 'Project not found');
      }

      const response: ApiResponse = {
        data: { project },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new project
   * POST /api/projects
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = req.body as CreateProjectRequest;

      if (!data.name) {
        throw new AppError(400, 'INVALID_INPUT', 'name is required');
      }

      const project = projectService.createProject(userId, data);

      const response: ApiResponse = {
        data: { project },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a project
   * PUT /api/projects/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const data = req.body as UpdateProjectRequest;

      const project = projectService.updateProject(projectId, userId, data);

      const response: ApiResponse = {
        data: { project },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a project
   * DELETE /api/projects/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;

      projectService.deleteProject(projectId, userId);

      const response: ApiResponse = {
        data: { success: true },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get graphs in a project
   * GET /api/projects/:id/graphs
   */
  async graphs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;

      const graphs = projectService.getProjectGraphs(projectId, userId);

      const response: ApiResponse = {
        data: { graphs },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
