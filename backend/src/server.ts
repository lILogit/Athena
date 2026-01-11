import express, { Express } from 'express';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authenticateUser } from './middleware/auth';
import { logger } from './utils/logger';
import { initializeDatabase } from './config/database';

// Import routes
import graphRoutes from './routes/graphs';
import projectRoutes from './routes/projects';
import clarifyRoutes from './routes/clarify';
import ontologyRoutes from './routes/ontology';
import userRoutes from './routes/users';
import suggestionRoutes from './routes/suggestions';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export function createApp(): Express {
  const app = express();

  // Initialize database
  initializeDatabase();

  // Middleware
  app.use(corsMiddleware);
  app.use(express.json({ limit: '10mb' })); // Support large graph data
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
      });
    });
    next();
  });

  // Authentication middleware
  app.use(authenticateUser);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // API routes
  app.use('/api/graphs', graphRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/clarify', clarifyRoutes);
  app.use('/api/ontology', ontologyRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/suggestions', suggestionRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export function createServer(app: Express): {
  httpServer: HTTPServer;
  io: SocketIOServer;
} {
  const httpServer = new HTTPServer(app);

  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: FRONTEND_URL,
      credentials: true,
    },
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    logger.info('Client connected', { socketId: socket.id });

    // Join user's personal room
    const userId = 1; // Mock user ID (from authentication)
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      logger.info('Client disconnected', { socketId: socket.id });
    });
  });

  return { httpServer, io };
}
