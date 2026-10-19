import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Transaction,
  FinancialSummaryResponse,
  CashFlowForecastResponse,
  RiskAnalysisResponse,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '../types';
import { apiClient, ApiError } from '../services/api';
import { buildFinancialSummary } from '../services/financialCalculations';

const OPENING_BALANCE_STORAGE_KEY = 'finpilot_opening_balance';

interface FinancialContextValue {
  transactions: Transaction[];
  summary: FinancialSummaryResponse | null;
  forecast: CashFlowForecastResponse | null;
  risks: RiskAnalysisResponse | null;
  openingBalance: number | null;
  setOpeningBalance: (amount: number | null) => void;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addTransaction: (data: CreateTransactionInput) => Promise<Transaction>;
  editTransaction: (id: string, data: UpdateTransactionInput) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextValue | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummaryResponse | null>(null);
  const [forecast, setForecast] = useState<CashFlowForecastResponse | null>(null);
  const [risks, setRisks] = useState<RiskAnalysisResponse | null>(null);

  // Initialize openingBalance from localStorage (defaults to null if not configured)
  const [openingBalance, setOpeningBalanceState] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(OPENING_BALANCE_STORAGE_KEY);
      if (stored !== null && stored !== '') {
        const parsed = parseFloat(stored);
        if (Number.isFinite(parsed)) return parsed;
      }
    } catch {
      // LocalStorage access fallback
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setOpeningBalance = useCallback((amount: number | null) => {
    setOpeningBalanceState(amount);
    try {
      if (amount === null || !Number.isFinite(amount)) {
        localStorage.removeItem(OPENING_BALANCE_STORAGE_KEY);
      } else {
        localStorage.setItem(OPENING_BALANCE_STORAGE_KEY, amount.toString());
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch current transaction list from API
      const result = await apiClient.getTransactions({ sortBy: 'date', sortOrder: 'desc' });
      const txList = result.data;
      setTransactions(txList);

      // Fetch database-backed financial summary (includes forecast & risk analysis)
      try {
        const backendSummary = await apiClient.getFinancialSummary(openingBalance);
        setSummary(backendSummary);
        setForecast(backendSummary.forecast || null);
        setRisks(backendSummary.risks || null);
      } catch (summaryErr) {
        // Fallback to local computation if offline
        const localSummary = buildFinancialSummary(txList, openingBalance);
        setSummary(localSummary);
        setForecast(null);
        setRisks(null);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load financial records from server');
      }
    } finally {
      setLoading(false);
    }
  }, [openingBalance]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addTransaction = async (data: CreateTransactionInput): Promise<Transaction> => {
    try {
      const created = await apiClient.createTransaction(data);
      await refreshData();
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record transaction';
      setError(message);
      throw err;
    }
  };

  const editTransaction = async (
    id: string,
    data: UpdateTransactionInput
  ): Promise<Transaction> => {
    try {
      const updated = await apiClient.updateTransaction(id, data);
      await refreshData();
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(message);
      throw err;
    }
  };

  const removeTransaction = async (id: string): Promise<void> => {
    try {
      await apiClient.deleteTransaction(id);
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(message);
      throw err;
    }
  };

  const resetDemoData = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.resetTransactions();
      // Reset opening balance to default demo $100k
      setOpeningBalance(100_000);
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset demo dataset';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <FinancialContext.Provider
      value={{
        transactions,
        summary,
        forecast,
        risks,
        openingBalance,
        setOpeningBalance,
        loading,
        error,
        refreshData,
        addTransaction,
        editTransaction,
        removeTransaction,
        resetDemoData,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export function useFinancial(): FinancialContextValue {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
}
