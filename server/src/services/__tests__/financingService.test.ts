import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessFinancialReadiness,
  matchFinancingOptions,
  executeFinancingAssessment,
  setTestNarrativeOverride,
} from '../financingService';
import {
  FinancingAssessmentInputSchema,
  FinancingAssessmentInput,
  Transaction,
} from '../../types';
import { setDatabaseInstanceForTesting } from '../../db/connection';

describe('SME Financing Recommendation Engine Unit Tests', () => {
  // Test Fixture Transactions
  const createTx = (
    id: string,
    date: string,
    type: 'income' | 'expense',
    amount: number,
    status: 'paid' | 'pending',
    category = 'Revenue / Sales'
  ): Transaction => ({
    id,
    date,
    description: `Test Transaction ${id}`,
    type,
    category,
    amount,
    status,
    createdAt: '2026-10-12T00:00:00.000Z',
    updatedAt: '2026-10-12T00:00:00.000Z',
  });

  const healthyTransactions: Transaction[] = [
    createTx('tx-1', '2026-05-01', 'income', 60000, 'paid'),
    createTx('tx-2', '2026-05-15', 'expense', 25000, 'paid', 'Payroll & Wages'),
    createTx('tx-3', '2026-06-01', 'income', 70000, 'paid'),
    createTx('tx-4', '2026-06-15', 'expense', 30000, 'paid', 'Payroll & Wages'),
    createTx('tx-5', '2026-07-01', 'income', 80000, 'paid'),
    createTx('tx-6', '2026-07-15', 'expense', 35000, 'paid', 'Payroll & Wages'),
    createTx('tx-7', '2026-08-01', 'income', 45000, 'pending', 'Accounts Receivable'), // Pending AR
  ];

  const deficitTransactions: Transaction[] = [
    createTx('tx-d1', '2026-09-01', 'income', 20000, 'paid'),
    createTx('tx-d2', '2026-09-10', 'expense', 60000, 'paid', 'Payroll & Wages'), // -40k net
  ];

  const createMockDb = (txList: Transaction[]) =>
    ({
      collection: () => ({
        find: () => ({
          sort: () => ({
            toArray: async () => txList,
          }),
        }),
        countDocuments: async () => txList.length,
      }),
    } as unknown as Parameters<typeof setDatabaseInstanceForTesting>[0]);

  beforeEach(() => {
    setDatabaseInstanceForTesting(createMockDb(healthyTransactions));
    setTestNarrativeOverride(null);
  });

  afterEach(() => {
    setTestNarrativeOverride(null);
  });

  // 1. Input Validation & Invalid Amounts
  test('1. Input validation - rejects non-positive, oversized, and invalid inputs', () => {
    // Zero or negative requested amount
    const zeroRes = FinancingAssessmentInputSchema.safeParse({
      businessType: 'LLC',
      industry: 'Logistics',
      operatingMonths: 24,
      requestedAmount: 0,
      purpose: 'working_capital',
      preferredRepaymentMonths: 12,
    });
    assert.equal(zeroRes.success, false);

    const negRes = FinancingAssessmentInputSchema.safeParse({
      businessType: 'LLC',
      industry: 'Logistics',
      operatingMonths: 24,
      requestedAmount: -5000,
      purpose: 'working_capital',
      preferredRepaymentMonths: 12,
    });
    assert.equal(negRes.success, false);

    // Oversized requested amount (> 50,000,000)
    const overRes = FinancingAssessmentInputSchema.safeParse({
      businessType: 'LLC',
      industry: 'Logistics',
      operatingMonths: 24,
      requestedAmount: 60_000_000,
      purpose: 'working_capital',
      preferredRepaymentMonths: 12,
    });
    assert.equal(overRes.success, false);

    // Invalid purpose
    const badPurposeRes = FinancingAssessmentInputSchema.safeParse({
      businessType: 'LLC',
      industry: 'Logistics',
      operatingMonths: 24,
      requestedAmount: 50000,
      purpose: 'crypto_speculation',
      preferredRepaymentMonths: 12,
    });
    assert.equal(badPurposeRes.success, false);

    // Valid input passes
    const validRes = FinancingAssessmentInputSchema.safeParse({
      businessType: 'Limited Liability Company (LLC)',
      industry: 'Logistics & Freight',
      operatingMonths: 36,
      requestedAmount: 75000,
      purpose: 'equipment_purchase',
      preferredRepaymentMonths: 36,
      statedMonthlyRevenue: 65000,
      existingMonthlyDebtRepayment: 4500,
    });
    assert.equal(validRes.success, true);
  });

  // 2. Missing Data Handling (No hallucinated revenue or debt metrics)
  test('2. Missing data handling - gracefully marks unstated revenue and debt as unavailable', async () => {
    const input: FinancingAssessmentInput = {
      businessType: 'Corporation',
      industry: 'Retail',
      operatingMonths: 18,
      requestedAmount: 40000,
      purpose: 'working_capital',
      preferredRepaymentMonths: 12,
      // statedMonthlyRevenue and existingMonthlyDebtRepayment are omitted
    };

    const readiness = await assessFinancialReadiness(input);

    assert.equal(readiness.debtServiceBurdenRatio, null, 'Debt ratio must be null when debt is unstated');
    assert.ok(
      readiness.missingInformationChecklist.some((item) => item.includes('debt schedule')),
      'Checklist must prompt for debt schedule when unstated'
    );
  });

  // 3. Negative Cash Flow Handling
  test('3. Negative cash flow handling - flags operating deficit and warns against fixed debt burdens', async () => {
    setDatabaseInstanceForTesting(createMockDb(deficitTransactions));

    const input: FinancingAssessmentInput = {
      businessType: 'LLC',
      industry: 'Services',
      operatingMonths: 10,
      requestedAmount: 50000,
      purpose: 'working_capital',
      preferredRepaymentMonths: 12,
    };

    const readiness = await assessFinancialReadiness(input);
    assert.equal(readiness.netCashFlowStatus, 'negative');
    assert.ok(
      readiness.readinessConcerns.some((c) => c.includes('deficit')),
      'Must contain specific operating deficit concern'
    );

    const options = matchFinancingOptions(input, readiness);
    const termLoan = options.find((o) => o.type === 'term_loan');
    assert.ok(termLoan);
    assert.equal(termLoan.matchLevel, 'caution_low_match', 'Term loan must be low match for negative cash flow');
  });

  // 4. Insufficient Historical Data Detection
  test('4. Insufficient transaction history - flags data quality warning and requires bank statements', async () => {
    // Only 1 transaction in DB
    const sparseDb = createMockDb([createTx('tx-single', '2026-10-01', 'income', 10000, 'paid')]);
    setDatabaseInstanceForTesting(sparseDb);

    const input: FinancingAssessmentInput = {
      businessType: 'LLC',
      industry: 'Technology',
      operatingMonths: 8,
      requestedAmount: 30000,
      purpose: 'working_capital',
      preferredRepaymentMonths: 12,
    };

    const readiness = await assessFinancialReadiness(input);
    assert.equal(readiness.dataQualityVerdict, 'insufficient');
    assert.ok(
      readiness.readinessConcerns.some((c) => c.includes('limited')),
      'Readiness concerns must explicitly note limited ledger depth'
    );
  });

  // 5. Transparent Rule-Based Matching (Equipment vs Invoice Factoring vs Line of Credit)
  test('5. Rule-based matching - ranks Equipment Financing highest for equipment purchase purpose', async () => {
    const input: FinancingAssessmentInput = {
      businessType: 'LLC',
      industry: 'Manufacturing',
      operatingMonths: 36,
      requestedAmount: 100000,
      purpose: 'equipment_purchase',
      preferredRepaymentMonths: 36,
    };

    const readiness = await assessFinancialReadiness(input);
    const options = matchFinancingOptions(input, readiness);

    assert.equal(options[0].type, 'equipment_financing', 'Equipment financing must be ranked #1 for equipment purpose');
    assert.equal(options[0].matchLevel, 'strong_match');
    assert.ok(options[0].matchScore >= 80);
  });

  test('6. Rule-based matching - ranks Invoice Factoring highest when purpose is invoice bridge and AR exists', async () => {
    const input: FinancingAssessmentInput = {
      businessType: 'LLC',
      industry: 'Wholesale',
      operatingMonths: 24,
      requestedAmount: 40000,
      purpose: 'invoice_bridge',
      preferredRepaymentMonths: 3,
    };

    const readiness = await assessFinancialReadiness(input);
    const options = matchFinancingOptions(input, readiness);

    assert.equal(options[0].type, 'invoice_factoring', 'Invoice factoring must be ranked #1 for invoice bridge');
    assert.equal(options[0].matchLevel, 'strong_match');
  });

  // 7. No Unsupported Claims / All Options Strictly Illustrative
  test('7. Illustrative compliance - ensures no guaranteed approvals or fake interest rates', async () => {
    setTestNarrativeOverride(async () => 'This is an illustrative AI explanation of calculated figures.');

    const input: FinancingAssessmentInput = {
      businessType: 'LLC',
      industry: 'Distribution',
      operatingMonths: 24,
      requestedAmount: 50000,
      purpose: 'working_capital',
      preferredRepaymentMonths: 12,
    };

    const result = await executeFinancingAssessment(input);

    assert(Array.isArray(result.disclaimers));
    assert.ok(result.disclaimers.some((d) => d.includes('NOT a lender')));

    // Every matched option must declare isIllustrative: true
    for (const opt of result.matchedOptions) {
      assert.equal(opt.isIllustrative, true, `${opt.name} must declare isIllustrative: true`);
      assert.ok(opt.potentialRisks.length > 0, `${opt.name} must articulate potential risks`);
      assert.ok(opt.informationStillNeeded.length > 0, `${opt.name} must specify information still needed`);
    }
  });
});
