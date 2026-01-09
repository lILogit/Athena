import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name: string;
      };
    }
  }
}

/**
 * Mock authentication middleware for Phase 1
 * Always authenticates as demo user (id=1)
 * In Phase 2, replace with JWT authentication
 */
export function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Mock authentication - always set user to demo user
  req.user = {
    id: 1,
    email: 'demo@local',
    name: 'Demo User',
  };

  next();
}

/**
 * Require authenticated user
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  next();
}
