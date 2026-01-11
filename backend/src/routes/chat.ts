import { Router } from 'express';
import { chatController } from '../controllers/ChatController';

const router = Router();

// Chat messages
router.post('/', chatController.sendMessage.bind(chatController));
router.post('/stream', chatController.streamMessage.bind(chatController));

// Chat sessions
router.get('/sessions', chatController.getSessions.bind(chatController));
router.get('/sessions/:id', chatController.getSession.bind(chatController));
router.delete('/sessions/:id', chatController.deleteSession.bind(chatController));

// Graph history and recommendations
router.get('/history/:graphId', chatController.getGraphHistory.bind(chatController));
router.get('/history/:graphId/causal', chatController.getCausalHistory.bind(chatController));
router.post('/recommendations/:graphId', chatController.getRecommendations.bind(chatController));

export default router;
