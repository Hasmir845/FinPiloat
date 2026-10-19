import {
  Transaction,
  CashFlowForecastResponse,
  RiskAlert,
  RiskAnalysisResponse,
  RiskSeverity,
} from '../types';
import { formatCurrency } from '../utils/formatting';
import { subtractDollars } from '../utils/money';

const MINIMUM_SAFETY_BUFFER = 15_000; // $15,000 baseline liquidity buffer

/**
 * Reusable Financial Risk Analysis Service
 * 
 * Rules:
 * 1. Potential cash shortage within the 30-day forecast horizon.
 * 2. Operating deficit (expenses exceeding income for selected period).
 * 3. Overdue receivables or payables (ONLY if valid due dates exist in the schema; never invent due dates).
 * 4. Missing or insufficient data limiting forecast reliability.
 */
export function analyzeFinancialRisks(
  transactions: Transaction[],
  forecast: CashFlowForecastResponse,
  currentCashBalance: number,
  asOfDate = '2026-10-13',
  isOpeningBalanceConfigured = true,
  minimumCashThreshold?: number
): RiskAnalysisResponse {
  const alerts: RiskAlert[] = [];
  const effectiveSafetyThreshold =
    typeof minimumCashThreshold === 'number' &&
    Number.isFinite(minimumCashThreshold) &&
    minimumCashThreshold >= 0
      ? minimumCashThreshold
      : MINIMUM_SAFETY_BUFFER;

  // =========================================================================
  // RULE 1: Potential Cash Shortage / Buffer Compression within Forecast Horizon
  // =========================================================================
  const timeline = forecast.timeline;
  let minProjectedBalance = startingMin(timeline, currentCashBalance);
  let minBalancePoint = timeline[0] || null;

  for (const point of timeline) {
    if (point.projectedBalance < minProjectedBalance) {
      minProjectedBalance = point.projectedBalance;
      minBalancePoint = point;
    }
  }

  if (minProjectedBalance < 0 && minBalancePoint) {
    const shortfall = Math.abs(minProjectedBalance);
    alerts.push({
      id: 'risk-cash-shortage',
      severity: 'high',
      category: 'Cash Runway',
      title: 'Potential Cash Shortage Detected',
      description: `Projected cash balance is estimated to drop to ${formatCurrency(
        minProjectedBalance
      )} on ${minBalancePoint.date} (${minBalancePoint.periodLabel}, Day ${
        minBalancePoint.dayIndex
      }). Estimated deficit of ${formatCurrency(shortfall)} within the 30-day forecast horizon.`,
      impact: 'Immediate risk of payment default, overdraft charges, or operational disruption.',
      date: minBalancePoint.date,
      relevantPeriod: `Next 30 Days (Trough on ${minBalancePoint.periodLabel})`,
      suggestedAction:
        'Expedite customer collections for outstanding invoices, negotiate temporary extensions on pending payables, or access short-term credit facilities.',
    });
  } else if (
    minProjectedBalance < effectiveSafetyThreshold &&
    minProjectedBalance >= 0 &&
    minBalancePoint &&
    isOpeningBalanceConfigured
  ) {
    alerts.push({
      id: 'risk-buffer-compression',
      severity: 'medium',
      category: 'Cash Runway',
      title: 'Operating Cash Buffer Compression',
      description: `Projected cash trough reaches ${formatCurrency(
        minProjectedBalance
      )} on ${minBalancePoint.periodLabel}, falling below the configured minimum safety threshold of ${formatCurrency(
        effectiveSafetyThreshold
      )}.`,
      impact: 'Reduced working capital cushion against unexpected operational expenses or settlement delays.',
      date: minBalancePoint.date,
      relevantPeriod: `Day ${minBalancePoint.dayIndex} (${minBalancePoint.periodLabel})`,
      suggestedAction:
        'Defer non-essential capital equipment acquisitions and confirm confirmed deposit dates with key accounts.',
    });
  }

  // =========================================================================
  // RULE 2: Expenses Exceeding Income for Selected Period (Operating Deficit)
  // =========================================================================
  // Evaluate the current active month (month containing asOfDate)
  const currentMonthKey = asOfDate.substring(0, 7); // e.g. "2026-10"
  let currentPeriodPaidTxs = transactions.filter(
    (tx) => tx.status === 'paid' && tx.date.startsWith(currentMonthKey) && tx.date <= asOfDate
  );

  // If no transactions in current month up to asOfDate, check all paid transactions in the latest active month
  if (currentPeriodPaidTxs.length === 0) {
    const latestMonthKey = transactions
      .filter((tx) => tx.status === 'paid' && tx.date)
      .reduce((max, tx) => (tx.date.substring(0, 7) > max ? tx.date.substring(0, 7) : max), '');
    if (latestMonthKey) {
      currentPeriodPaidTxs = transactions.filter(
        (tx) => tx.status === 'paid' && tx.date.startsWith(latestMonthKey)
      );
    }
  }

  const monthPaidIncome = currentPeriodPaidTxs
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthPaidExpense = currentPeriodPaidTxs
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (monthPaidExpense > monthPaidIncome && currentPeriodPaidTxs.length > 0) {
    const netBurn = subtractDollars(monthPaidExpense, monthPaidIncome);

    alerts.push({
      id: `risk-operating-deficit-${currentMonthKey}`,
      severity: 'medium',
      category: 'Operating Deficit',
      title: 'Current Period Operating Deficit',
      description: `In the evaluated period (${currentMonthKey}), paid expenses of ${formatCurrency(
        monthPaidExpense
      )} exceeded paid income of ${formatCurrency(
        monthPaidIncome
      )} by ${formatCurrency(netBurn)} (net cash flow: -${formatCurrency(netBurn)}).`,
      impact: `Reduces liquid reserves at a net burn rate of ${formatCurrency(netBurn)} this period.`,
      date: asOfDate,
      relevantPeriod: currentMonthKey,
      suggestedAction:
        'Conduct a cost center review across major operating expenditures (freight, facilities, subscriptions) and prioritize delivery on billable accounts.',
    });
  }

  // =========================================================================
  // RULE 3: Overdue Receivables or Payables (ONLY if valid due dates exist in schema)
  // =========================================================================
  // STRICT CONSTRAINT: Do not invent due dates or classify invoices as overdue without a valid due date.
  for (const tx of transactions) {
    const possibleDueDate = (tx as any).dueDate;
    if (typeof possibleDueDate === 'string' && possibleDueDate.length >= 10) {
      if (tx.status === 'pending' && possibleDueDate < asOfDate) {
        const isReceivable = tx.type === 'income';
        const severity: RiskSeverity = tx.amount >= 10_000 ? 'high' : 'medium';
        alerts.push({
          id: `risk-overdue-${tx.id}`,
          severity,
          category: isReceivable ? 'Receivables' : 'Payables',
          title: isReceivable ? 'Overdue Customer Receivable' : 'Overdue Supplier Commitment',
          description: `${isReceivable ? 'Receivable from' : 'Payable to'} ${
            tx.counterparty || 'Counterparty'
          } for ${formatCurrency(tx.amount)} (${tx.description}) was due on ${possibleDueDate} and remains unsettled.`,
          impact: isReceivable
            ? `Delays expected working capital inflow of ${formatCurrency(tx.amount)}.`
            : `Risk of vendor credit hold or late interest penalties on ${formatCurrency(tx.amount)}.`,
          date: possibleDueDate,
          relevantPeriod: `Due date: ${possibleDueDate}`,
          relatedTransactionId: tx.id,
          suggestedAction: isReceivable
            ? 'Issue immediate payment reminder notice and verify invoice receipt with client accounting.'
            : 'Initiate vendor remittance or request scheduled payment arrangement.',
        });
      }
    }
  }

  // =========================================================================
  // RULE 4: Missing or Insufficient Data Limiting Forecast Reliability
  // =========================================================================
  if (!forecast.dataSufficiency.isSufficient) {
    alerts.push({
      id: 'risk-insufficient-history',
      severity: 'medium',
      category: 'Data Quality',
      title: 'Insufficient Historical Data for Reliable Runway Modeling',
      description: `${forecast.dataSufficiency.statusMessage} Baseline velocity projections require adequate transaction history to prevent skewed forecasts.`,
      impact: 'Forecast reliability is limited; runway estimates may not reflect recurring seasonal patterns.',
      date: asOfDate,
      suggestedAction:
        'Record at least 14 days and 5 completed transactions to establish a representative operating cash velocity.',
    });
  }

  if (!isOpeningBalanceConfigured) {
    alerts.push({
      id: 'risk-unconfigured-opening-balance',
      severity: 'low',
      category: 'Data Quality',
      title: 'Opening Cash Balance Not Configured',
      description:
        'An initial opening bank balance has not been specified. Operating cash calculations reflect cumulative net cash movements since inception rather than absolute liquid bank holdings.',
      impact: 'Total liquid reserves and absolute bankruptcy runway horizon cannot be validated with certainty.',
      date: asOfDate,
      suggestedAction:
        'Specify your company starting bank balance via Cash Flow Settings or the openingBalance parameter.',
    });
  }

  // Determine Overall Risk Level
  const highCount = alerts.filter((a) => a.severity === 'high').length;
  const mediumCount = alerts.filter((a) => a.severity === 'medium').length;
  const lowCount = alerts.filter((a) => a.severity === 'low').length;

  let overallRiskLevel: 'low' | 'moderate' | 'elevated' | 'critical' = 'low';
  if (highCount >= 2) {
    overallRiskLevel = 'critical';
  } else if (highCount === 1 || mediumCount >= 2) {
    overallRiskLevel = 'elevated';
  } else if (mediumCount === 1) {
    overallRiskLevel = 'moderate';
  }

  return {
    asOfDate,
    alerts,
    overallRiskLevel,
    minimumCashThreshold: effectiveSafetyThreshold,
    summaryCounts: {
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      total: alerts.length,
    },
  };
}

function startingMin(timeline: { projectedBalance: number }[], fallback: number): number {
  if (timeline.length === 0) return fallback;
  return timeline[0].projectedBalance;
}
