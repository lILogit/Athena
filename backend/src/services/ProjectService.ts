import { db } from '../config/database';
import { Project, CreateProjectRequest, UpdateProjectRequest } from '@kgs/shared';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class ProjectService {
  /**
   * Get all projects for a user
   */
  getProjects(userId: number): Project[] {
    try {
      const rows = db
        .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC')
        .all(userId);

      return rows.map(this.rowToProject);
    } catch (error) {
      logger.error('ProjectService.getProjects error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to fetch projects');
    }
  }

  /**
   * Get a single project by ID
   */
  getProjectById(projectId: number, userId: number): Project | null {
    try {
      const row = db
        .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
        .get(projectId, userId);

      return row ? this.rowToProject(row) : null;
    } catch (error) {
      logger.error('ProjectService.getProjectById error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to fetch project');
    }
  }

  /**
   * Create a new project
   */
  createProject(userId: number, data: CreateProjectRequest): Project {
    try {
      const timestamp = Math.floor(Date.now() / 1000);

      const result = db
        .prepare(
          `INSERT INTO projects (user_id, name, description, domain, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          data.name,
          data.description || null,
          data.domain || null,
          timestamp,
          timestamp
        );

      const projectId = result.lastInsertRowid as number;

      logger.info('Project created', { projectId, userId, name: data.name });

      const project = this.getProjectById(projectId, userId);
      if (!project) {
        throw new Error('Failed to retrieve created project');
      }

      return project;
    } catch (error) {
      logger.error('ProjectService.createProject error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to create project');
    }
  }

  /**
   * Update a project
   */
  updateProject(projectId: number, userId: number, data: UpdateProjectRequest): Project {
    try {
      const existing = this.getProjectById(projectId, userId);
      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Project not found');
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
      }

      if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description);
      }

      if (data.domain !== undefined) {
        updates.push('domain = ?');
        params.push(data.domain);
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        params.push(Math.floor(Date.now() / 1000));
        params.push(projectId, userId);

        db.prepare(
          `UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
        ).run(...params);

        logger.info('Project updated', { projectId, userId });
      }

      const updated = this.getProjectById(projectId, userId);
      if (!updated) {
        throw new Error('Failed to retrieve updated project');
      }

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('ProjectService.updateProject error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to update project');
    }
  }

  /**
   * Delete a project
   */
  deleteProject(projectId: number, userId: number): void {
    try {
      const result = db
        .prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')
        .run(projectId, userId);

      if (result.changes === 0) {
        throw new AppError(404, 'NOT_FOUND', 'Project not found');
      }

      logger.info('Project deleted', { projectId, userId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('ProjectService.deleteProject error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to delete project');
    }
  }

  /**
   * Get graphs for a project
   */
  getProjectGraphs(projectId: number, userId: number): any[] {
    try {
      // Verify project ownership
      const project = this.getProjectById(projectId, userId);
      if (!project) {
        throw new AppError(404, 'NOT_FOUND', 'Project not found');
      }

      const rows = db
        .prepare(
          `SELECT id, title, description, version, created_at, updated_at
           FROM graphs
           WHERE project_id = ? AND user_id = ? AND is_archived = 0
           ORDER BY updated_at DESC`
        )
        .all(projectId, userId);

      return rows;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('ProjectService.getProjectGraphs error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to fetch project graphs');
    }
  }

  /**
   * Convert database row to Project object
   */
  private rowToProject(row: any): Project {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      domain: row.domain,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_public: Boolean(row.is_public),
    };
  }
}

export const projectService = new ProjectService();
