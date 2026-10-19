import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../types';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  };
  res.status(404).json(response);
};

const sanitizeSecrets = (str: string): string => {
  return str.replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, 'mongodb$1://***:***@');
};

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = 'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : 500;
  const rawMessage = err.message || 'Internal Server Error';
  const message = sanitizeSecrets(rawMessage);
  const details = 'details' in err ? err.details : undefined;

  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV !== 'production' && { details }),
    },
  };

  // Only log full stack in non-production or for 500 errors, with sanitized message
  if (statusCode >= 500) {
    console.error(`[Error] ${statusCode} - ${message}:`, err);
  }

  res.status(statusCode).json(response);
};
