import {
  Transaction,
  MonthlyFinancialSummary,
  BaselineProjection,
  FinancialSummaryResponse,
} from '../types';
import { sumDollars, subtractDollars, toCents, fromCents } from '../lib/money';

export const DEFAULT_OPENING_BALANCE = 100_000;

/**
 * Calculates total paid income within an optional date range.
 * Only includes transactions with `status === 'paid'` and `type === 'income'`.
 */
export function calculateTotalPaidIncome(
  transactions: Transaction[],
  startDate?: string,
  endDate?: string
): number {
  const filtered = transactions.filter((tx) => {
    if (tx.status !== 'paid' || tx.type !== 'income') return false;
    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;
    return true;
  });

  return sumDollars(filtered.map((tx) => tx.amount));
}

/**
 * Calculates total paid expenses within an optional date range.
 * Only includes transactions with `status === 'paid'` and `type === 'expense'`.
 */
export function calculateTotalPaidExpenses(
  transactions: Transaction[],
  startDate?: string,
  endDate?: string
): number {
  const filtered = transactions.filter((tx) => {
    if (tx.status !== 'paid' || tx.type !== 'expense') return false;
    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;
    return true;
  });

  return sumDollars(filtered.map((tx) => tx.amount));
}

/**
 * Calculates net cash flow = Paid Income - Paid Expenses.
 */
export function calculateNetCashFlow(
  transactions: Transaction[],
  startDate?: string,
  endDate?: string
): number {
  const paidIncome = calculateTotalPaidIncome(transactions, startDate, endDate);
  const paidExpense = calculateTotalPaidExpenses(transactions, startDate, endDate);
  return subtractDollars(paidIncome, paidExpense);
}

/**
 * Calculates current cash balance = Opening balance + all paid cash movements.
 * Strictly excludes pending invoices / payables.
 */
export function calculateCurrentCashBalance(
  transactions: Transaction[],
  openingBalance?: number | null,
  asOfDate?: string
): number {
  const paidIncome = calculateTotalPaidIncome(transactions, undefined, asOfDate);
  const paidExpense = calculateTotalPaidExpenses(transactions, undefined, asOfDate);
  const netPaidCash = subtractDollars(paidIncome, paidExpense);
  const base = typeof openingBalance === 'number' && Number.isFinite(openingBalance) ? openingBalance : 0;
  return sumDollars([base, netPaidCash]);
}

/**
 * Calculates total pending receivables (AR) = pending income.
 */
export function calculatePendingReceivables(
  transactions: Transaction[],
  startDate?: string,
  endDate?: string
): number {
  const filtered = transactions.filter((tx) => {
    if (tx.status !== 'pending' || tx.type !== 'income') return false;
    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;
    return true;
  });

  return sumDollars(filtered.map((tx) => tx.amount));
}

/**
 * Calculates total pending payables (AP) = pending expenses.
 */
export function calculatePendingPayables(
  transactions: Transaction[],
  startDate?: string,
  endDate?: string
): number {
  const filtered = transactions.filter((tx) => {
    if (tx.status !== 'pending' || tx.type !== 'expense') return false;
    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;
    return true;
  });

  return sumDollars(filtered.map((tx) => tx.amount));
}

/**
 * Calculates monthly summaries chronologically.
 * Rolling balance: Month N closing = Month N+1 opening.
 */
export function calculateMonthlySummaries(
  transactions: Transaction[],
  initialOpeningBalance?: number | null
): MonthlyFinancialSummary[] {
  if (transactions.length === 0) return [];

  const monthKeysSet = new Set<string>();
  for (const tx of transactions) {
    if (tx.date && tx.date.length >= 7) {
      monthKeysSet.add(tx.date.substring(0, 7));
    }
  }

  const sortedMonthKeys = Array.from(monthKeysSet).sort();
  const baseOpening = typeof initialOpeningBalance === 'number' && Number.isFinite(initialOpeningBalance) ? initialOpeningBalance : 0;
  let rollingBalance = baseOpening;
  const summaries: MonthlyFinancialSummary[] = [];

  for (const monthKey of sortedMonthKeys) {
    const monthStart = `${monthKey}-01`;
    const monthEnd = `${monthKey}-31`;

    const paidIncome = calculateTotalPaidIncome(transactions, monthStart, monthEnd);
    const paidExpense = calculateTotalPaidExpenses(transactions, monthStart, monthEnd);
    const netCashFlow = subtractDollars(paidIncome, paidExpense);

    const monthOpening = rollingBalance;
    const monthClosing = sumDollars([monthOpening, netCashFlow]);
    rollingBalance = monthClosing;

    const pendingReceivables = calculatePendingReceivables(transactions, monthStart, monthEnd);
    const pendingPayables = calculatePendingPayables(transactions, monthStart, monthEnd);

    const monthTxCount = transactions.filter(
      (tx) => tx.date && tx.date.startsWith(monthKey)
    ).length;

    const [year, month] = monthKey.split('-');
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const monthLabel = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });

    summaries.push({
      monthKey,
      monthLabel,
      paidIncome,
      paidExpense,
      netCashFlow,
      openingBalance: monthOpening,
      closingBalance: monthClosing,
      pendingReceivables,
      pendingPayables,
      transactionCount: monthTxCount,
    });
  }

  return summaries;
}

/**
 * Calculates baseline 30-day cash projection with transparent run-rate methodology.
 */
export function calculateBaseline30DayProjection(
  transactions: Transaction[],
  currentCashBalance: number,
  referenceDate = '2026-10-12'
): BaselineProjection {
  const refDateObj = new Date(referenceDate);
  const trailing60DateObj = new Date(refDateObj);
  trailing60DateObj.setDate(trailing60DateObj.getDate() - 60);
  const trailing60Str = trailing60DateObj.toISOString().split('T')[0];

  const trailingPaidIncome = calculateTotalPaidIncome(transactions, trailing60Str, referenceDate);
  const trailingPaidExpense = calculateTotalPaidExpenses(transactions, trailing60Str, referenceDate);
  const trailingNetCashFlow = subtractDollars(trailingPaidIncome, trailingPaidExpense);

  const dailyAverageBurnOrGain = fromCents(Math.round(toCents(trailingNetCashFlow) / 60));

  const forward30DateObj = new Date(refDateObj);
  forward30DateObj.setDate(forward30DateObj.getDate() + 30);
  const forward30Str = forward30DateObj.toISOString().split('T')[0];

  const pendingInflow = calculatePendingReceivables(transactions, referenceDate, forward30Str);
  const pendingOutflow = calculatePendingPayables(transactions, referenceDate, forward30Str);

  const conservativePendingInflow = fromCents(Math.round(toCents(pendingInflow) * 0.9));
  const expectedPendingNet = subtractDollars(conservativePendingInflow, pendingOutflow);

  const baselineRunRate30Days = fromCents(toCents(dailyAverageBurnOrGain) * 30);
  const projectedNetChange = sumDollars([baselineRunRate30Days, expectedPendingNet]);
  const projectedEndingBalance = sumDollars([currentCashBalance, projectedNetChange]);

  return {
    baselineMethod: 'Trailing 60-day daily run-rate + scheduled pending settlement factor',
    assumptions: [
      'Operating cash velocity extrapolated from trailing 60 calendar days',
      '90% realization rate applied to scheduled pending customer receivables',
      '100% fulfillment rate applied to scheduled pending supplier payables',
      'Assumes zero unbudgeted extraordinary capital equipment outlays',
      'Baseline extrapolation model: not an AI prediction',
    ],
    projectionDays: 30,
    dailyAverageBurnOrGain,
    expectedPendingInflow: pendingInflow,
    expectedPendingOutflow: pendingOutflow,
    projectedEndingBalance,
    projectedNetChange,
    statusNotice:
      'Baseline Projection: Extrapolated from verified 60-day operating velocity and pending invoice ledger. Intended as a baseline benchmark, not an AI forecast.',
  };
}

/**
 * Resolves the effective anchor date for financial evaluation.
 * If an explicit date is provided, it is used. Otherwise defaults to today or the latest transaction date.
 */
export function resolveEffectiveAsOfDate(
  transactions: Transaction[],
  requestedAsOfDate?: string
): string {
  if (requestedAsOfDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedAsOfDate)) {
    return requestedAsOfDate;
  }
  const today = new Date().toISOString().split('T')[0];
  const maxPaidTxDate = transactions
    .filter((tx) => tx.status === 'paid')
    .reduce((max, tx) => (tx.date && tx.date > max ? tx.date : max), '');
  return maxPaidTxDate > today ? maxPaidTxDate : today;
}

/**
 * Builds the full financial summary model from transactions.
 */
export function buildFinancialSummary(
  transactions: Transaction[],
  openingBalance?: number | null,
  asOfDate?: string
): FinancialSummaryResponse {
  const effectiveAsOfDate = resolveEffectiveAsOfDate(transactions, asOfDate);
  const isOpeningBalanceConfigured =
    typeof openingBalance === 'number' && Number.isFinite(openingBalance);
  const configuredOpening = isOpeningBalanceConfigured ? (openingBalance as number) : null;
  const currentCashBalance = calculateCurrentCashBalance(
    transactions,
    openingBalance,
    asOfDate ? effectiveAsOfDate : undefined
  );
  const totalPaidIncome = calculateTotalPaidIncome(
    transactions,
    undefined,
    asOfDate ? effectiveAsOfDate : undefined
  );
  const totalPaidExpenses = calculateTotalPaidExpenses(
    transactions,
    undefined,
    asOfDate ? effectiveAsOfDate : undefined
  );
  const netCashFlow = subtractDollars(totalPaidIncome, totalPaidExpenses);
  const cumulativeNetCash = netCashFlow;
  const pendingReceivables = calculatePendingReceivables(transactions);
  const pendingPayables = calculatePendingPayables(transactions);
  const monthlySummaries = calculateMonthlySummaries(transactions, openingBalance);
  const baseline30DayProjection = calculateBaseline30DayProjection(
    transactions,
    currentCashBalance,
    effectiveAsOfDate
  );

  return {
    openingBalance: configuredOpening,
    isOpeningBalanceConfigured,
    currentCashBalance,
    cumulativeNetCash,
    totalPaidIncome,
    totalPaidExpenses,
    netCashFlow,
    pendingReceivables,
    pendingPayables,
    monthlySummaries,
    baseline30DayProjection,
    asOfDate: effectiveAsOfDate,
    isDemoData: true,
  };
}
