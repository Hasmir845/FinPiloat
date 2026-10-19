import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { useFinancial } from '../../context/FinancialContext';
import { CashFlowDataPoint } from '../../types';
import { Skeleton } from '../common/LoadingState';

export const CashFlowOverviewChart: React.FC = () => {
  const { summary, loading } = useFinancial();
  const { t } = useTranslation(['dashboard', 'common']);

  if (loading || !summary) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </CardHeader>
        <CardContent className="h-72 flex items-center justify-center">
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData: CashFlowDataPoint[] = summary.monthlySummaries.map((m) => ({
    month: m.monthLabel,
    inflow: m.paidIncome,
    outflow: m.paidExpense,
    net: m.netCashFlow,
  }));

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>{t('dashboard:charts.overviewTitle')}</CardTitle>
            <StatusBadge variant="demo" size="sm">
              {t('common:badges.verifiedLedger')}
            </StatusBadge>
          </div>
          <CardDescription>
            {t('dashboard:charts.overviewDesc')}
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
            {t('dashboard:charts.inflow')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" />
            {t('dashboard:charts.outflow')}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-2">
        <div className="h-72 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              {t('dashboard:charts.noChartData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#64748B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${formatNumber(Math.round(value / 1000))}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const inflowVal = Number(payload[0]?.value || 0);
                      const outflowVal = Number(payload[1]?.value || 0);
                      const netVal = inflowVal - outflowVal;
                      return (
                        <div className="bg-slate-900 text-white rounded-lg p-3 shadow-dropdown text-xs space-y-1.5 border border-slate-700">
                          <p className="font-semibold text-slate-200 border-b border-slate-800 pb-1">
                            {label}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-blue-300">
                            <span>{t('dashboard:charts.inflow')}:</span>
                            <span className="font-medium">{formatCurrency(inflowVal)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-300">
                            <span>{t('dashboard:charts.outflow')}:</span>
                            <span className="font-medium">{formatCurrency(outflowVal)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 text-emerald-400 font-semibold">
                            <span>{t('dashboard:charts.net')}:</span>
                            <span>{formatCurrency(netVal)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" height={36} content={() => null} />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  name={t('dashboard:charts.inflow')}
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#inflowGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  name={t('dashboard:charts.outflow')}
                  stroke="#64748B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#outflowGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
