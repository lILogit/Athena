import express, { Express } from 'express';
import path from 'path';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authenticateUser } from './middleware/auth';
import { logger } from './utils/logger';
import { initializeDatabase } from './config/database';

// Import routes
import authRoutes from './routes/auth';
import graphRoutes from './routes/graphs';
import projectRoutes from './routes/projects';
import clarifyRoutes from './routes/clarify';
import ontologyRoutes from './routes/ontology';
import userRoutes from './routes/users';
import suggestionRoutes from './routes/suggestions';
import chatRoutes from './routes/chat';
import { requireAuth } from './middleware/auth';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export function createApp(): Express {
  const app = express();

  // Initialize database
  initializeDatabase();

  // Serve frontend static files in production (BEFORE other middleware - no CORS needed)
  let frontendPath: string | undefined;
  if (process.env.NODE_ENV === 'production') {
    frontendPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendPath));
  }

  // Apply CORS only to API routes
  app.use('/api', corsMiddleware);

  // Middleware
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

  // Health check (public)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Public routes (no authentication required)
  app.use('/api/auth', authRoutes);

  // Protected API routes (authentication required)
  app.use('/api/graphs', requireAuth, graphRoutes);
  app.use('/api/projects', requireAuth, projectRoutes);
  app.use('/api/clarify', requireAuth, clarifyRoutes);
  app.use('/api/ontology', requireAuth, ontologyRoutes);
  app.use('/api/users', requireAuth, userRoutes);
  app.use('/api/suggestions', requireAuth, suggestionRoutes);
  app.use('/api/chat', requireAuth, chatRoutes);

  // SPA fallback - serve index.html for non-API routes (production only)
  if (process.env.NODE_ENV === 'production' && frontendPath) {
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

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
