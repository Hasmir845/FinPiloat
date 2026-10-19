import { z } from 'zod';
import {
  HealthCheckResponse,
  HealthCheckSchema,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  FinancialSummaryResponse,
  CashFlowForecastResponse,
  RiskAnalysisResponse,
  CopilotStatusResponseData,
  CopilotChatResponseData,
  FinancingAssessmentInput,
  FinancingReadinessAssessment,
  FinancingAssessmentResponseData,
} from '../types';

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    // In Vite dev with proxy, '/api' can work directly or fall back to VITE_API_URL
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    schema?: z.ZodType<T>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorData: unknown;
        try {
          errorData = await response.json();
        } catch {
          errorData = null;
        }

        const message =
          (typeof errorData === 'object' &&
            errorData !== null &&
            'error' in errorData &&
            typeof (errorData as { error: { message?: string } }).error?.message === 'string' &&
            (errorData as { error: { message: string } }).error.message) ||
          response.statusText ||
          `Request failed with status ${response.status}`;

        throw new ApiError(message, response.status, errorData);
      }

      const data = await response.json();

      if (schema) {
        const parsed = schema.safeParse(data);
        if (!parsed.success) {
          console.warn('[ApiClient] Validation Warning:', parsed.error);
          return data as T;
        }
        return parsed.data;
      }

      return data as T;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw err;
      }

      const rawMessage = err instanceof Error ? err.message : 'Unknown network failure';
      const isNetworkFailure =
        err instanceof TypeError ||
        rawMessage.toLowerCase().includes('failed to fetch') ||
        rawMessage.toLowerCase().includes('network') ||
        rawMessage.toLowerCase().includes('connection');

      const message = isNetworkFailure
        ? `Cannot connect to FinPilot API server (${this.baseUrl}). Please ensure the Express backend is running (run 'npm run dev:server' in terminal).`
        : rawMessage;

      throw new ApiError(message, 0, err);
    }
  }

  /**
   * Health Check endpoint to verify backend connectivity
   */
  public async getHealth(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/health', { method: 'GET' }, HealthCheckSchema);
  }

  /**
   * Fetch all transactions with optional query filters
   */
  public async getTransactions(
    filters?: Record<string, string | undefined>
  ): Promise<{ data: Transaction[]; total: number }> {
    const query = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, val);
      });
    }
    const endpoint = `/transactions${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await this.request<{ success: boolean; data: Transaction[]; meta?: { total?: number } }>(
      endpoint,
      { method: 'GET' }
    );
    return {
      data: res.data,
      total: res.meta?.total ?? res.data.length,
    };
  }

  /**
   * Fetch a single transaction by ID
   */
  public async getTransaction(id: string): Promise<Transaction> {
    const res = await this.request<{ success: boolean; data: Transaction }>(
      `/transactions/${encodeURIComponent(id)}`,
      { method: 'GET' }
    );
    return res.data;
  }

  /**
   * Create a new transaction
   */
  public async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    const res = await this.request<{ success: boolean; data: Transaction; message: string }>(
      '/transactions',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  /**
   * Update an existing transaction
   */
  public async updateTransaction(id: string, data: UpdateTransactionInput): Promise<Transaction> {
    const res = await this.request<{ success: boolean; data: Transaction; message: string }>(
      `/transactions/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  /**
   * Delete a transaction
   */
  public async deleteTransaction(id: string): Promise<{ id: string }> {
    const res = await this.request<{ success: boolean; data: { id: string }; message: string }>(
      `/transactions/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  }

  /**
   * Reset transactions back to default demo seed dataset
   */
  public async resetTransactions(): Promise<Transaction[]> {
    const res = await this.request<{ success: boolean; data: Transaction[]; message: string }>(
      '/transactions/reset',
      {
        method: 'POST',
      }
    );
    return res.data;
  }

  /**
   * Fetch precomputed financial summary metrics from backend
   */
  public async getFinancialSummary(
    openingBalance?: number | null,
    asOfDate?: string
  ): Promise<FinancialSummaryResponse> {
    const params = new URLSearchParams();
    if (typeof openingBalance === 'number' && Number.isFinite(openingBalance)) {
      params.append('openingBalance', openingBalance.toString());
    }
    if (asOfDate) {
      params.append('asOfDate', asOfDate);
    }
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await this.request<{ success: boolean; data: FinancialSummaryResponse }>(
      `/financial/summary${query}`,
      { method: 'GET' }
    );
    return res.data;
  }

  /**
   * Fetch 30-day deterministic cash flow forecast from backend
   */
  public async getForecast(
    openingBalance?: number | null,
    asOfDate?: string
  ): Promise<CashFlowForecastResponse> {
    const params = new URLSearchParams();
    if (typeof openingBalance === 'number' && Number.isFinite(openingBalance)) {
      params.append('openingBalance', openingBalance.toString());
    }
    if (asOfDate) {
      params.append('asOfDate', asOfDate);
    }
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await this.request<{ success: boolean; data: CashFlowForecastResponse }>(
      `/financial/forecast${query}`,
      { method: 'GET' }
    );
    return res.data;
  }

  /**
   * Fetch financial risk alerts from backend risk analysis service
   */
  public async getRisks(
    openingBalance?: number | null,
    asOfDate?: string
  ): Promise<RiskAnalysisResponse> {
    const params = new URLSearchParams();
    if (typeof openingBalance === 'number' && Number.isFinite(openingBalance)) {
      params.append('openingBalance', openingBalance.toString());
    }
    if (asOfDate) {
      params.append('asOfDate', asOfDate);
    }
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await this.request<{ success: boolean; data: RiskAnalysisResponse }>(
      `/financial/risks${query}`,
      { method: 'GET' }
    );
    return res.data;
  }

  /**
   * Fetch Gemini Copilot configuration and workspace status
   */
  public async getCopilotStatus(): Promise<CopilotStatusResponseData> {
    const res = await this.request<{ success: boolean; data: CopilotStatusResponseData }>(
      '/copilot/status',
      { method: 'GET' }
    );
    return res.data;
  }

  /**
   * Send a chat prompt to the Gemini Copilot assistant grounded in authoritative financial data
   */
  public async sendCopilotMessage(payload: {
    message: string;
    history?: Array<{ role: 'user' | 'model'; content: string }>;
    asOfDate?: string;
    openingBalance?: number;
    minimumCashThreshold?: number;
    language?: 'en' | 'bn';
  }): Promise<CopilotChatResponseData> {
    const res = await this.request<{ success: boolean; data: CopilotChatResponseData }>(
      '/copilot/chat',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  }

  /**
   * Fetch quick financial readiness summary from MongoDB records
   */
  public async getFinancingReadiness(
    openingBalance?: number | null,
    asOfDate?: string
  ): Promise<FinancingReadinessAssessment> {
    const params = new URLSearchParams();
    if (typeof openingBalance === 'number' && Number.isFinite(openingBalance)) {
      params.append('openingBalance', openingBalance.toString());
    }
    if (asOfDate) {
      params.append('asOfDate', asOfDate);
    }
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await this.request<{ success: boolean; data: FinancingReadinessAssessment }>(
      `/financing/readiness${query}`,
      { method: 'GET' }
    );
    return res.data;
  }

  /**
   * Submit SME financing parameters for readiness analysis, rule-based matching, and AI explanation
   */
  public async submitFinancingAssessment(
    payload: FinancingAssessmentInput
  ): Promise<FinancingAssessmentResponseData> {
    const res = await this.request<{ success: boolean; data: FinancingAssessmentResponseData }>(
      '/financing/assess',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  }
}

export const apiClient = new ApiClient();
