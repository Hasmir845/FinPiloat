import { Router } from 'express';
import { getStatus, postChat } from '../controllers/copilotController';
import { aiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// GET /api/copilot/status - Check Gemini AI configuration & workspace status
router.get('/status', getStatus);

// POST /api/copilot/chat - Send message to Gemini AI Copilot grounded in financial records (rate limited)
router.post('/chat', aiRateLimiter, postChat);

export default router;
