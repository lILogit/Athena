// Environment variables loaded via -r dotenv/config flag in npm script
import { createApp, createServer } from './server';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

// Create Express app and HTTP/WebSocket server
const app = createApp();
const { httpServer, io } = createServer(app);

// Make io available globally for WebSocket event emission
export { io };

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
  });
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket ready on ws://localhost:${PORT}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
