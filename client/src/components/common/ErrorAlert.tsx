import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  onDismiss,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900 shadow-sm flex items-start gap-3',
        className
      )}
      role="alert"
    >
      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <h4 className="font-semibold text-rose-900 mb-0.5">{title}</h4>
        <p className="text-rose-700 leading-relaxed">{message}</p>
        {onRetry && (
          <div className="mt-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="bg-white hover:bg-rose-50 border-rose-300 text-rose-800 text-xs py-1 px-2.5 h-auto"
            >
              Retry Connection
            </Button>
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-rose-400 hover:text-rose-700 transition-colors p-1"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
