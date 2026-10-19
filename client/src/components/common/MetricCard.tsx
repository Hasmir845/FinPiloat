import React from 'react';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  timeframe?: string;
  status?: 'positive' | 'warning' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
  isDemo?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  timeframe = 'vs last month',
  status = 'neutral',
  icon,
  subtitle,
  isDemo = true,
}) => {
  const trendColor = {
    positive: 'text-emerald-700 bg-emerald-50 border-emerald-200/60',
    negative: 'text-rose-700 bg-rose-50 border-rose-200/60',
    warning: 'text-amber-700 bg-amber-50 border-amber-200/60',
    neutral: 'text-slate-600 bg-slate-100 border-slate-200',
  }[status];

  return (
    <Card className="p-5 flex flex-col justify-between relative overflow-hidden group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <div className="flex items-center gap-1.5">
            {isDemo && (
              <StatusBadge variant="demo" size="sm">
                Demo
              </StatusBadge>
            )}
            {icon && (
              <span className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/60 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                {icon}
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </span>
        </div>

        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>

      {change && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium',
              trendColor
            )}
          >
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend === 'neutral' && <Minus className="w-3 h-3" />}
            <span>{change}</span>
          </div>
          <span className="text-slate-400 text-[11px]">{timeframe}</span>
        </div>
      )}
    </Card>
  );
};
