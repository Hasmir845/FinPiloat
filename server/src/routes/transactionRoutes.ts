import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  resetTransactions,
} from '../controllers/transactionController';

const router = Router();

// Reset demo dataset route
router.post('/reset', resetTransactions);

// Standard CRUD endpoints
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
