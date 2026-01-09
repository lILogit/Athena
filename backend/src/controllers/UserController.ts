import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse, User } from '@kgs/shared';

export class UserController {
  /**
   * Get current user
   * GET /api/users/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

      if (!row) {
        throw new AppError(404, 'NOT_FOUND', 'User not found');
      }

      const user: User = {
        id: row.id,
        email: row.email,
        name: row.name,
        avatar_url: row.avatar_url,
        created_at: row.created_at,
        last_login: row.last_login,
        preferences: JSON.parse(row.preferences || '{}'),
        reputation_score: row.reputation_score,
      };

      const response: ApiResponse = {
        data: { user },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user
   * PUT /api/users/me
   */
  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, preferences } = req.body;

      const updates: string[] = [];
      const params: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }

      if (preferences !== undefined) {
        updates.push('preferences = ?');
        params.push(JSON.stringify(preferences));
      }

      if (updates.length > 0) {
        params.push(userId);

        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }

      // Get updated user
      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

      const user: User = {
        id: row.id,
        email: row.email,
        name: row.name,
        avatar_url: row.avatar_url,
        created_at: row.created_at,
        last_login: row.last_login,
        preferences: JSON.parse(row.preferences || '{}'),
        reputation_score: row.reputation_score,
      };

      const response: ApiResponse = {
        data: { user },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
