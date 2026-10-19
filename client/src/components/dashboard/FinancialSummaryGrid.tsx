import React from 'react';
import { MetricCard } from '../common/MetricCard';
import { Wallet, Hourglass, ArrowUpRight, Receipt } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { Skeleton } from '../common/LoadingState';

export const FinancialSummaryGrid: React.FC = () => {
  const { summary, transactions, loading } = useFinancial();

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-subtle space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Current month (October 2026 or latest available)
  const monthlyList = summary.monthlySummaries;
  const currentMonthSummary = monthlyList[monthlyList.length - 1];
  const previousMonthSummary = monthlyList.length >= 2 ? monthlyList[monthlyList.length - 2] : null;

  // 1. Operating Cash Balance
  const currentCash = summary.currentCashBalance;
  let cashChangePct = 0;
  if (previousMonthSummary && previousMonthSummary.closingBalance > 0) {
    cashChangePct = ((currentCash - previousMonthSummary.closingBalance) / previousMonthSummary.closingBalance) * 100;
  }

  // 2. Estimated Runway calculation based on average monthly paid expenses
  let runwayText = 'Not available';
  let runwayTrend: 'up' | 'down' | 'neutral' = 'neutral';
  let runwayStatus: 'positive' | 'warning' | 'negative' | 'neutral' = 'neutral';
  let runwayTimeframe = 'Insufficient burn data';

  const nonZeroExpenseMonths = monthlyList.filter((m) => m.paidExpense > 0);
  if (nonZeroExpenseMonths.length > 0) {
    const totalExp = nonZeroExpenseMonths.reduce((sum, m) => sum + m.paidExpense, 0);
    const avgMonthlyBurn = totalExp / nonZeroExpenseMonths.length;
    if (avgMonthlyBurn > 0) {
      const months = (currentCash / avgMonthlyBurn).toFixed(1);
      runwayText = `${months} Months`;
      runwayTrend = Number(months) >= 3 ? 'up' : 'down';
      runwayStatus = Number(months) >= 4 ? 'positive' : Number(months) >= 2 ? 'warning' : 'negative';
      runwayTimeframe = `based on $${Math.round(avgMonthlyBurn / 1000)}k/mo avg burn`;
    }
  }

  // 3. Net Monthly Cash Flow for current active period
  const netMonthly = currentMonthSummary ? currentMonthSummary.netCashFlow : summary.netCashFlow;
  const isNetPositive = netMonthly >= 0;
  const netMonthlyFormatted = `${isNetPositive ? '+' : ''}${formatCurrency(netMonthly)}`;
  const netMonthlyTrend: 'up' | 'down' | 'neutral' = isNetPositive ? 'up' : 'down';
  const netMonthlyStatus: 'positive' | 'warning' | 'negative' | 'neutral' = isNetPositive ? 'positive' : 'warning';

  // 4. Pending Receivables
  const pendingReceivablesTotal = summary.pendingReceivables;
  const pendingIncomeCount = transactions.filter((t) => t.status === 'pending' && t.type === 'income').length;
  const pendingIncomeFormatted = formatCurrency(pendingReceivablesTotal);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Operating Cash */}
      <MetricCard
        title="Total Operating Cash"
        value={formatCurrency(currentCash)}
        change={cashChangePct !== 0 ? formatPercent(cashChangePct) : '0.0%'}
        trend={cashChangePct >= 0 ? 'up' : 'down'}
        timeframe="vs prior month end"
        status={cashChangePct >= 0 ? 'positive' : 'warning'}
        icon={<Wallet className="w-4 h-4 text-blue-600" />}
        subtitle={
          summary.isOpeningBalanceConfigured
            ? 'Opening balance + verified paid cash receipts'
            : 'Cumulative net cash (opening balance not set)'
        }
        isDemo={true}
      />

      {/* Estimated Cash Runway */}
      <MetricCard
        title="Estimated Cash Runway"
        value={runwayText}
        change={runwayText !== 'Not available' ? 'Active' : undefined}
        trend={runwayTrend}
        timeframe={runwayTimeframe}
        status={runwayStatus}
        icon={<Hourglass className="w-4 h-4 text-emerald-600" />}
        subtitle="Operating months before liquidity depletion"
        isDemo={true}
      />

      {/* Net Monthly Cash Flow */}
      <MetricCard
        title="Net Monthly Cash Flow"
        value={netMonthlyFormatted}
        change={currentMonthSummary ? currentMonthSummary.monthLabel : 'Current Period'}
        trend={netMonthlyTrend}
        timeframe="Paid inflows minus paid outflows"
        status={netMonthlyStatus}
        icon={<ArrowUpRight className="w-4 h-4 text-amber-600" />}
        subtitle="Realized operating cash velocity"
        isDemo={true}
      />

      {/* Pending Receivables (AR) */}
      <MetricCard
        title="Pending Receivables (AR)"
        value={pendingIncomeFormatted}
        change={`${pendingIncomeCount} pending invoice${pendingIncomeCount === 1 ? '' : 's'}`}
        trend="neutral"
        timeframe="Awaiting customer settlement"
        status={pendingReceivablesTotal > 0 ? 'warning' : 'neutral'}
        icon={<Receipt className="w-4 h-4 text-indigo-600" />}
        subtitle="Accrued revenue, strictly not in cash"
        isDemo={true}
      />
    </div>
  );
};
