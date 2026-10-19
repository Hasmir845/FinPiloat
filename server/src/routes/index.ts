import { Router } from 'express';
import healthRoutes from './healthRoutes';
import transactionRoutes from './transactionRoutes';
import financialRoutes from './financialRoutes';

const router = Router();

// Mount API routes
router.use('/', healthRoutes);
router.use('/transactions', transactionRoutes);
router.use('/financial', financialRoutes);

export default router;
