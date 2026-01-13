import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));

// Protected routes
router.get('/me', requireAuth, (req, res, next) => authController.me(req, res, next));

export default router;
