import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '@kgs/shared';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.error('Application error:', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
      path: req.path,
    });

    const response: ApiResponse = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    res.status(err.statusCode).json(response);
  } else {
    logger.error('Unexpected error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
    });

    const response: ApiResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    };

    res.status(500).json(response);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  };

  res.status(404).json(response);
}
