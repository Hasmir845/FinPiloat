import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { CashFlowOverviewChart } from '../components/dashboard/CashFlowOverviewChart';
import { CashFlowForecastChart } from '../components/dashboard/CashFlowForecastChart';
import { RecentAlertsList } from '../components/dashboard/RecentAlertsList';
import { formatCurrency } from '../lib/utils';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { MonthlyFinancialSummary } from '../types';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Info,
  AlertTriangle,
  RotateCcw,
  Wallet,
  Settings,
  Check,
  X,
} from 'lucide-react';

export const CashFlowPage: React.FC = () => {
  const {
    summary,
    forecast,
    openingBalance,
    setOpeningBalance,
    loading,
    error,
    refreshData,
    resetDemoData,
  } = useFinancial();

  const [isEditingOpeningBalance, setIsEditingOpeningBalance] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState(
    openingBalance !== null ? openingBalance.toString() : ''
  );

  if (loading || !summary) {
    return <LoadingState message="Loading cash flow intelligence and projections..." fullHeight />;
  }

  const monthlyList: MonthlyFinancialSummary[] = summary.monthlySummaries;
  const isOpeningConfigured = summary.isOpeningBalanceConfigured;

  // Aggregate averages across all available months with valid history
  const hasMonthlyHistory = monthlyList.length > 0;
  const totalMonths = monthlyList.length;
  const avgMonthlyInflow = hasMonthlyHistory
    ? Math.round(
        monthlyList.reduce((acc: number, m: MonthlyFinancialSummary) => acc + m.paidIncome, 0) /
          totalMonths
      )
    : 0;
  const avgMonthlyOutflow = hasMonthlyHistory
    ? Math.round(
        monthlyList.reduce((acc: number, m: MonthlyFinancialSummary) => acc + m.paidExpense, 0) /
          totalMonths
      )
    : 0;
  const avgMonthlyNet = avgMonthlyInflow - avgMonthlyOutflow;

  const handleSaveOpeningBalance = () => {
    const parsed = parseFloat(openingBalanceInput.trim());
    if (openingBalanceInput.trim() === '') {
      setOpeningBalance(null);
    } else if (Number.isFinite(parsed)) {
      setOpeningBalance(parsed);
    } else {
      alert('Please enter a valid numeric starting cash balance.');
      return;
    }
    setIsEditingOpeningBalance(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Cash Flow Intelligence & Projections
            </h1>
            <StatusBadge variant="demo" size="md">
              Transaction Engine
            </StatusBadge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monthly cash conversion ledger, rolling balances, and deterministic 30-day baseline runway forecast
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={resetDemoData}
            leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
            title="Reset dataset back to default demo state"
          >
            Reset Demo Data
          </Button>

          <Link to="/transactions">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Manage Transactions
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <ErrorAlert
          title="Cash Flow Calculation Error"
          message={error}
          onRetry={refreshData}
          onDismiss={() => {}}
        />
      )}

      {/* Opening Balance Configuration Notice / Controls */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isOpeningConfigured
            ? 'bg-slate-50/80 border-slate-200'
            : 'bg-amber-50/80 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg ${
              isOpeningConfigured ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <span>Opening Cash Balance:</span>
              {isOpeningConfigured ? (
                <span className="font-mono text-blue-700 font-bold">
                  {formatCurrency(summary.openingBalance || 0)}
                </span>
              ) : (
                <span className="text-amber-700 font-bold">Not Configured</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isOpeningConfigured
                ? 'Absolute bank holdings are calculated starting from this balance.'
                : 'Opening balance is missing. Figures currently reflect cumulative net cash movements since inception.'}
            </p>
          </div>
        </div>

        {isEditingOpeningBalance ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-slate-400 font-mono">$</span>
              <input
                type="number"
                value={openingBalanceInput}
                onChange={(e) => setOpeningBalanceInput(e.target.value)}
                placeholder="100000"
                className="pl-6 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-36 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <button
              onClick={handleSaveOpeningBalance}
              className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Save Opening Balance"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsEditingOpeningBalance(false)}
              className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setOpeningBalanceInput(
                summary.openingBalance !== null ? summary.openingBalance.toString() : ''
              );
              setIsEditingOpeningBalance(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold shadow-xs transition-colors shrink-0"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>{isOpeningConfigured ? 'Change Balance' : 'Configure Starting Balance'}</span>
          </button>
        )}
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Cash */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Current Operating Cash
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(summary.currentCashBalance)}
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {isOpeningConfigured
              ? 'Opening balance + verified paid movements'
              : 'Cumulative net cash (opening balance not set)'}
          </span>
        </div>

        {/* Avg Monthly Inflow */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Avg Monthly Inflows
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono">
            {hasMonthlyHistory
              ? `${avgMonthlyInflow > 0 ? '+' : ''}${formatCurrency(avgMonthlyInflow)}`
              : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {hasMonthlyHistory
              ? `Across ${totalMonths} recorded calendar month${totalMonths === 1 ? '' : 's'}`
              : 'No transaction history recorded'}
          </span>
        </div>

        {/* Avg Monthly Outflow */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Avg Monthly Outflows
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {hasMonthlyHistory
              ? `${avgMonthlyOutflow > 0 ? '-' : ''}${formatCurrency(avgMonthlyOutflow)}`
              : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {hasMonthlyHistory
              ? 'Operating expenses, facilities & payroll'
              : 'No expense history recorded'}
          </span>
        </div>

        {/* Net Monthly Run-Rate */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Avg Net Cash Flow
          </span>
          <div
            className={`mt-2 text-2xl font-bold font-mono ${
              !hasMonthlyHistory
                ? 'text-slate-400'
                : avgMonthlyNet >= 0
                ? 'text-emerald-700'
                : 'text-rose-700'
            }`}
          >
            {hasMonthlyHistory
              ? `${avgMonthlyNet > 0 ? '+' : ''}${formatCurrency(avgMonthlyNet)}`
              : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {hasMonthlyHistory
              ? 'Net cash generation rate per month'
              : 'Requires completed monthly records'}
          </span>
        </div>
      </div>

      {/* Forecast & Risk Intelligence Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CashFlowForecastChart />
        </div>
        <div className="lg:col-span-1">
          <RecentAlertsList />
        </div>
      </div>

      {/* Historical Cash Flow Trajectory Chart */}
      <CashFlowOverviewChart />

      {/* Monthly Rolling Balance Ledger Table */}
      <Card>
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Monthly Cash Flow & Balance Ledger</CardTitle>
              <StatusBadge variant="demo" size="sm">
                Verified Ledger
              </StatusBadge>
            </div>
            <CardDescription>
              Chronological opening balance, realized cash movements, closing balances, and separate pending commitments
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-5">Month Period</th>
                <th className="py-3 px-5 text-right">Opening Balance</th>
                <th className="py-3 px-5 text-right">Paid Inflow</th>
                <th className="py-3 px-5 text-right">Paid Outflow</th>
                <th className="py-3 px-5 text-right">Net Cash Flow</th>
                <th className="py-3 px-5 text-right">Closing Balance</th>
                <th className="py-3 px-5 text-right">Pending Receivables (AR)</th>
                <th className="py-3 px-5 text-right">Pending Payables (AP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No monthly transaction history available. Create completed or pending transactions to populate the ledger.
                  </td>
                </tr>
              ) : (
                monthlyList.map((m: MonthlyFinancialSummary) => {
                const isNetPositive = m.netCashFlow >= 0;
                return (
                  <tr key={m.monthKey} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900 whitespace-nowrap">
                      {m.monthLabel}
                      <span className="text-[10px] text-slate-400 block font-normal font-mono">
                        {m.transactionCount} entries
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right text-slate-600 font-mono">
                      {formatCurrency(m.openingBalance)}
                    </td>
                    <td className="py-3.5 px-5 text-right text-emerald-700 font-medium font-mono">
                      +{formatCurrency(m.paidIncome)}
                    </td>
                    <td className="py-3.5 px-5 text-right text-slate-900 font-medium font-mono">
                      -{formatCurrency(m.paidExpense)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold whitespace-nowrap font-mono">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isNetPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isNetPositive ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        {isNetPositive ? '+' : ''}
                        {formatCurrency(m.netCashFlow)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(m.closingBalance)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-[11px]">
                      {m.pendingReceivables > 0 ? (
                        <span className="text-amber-700 font-medium">
                          +{formatCurrency(m.pendingReceivables)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-[11px]">
                      {m.pendingPayables > 0 ? (
                        <span className="text-slate-700 font-medium">
                          -{formatCurrency(m.pendingPayables)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Forecast Governance & Assumptions Documentation */}
      {forecast && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Info className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Forecasting Model Assumptions & Governance
            </h3>
          </div>

          <ul className="text-xs text-slate-600 space-y-2 pl-5 list-disc">
            {forecast.assumptions.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>

          <div className="pt-3 text-[11px] text-slate-500 border-t border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{forecast.confidenceLimitationsNotice}</span>
          </div>
        </div>
      )}
    </div>
  );
};
