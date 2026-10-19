import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatNumber, formatDate } from '../../lib/utils';
import { useFinancial } from '../../context/FinancialContext';
import { ForecastDataPoint } from '../../types';
import { Skeleton } from '../common/LoadingState';
import { AlertCircle, Calendar, TrendingDown, TrendingUp, Info } from 'lucide-react';

export const CashFlowForecastChart: React.FC = () => {
  const { forecast, loading } = useFinancial();
  const { t } = useTranslation(['cashflow', 'common']);
  const [viewMode, setViewMode] = useState<'balance' | 'movements'>('balance');

  if (loading || !forecast) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { dataSufficiency, timeline, startingCashBalance, projectedEndingBalance } = forecast;

  // Insufficient Data State
  if (!dataSufficiency.isSufficient) {
    return (
      <Card className="flex flex-col border-amber-200/80 bg-amber-50/20">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-amber-900">{t('cashflow:forecastSection.title')}</CardTitle>
                <StatusBadge variant="warning" size="sm">
                  {t('cashflow:sufficiency.warningTitle')}
                </StatusBadge>
              </div>
              <CardDescription className="text-amber-700">
                {t('cashflow:sufficiency.insufficientDesc')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-10 text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-amber-100 rounded-full text-amber-700">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">
              {t('cashflow:sufficiency.warningTitle')}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {dataSufficiency.statusMessage}
            </p>
          </div>
          <div className="text-[11px] text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 mt-2">
            <strong>{t('common:status.active')}:</strong> {t('cashflow:sufficiency.daysRecorded', { days: formatNumber(dataSufficiency.historicalDays) })} & {t('cashflow:sufficiency.txRecorded', { count: formatNumber(dataSufficiency.paidTransactionCount) })}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasNegativeTrough = timeline.some((p) => p.projectedBalance < 0);
  const isNetPositive = projectedEndingBalance >= startingCashBalance;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle>{t('cashflow:forecastSection.title')}</CardTitle>
            <StatusBadge variant="info" size="sm">
              {t('common:badges.forecast')}
            </StatusBadge>
          </div>
          <CardDescription>
            {t('cashflow:forecastSection.description')}
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('balance')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'balance'
                  ? 'bg-white text-slate-900 shadow-subtle'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('cashflow:charts.projectedBalance')}
            </button>
            <button
              onClick={() => setViewMode('movements')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'movements'
                  ? 'bg-white text-slate-900 shadow-subtle'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('cashflow:tabs.historical')}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4 space-y-4">
        {/* Trajectory Key Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/75 p-3 rounded-xl border border-slate-200/70 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 block">{t('cashflow:summary.openingBalance')}</span>
            <span className="font-bold font-mono text-slate-900">
              {formatCurrency(startingCashBalance)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">{t('cashflow:forecastSection.projectedEnding')}</span>
            <span
              className={`font-bold font-mono ${
                projectedEndingBalance < 0 ? 'text-rose-700' : 'text-slate-900'
              }`}
            >
              {formatCurrency(projectedEndingBalance)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">{t('cashflow:forecastSection.netForecastChange')}</span>
            <span
              className={`font-bold font-mono inline-flex items-center gap-0.5 ${
                isNetPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isNetPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {isNetPositive ? '+' : ''}
              {formatCurrency(forecast.projectedNetChange)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">{t('dashboard:metrics.burnRate')}</span>
            <span className="font-mono text-slate-700">
              {formatCurrency(forecast.dailyAverageBurnOrGain)}{t('cashflow:forecastSection.perDay')}
            </span>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeline} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="deficitBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E11D48" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E11D48" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="periodLabel"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                interval={4}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${formatNumber(Math.round(value / 1000))}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ForecastDataPoint;
                    return (
                      <div className="bg-slate-900 text-white rounded-lg p-3 shadow-dropdown text-xs space-y-1.5 border border-slate-700 max-w-xs">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 font-semibold text-slate-200">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            {formatDate(data.date)} ({t('cashflow:charts.dayLabel', { day: formatNumber(data.dayIndex) })})
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">{t('common:badges.forecast')}</span>
                        </div>

                        <div className="flex items-center justify-between gap-4 text-blue-300 font-bold">
                          <span>{t('cashflow:charts.projectedBalance')}:</span>
                          <span
                            className={data.projectedBalance < 0 ? 'text-rose-400' : 'text-blue-300'}
                          >
                            {formatCurrency(data.projectedBalance)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4 text-emerald-400">
                          <span>{t('cashflow:charts.inflows')}:</span>
                          <span>+{formatCurrency(data.expectedInflow)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-4 text-slate-300">
                          <span>{t('cashflow:charts.outflows')}:</span>
                          <span>-{formatCurrency(data.expectedOutflow)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1 text-slate-300">
                          <span>{t('cashflow:charts.netVelocity')}:</span>
                          <span
                            className={
                              data.netMovement >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {data.netMovement >= 0 ? '+' : ''}
                            {formatCurrency(data.netMovement)}
                          </span>
                        </div>

                        {data.notes && (
                          <div className="pt-1 border-t border-slate-800 text-[10px] text-amber-300">
                            {data.notes}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {hasNegativeTrough && (
                <ReferenceLine
                  y={0}
                  stroke="#E11D48"
                  strokeDasharray="4 4"
                  label={{ value: t('dashboard:metrics.cashDeficit'), fill: '#E11D48', fontSize: 10, position: 'right' }}
                />
              )}

              {viewMode === 'balance' ? (
                <Area
                  type="monotone"
                  dataKey="projectedBalance"
                  name={t('cashflow:charts.projectedBalance')}
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#forecastBalanceGrad)"
                />
              ) : (
                <>
                  <Bar
                    dataKey="expectedInflow"
                    name={t('cashflow:charts.inflows')}
                    fill="#10B981"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="expectedOutflow"
                    name={t('cashflow:charts.outflows')}
                    fill="#64748B"
                    radius={[2, 2, 0, 0]}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Disclaimer / Assumptions Banner */}
        <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start gap-2.5 text-[11px] text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>{t('cashflow:forecastSection.assumptionsTitle')}:</strong> {t('cashflow:forecastSection.disclaimer')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
