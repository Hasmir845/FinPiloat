import { Request, Response } from 'express';
import { healthService } from '../services/healthService';

export const getHealth = (_req: Request, res: Response): void => {
  const healthData = healthService.getHealthStatus();
  res.status(200).json(healthData);
};
