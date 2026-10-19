import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoadingStateProps {
  message?: string;
  className?: string;
  fullHeight?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className,
  fullHeight = false,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-slate-500',
        fullHeight ? 'min-h-[320px]' : 'py-12',
        className
      )}
    >
      <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-3" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn('animate-pulse bg-slate-200/80 rounded-md', className)}
    />
  );
};
