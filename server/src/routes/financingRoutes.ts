import { Router } from 'express';
import {
  postFinancingAssessment,
  getFinancingReadinessSummary,
} from '../controllers/financingController';
import { aiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// GET /api/financing/readiness - Quick preview of financial readiness metrics from MongoDB
router.get('/readiness', getFinancingReadinessSummary);

// POST /api/financing/assess - Full financing assessment & transparent option matching (rate limited)
router.post('/assess', aiRateLimiter, postFinancingAssessment);

export default router;
