import { Router } from 'express';
import { graphController } from '../controllers/GraphController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/graphs - List all graphs
router.get('/', (req, res, next) => graphController.list(req, res, next));

// GET /api/graphs/:id - Get a specific graph
router.get('/:id', (req, res, next) => graphController.get(req, res, next));

// POST /api/graphs - Create a new graph
router.post('/', (req, res, next) => graphController.create(req, res, next));

// PUT /api/graphs/:id - Update a graph
router.put('/:id', (req, res, next) => graphController.update(req, res, next));

// DELETE /api/graphs/:id - Delete a graph
router.delete('/:id', (req, res, next) => graphController.delete(req, res, next));

// GET /api/graphs/:id/versions - Get graph versions
router.get('/:id/versions', (req, res, next) => graphController.versions(req, res, next));

export default router;
