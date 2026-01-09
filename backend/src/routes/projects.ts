import { Router } from 'express';
import { projectController } from '../controllers/ProjectController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/projects - List all projects
router.get('/', (req, res, next) => projectController.list(req, res, next));

// GET /api/projects/:id - Get a specific project
router.get('/:id', (req, res, next) => projectController.get(req, res, next));

// POST /api/projects - Create a new project
router.post('/', (req, res, next) => projectController.create(req, res, next));

// PUT /api/projects/:id - Update a project
router.put('/:id', (req, res, next) => projectController.update(req, res, next));

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', (req, res, next) => projectController.delete(req, res, next));

// GET /api/projects/:id/graphs - Get project's graphs
router.get('/:id/graphs', (req, res, next) => projectController.graphs(req, res, next));

export default router;
