import { Router } from 'express';
import {
  getFinancialSummary,
  getForecast,
  getRisks,
} from '../controllers/financialController';

const router = Router();

router.get('/summary', getFinancialSummary);
router.get('/forecast', getForecast);
router.get('/risks', getRisks);

export default router;
