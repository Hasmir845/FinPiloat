import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotalPaidIncome,
  calculateTotalPaidExpenses,
  calculateNetCashFlow,
  calculateCurrentCashBalance,
  calculatePendingReceivables,
  calculatePendingPayables,
  calculateMonthlySummaries,
  calculateBaseline30DayProjection,
  buildFinancialSummary,
} from '../financialCalculationService';
import {
  generateCashFlowForecast,
  evaluateDataSufficiency,
} from '../forecastingService';
import { analyzeFinancialRisks } from '../riskAnalysisService';
import { Transaction } from '../../types';
import { toCents, fromCents, sumDollars, subtractDollars } from '../../utils/money';

describe('Financial Calculation Engine & Forecasting Unit Tests', () => {
  // Test fixture helper
  const createTx = (
    id: string,
    date: string,
    type: 'income' | 'expense',
    amount: number,
    status: 'paid' | 'pending',
    extra?: Partial<Transaction>
  ): Transaction => ({
    id,
    date,
    description: `Test Transaction ${id}`,
    type,
    category: type === 'income' ? 'Revenue / Sales' : 'Payroll & Wages',
    amount,
    status,
    createdAt: '2026-10-12T00:00:00.000Z',
    updatedAt: '2026-10-12T00:00:00.000Z',
    ...extra,
  });

  test('1. Separates paid cash movements from pending invoices (no double counting or false cash)', () => {
    const transactions: Transaction[] = [
      createTx('tx-1', '2026-10-01', 'income', 10000, 'paid'),
      createTx('tx-2', '2026-10-02', 'income', 5000, 'pending'), // Invoice sent, not received
      createTx('tx-3', '2026-10-03', 'expense', 4000, 'paid'),
      createTx('tx-4', '2026-10-04', 'expense', 2500, 'pending'), // Bill received, not paid
    ];

    const paidIncome = calculateTotalPaidIncome(transactions);
    const pendingReceivables = calculatePendingReceivables(transactions);
    const paidExpenses = calculateTotalPaidExpenses(transactions);
    const pendingPayables = calculatePendingPayables(transactions);

    assert.equal(paidIncome, 10000, 'Paid income should only reflect paid transactions');
    assert.equal(pendingReceivables, 5000, 'Pending receivables should reflect pending income');
    assert.equal(paidExpenses, 4000, 'Paid expenses should only reflect paid transactions');
    assert.equal(pendingPayables, 2500, 'Pending payables should reflect pending expenses');

    // Net cash flow must only reflect paid amounts ($10,000 - $4,000 = $6,000)
    const netCashFlow = calculateNetCashFlow(transactions);
    assert.equal(netCashFlow, 6000, 'Net cash flow must equal paid income minus paid expenses');

    // Balance with $100,000 opening: 100,000 + 10,000 - 4,000 = 106,000
    const balance = calculateCurrentCashBalance(transactions, 100000);
    assert.equal(balance, 106000, 'Current balance must exclude pending amounts');
  });

  test('2. Handles negative net cash flow correctly', () => {
    const transactions: Transaction[] = [
      createTx('tx-1', '2026-10-01', 'income', 5000, 'paid'),
      createTx('tx-2', '2026-10-05', 'expense', 12500, 'paid'),
    ];

    const netCash = calculateNetCashFlow(transactions);
    assert.equal(netCash, -7500, 'Net cash flow must accurately evaluate negative result');

    const balance = calculateCurrentCashBalance(transactions, 50000);
    assert.equal(balance, 42500, 'Balance must accurately deduct net burn');
  });

  test('3. Handles zero values and empty transaction sets gracefully', () => {
    const emptyTx: Transaction[] = [];

    assert.equal(calculateTotalPaidIncome(emptyTx), 0);
    assert.equal(calculateTotalPaidExpenses(emptyTx), 0);
    assert.equal(calculateNetCashFlow(emptyTx), 0);
    assert.equal(calculateCurrentCashBalance(emptyTx, 25000), 25000);
    assert.equal(calculatePendingReceivables(emptyTx), 0);
    assert.equal(calculatePendingPayables(emptyTx), 0);

    const summaries = calculateMonthlySummaries(emptyTx);
    assert.equal(summaries.length, 0, 'Empty transactions yield empty monthly summaries');

    // Data sufficiency on empty set
    const sufficiency = evaluateDataSufficiency(emptyTx, '2026-10-12');
    assert.equal(sufficiency.isSufficient, false);
    assert.equal(sufficiency.paidTransactionCount, 0);
  });

  test('4. Integer-cents arithmetic prevents JavaScript floating-point drift', () => {
    // Classic 0.1 + 0.2 floating point check
    const valA = 0.1;
    const valB = 0.2;
    assert.equal(sumDollars([valA, valB]), 0.3, '0.1 + 0.2 must equal exactly 0.30');

    // Subtraction precision
    assert.equal(subtractDollars(100.05, 50.02), 50.03, '100.05 - 50.02 must equal exactly 50.03');

    // Minor unit conversion
    assert.equal(toCents(123.456), 12346);
    assert.equal(fromCents(12346), 123.46);
  });

  test('5. Computes monthly summaries with rolling opening and closing balances', () => {
    const transactions: Transaction[] = [
      createTx('tx-1', '2026-05-10', 'income', 20000, 'paid'),
      createTx('tx-2', '2026-05-20', 'expense', 10000, 'paid'),
      createTx('tx-3', '2026-06-05', 'income', 15000, 'paid'),
      createTx('tx-4', '2026-06-25', 'expense', 8000, 'paid'),
    ];

    const openingBalance = 50000;
    const summaries = calculateMonthlySummaries(transactions, openingBalance);

    assert.equal(summaries.length, 2, 'Should produce 2 monthly summary buckets');

    // Month 1 (May 2026)
    assert.equal(summaries[0].monthKey, '2026-05');
    assert.equal(summaries[0].openingBalance, 50000);
    assert.equal(summaries[0].paidIncome, 20000);
    assert.equal(summaries[0].paidExpense, 10000);
    assert.equal(summaries[0].netCashFlow, 10000);
    assert.equal(summaries[0].closingBalance, 60000);

    // Month 2 (June 2026): opening must equal May closing ($60,000)
    assert.equal(summaries[1].monthKey, '2026-06');
    assert.equal(summaries[1].openingBalance, 60000, 'June opening must equal May closing');
    assert.equal(summaries[1].netCashFlow, 7000);
    assert.equal(summaries[1].closingBalance, 67000);
  });

  test('6. Month boundaries (first and last day of month) are correctly included', () => {
    const transactions: Transaction[] = [
      createTx('tx-1', '2026-10-01', 'income', 1000, 'paid'), // First day
      createTx('tx-2', '2026-10-15', 'income', 2000, 'paid'),
      createTx('tx-3', '2026-10-31', 'income', 3000, 'paid'), // Last day
    ];

    const summaries = calculateMonthlySummaries(transactions, 10000);
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].paidIncome, 6000, 'Should sum all transactions in October including boundaries');
    assert.equal(summaries[0].transactionCount, 3);
  });

  test('7. Missing / Unconfigured opening balance is reported explicitly without arbitrary fallback', () => {
    const transactions: Transaction[] = [
      createTx('tx-1', '2026-10-02', 'income', 8000, 'paid'),
      createTx('tx-2', '2026-10-05', 'expense', 3000, 'paid'),
    ];

    // Omit openingBalance (undefined)
    const summary = buildFinancialSummary(transactions, undefined, '2026-10-12');

    assert.equal(summary.isOpeningBalanceConfigured, false, 'Must report opening balance is not configured');
    assert.equal(summary.openingBalance, null, 'Unconfigured opening balance must be null');
    assert.equal(summary.currentCashBalance, 5000, 'Current cash balance must equal net cumulative cash ($5,000)');
    assert.equal(summary.cumulativeNetCash, 5000);
  });

  test('8. Insufficient historical data detection correctly triggers warning state', () => {
    // Only 2 transactions spanning 3 days (less than required 14 days and 5 transactions)
    const sparseTxs: Transaction[] = [
      createTx('tx-1', '2026-10-08', 'income', 10000, 'paid'),
      createTx('tx-2', '2026-10-10', 'expense', 4000, 'paid'),
    ];

    const sufficiency = evaluateDataSufficiency(sparseTxs, '2026-10-12');
    assert.equal(sufficiency.isSufficient, false);
    assert.ok(sufficiency.statusMessage.includes('Insufficient historical data'));
    assert.equal(sufficiency.paidTransactionCount, 2);

    const forecast = generateCashFlowForecast(sparseTxs, 50000, '2026-10-12');
    assert.equal(forecast.dataSufficiency.isSufficient, false);
    assert.equal(forecast.dailyAverageBurnOrGain, 0, 'Run rate velocity must be 0 when data is insufficient');
  });

  test('9. Deterministic next-30-day forecast generates 30 daily data points with conservative AR factor', () => {
    const transactions: Transaction[] = [
      // Verified 60-day history (6 transactions spanning > 30 days)
      createTx('tx-1', '2026-08-15', 'income', 30000, 'paid'),
      createTx('tx-2', '2026-08-25', 'expense', 15000, 'paid'),
      createTx('tx-3', '2026-09-05', 'income', 40000, 'paid'),
      createTx('tx-4', '2026-09-20', 'expense', 20000, 'paid'),
      createTx('tx-5', '2026-10-02', 'income', 25000, 'paid'),
      createTx('tx-6', '2026-10-10', 'expense', 12000, 'paid'),
      // Scheduled pending transactions in next 30 days (asOfDate = 2026-10-12)
      createTx('tx-pending-in', '2026-10-20', 'income', 20000, 'pending'), // Scheduled AR
      createTx('tx-pending-out', '2026-10-25', 'expense', 10000, 'pending'), // Scheduled AP
    ];

    const startingCash = 100000;
    const forecast = generateCashFlowForecast(transactions, startingCash, '2026-10-12', true, 30);

    assert.equal(forecast.timeline.length, 30, 'Must generate exactly 30 daily forecast points');
    assert.equal(forecast.dataSufficiency.isSufficient, true, 'Sufficient data must be verified');

    // Conservative realization check:
    // Scheduled pending AR ($20,000) must receive 85% realization factor ($17,000), not treated as guaranteed
    const day20 = forecast.timeline.find((p) => p.date === '2026-10-20');
    assert.ok(day20 !== undefined);
    assert.equal(day20?.scheduledPendingInflow, 17000, '20,000 * 0.85 = 17,000 expected realization');

    // Scheduled pending AP ($10,000) must receive 100% fulfillment factor ($10,000)
    const day25 = forecast.timeline.find((p) => p.date === '2026-10-25');
    assert.ok(day25 !== undefined);
    assert.equal(day25?.scheduledPendingOutflow, 10000, '10,000 * 1.0 = 10,000 full fulfillment');

    // Ending balance should equal rolling balance of day 30
    assert.equal(forecast.projectedEndingBalance, forecast.timeline[29].projectedBalance);
    assert.ok(forecast.assumptions.length >= 4);
    assert.ok(forecast.confidenceLimitationsNotice.includes('Deterministic Baseline'));
  });

  test('10. Risk Detection Engine - detects cash shortage and triggers High Severity alert', () => {
    // Heavy outflows pushing starting cash ($5,000) into negative within forecast horizon
    const transactions: Transaction[] = [
      createTx('tx-1', '2026-09-01', 'income', 10000, 'paid'),
      createTx('tx-2', '2026-09-10', 'expense', 25000, 'paid'),
      createTx('tx-3', '2026-09-20', 'expense', 20000, 'paid'),
      createTx('tx-4', '2026-10-01', 'income', 5000, 'paid'),
      createTx('tx-5', '2026-10-05', 'expense', 15000, 'paid'),
      createTx('tx-6', '2026-10-15', 'expense', 30000, 'pending'), // Large scheduled bill due
    ];

    const lowStartingCash = 5000;
    const forecast = generateCashFlowForecast(transactions, lowStartingCash, '2026-10-12', true);
    const risks = analyzeFinancialRisks(transactions, forecast, lowStartingCash, '2026-10-12', true);

    const shortageAlert = risks.alerts.find(
      (a) => a.category === 'Cash Runway' && a.severity === 'high'
    );

    assert.ok(shortageAlert !== undefined, 'Must trigger high severity cash shortage alert');
    assert.ok(shortageAlert?.title.includes('Cash Shortage'));
    assert.ok(shortageAlert?.suggestedAction.length > 0, 'Must provide practical suggested action');
    assert.equal(risks.overallRiskLevel === 'critical' || risks.overallRiskLevel === 'elevated', true);
  });

  test('11. Risk Detection Engine - detects operating deficit (expenses > income) in period', () => {
    // Current month (October) paid expenses ($15,000) exceed income ($5,000)
    const transactions: Transaction[] = [
      createTx('tx-1', '2026-09-01', 'income', 20000, 'paid'),
      createTx('tx-2', '2026-09-15', 'expense', 10000, 'paid'),
      createTx('tx-3', '2026-09-25', 'income', 15000, 'paid'),
      createTx('tx-4', '2026-10-02', 'income', 5000, 'paid'),
      createTx('tx-5', '2026-10-05', 'expense', 15000, 'paid'),
    ];

    const forecast = generateCashFlowForecast(transactions, 50000, '2026-10-12', true);
    const risks = analyzeFinancialRisks(transactions, forecast, 50000, '2026-10-12', true);

    const deficitAlert = risks.alerts.find((a) => a.category === 'Operating Deficit');
    assert.ok(deficitAlert !== undefined, 'Must trigger Operating Deficit alert');
    assert.ok(deficitAlert?.description.includes('exceeded paid income'));
    assert.ok(deficitAlert?.suggestedAction.length > 0);
  });

  test('12. Risk Detection Engine - does NOT invent due dates or classify items overdue without valid dueDate', () => {
    const transactions: Transaction[] = [
      createTx('tx-1', '2026-09-01', 'income', 20000, 'paid'),
      createTx('tx-2', '2026-09-15', 'expense', 10000, 'paid'),
      createTx('tx-3', '2026-09-25', 'income', 15000, 'paid'),
      createTx('tx-4', '2026-10-02', 'income', 5000, 'paid'),
      createTx('tx-5', '2026-10-05', 'expense', 5000, 'paid'),
      // Pending transaction with NO dueDate field
      createTx('tx-pending', '2026-10-08', 'income', 24500, 'pending'),
    ];

    const forecast = generateCashFlowForecast(transactions, 50000, '2026-10-12', true);
    const risks = analyzeFinancialRisks(transactions, forecast, 50000, '2026-10-12', true);

    const overdueAlerts = risks.alerts.filter((a) => a.title.includes('Overdue'));
    assert.equal(
      overdueAlerts.length,
      0,
      'Must NOT generate overdue alert when no dueDate field exists in the schema'
    );
  });

  // =========================================================================
  // CONTROLLED SCENARIOS VERIFICATION (Scenarios A through E)
  // =========================================================================

  test('13. Controlled Scenario A: Opening balance 100,000 and NO transactions', () => {
    const transactions: Transaction[] = [];
    const openingBalance = 100000;
    const summary = buildFinancialSummary(transactions, openingBalance);

    assert.equal(summary.currentCashBalance, 100000, 'Operating cash must equal opening balance');
    assert.equal(summary.totalPaidIncome, 0, 'No paid income');
    assert.equal(summary.totalPaidExpenses, 0, 'No paid expenses (opening balance is NOT an expense)');
    assert.equal(summary.netCashFlow, 0, 'Net cash flow must be 0');
    assert.equal(summary.monthlySummaries.length, 0, 'No monthly summaries');
    assert.equal(summary.forecast?.dataSufficiency.isSufficient, false, 'Forecast status is Insufficient Data');

    // Alerts verification
    const alerts = summary.risks?.alerts || [];
    const insufficientAlert = alerts.find((a) => a.id === 'risk-insufficient-history');
    assert.ok(insufficientAlert !== undefined, 'Must trigger Insufficient Historical Data alert');
    assert.equal(insufficientAlert?.severity, 'medium');

    // Must NOT trigger cash shortage, buffer compression, deficit, or unconfigured balance
    assert.equal(alerts.some((a) => a.id === 'risk-cash-shortage'), false);
    assert.equal(alerts.some((a) => a.id.startsWith('risk-operating-deficit')), false);
    assert.equal(alerts.some((a) => a.id === 'risk-unconfigured-opening-balance'), false);
  });

  test('14. Controlled Scenario B: Opening balance 100,000 + One paid income of 20,000', () => {
    const transactions: Transaction[] = [
      createTx('tx-b1', '2026-10-13', 'income', 20000, 'paid'),
    ];
    const openingBalance = 100000;
    const summary = buildFinancialSummary(transactions, openingBalance);

    assert.equal(summary.currentCashBalance, 120000, '100,000 + 20,000 = 120,000');
    assert.equal(summary.totalPaidIncome, 20000, 'Paid income is 20,000');
    assert.equal(summary.totalPaidExpenses, 0, 'Paid expenses is 0');
    assert.equal(summary.netCashFlow, 20000, 'Net cash flow is +20,000');
    assert.equal(summary.forecast?.dataSufficiency.isSufficient, false, '1 tx is insufficient history');

    // No deficit or cash shortage alerts
    const alerts = summary.risks?.alerts || [];
    assert.equal(alerts.some((a) => a.id === 'risk-cash-shortage'), false);
    assert.equal(alerts.some((a) => a.id.startsWith('risk-operating-deficit')), false);
  });

  test('15. Controlled Scenario C: Opening balance 100,000 + One paid expense of 150,000', () => {
    const transactions: Transaction[] = [
      createTx('tx-c1', '2026-10-13', 'expense', 150000, 'paid'),
    ];
    const openingBalance = 100000;
    const summary = buildFinancialSummary(transactions, openingBalance);

    assert.equal(summary.currentCashBalance, -50000, '100,000 - 150,000 = -50,000 (negative cash balance)');
    assert.equal(summary.totalPaidIncome, 0);
    assert.equal(summary.totalPaidExpenses, 150000);
    assert.equal(summary.netCashFlow, -150000);

    const alerts = summary.risks?.alerts || [];
    // High severity cash shortage alert MUST trigger
    const shortageAlert = alerts.find((a) => a.id === 'risk-cash-shortage');
    assert.ok(shortageAlert !== undefined, 'Must trigger High Severity Cash Shortage alert');
    assert.equal(shortageAlert?.severity, 'high');
    assert.ok(shortageAlert?.description.includes('deficit of $50,000') || shortageAlert?.description.includes('-$50,000'));

    // Operating deficit alert MUST trigger
    const deficitAlert = alerts.find((a) => a.id.startsWith('risk-operating-deficit'));
    assert.ok(deficitAlert !== undefined, 'Must trigger Operating Deficit alert');
    assert.equal(deficitAlert?.severity, 'medium');
  });

  test('16. Controlled Scenario D: Opening balance 100,000 + A pending expense transaction of 30,000', () => {
    const transactions: Transaction[] = [
      createTx('tx-d1', '2026-10-25', 'expense', 30000, 'pending'),
    ];
    const openingBalance = 100000;
    const summary = buildFinancialSummary(transactions, openingBalance);

    // Pending expense must NOT reduce current operating cash
    assert.equal(summary.currentCashBalance, 100000, 'Pending expense must NOT reduce operating cash');
    assert.equal(summary.totalPaidExpenses, 0, 'Eligible paid expenses is 0');
    assert.equal(summary.pendingPayables, 30000, 'Pending payables (AP) is 30,000');
    assert.equal(summary.netCashFlow, 0, 'Net cash flow is 0');

    // In the 30-day forecast, the pending expense is recognized at 100% fulfillment ($30,000)
    const dayPoint = summary.forecast?.timeline.find((p) => p.date === '2026-10-25');
    assert.ok(dayPoint !== undefined);
    assert.equal(dayPoint?.scheduledPendingOutflow, 30000);
    // Balance drops on day 25 from 100,000 to 70,000
    assert.equal(dayPoint?.projectedBalance, 70000);

    // Still positive and above $15,000 buffer, so no shortage alert
    const alerts = summary.risks?.alerts || [];
    assert.equal(alerts.some((a) => a.id === 'risk-cash-shortage'), false);
  });

  test('17. Controlled Scenario E: Transaction edit and deletion updates metrics and alerts', () => {
    const openingBalance = 100000;

    // Step 1: Start with high expense transaction (150,000)
    let transactions: Transaction[] = [
      createTx('tx-e1', '2026-10-13', 'expense', 150000, 'paid'),
    ];
    let summary = buildFinancialSummary(transactions, openingBalance);
    assert.equal(summary.currentCashBalance, -50000);
    assert.ok(summary.risks?.alerts.some((a) => a.id === 'risk-cash-shortage'));

    // Step 2: Edit transaction: reduce amount to 10,000
    transactions = [
      createTx('tx-e1', '2026-10-13', 'expense', 10000, 'paid'),
    ];
    summary = buildFinancialSummary(transactions, openingBalance);
    assert.equal(summary.currentCashBalance, 90000, '100,000 - 10,000 = 90,000');
    assert.equal(summary.totalPaidExpenses, 10000);
    // High severity shortage alert MUST be cleared
    assert.equal(summary.risks?.alerts.some((a) => a.id === 'risk-cash-shortage'), false);

    // Step 3: Delete transaction: collection becomes empty
    transactions = [];
    summary = buildFinancialSummary(transactions, openingBalance);
    assert.equal(summary.currentCashBalance, 100000, 'Reverts to opening balance');
    assert.equal(summary.totalPaidExpenses, 0);
    // Operating deficit alert MUST be cleared
    assert.equal(summary.risks?.alerts.some((a) => a.id.startsWith('risk-operating-deficit')), false);
  });
});
