import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinancial } from '../context/FinancialContext';
import {
  Transaction,
  TransactionCategoryValues,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { DeleteConfirmModal } from '../components/transactions/DeleteConfirmModal';
import { formatCurrency, formatDate, formatNumber } from '../lib/utils';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Building,
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const {
    transactions,
    loading,
    error,
    refreshData,
    addTransaction,
    editTransaction,
    removeTransaction,
    resetDemoData,
  } = useFinancial();

  const { t } = useTranslation(['transactions', 'common']);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx: Transaction) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesDesc = tx.description.toLowerCase().includes(q);
          const matchesCounter = tx.counterparty?.toLowerCase().includes(q) ?? false;
          const matchesCat = tx.category.toLowerCase().includes(q);
          if (!matchesDesc && !matchesCounter && !matchesCat) return false;
        }

        return true;
      })
      .sort((a: Transaction, b: Transaction) => {
        const diff = a.date.localeCompare(b.date);
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [transactions, typeFilter, statusFilter, categoryFilter, startDate, endDate, searchQuery, sortOrder]);

  // Quick stat strip computed over filtered items
  const stats = useMemo(() => {
    let paidIn = 0;
    let paidOut = 0;
    let pendingIn = 0;
    let pendingOut = 0;

    filteredTransactions.forEach((tx: Transaction) => {
      if (tx.status === 'paid') {
        if (tx.type === 'income') paidIn += tx.amount;
        else paidOut += tx.amount;
      } else {
        if (tx.type === 'income') pendingIn += tx.amount;
        else pendingOut += tx.amount;
      }
    });

    return { paidIn, paidOut, pendingIn, pendingOut, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const handleCreateOrUpdate = async (data: CreateTransactionInput) => {
    if (editingTransaction) {
      await editTransaction(editingTransaction.id, data as UpdateTransactionInput);
      setActionSuccessMessage(t('transactions:alerts.updateSuccess'));
    } else {
      await addTransaction(data);
      setActionSuccessMessage(t('transactions:alerts.createSuccess'));
    }
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return;
    setIsDeleting(true);
    try {
      await removeTransaction(deletingTransaction.id);
      setActionSuccessMessage(t('transactions:alerts.deleteSuccess'));
      setDeletingTransaction(null);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
    setSortOrder('desc');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('transactions:header.title')}
            </h1>
            <StatusBadge variant="demo" size="md">
              {t('common:badges.liveEngine')}
            </StatusBadge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('transactions:header.description')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={resetDemoData}
            leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
            title={t('common:buttons.refresh')}
          >
            {t('common:buttons.refresh')}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t('transactions:header.addTransaction')}
          </Button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-900 text-xs flex items-center justify-between animate-fade-in shadow-subtle">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            {t('common:buttons.close')}
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <ErrorAlert
          title={t('common:states.errorOccurred')}
          message={error}
          onRetry={refreshData}
          onDismiss={() => {}}
        />
      )}

      {/* Filtered Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-subtle">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            {t('dashboard:metrics.inflow')}
          </span>
          <span className="text-lg font-bold text-emerald-700 mt-0.5 block">
            +{formatCurrency(stats.paidIn)}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-subtle">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            {t('dashboard:metrics.outflow')}
          </span>
          <span className="text-lg font-bold text-slate-900 mt-0.5 block">
            -{formatCurrency(stats.paidOut)}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-subtle">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            {t('dashboard:metrics.pendingReceivables')}
          </span>
          <span className="text-lg font-bold text-amber-700 mt-0.5 block">
            {formatCurrency(stats.pendingIn)}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-subtle">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            {t('transactions:columns.actions')}
          </span>
          <span className="text-lg font-bold text-slate-900 mt-0.5 block">
            {formatNumber(stats.count)} / {formatNumber(transactions.length)}
          </span>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <Card>
        {/* Filters and Search Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={t('transactions:filters.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>

            {/* Quick Filter Controls */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
              >
                <option value="all">{t('transactions:types.all')}</option>
                <option value="income">{t('transactions:types.income')}</option>
                <option value="expense">{t('transactions:types.expense')}</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
              >
                <option value="all">{t('common:timeframes.all')}</option>
                <option value="paid">{t('common:status.paid')}</option>
                <option value="pending">{t('common:status.pending')}</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 max-w-[150px]"
              >
                <option value="all">{t('transactions:categories.all')}</option>
                {TransactionCategoryValues.map((cat: string) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Sort Toggle */}
              <button
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1 text-slate-700 font-medium transition-colors"
                title="Toggle Date Sort Order"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('transactions:columns.date')}: {sortOrder === 'desc' ? '↓' : '↑'}</span>
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-2.5 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                >
                  {t('transactions:filters.clear')}
                </button>
              )}
            </div>
          </div>

          {/* Date range filter sub-row */}
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{t('transactions:columns.date')}:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <LoadingState message={t('common:states.loadingData')} />
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Filter className="w-6 h-6 text-slate-400" />}
              title={t('common:states.noRecordsFound')}
              description={t('common:states.empty')}
              actionLabel={hasActiveFilters ? t('transactions:filters.clear') : t('transactions:header.addTransaction')}
              onAction={
                hasActiveFilters
                  ? clearAllFilters
                  : () => {
                      setEditingTransaction(null);
                      setIsModalOpen(true);
                    }
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-5">{t('transactions:columns.date')}</th>
                  <th className="py-3 px-5">{t('transactions:columns.description')}</th>
                  <th className="py-3 px-5">{t('transactions:columns.category')}</th>
                  <th className="py-3 px-5">{t('transactions:columns.status')}</th>
                  <th className="py-3 px-5 text-right">{t('transactions:columns.amount')}</th>
                  <th className="py-3 px-5 text-center">{t('transactions:columns.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx: Transaction) => (
                  <tr key={tx.id} className="hover:bg-slate-50/75 transition-colors group">
                    {/* Date */}
                    <td className="py-3.5 px-5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {formatDate(tx.date)}
                    </td>

                    {/* Description & Counterparty */}
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {tx.description}
                      </div>
                      {tx.counterparty && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{tx.counterparty}</span>
                        </div>
                      )}
                      {tx.notes && (
                        <div className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                          {tx.notes}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                        {tx.category}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      {tx.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {t('common:status.paid')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          <Clock className="w-3 h-3 text-amber-500" />
                          {t('common:status.pending')}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-5 text-right font-semibold whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          tx.type === 'income' ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTransaction(tx);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title={t('common:buttons.edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTransaction(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title={t('common:buttons.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingTransaction}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingTransaction)}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDeleteConfirm}
        transaction={deletingTransaction}
        isDeleting={isDeleting}
      />
    </div>
  );
};
