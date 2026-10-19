import { z } from 'zod';

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

// Zod Schema for Validating Incoming Transaction Creation
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

export type CreateTransactionInput = z.input<typeof CreateTransactionSchema>;

// Zod Schema for Validating Incoming Transaction Updates (Requires at least one field)
export const UpdateTransactionSchema = CreateTransactionSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided to update a transaction' }
);
export type UpdateTransactionInput = z.input<typeof UpdateTransactionSchema>;

// Stored Transaction Model
export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: TransactionType;
  category: string;
  amount: number; // Stored in major currency unit (USD), precision-managed via integer cents
  counterparty?: string;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Monthly Summary Structure
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

// 30-Day Baseline Projection Structure
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
  realizedPendingInflowFactor: number; // e.g. 0.85
  realizedPendingOutflowFactor: number; // e.g. 1.0
  assumptions: string[];
  confidenceLimitationsNotice: string;
  methodologyDescription: string;
  dataSufficiency: DataSufficiency;
  timeline: ForecastDataPoint[];
}

// Risk Analysis Types
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

// Health Check Response
export interface DatabaseHealthInfo {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  databaseName?: string;
  configured: boolean;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: DatabaseHealthInfo;
}

// Standard API Responses
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    timestamp?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

// AI Copilot Types
export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export const CopilotChatRequestSchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message cannot exceed 2,000 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string().trim().min(1).max(12000, 'History item cannot exceed 12,000 characters'),
      })
    )
    .max(20, 'History cannot exceed 20 messages')
    .optional(),
  asOfDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  openingBalance: z.number().finite().optional(),
  minimumCashThreshold: z.number().nonnegative().finite().optional(),
  language: z.enum(['en', 'bn']).optional(),
});

export type CopilotChatRequest = z.infer<typeof CopilotChatRequestSchema>;

export interface CopilotGroundingContext {
  asOfDate: string;
  isOpeningBalanceConfigured: boolean;
  openingBalance: number | null;
  currentCashBalance: number;
  totalPaidIncome: number;
  totalPaidExpenses: number;
  netCashFlow: number;
  pendingReceivables: number;
  pendingPayables: number;
  forecastEndingBalance: number;
  forecastNetChange: number;
  dailyAverageBurnOrGain: number;
  dataSufficiency: {
    isSufficient: boolean;
    historicalDays: number;
    paidTransactionCount: number;
    statusMessage: string;
  };
  activeAlerts: Array<{
    severity: RiskSeverity;
    category: RiskCategory;
    title: string;
    description: string;
    suggestedAction: string;
  }>;
  overallRiskLevel: 'low' | 'moderate' | 'elevated' | 'critical';
  topIncomeCategories: Array<{ category: string; amount: number }>;
  topExpenseCategories: Array<{ category: string; amount: number }>;
  recentPendingItems: Array<{
    date: string;
    description: string;
    type: TransactionType;
    category: string;
    amount: number;
    counterparty?: string;
  }>;
  totalTransactionsCount: number;
  workspaceName: string;
}

export interface CopilotChatResponseData {
  message: string;
  model: string;
  groundingContext: CopilotGroundingContext;
  confidenceLimitations: string[];
}

export interface CopilotStatusResponseData {
  configured: boolean;
  model: string;
  workspace: string;
  isSingleWorkspaceDemo: boolean;
  notice: string;
}

// Financing Recommendation Types
export const FinancingPurposeValues = [
  'working_capital',
  'invoice_bridge',
  'equipment_purchase',
  'inventory_purchase',
  'growth_expansion',
  'debt_refinancing',
] as const;

export type FinancingPurpose = (typeof FinancingPurposeValues)[number];

export const BusinessTypeValues = [
  'Limited Liability Company (LLC)',
  'Corporation (C-Corp / S-Corp)',
  'Sole Proprietorship',
  'Partnership',
  'Other',
] as const;

export type BusinessType = (typeof BusinessTypeValues)[number];

export const FinancingAssessmentInputSchema = z.object({
  businessType: z.string().trim().min(2, 'Business type is required').max(100),
  industry: z.string().trim().min(2, 'Industry is required').max(100),
  operatingMonths: z
    .number({ invalid_type_error: 'Operating duration must be a number of months' })
    .int('Operating duration must be an integer')
    .min(1, 'Operating duration must be at least 1 month')
    .max(1200, 'Operating duration cannot exceed 100 years'),
  requestedAmount: z
    .number({ invalid_type_error: 'Requested amount must be a number' })
    .positive('Requested amount must be greater than 0')
    .finite('Requested amount must be finite')
    .max(50_000_000, 'Requested amount cannot exceed $50,000,000'),
  purpose: z.enum(FinancingPurposeValues, {
    errorMap: () => ({ message: 'Please select a valid financing purpose' }),
  }),
  preferredRepaymentMonths: z
    .number({ invalid_type_error: 'Repayment period must be a number of months' })
    .int('Repayment period must be an integer')
    .min(1, 'Repayment period must be at least 1 month')
    .max(120, 'Repayment period cannot exceed 120 months'),
  statedMonthlyRevenue: z
    .number({ invalid_type_error: 'Monthly revenue must be a number' })
    .nonnegative('Monthly revenue cannot be negative')
    .finite('Monthly revenue must be finite')
    .optional(),
  existingMonthlyDebtRepayment: z
    .number({ invalid_type_error: 'Existing debt repayment must be a number' })
    .nonnegative('Existing debt repayment cannot be negative')
    .finite('Existing debt repayment must be finite')
    .optional(),
  notes: z.string().trim().max(1000).optional(),
  asOfDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  openingBalance: z.number().finite().optional(),
  language: z.enum(['en', 'bn']).optional(),
});

export type FinancingAssessmentInput = z.infer<typeof FinancingAssessmentInputSchema>;

export type FinancingMatchLevel = 'strong_match' | 'potential_match' | 'caution_low_match';

export interface FinancingOption {
  id: string;
  name: string;
  type: string;
  matchLevel: FinancingMatchLevel;
  matchScore: number; // 0-100
  typicalUseCase: string;
  relevanceExplanation: string;
  potentialAdvantages: string[];
  potentialRisks: string[];
  typicalRepaymentTerms: string;
  verifiedEligibilityCriteria: string[];
  informationStillNeeded: string[];
  isIllustrative: true;
}

export interface FinancingReadinessAssessment {
  currentCashBalance: number;
  totalPaidIncome: number;
  totalPaidExpenses: number;
  trailingNetCashFlow: number;
  pendingReceivables: number;
  pendingPayables: number;
  isOpeningBalanceConfigured: boolean;
  openingBalance: number | null;
  dataSufficiency: DataSufficiency;
  activeRiskCount: number;
  overallRiskLevel: 'low' | 'moderate' | 'elevated' | 'critical';
  operatingRunwayMonths: number | null;
  monthlyRevenueEstimate: number | null;
  monthlyRevenueSource: 'verified_ledger' | 'user_reported' | 'unavailable';
  debtServiceBurdenRatio: number | null;
  netCashFlowStatus: 'positive' | 'negative' | 'break_even';
  dataQualityVerdict: 'sufficient' | 'limited' | 'insufficient';
  readinessHighlights: string[];
  readinessConcerns: string[];
  missingInformationChecklist: string[];
}

export interface FinancingAssessmentResponseData {
  userInput: FinancingAssessmentInput;
  readiness: FinancingReadinessAssessment;
  matchedOptions: FinancingOption[];
  aiExplanation?: string;
  disclaimers: string[];
  generatedAt: string;
}
