import { Router } from 'express';
import { ontologyController } from '../controllers/OntologyController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/ontology/convert - Convert text to ontology
router.post('/convert', (req, res, next) => ontologyController.convert(req, res, next));

// POST /api/ontology/extract - Extract entities and relationships
router.post('/extract', (req, res, next) => ontologyController.extract(req, res, next));

export default router;
