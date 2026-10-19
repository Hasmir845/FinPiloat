import { z } from 'zod';

export const DatabaseHealthSchema = z.object({
  status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
  databaseName: z.string().optional(),
  configured: z.boolean(),
  message: z.string().optional(),
});

export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  service: z.string(),
  version: z.string(),
  timestamp: z.string(),
  uptimeSeconds: z.number(),
  environment: z.string(),
  database: DatabaseHealthSchema.optional(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckSchema>;

// Navigation Item Interface
export interface NavItem {
  name: string;
  href: string;
  iconName: string;
  badge?: string;
}

// Transaction Types & Categories
export type TransactionType = 'income' | 'expense';
export type PaymentStatus = 'paid' | 'pending';

export const TransactionCategoryValues = [
  'Revenue / Sales',
  'Consulting & Services',
  'Accounts Receivable',
  'Payroll & Wages',
  'Rent & Facilities',
  'Software & Cloud',
  'Freight & Logistics',
  'Tax & Statutory',
  'Marketing & Advertising',
  'Supplies & Equipment',
  'Utilities',
  'Professional Fees',
  'Other Inflow',
  'Other Expense',
] as const;

export type TransactionCategory = (typeof TransactionCategoryValues)[number];

// Zod Schema for Validating Transaction Form Inputs
export const CreateTransactionSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in valid YYYY-MM-DD format'),
  description: z.string().trim().min(2, 'Description must be at least 2 characters').max(200),
  type: z.enum(['income', 'expense']),
  category: z.string().trim().min(1, 'Category is required'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be a positive finite number')
    .finite('Amount must be finite')
    .max(100_000_000, 'Amount cannot exceed 100,000,000'),
  counterparty: z.string().trim().max(100).optional().default(''),
  status: z.enum(['paid', 'pending']),
  notes: z.string().trim().max(500).optional().default(''),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

export const UpdateTransactionSchema = CreateTransactionSchema.partial();
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

// Full Transaction Interface
export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: TransactionType;
  category: string;
  amount: number;
  counterparty?: string;
  status: PaymentStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Monthly Financial Summary
export interface MonthlyFinancialSummary {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // "May 2026"
  paidIncome: number;
  paidExpense: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  pendingReceivables: number;
  pendingPayables: number;
  transactionCount: number;
}

// Baseline Projection
export interface BaselineProjection {
  baselineMethod: string;
  assumptions: string[];
  projectionDays: number;
  dailyAverageBurnOrGain: number;
  expectedPendingInflow: number;
  expectedPendingOutflow: number;
  projectedEndingBalance: number;
  projectedNetChange: number;
  statusNotice: string;
}

// Daily / Periodic Forecast Timeline Point
export interface ForecastDataPoint {
  date: string; // YYYY-MM-DD
  periodLabel: string; // e.g. "Oct 15"
  dayIndex: number; // 1 to 30
  projectedBalance: number;
  expectedInflow: number;
  expectedOutflow: number;
  netMovement: number;
  scheduledPendingInflow: number;
  scheduledPendingOutflow: number;
  runRateInflow: number;
  runRateOutflow: number;
  notes?: string;
}

// Data Sufficiency Assessment
export interface DataSufficiency {
  isSufficient: boolean;
  historicalDays: number;
  paidTransactionCount: number;
  earliestDate?: string;
  latestDate?: string;
  statusMessage: string;
  minimumRequiredDays: number;
  minimumRequiredTransactions: number;
}

// 30-Day Cash Flow Forecast Structure
export interface CashFlowForecastResponse {
  asOfDate: string;
  forecastHorizonDays: number;
  startingCashBalance: number;
  isOpeningBalanceConfigured: boolean;
  projectedEndingBalance: number;
  projectedNetChange: number;
  dailyAverageBurnOrGain: number;
  totalExpectedInflow: number;
  totalExpectedOutflow: number;
  totalScheduledPendingInflow: number;
  totalScheduledPendingOutflow: number;
  realizedPendingInflowFactor: number;
  realizedPendingOutflowFactor: number;
  assumptions: string[];
  confidenceLimitationsNotice: string;
  methodologyDescription: string;
  dataSufficiency: DataSufficiency;
  timeline: ForecastDataPoint[];
}

// Risk Alert Interface
export type RiskSeverity = 'high' | 'medium' | 'low';
export type RiskCategory =
  | 'Cash Runway'
  | 'Operating Deficit'
  | 'Receivables'
  | 'Payables'
  | 'Data Quality';

export interface RiskAlert {
  id: string;
  severity: RiskSeverity;
  category: RiskCategory;
  title: string;
  description: string;
  impact: string;
  date: string;
  suggestedAction: string;
  relevantPeriod?: string;
  relatedTransactionId?: string;
}

export interface RiskAnalysisResponse {
  asOfDate: string;
  alerts: RiskAlert[];
  overallRiskLevel: 'low' | 'moderate' | 'elevated' | 'critical';
  minimumCashThreshold?: number;
  summaryCounts: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

// Overall Financial Summary
export interface FinancialSummaryResponse {
  openingBalance: number | null;
  isOpeningBalanceConfigured: boolean;
  currentCashBalance: number;
  cumulativeNetCash: number;
  totalPaidIncome: number;
  totalPaidExpenses: number;
  netCashFlow: number;
  pendingReceivables: number;
  pendingPayables: number;
  monthlySummaries: MonthlyFinancialSummary[];
  baseline30DayProjection: BaselineProjection;
  forecast?: CashFlowForecastResponse;
  risks?: RiskAnalysisResponse;
  asOfDate: string;
  isDemoData: boolean;
}

// Financial KPI Metric Interface
export interface FinancialMetric {
  id: string;
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  timeframe?: string;
  status?: 'positive' | 'warning' | 'negative' | 'neutral';
  tooltipText?: string;
}

// Cash Flow Chart Data Point Interface
export interface CashFlowDataPoint {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}
