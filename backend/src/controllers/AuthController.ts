import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string | null;
  created_at: number;
}

function generateToken(user: { id: number; email: string; name: string }): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    options
  );
}

class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Email, password, and name are required');
      }

      if (password.length < 6) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Password must be at least 6 characters');
      }

      // Check if user already exists
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        throw new AppError(409, 'USER_EXISTS', 'A user with this email already exists');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user
      const result = db.prepare(`
        INSERT INTO users (email, name, password_hash, created_at)
        VALUES (?, ?, ?, strftime('%s', 'now'))
      `).run(email, name, passwordHash);

      const userId = result.lastInsertRowid as number;

      // Create default project for the new user
      db.prepare(`
        INSERT INTO projects (user_id, name, description, created_at, updated_at)
        VALUES (?, 'My First Project', 'Default project for getting started', strftime('%s', 'now'), strftime('%s', 'now'))
      `).run(userId);

      const user = { id: userId, email, name };
      const token = generateToken(user);

      logger.info('User registered', { userId, email });

      res.status(201).json({
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Email and password are required');
      }

      // Find user
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;

      if (!user) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      if (!user.password_hash) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      // Update last login
      db.prepare('UPDATE users SET last_login = strftime(\'%s\', \'now\') WHERE id = ?').run(user.id);

      const token = generateToken({ id: user.id, email: user.email, name: user.name });

      logger.info('User logged in', { userId: user.id, email });

      res.json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const user = db.prepare('SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?').get(req.user.id);

      if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'User not found');
      }

      res.json({ data: { user } });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
