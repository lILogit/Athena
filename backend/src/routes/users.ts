import { Router } from 'express';
import { userController } from '../controllers/UserController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/users/me - Get current user
router.get('/me', (req, res, next) => userController.getMe(req, res, next));

// PUT /api/users/me - Update current user
router.put('/me', (req, res, next) => userController.updateMe(req, res, next));

export default router;
