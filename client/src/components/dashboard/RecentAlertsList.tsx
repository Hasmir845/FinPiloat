import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { RiskAlert } from '../../types';
import { useFinancial } from '../../context/FinancialContext';
import { Skeleton } from '../common/LoadingState';
import { formatDate } from '../../lib/utils';

export const RecentAlertsList: React.FC = () => {
  const { risks, loading } = useFinancial();
  const { t } = useTranslation(['dashboard', 'common']);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);

  if (loading || !risks) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const alerts = risks.alerts;

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{t('dashboard:alerts.sectionTitle')}</CardTitle>
              <StatusBadge
                variant={
                  risks.overallRiskLevel === 'critical'
                    ? 'error'
                    : risks.overallRiskLevel === 'elevated'
                    ? 'warning'
                    : 'success'
                }
                size="sm"
              >
                {t(`common:status.${risks.overallRiskLevel}`, risks.overallRiskLevel.toUpperCase())}
              </StatusBadge>
            </div>
            <CardDescription>
              {t('dashboard:alerts.sectionDesc')}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-100">
          {alerts.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
              <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                {t('dashboard:alerts.noAlertsTitle')}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                {t('dashboard:alerts.noAlertsDesc')}
              </p>
            </div>
          ) : (
            alerts.map((alertItem) => {
              const badgeVariant =
                alertItem.severity === 'high'
                  ? 'error'
                  : alertItem.severity === 'medium'
                  ? 'warning'
                  : 'info';

              const SeverityIcon =
                alertItem.severity === 'high'
                  ? AlertCircle
                  : alertItem.severity === 'medium'
                  ? AlertTriangle
                  : CheckCircle2;

              return (
                <div
                  key={alertItem.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-start gap-3 group cursor-pointer"
                  onClick={() => setSelectedAlert(alertItem)}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      alertItem.severity === 'high'
                        ? 'bg-rose-50 text-rose-600'
                        : alertItem.severity === 'medium'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    <SeverityIcon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {alertItem.title}
                      </span>
                      <StatusBadge variant={badgeVariant} size="sm">
                        {t(`common:status.${alertItem.severity}`, alertItem.severity.toUpperCase())}
                      </StatusBadge>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-1.5 leading-relaxed">
                      {alertItem.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-slate-500 font-medium truncate max-w-[200px]">
                        {alertItem.impact}
                      </span>
                      <span className="shrink-0">{formatDate(alertItem.date)}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 self-center transition-colors" />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-dropdown max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg ${
                    selectedAlert.severity === 'high'
                      ? 'bg-rose-50 text-rose-600'
                      : selectedAlert.severity === 'medium'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedAlert.title}</h3>
                  <span className="text-[11px] text-slate-400">{selectedAlert.category}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="font-semibold text-slate-700 block">Analysis & Findings:</span>
                <p className="text-slate-600 leading-relaxed">{selectedAlert.description}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="font-semibold text-slate-700 block">Business Impact:</span>
                <p className="text-slate-600 leading-relaxed">{selectedAlert.impact}</p>
              </div>

              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 space-y-1">
                <span className="font-semibold text-blue-900 block flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  {t('dashboard:alerts.suggestedAction')}:
                </span>
                <p className="text-blue-800 leading-relaxed">{selectedAlert.suggestedAction}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                {t('common:buttons.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
