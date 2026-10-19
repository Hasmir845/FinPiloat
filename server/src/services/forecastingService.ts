import {
  Transaction,
  CashFlowForecastResponse,
  ForecastDataPoint,
  DataSufficiency,
} from '../types';
import {
  toCents,
  fromCents,
  sumDollars,
  subtractDollars,
  multiplyDollars,
} from '../utils/money';
import { calculateTotalPaidIncome, calculateTotalPaidExpenses } from './financialCalculationService';

const MINIMUM_REQUIRED_DAYS = 14;
const MINIMUM_REQUIRED_TRANSACTIONS = 5;
const PENDING_RECEIVABLE_REALIZATION_FACTOR = 0.85; // Conservative 85% realization rate
const PENDING_PAYABLE_FULFILLMENT_FACTOR = 1.0; // 100% fulfillment of commitments

/**
 * Evaluates whether historical transaction data is sufficient for reliable baseline forecasting.
 */
export function evaluateDataSufficiency(
  transactions: Transaction[],
  asOfDate: string
): DataSufficiency {
  // Only evaluate paid transactions occurring on or before asOfDate
  const paidHistory = transactions.filter((tx) => tx.status === 'paid' && tx.date <= asOfDate);

  if (paidHistory.length === 0) {
    return {
      isSufficient: false,
      historicalDays: 0,
      paidTransactionCount: 0,
      statusMessage:
        'No historical paid transactions found on or before the reference date. Record completed sales and expense records to activate runway forecasting.',
      minimumRequiredDays: MINIMUM_REQUIRED_DAYS,
      minimumRequiredTransactions: MINIMUM_REQUIRED_TRANSACTIONS,
    };
  }

  // Find unique historical dates
  const uniqueDates = Array.from(new Set(paidHistory.map((tx) => tx.date))).sort();
  const earliestDate = uniqueDates[0];
  const latestDate = uniqueDates[uniqueDates.length - 1];

  const earliestTime = new Date(earliestDate).getTime();
  const asOfTime = new Date(asOfDate).getTime();
  const daySpan = Math.max(1, Math.round((asOfTime - earliestTime) / (1000 * 60 * 60 * 24)));

  const isSufficient =
    paidHistory.length >= MINIMUM_REQUIRED_TRANSACTIONS && daySpan >= MINIMUM_REQUIRED_DAYS;

  let statusMessage = `Verified ${paidHistory.length} paid transactions spanning ${daySpan} days of operating history.`;
  if (!isSufficient) {
    const reasons: string[] = [];
    if (paidHistory.length < MINIMUM_REQUIRED_TRANSACTIONS) {
      reasons.push(
        `requires at least ${MINIMUM_REQUIRED_TRANSACTIONS} paid records (currently: ${paidHistory.length})`
      );
    }
    if (daySpan < MINIMUM_REQUIRED_DAYS) {
      reasons.push(
        `requires at least ${MINIMUM_REQUIRED_DAYS} days of operating history (currently: ${daySpan} days)`
      );
    }
    statusMessage = `Insufficient historical data: ${reasons.join(
      ' and '
    )}. Baseline forecasting requires representative transaction history.`;
  }

  return {
    isSufficient,
    historicalDays: daySpan,
    paidTransactionCount: paidHistory.length,
    earliestDate,
    latestDate,
    statusMessage,
    minimumRequiredDays: MINIMUM_REQUIRED_DAYS,
    minimumRequiredTransactions: MINIMUM_REQUIRED_TRANSACTIONS,
  };
}

/**
 * Deterministic Baseline Cash Flow Forecasting Service
 * 
 * METHODOLOGY:
 * 1. Analyzes trailing 60-day paid velocity up to asOfDate to compute daily run-rates.
 * 2. Incorporates scheduled pending invoices in the next 30 days using explicit realization factors.
 *    - 85% realization factor for pending receivables (customers may delay).
 *    - 100% fulfillment factor for pending payables (bills must be honored).
 * 3. Builds a daily timeline of projected cash movements and ending balances for 30 days.
 * 4. Transparently disclaims all assumptions and provides data sufficiency evaluation.
 */
export function generateCashFlowForecast(
  transactions: Transaction[],
  startingCashBalance: number,
  asOfDate = '2026-10-12',
  isOpeningBalanceConfigured = true,
  horizonDays = 30
): CashFlowForecastResponse {
  const dataSufficiency = evaluateDataSufficiency(transactions, asOfDate);

  // Trailing 60-day window
  const asOfDateObj = new Date(asOfDate);
  const trailing60DateObj = new Date(asOfDateObj);
  trailing60DateObj.setDate(trailing60DateObj.getDate() - 60);
  const trailing60Str = trailing60DateObj.toISOString().split('T')[0];

  const trailingPaidIncome = calculateTotalPaidIncome(transactions, trailing60Str, asOfDate);
  const trailingPaidExpense = calculateTotalPaidExpenses(transactions, trailing60Str, asOfDate);

  // Daily run-rates (only if data is sufficient)
  const windowDays = 60;
  const dailyRunRateIncome = dataSufficiency.isSufficient
    ? fromCents(Math.round(toCents(trailingPaidIncome) / windowDays))
    : 0;
  const dailyRunRateExpense = dataSufficiency.isSufficient
    ? fromCents(Math.round(toCents(trailingPaidExpense) / windowDays))
    : 0;
  const dailyAverageBurnOrGain = subtractDollars(dailyRunRateIncome, dailyRunRateExpense);

  // Forward 30-day window boundary
  const forwardDateObj = new Date(asOfDateObj);
  forwardDateObj.setDate(forwardDateObj.getDate() + horizonDays);
  const forwardMaxStr = forwardDateObj.toISOString().split('T')[0];

  // Extract scheduled pending transactions in the 30-day forecast horizon
  const scheduledPendingTxs = transactions.filter(
    (tx) => tx.status === 'pending' && tx.date > asOfDate && tx.date <= forwardMaxStr
  );

  // Map pending transactions by date for quick daily lookup
  const pendingByDate = new Map<string, { income: number; expense: number; descriptions: string[] }>();
  let totalScheduledPendingInflow = 0;
  let totalScheduledPendingOutflow = 0;

  for (const tx of scheduledPendingTxs) {
    const existing = pendingByDate.get(tx.date) || { income: 0, expense: 0, descriptions: [] };
    if (tx.type === 'income') {
      existing.income = sumDollars([existing.income, tx.amount]);
      totalScheduledPendingInflow = sumDollars([totalScheduledPendingInflow, tx.amount]);
    } else {
      existing.expense = sumDollars([existing.expense, tx.amount]);
      totalScheduledPendingOutflow = sumDollars([totalScheduledPendingOutflow, tx.amount]);
    }
    existing.descriptions.push(tx.description);
    pendingByDate.set(tx.date, existing);
  }

  // Build daily timeline
  const timeline: ForecastDataPoint[] = [];
  let rollingBalance = startingCashBalance;
  let totalExpectedInflow = 0;
  let totalExpectedOutflow = 0;

  for (let day = 1; day <= horizonDays; day++) {
    const curDateObj = new Date(asOfDateObj);
    curDateObj.setDate(curDateObj.getDate() + day);
    const dateStr = curDateObj.toISOString().split('T')[0];

    const periodLabel = curDateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const pendingItem = pendingByDate.get(dateStr);
    const scheduledInflowRaw = pendingItem ? pendingItem.income : 0;
    const scheduledOutflowRaw = pendingItem ? pendingItem.expense : 0;

    // Apply realization factors
    const realizedPendingInflow = multiplyDollars(
      scheduledInflowRaw,
      PENDING_RECEIVABLE_REALIZATION_FACTOR
    );
    const realizedPendingOutflow = multiplyDollars(
      scheduledOutflowRaw,
      PENDING_PAYABLE_FULFILLMENT_FACTOR
    );

    const dayExpectedInflow = sumDollars([dailyRunRateIncome, realizedPendingInflow]);
    const dayExpectedOutflow = sumDollars([dailyRunRateExpense, realizedPendingOutflow]);
    const netMovement = subtractDollars(dayExpectedInflow, dayExpectedOutflow);

    rollingBalance = sumDollars([rollingBalance, netMovement]);
    totalExpectedInflow = sumDollars([totalExpectedInflow, dayExpectedInflow]);
    totalExpectedOutflow = sumDollars([totalExpectedOutflow, dayExpectedOutflow]);

    timeline.push({
      date: dateStr,
      periodLabel,
      dayIndex: day,
      projectedBalance: rollingBalance,
      expectedInflow: dayExpectedInflow,
      expectedOutflow: dayExpectedOutflow,
      netMovement,
      scheduledPendingInflow: realizedPendingInflow,
      scheduledPendingOutflow: realizedPendingOutflow,
      runRateInflow: dailyRunRateIncome,
      runRateOutflow: dailyRunRateExpense,
      notes: pendingItem && pendingItem.descriptions.length > 0
        ? `Scheduled: ${pendingItem.descriptions.join(', ')}`
        : undefined,
    });
  }

  const projectedEndingBalance = rollingBalance;
  const projectedNetChange = subtractDollars(projectedEndingBalance, startingCashBalance);

  return {
    asOfDate,
    forecastHorizonDays: horizonDays,
    startingCashBalance,
    isOpeningBalanceConfigured,
    projectedEndingBalance,
    projectedNetChange,
    dailyAverageBurnOrGain,
    totalExpectedInflow,
    totalExpectedOutflow,
    totalScheduledPendingInflow,
    totalScheduledPendingOutflow,
    realizedPendingInflowFactor: PENDING_RECEIVABLE_REALIZATION_FACTOR,
    realizedPendingOutflowFactor: PENDING_PAYABLE_FULFILLMENT_FACTOR,
    assumptions: [
      'Operating velocity is linearly extrapolated from verified trailing 60-day paid transactions',
      `Conservative ${Math.round(
        PENDING_RECEIVABLE_REALIZATION_FACTOR * 100
      )}% realization factor applied to scheduled customer receivables to reflect payment delay risks`,
      `100% fulfillment factor applied to scheduled pending supplier, statutory, and payroll obligations`,
      'Assumes ordinary course of business without unbudgeted emergency capital outlays',
      'Deterministic baseline extrapolation: represents run-rate benchmark, not an AI or guaranteed forecast',
    ],
    confidenceLimitationsNotice:
      'Deterministic Baseline Forecast: Extrapolated from verified operating velocity and pending invoice ledger. Intended as a baseline benchmark, not an audited forecast or guaranteed outcome. Actual cash movements will vary based on customer payment timing.',
    methodologyDescription:
      'Trailing 60-day daily velocity run-rate + scheduled pending invoice settlement factors (85% AR realization, 100% AP fulfillment).',
    dataSufficiency,
    timeline,
  };
}
