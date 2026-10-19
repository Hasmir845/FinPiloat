import React from 'react';
import { useTranslation } from 'react-i18next';
import { MetricCard } from '../common/MetricCard';
import { Wallet, Hourglass, ArrowUpRight, Receipt } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatPercent, formatNumber } from '../../lib/utils';
import { Skeleton } from '../common/LoadingState';

export const FinancialSummaryGrid: React.FC = () => {
  const { summary, transactions, loading } = useFinancial();
  const { t } = useTranslation(['dashboard', 'common']);

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

  // Current month
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
  let runwayText = t('common:states.empty', 'Not available');
  let runwayTrend: 'up' | 'down' | 'neutral' = 'neutral';
  let runwayStatus: 'positive' | 'warning' | 'negative' | 'neutral' = 'neutral';
  let runwayTimeframe = t('dashboard:metrics.unconfigured');

  const nonZeroExpenseMonths = monthlyList.filter((m) => m.paidExpense > 0);
  if (nonZeroExpenseMonths.length > 0) {
    const totalExp = nonZeroExpenseMonths.reduce((sum, m) => sum + m.paidExpense, 0);
    const avgMonthlyBurn = totalExp / nonZeroExpenseMonths.length;
    if (avgMonthlyBurn > 0) {
      const months = (currentCash / avgMonthlyBurn).toFixed(1);
      runwayText = t('dashboard:metrics.runwayMonths', { months: formatNumber(Number(months), 1) });
      runwayTrend = Number(months) >= 3 ? 'up' : 'down';
      runwayStatus = Number(months) >= 4 ? 'positive' : Number(months) >= 2 ? 'warning' : 'negative';
      runwayTimeframe = `${t('dashboard:metrics.burnRate')}: ~${formatCurrency(avgMonthlyBurn)}/${t('common:units.months')}`;
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
        title={t('dashboard:metrics.currentCash')}
        value={formatCurrency(currentCash)}
        change={cashChangePct !== 0 ? formatPercent(cashChangePct) : '0.0%'}
        trend={cashChangePct >= 0 ? 'up' : 'down'}
        timeframe={t('dashboard:metrics.currentCashTooltip')}
        status={cashChangePct >= 0 ? 'positive' : 'warning'}
        icon={<Wallet className="w-4 h-4 text-blue-600" />}
        subtitle={
          summary.isOpeningBalanceConfigured
            ? t('dashboard:metrics.openingBalance') + ': ' + formatCurrency(summary.openingBalance || 0)
            : t('dashboard:metrics.unconfigured')
        }
        isDemo={true}
      />

      {/* Estimated Cash Runway */}
      <MetricCard
        title={t('dashboard:metrics.runway')}
        value={runwayText}
        change={runwayText !== t('common:states.empty') ? t('common:status.active') : undefined}
        trend={runwayTrend}
        timeframe={runwayTimeframe}
        status={runwayStatus}
        icon={<Hourglass className="w-4 h-4 text-emerald-600" />}
        subtitle={t('dashboard:metrics.runwayTooltip')}
        isDemo={true}
      />

      {/* Net Monthly Cash Flow */}
      <MetricCard
        title={t('dashboard:metrics.netCashFlow')}
        value={netMonthlyFormatted}
        change={currentMonthSummary ? currentMonthSummary.monthLabel : t('common:timeframes.all')}
        trend={netMonthlyTrend}
        timeframe={t('dashboard:metrics.netCashFlowTooltip')}
        status={netMonthlyStatus}
        icon={<ArrowUpRight className="w-4 h-4 text-amber-600" />}
        subtitle={isNetPositive ? t('dashboard:metrics.positiveFlow') : t('dashboard:metrics.cashDeficit')}
        isDemo={true}
      />

      {/* Pending Receivables (AR) */}
      <MetricCard
        title={t('dashboard:metrics.pendingReceivables')}
        value={pendingIncomeFormatted}
        change={`${formatNumber(pendingIncomeCount)} ${t('common:units.items')}`}
        trend="neutral"
        timeframe={t('dashboard:metrics.pendingReceivablesTooltip')}
        status={pendingReceivablesTotal > 0 ? 'warning' : 'neutral'}
        icon={<Receipt className="w-4 h-4 text-indigo-600" />}
        subtitle={t('transactions:categories.receivables')}
        isDemo={true}
      />
    </div>
  );
};
