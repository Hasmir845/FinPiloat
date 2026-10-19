import { Request, Response, NextFunction } from 'express';
import { transactionRepository } from '../repositories/transactionRepository';
import { CreateTransactionSchema, UpdateTransactionSchema } from '../types';
import { AppError } from '../middleware/errorHandler';

export const getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, status, category, search, startDate, endDate, sortBy, sortOrder } = req.query;

    const transactions = await transactionRepository.getAll({
      type: typeof type === 'string' ? type : undefined,
      status: typeof status === 'string' ? status : undefined,
      category: typeof category === 'string' ? category : undefined,
      search: typeof search === 'string' ? search : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      sortBy: sortBy === 'amount' ? 'amount' : 'date',
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });

    res.status(200).json({
      success: true,
      data: transactions,
      meta: {
        total: transactions.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validates transaction ID format (alphanumeric, dashes, underscores, max 64 chars).
 * Blocks SQL/NoSQL query injection vectors and malformed ID paths.
 */
export const validateTransactionId = (id: unknown): string => {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    throw new AppError(`Invalid transaction ID format: '${String(id)}'`, 400);
  }
  return id;
};

export const getTransactionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validateTransactionId(req.params.id);
    const transaction = await transactionRepository.getById(id);

    if (!transaction) {
      throw new AppError(`Transaction with ID '${id}' not found`, 404);
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = CreateTransactionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new AppError(`Validation failed: ${errorMessages}`, 400, parseResult.error.flatten());
    }

    const created = await transactionRepository.create(parseResult.data);

    res.status(201).json({
      success: true,
      data: created,
      message: 'Transaction recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validateTransactionId(req.params.id);
    const parseResult = UpdateTransactionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new AppError(`Validation failed: ${errorMessages}`, 400, parseResult.error.flatten());
    }

    const updated = await transactionRepository.update(id, parseResult.data);

    if (!updated) {
      throw new AppError(`Transaction with ID '${id}' not found`, 404);
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Transaction updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validateTransactionId(req.params.id);
    const deleted = await transactionRepository.delete(id);

    if (!deleted) {
      throw new AppError(`Transaction with ID '${id}' not found`, 404);
    }

    res.status(200).json({
      success: true,
      data: { id },
      message: 'Transaction removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const resetTransactions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resetList = await transactionRepository.resetToSeed();

    res.status(200).json({
      success: true,
      data: resetList,
      meta: {
        total: resetList.length,
      },
      message: 'Demo dataset reset to initial illustrative records',
    });
  } catch (error) {
    next(error);
  }
};
