import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FinancialSummaryGrid } from '../components/dashboard/FinancialSummaryGrid';
import { CashFlowOverviewChart } from '../components/dashboard/CashFlowOverviewChart';
import { RecentAlertsList } from '../components/dashboard/RecentAlertsList';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { formatCurrency, formatDate, formatNumber } from '../lib/utils';
import { useFinancial } from '../context/FinancialContext';
import { Link } from 'react-router-dom';
import {
  Download,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { transactions, summary, resetDemoData, loading } = useFinancial();
  const { t } = useTranslation(['dashboard', 'common', 'nav', 'transactions']);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [resetting, setResetting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Take the 6 most recent transactions
  const recentTransactions = transactions
    .filter((tx) => {
      if (filterType === 'all') return true;
      return tx.type === filterType;
    })
    .slice(0, 6);

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetDemoData();
      setStatusBanner(t('dashboard:header.resetSuccess'));
      setTimeout(() => setStatusBanner(null), 4000);
    } finally {
      setResetting(false);
    }
  };

  const handleExportCsv = () => {
    if (!transactions || transactions.length === 0) return;
    const headers = ['ID', 'Date', 'Type', 'Category', 'Description', 'Counterparty', 'Amount', 'Status'];
    const rows = transactions.map((tx) => [
      tx.id,
      tx.date,
      tx.type,
      `"${tx.category}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${(tx.counterparty || '').replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      tx.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finpilot_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatusBanner(t('dashboard:header.exportSuccess'));
    setTimeout(() => setStatusBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('dashboard:header.title')}
            </h1>
            <StatusBadge variant="demo" size="md">
              {t('common:badges.illustrativeDemo')}
            </StatusBadge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('nav:workspace.title')} ({t('nav:workspace.subtitle')})</span>
            <span>&bull;</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('common:timeframes.asOf', { date: formatDate(summary?.asOfDate || '2026-10-12') })}</span>
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            isLoading={resetting}
            leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
            title={t('common:buttons.refresh')}
          >
            {t('common:buttons.refresh')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            {t('transactions:header.exportCsv')}
          </Button>

          <Link to="/copilot">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {t('dashboard:quickActions.askCopilot')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Action Notification Banner */}
      {statusBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-900 text-xs flex items-center justify-between shadow-subtle animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusBanner}</span>
          </div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-2 text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Metric Cards connected to Financial Context */}
      <FinancialSummaryGrid />

      {/* 30-Day Cash Flow Forecast Summary Banner */}
      {summary && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg shrink-0 mt-0.5 sm:mt-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('dashboard:charts.forecastTitle')}
                </span>
                <StatusBadge variant="info" size="sm">
                  {t('common:badges.forecast')}
                </StatusBadge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {t('dashboard:charts.forecastDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs shrink-0 self-end md:self-center">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">
                {t('cashflow:forecastSection.projectedEnding')}
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  summary.baseline30DayProjection.projectedEndingBalance < 0
                    ? 'text-rose-600'
                    : 'text-slate-900'
                }`}
              >
                {formatCurrency(summary.baseline30DayProjection.projectedEndingBalance)}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block font-medium">
                {t('cashflow:forecastSection.netForecastChange')}
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  summary.baseline30DayProjection.projectedNetChange >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }`}
              >
                {summary.baseline30DayProjection.projectedNetChange >= 0 ? '+' : ''}
                {formatCurrency(summary.baseline30DayProjection.projectedNetChange)}
              </span>
            </div>

            <Link to="/cash-flow">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                {t('common:buttons.viewDetails')}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Visual Analytics & Alert Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CashFlowOverviewChart />
        </div>
        <div className="lg:col-span-1">
          <RecentAlertsList />
        </div>
      </div>

      {/* Recent Cash Flow Ledger from Real Transactions */}
      <Card>
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{t('transactions:header.title')}</CardTitle>
              <StatusBadge variant="demo" size="sm">
                {t('common:badges.liveEngine')}
              </StatusBadge>
            </div>
            <CardDescription>
              {t('transactions:header.description')}
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 shadow-subtle'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('transactions:types.all')}
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterType === 'income'
                    ? 'bg-white text-blue-700 shadow-subtle'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('transactions:types.income')}
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterType === 'expense'
                    ? 'bg-white text-slate-900 shadow-subtle'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('transactions:types.expense')}
              </button>
            </div>

            <Link to="/transactions">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                {t('common:buttons.viewDetails')} ({formatNumber(transactions.length)})
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400">
              {t('common:states.loadingData')}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              {t('common:states.empty')}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-5">{t('transactions:columns.date')}</th>
                  <th className="py-3 px-5">{t('transactions:columns.description')}</th>
                  <th className="py-3 px-5">{t('transactions:columns.category')}</th>
                  <th className="py-3 px-5">{t('transactions:columns.status')}</th>
                  <th className="py-3 px-5 text-right">{t('transactions:columns.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{tx.description}</div>
                      {tx.counterparty && (
                        <div className="text-[11px] text-slate-500">{tx.counterparty}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 font-medium whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      {tx.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {t('common:status.paid')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          <Clock className="w-3 h-3 text-amber-500" />
                          {t('common:status.pending')}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-semibold whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          tx.type === 'income' ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
