import cors from 'cors';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (same-origin, mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    // In production, frontend is served from same origin - allow all origins
    // (Browser sends Origin header even for same-origin fetch in some cases)
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    // Allow configured frontend URL
    if (origin === FRONTEND_URL) {
      return callback(null, true);
    }
    // In development, allow localhost
    if (origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export const corsMiddleware = cors(corsOptions);
