import { Request, Response, NextFunction } from 'express';
import { transactionRepository } from '../repositories/transactionRepository';
import {
  buildFinancialSummary,
  calculateCurrentCashBalance,
  resolveEffectiveAsOfDate,
} from '../services/financialCalculationService';
import { generateCashFlowForecast } from '../services/forecastingService';
import { analyzeFinancialRisks } from '../services/riskAnalysisService';
import { AppError } from '../middleware/errorHandler';

function parseFinancialQueryParams(req: Request): {
  asOfDate?: string;
  openingBalance?: number;
  minimumCashThreshold?: number;
} {
  let asOfDate: string | undefined = undefined;
  if (typeof req.query.asOfDate === 'string' && req.query.asOfDate.trim() !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.asOfDate)) {
      throw new AppError(
        "Invalid query parameter 'asOfDate'. Must be in YYYY-MM-DD format (e.g. 2026-10-12).",
        400
      );
    }
    asOfDate = req.query.asOfDate;
  }

  let openingBalance: number | undefined = undefined;
  if (req.query.openingBalance !== undefined && req.query.openingBalance !== '') {
    const parsed = parseFloat(String(req.query.openingBalance));
    if (!Number.isFinite(parsed)) {
      throw new AppError(
        "Invalid query parameter 'openingBalance'. Must be a finite numeric dollar value.",
        400
      );
    }
    openingBalance = parsed;
  }

  let minimumCashThreshold: number | undefined = undefined;
  if (req.query.minimumCashThreshold !== undefined && req.query.minimumCashThreshold !== '') {
    const parsedThreshold = parseFloat(String(req.query.minimumCashThreshold));
    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
      throw new AppError(
        "Invalid query parameter 'minimumCashThreshold'. Must be a non-negative numeric dollar value.",
        400
      );
    }
    minimumCashThreshold = parsedThreshold;
  }

  return { asOfDate, openingBalance, minimumCashThreshold };
}

/**
 * GET /api/financial/summary
 * Returns overall financial summary, monthly ledger, baseline run-rate, 30-day forecast, and risks.
 */
export const getFinancialSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { asOfDate, openingBalance, minimumCashThreshold } = parseFinancialQueryParams(req);
    const transactions = await transactionRepository.getAll();
    const summary = buildFinancialSummary(
      transactions,
      openingBalance,
      asOfDate,
      minimumCashThreshold
    );

    res.status(200).json({
      success: true,
      data: summary,
      meta: {
        timestamp: new Date().toISOString(),
        transactionCount: transactions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/financial/forecast
 * Returns dedicated 30-day deterministic cash flow forecast with daily trajectory and data sufficiency assessment.
 */
export const getForecast = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { asOfDate, openingBalance } = parseFinancialQueryParams(req);
    const transactions = await transactionRepository.getAll();
    const effectiveAsOfDate = resolveEffectiveAsOfDate(transactions, asOfDate);

    const isOpeningBalanceConfigured = typeof openingBalance === 'number';
    const currentCashBalance = calculateCurrentCashBalance(
      transactions,
      openingBalance,
      asOfDate ? effectiveAsOfDate : undefined
    );

    const forecast = generateCashFlowForecast(
      transactions,
      currentCashBalance,
      effectiveAsOfDate,
      isOpeningBalanceConfigured
    );

    res.status(200).json({
      success: true,
      data: forecast,
      meta: {
        asOfDate: effectiveAsOfDate,
        transactionCount: transactions.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/financial/risks
 * Returns financial risk detection alerts (shortages, deficits, overdue items, data sufficiency).
 */
export const getRisks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { asOfDate, openingBalance, minimumCashThreshold } = parseFinancialQueryParams(req);
    const transactions = await transactionRepository.getAll();
    const effectiveAsOfDate = resolveEffectiveAsOfDate(transactions, asOfDate);

    const isOpeningBalanceConfigured = typeof openingBalance === 'number';
    const currentCashBalance = calculateCurrentCashBalance(
      transactions,
      openingBalance,
      asOfDate ? effectiveAsOfDate : undefined
    );

    const forecast = generateCashFlowForecast(
      transactions,
      currentCashBalance,
      effectiveAsOfDate,
      isOpeningBalanceConfigured
    );

    const risks = analyzeFinancialRisks(
      transactions,
      forecast,
      currentCashBalance,
      effectiveAsOfDate,
      isOpeningBalanceConfigured,
      minimumCashThreshold
    );

    res.status(200).json({
      success: true,
      data: risks,
      meta: {
        asOfDate: effectiveAsOfDate,
        totalAlerts: risks.alerts.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
