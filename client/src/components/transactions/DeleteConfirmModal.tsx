import React from 'react';
import { Transaction } from '../../types';
import { Button } from '../common/Button';
import { formatCurrency } from '../../lib/utils';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  transaction: Transaction | null;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  isDeleting,
}) => {
  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-dropdown border border-slate-200/90 w-full max-w-md overflow-hidden p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Are you sure you want to permanently delete this transaction? All derived financial
            summaries, runway estimates, and cash flow charts will be immediately recalculated.
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Description:</span>
            <span className="font-semibold text-slate-900">{transaction.description}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Amount:</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(transaction.amount)} ({transaction.type.toUpperCase()})
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Date & Status:</span>
            <span>
              {transaction.date} &bull; {transaction.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            isLoading={isDeleting}
          >
            Delete Transaction
          </Button>
        </div>
      </div>
    </div>
  );
};
