import React, { useState, useEffect } from 'react';
import {
  Transaction,
  CreateTransactionInput,
  CreateTransactionSchema,
  TransactionCategoryValues,
} from '../../types';
import { Button } from '../common/Button';
import { X, AlertCircle } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  initialData?: Transaction | null;
  title: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const [formData, setFormData] = useState<CreateTransactionInput>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'income',
    category: 'Revenue / Sales',
    amount: 1000,
    counterparty: '',
    status: 'paid',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date,
        description: initialData.description,
        type: initialData.type,
        category: initialData.category,
        amount: initialData.amount,
        counterparty: initialData.counterparty || '',
        status: initialData.status,
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        type: 'income',
        category: 'Revenue / Sales',
        amount: 1000,
        counterparty: '',
        status: 'paid',
        notes: '',
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [initialData, isOpen]);

  const updateField = <K extends keyof CreateTransactionInput>(
    field: K,
    value: CreateTransactionInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (submitError) setSubmitError(null);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate with Zod
    const result = CreateTransactionSchema.safeParse({
      ...formData,
      amount: Number(formData.amount),
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(result.data);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save transaction';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-dropdown border border-slate-200/90 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">
              Record verified cash movement or pending commitment
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {submitError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Type selector toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Transaction Flow Type *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: 'income',
                    category: prev.type === 'expense' ? 'Revenue / Sales' : prev.category,
                  }))
                }
                className={`py-2 text-xs font-semibold rounded-md transition-all ${
                  formData.type === 'income'
                    ? 'bg-white text-emerald-700 shadow-subtle border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Income (Cash Inflow)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: 'expense',
                    category: prev.type === 'income' ? 'Payroll & Wages' : prev.category,
                  }))
                }
                className={`py-2 text-xs font-semibold rounded-md transition-all ${
                  formData.type === 'expense'
                    ? 'bg-white text-rose-700 shadow-subtle border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                - Expense (Cash Outflow)
              </button>
            </div>
          </div>

          {/* Amount & Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Amount (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) =>
                    updateField('amount', parseFloat(e.target.value) || 0)
                  }
                  className={`w-full pl-7 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.amount
                      ? 'border-rose-400 focus:ring-rose-400'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Transaction Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => updateField('date', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.date
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {errors.date && <p className="text-[11px] text-rose-600 mt-1">{errors.date}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description *
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="e.g. Q3 Regional Wholesale Invoice Settlement"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                errors.description
                  ? 'border-rose-400 focus:ring-rose-400'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.description && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Category & Counterparty row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {TransactionCategoryValues.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Counterparty (Optional)
              </label>
              <input
                type="text"
                value={formData.counterparty}
                onChange={(e) => updateField('counterparty', e.target.value)}
                placeholder="e.g. Apex Distribution Corp"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Payment Status (Paid vs Pending) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Settlement Status *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  formData.status === 'paid'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="paid"
                  checked={formData.status === 'paid'}
                  onChange={() => updateField('status', 'paid')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="block text-xs font-semibold">Settled (Paid)</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Realized cash movement in operating account
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  formData.status === 'pending'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="pending"
                  checked={formData.status === 'pending'}
                  onChange={() => updateField('status', 'pending')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="block text-xs font-semibold">Pending (Accrued)</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Accounts Receivable/Payable, not yet settled
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Internal Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Add relevant terms, purchase order reference, or audit details..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {initialData ? 'Save Changes' : 'Record Transaction'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
