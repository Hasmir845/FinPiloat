import { Request, Response, NextFunction } from 'express';
import {
  FinancingAssessmentInputSchema,
  FinancingAssessmentInput,
} from '../types';
import {
  executeFinancingAssessment,
  assessFinancialReadiness,
} from '../services/financingService';
import { AppError } from '../middleware/errorHandler';

/**
 * POST /api/financing/assess
 * Validates SME financing parameters, evaluates authoritative financial readiness from MongoDB,
 * runs transparent rule-based option matching, and generates an AI explanation.
 */
export const postFinancingAssessment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      throw new AppError('Invalid request body. JSON object required.', 400);
    }

    const parseResult = FinancingAssessmentInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const errorMessage = issue
        ? `${issue.path.join('.')}: ${issue.message}`
        : 'Invalid financing assessment input payload';
      throw new AppError(errorMessage, 400, parseResult.error.flatten());
    }

    const validatedInput: FinancingAssessmentInput = parseResult.data;
    const assessmentResult = await executeFinancingAssessment(validatedInput);

    res.status(200).json({
      success: true,
      data: assessmentResult,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/financing/readiness
 * Returns a quick preview of current financial readiness metrics and data sufficiency
 * based on verified MongoDB records without requiring form submission.
 */
export const getFinancingReadinessSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let openingBalance: number | undefined = undefined;
    if (req.query.openingBalance !== undefined && req.query.openingBalance !== '') {
      const parsed = parseFloat(String(req.query.openingBalance));
      if (Number.isFinite(parsed)) openingBalance = parsed;
    }

    let asOfDate: string | undefined = undefined;
    if (typeof req.query.asOfDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.asOfDate)) {
      asOfDate = req.query.asOfDate;
    }

    // Default baseline parameters for readiness preview
    const baselineInput: FinancingAssessmentInput = {
      businessType: 'Limited Liability Company (LLC)',
      industry: 'General Commercial & Services',
      operatingMonths: 24,
      requestedAmount: 50000,
      purpose: 'working_capital',
      preferredRepaymentMonths: 12,
      openingBalance,
      asOfDate,
    };

    const readiness = await assessFinancialReadiness(baselineInput);

    res.status(200).json({
      success: true,
      data: readiness,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
