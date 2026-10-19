import React from 'react';
import { cn } from '../../lib/utils';

export interface StatusBadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'demo';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  children,
  dot = false,
  className,
}) => {
  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
    error: 'bg-rose-50 text-rose-700 border-rose-200/60',
    info: 'bg-blue-50 text-blue-700 border-blue-200/60',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    demo: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
  };

  const dotStyles = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-400',
    demo: 'bg-indigo-500',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} />}
      <span>{children}</span>
    </span>
  );
};
