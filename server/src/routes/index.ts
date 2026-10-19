import { Router } from 'express';
import healthRoutes from './healthRoutes';
import transactionRoutes from './transactionRoutes';
import financialRoutes from './financialRoutes';
import copilotRoutes from './copilotRoutes';
import financingRoutes from './financingRoutes';

const router = Router();

// Mount API routes
router.use('/', healthRoutes);
router.use('/transactions', transactionRoutes);
router.use('/financial', financialRoutes);
router.use('/copilot', copilotRoutes);
router.use('/financing', financingRoutes);

export default router;
