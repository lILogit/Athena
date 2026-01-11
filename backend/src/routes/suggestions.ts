import { Router } from 'express';
import { suggestionController } from '../controllers/SuggestionController';

const router = Router();

// Get AI-powered suggestions for a graph
router.post('/graph/:id', suggestionController.getGraphSuggestions.bind(suggestionController));

// Get quick node types for an archetype (no AI)
router.get('/node-types/:archetype', suggestionController.getNodeTypes.bind(suggestionController));

// Get quick edge types for an archetype (no AI)
router.get('/edge-types/:archetype', suggestionController.getEdgeTypes.bind(suggestionController));

export default router;
