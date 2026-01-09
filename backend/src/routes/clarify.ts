import { Router } from 'express';
import { clarificationController } from '../controllers/ClarificationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/clarify/start - Start clarification session
router.post('/start', (req, res, next) => clarificationController.start(req, res, next));

// POST /api/clarify/message - Send message (SSE streaming)
router.post('/message', (req, res, next) => clarificationController.message(req, res, next));

// POST /api/clarify/finalize - Finalize and create graph
router.post('/finalize', (req, res, next) => clarificationController.finalize(req, res, next));

// GET /api/clarify/session/:id - Get session details
router.get('/session/:id', (req, res, next) => clarificationController.getSession(req, res, next));

export default router;
