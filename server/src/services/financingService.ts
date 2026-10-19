import { GoogleGenAI } from '@google/genai';
import {
  Transaction,
  FinancingAssessmentInput,
  FinancingReadinessAssessment,
  FinancingOption,
  FinancingAssessmentResponseData,
  FinancingMatchLevel,
} from '../types';
import { transactionRepository } from '../repositories/transactionRepository';
import {
  calculateCurrentCashBalance,
  calculateTotalPaidIncome,
  calculateTotalPaidExpenses,
  calculatePendingReceivables,
  calculatePendingPayables,
  resolveEffectiveAsOfDate,
} from './financialCalculationService';
import { generateCashFlowForecast } from './forecastingService';
import { analyzeFinancialRisks } from './riskAnalysisService';
import { isCopilotConfigured, getCopilotModel } from './copilotService';
import { formatCurrency } from '../utils/formatting';

// Testing hook to mock Gemini narrative generation
type GeminiNarrativeFn =
  | string
  | ((params: {
      readiness: FinancingReadinessAssessment;
      input: FinancingAssessmentInput;
      matchedOptions: FinancingOption[];
    }) => Promise<string> | string);

let testNarrativeOverride: GeminiNarrativeFn | null = null;

export function setTestNarrativeOverride(fn: GeminiNarrativeFn | null): void {
  testNarrativeOverride = fn;
}

const FINANCING_DISCLAIMERS = [
  'FinPilot AI is an analytical decision-support tool, NOT a lender, licensed loan broker, or credit rating agency.',
  'All financing options, eligibility criteria, and terms displayed are illustrative industry benchmarks. They do NOT constitute binding loan offers, credit pre-approvals, or guaranteed financing.',
  'Interest rates, fees, underwriting guidelines, and approval terms must be verified directly with licensed institutional or commercial financial providers.',
  'FinPilot does not accept, submit, or process loan applications, nor does it execute or facilitate financial transactions.',
];

/**
 * Assesses SME financial readiness using authoritative backend calculation services and MongoDB transactions.
 * Strictly avoids inventing unverified metrics.
 */
export async function assessFinancialReadiness(
  input: FinancingAssessmentInput
): Promise<FinancingReadinessAssessment> {
  const transactions = await transactionRepository.getAll();
  const effectiveAsOfDate = resolveEffectiveAsOfDate(transactions, input.asOfDate);
  const isOpeningBalanceConfigured =
    typeof input.openingBalance === 'number' && Number.isFinite(input.openingBalance);

  const currentCashBalance = calculateCurrentCashBalance(
    transactions,
    input.openingBalance,
    input.asOfDate ? effectiveAsOfDate : undefined
  );
  const totalPaidIncome = calculateTotalPaidIncome(
    transactions,
    undefined,
    input.asOfDate ? effectiveAsOfDate : undefined
  );
  const totalPaidExpenses = calculateTotalPaidExpenses(
    transactions,
    undefined,
    input.asOfDate ? effectiveAsOfDate : undefined
  );
  const trailingNetCashFlow = totalPaidIncome - totalPaidExpenses;
  const pendingReceivables = calculatePendingReceivables(transactions);
  const pendingPayables = calculatePendingPayables(transactions);

  const forecast = generateCashFlowForecast(
    transactions,
    currentCashBalance,
    effectiveAsOfDate,
    isOpeningBalanceConfigured
  );

  const risks = analyzeFinancialRisks(
    transactions,
    forecast,
    currentCashBalance,
    effectiveAsOfDate,
    isOpeningBalanceConfigured
  );

  // Determine Net Cash Flow Status
  const netCashFlowStatus: 'positive' | 'negative' | 'break_even' =
    trailingNetCashFlow > 0 ? 'positive' : trailingNetCashFlow < 0 ? 'negative' : 'break_even';

  // Determine Monthly Revenue Estimate
  let monthlyRevenueEstimate: number | null = null;
  let monthlyRevenueSource: 'verified_ledger' | 'user_reported' | 'unavailable' = 'unavailable';

  if (forecast.dataSufficiency.isSufficient && forecast.dataSufficiency.historicalDays >= 30) {
    // Extrapolate verified 30-day average income from actual paid transactions
    monthlyRevenueEstimate = Math.round(
      (totalPaidIncome / forecast.dataSufficiency.historicalDays) * 30
    );
    monthlyRevenueSource = 'verified_ledger';
  } else if (typeof input.statedMonthlyRevenue === 'number' && input.statedMonthlyRevenue > 0) {
    monthlyRevenueEstimate = input.statedMonthlyRevenue;
    monthlyRevenueSource = 'user_reported';
  }

  // Calculate Debt Service Burden Ratio (if debt and revenue figures exist)
  let debtServiceBurdenRatio: number | null = null;
  if (
    typeof input.existingMonthlyDebtRepayment === 'number' &&
    monthlyRevenueEstimate !== null &&
    monthlyRevenueEstimate > 0
  ) {
    debtServiceBurdenRatio = Math.round(
      (input.existingMonthlyDebtRepayment / monthlyRevenueEstimate) * 100
    ) / 100;
  }

  // Calculate Operating Runway Months (if burn rate is negative)
  let operatingRunwayMonths: number | null = null;
  if (forecast.dailyAverageBurnOrGain < 0 && currentCashBalance > 0) {
    const monthlyBurn = Math.abs(forecast.dailyAverageBurnOrGain) * 30;
    operatingRunwayMonths = Math.round((currentCashBalance / monthlyBurn) * 10) / 10;
  } else if (currentCashBalance <= 0) {
    operatingRunwayMonths = 0;
  }

  // Determine Data Quality Verdict
  const dataQualityVerdict: 'sufficient' | 'limited' | 'insufficient' =
    forecast.dataSufficiency.isSufficient
      ? 'sufficient'
      : forecast.dataSufficiency.paidTransactionCount >= 3
      ? 'limited'
      : 'insufficient';

  // Build Readiness Highlights & Concerns
  const readinessHighlights: string[] = [];
  const readinessConcerns: string[] = [];

  if (currentCashBalance > 0) {
    readinessHighlights.push(
      `Current operating cash balance of ${formatCurrency(currentCashBalance)} provides liquidity buffer.`
    );
  } else {
    readinessConcerns.push(
      `Operating cash balance is negative (${formatCurrency(currentCashBalance)}), indicating acute liquidity distress.`
    );
  }

  if (trailingNetCashFlow > 0) {
    readinessHighlights.push(
      `Positive cumulative net cash flow of ${formatCurrency(trailingNetCashFlow)} demonstrates operating profitability.`
    );
  } else if (trailingNetCashFlow < 0) {
    readinessConcerns.push(
      `Business operates at a net cash deficit (${formatCurrency(trailingNetCashFlow)}). Additional debt service will increase burn velocity.`
    );
  }

  if (pendingReceivables > 0) {
    readinessHighlights.push(
      `${formatCurrency(pendingReceivables)} in outstanding customer receivables can be leveraged for non-debt asset conversion.`
    );
  }

  if (input.operatingMonths >= 24) {
    readinessHighlights.push(
      `Established operating history of ${Math.floor(input.operatingMonths / 12)} years satisfies traditional underwriting thresholds.`
    );
  } else if (input.operatingMonths < 12) {
    readinessConcerns.push(
      `Early-stage status (${input.operatingMonths} months in business) typically precludes conventional commercial bank term loans.`
    );
  }

  if (debtServiceBurdenRatio !== null && debtServiceBurdenRatio > 0.35) {
    readinessConcerns.push(
      `Existing debt repayments consume ${Math.round(debtServiceBurdenRatio * 100)}% of monthly revenue, exceeding conventional 35% safe debt ratios.`
    );
  }

  if (!forecast.dataSufficiency.isSufficient) {
    readinessConcerns.push(
      `Ledger data depth is limited (${forecast.dataSufficiency.historicalDays} days, ${forecast.dataSufficiency.paidTransactionCount} transactions). Commercial underwriters will require external bank statements.`
    );
  }

  // Missing Information Checklist
  const missingInformationChecklist: string[] = [];
  if (monthlyRevenueSource !== 'verified_ledger') {
    missingInformationChecklist.push(
      'Verified profit & loss (P&L) statements covering trailing 12 months'
    );
  }
  if (typeof input.existingMonthlyDebtRepayment !== 'number') {
    missingInformationChecklist.push(
      'Complete business debt schedule and outstanding liability agreements'
    );
  }
  missingInformationChecklist.push(
    'Last 2 years of corporate tax returns and owner personal tax returns'
  );
  missingInformationChecklist.push(
    '3 to 6 months of official business checking account statements'
  );
  if (input.purpose === 'invoice_bridge' || pendingReceivables > 0) {
    missingInformationChecklist.push(
      'Detailed accounts receivable (AR) aging report with customer contact verification'
    );
  }
  if (input.purpose === 'equipment_purchase') {
    missingInformationChecklist.push(
      'Official equipment purchase quote, vendor invoice, or pro-forma specification'
    );
  }

  return {
    currentCashBalance,
    totalPaidIncome,
    totalPaidExpenses,
    trailingNetCashFlow,
    pendingReceivables,
    pendingPayables,
    isOpeningBalanceConfigured,
    openingBalance: isOpeningBalanceConfigured ? (input.openingBalance as number) : null,
    dataSufficiency: forecast.dataSufficiency,
    activeRiskCount: risks.alerts.length,
    overallRiskLevel: risks.overallRiskLevel,
    operatingRunwayMonths,
    monthlyRevenueEstimate,
    monthlyRevenueSource,
    debtServiceBurdenRatio,
    netCashFlowStatus,
    dataQualityVerdict,
    readinessHighlights,
    readinessConcerns,
    missingInformationChecklist,
  };
}

/**
 * Transparent, rule-based matching engine comparing the SME's stated needs
 * with illustrative financing option characteristics.
 */
export function matchFinancingOptions(
  input: FinancingAssessmentInput,
  readiness: FinancingReadinessAssessment
): FinancingOption[] {
  const options: FinancingOption[] = [];

  // =========================================================================
  // 1. INVOICE FACTORING / ACCOUNTS RECEIVABLE DISCOUNTING
  // =========================================================================
  let factoringScore = 45;
  const factoringReasons: string[] = [];

  if (input.purpose === 'invoice_bridge') {
    factoringScore += 40;
    factoringReasons.push('Directly matches stated purpose of bridging unpaid client invoices.');
  } else if (input.purpose === 'working_capital') {
    factoringScore += 15;
    factoringReasons.push('Provides flexible working capital without adding fixed monthly debt.');
  }

  if (readiness.pendingReceivables > 0) {
    factoringScore += 15;
    factoringReasons.push(
      `Verified ledger contains ${formatCurrency(readiness.pendingReceivables)} in outstanding customer invoices.`
    );
    if (readiness.pendingReceivables >= input.requestedAmount * 0.5) {
      factoringScore += 10;
      factoringReasons.push('Outstanding receivables provide substantial coverage for the requested capital amount.');
    }
  } else {
    factoringScore -= 25;
    factoringReasons.push('No pending customer receivables currently recorded in verified ledger.');
  }

  if (readiness.trailingNetCashFlow < 0) {
    // Factoring is advantageous for deficit companies because approval relies on customer credit, not borrower cash flow
    factoringScore += 10;
    factoringReasons.push('Underwriting focuses on customer creditworthiness rather than borrower historical operating deficit.');
  }

  const factoringMatchLevel: FinancingMatchLevel =
    factoringScore >= 70 ? 'strong_match' : factoringScore >= 45 ? 'potential_match' : 'caution_low_match';

  options.push({
    id: 'opt-invoice-factoring',
    name: 'Invoice Factoring & AR Discounting',
    type: 'invoice_factoring',
    matchLevel: factoringMatchLevel,
    matchScore: Math.min(Math.max(factoringScore, 10), 98),
    typicalUseCase:
      'Advancing 80%–90% of verified B2B invoice value immediately, clearing upon customer payment (30–90 days).',
    relevanceExplanation: factoringReasons.join(' '),
    potentialAdvantages: [
      'Does not create fixed monthly balance-sheet debt service obligations.',
      'Underwriting emphasizes your corporate customer credit rating rather than your business balance sheet.',
      'Financing scales automatically as your sales invoice volume expands.',
    ],
    potentialRisks: [
      'Factoring fees (typically 1.5%–4.0% per 30 days) reduce gross profit margins.',
      'Customer dispute or failure to pay may trigger recourse chargebacks against your business.',
      'Direct customer notification may be required by the factor provider.',
    ],
    typicalRepaymentTerms: '30 to 90 days (liquidated upon customer invoice remittance)',
    verifiedEligibilityCriteria: [
      'Commercial B2B or government customer accounts (not retail B2C).',
      'Goods or services fully delivered with verifiable invoice and proof of delivery.',
      'Customer creditworthiness verified as acceptable by factor underwriter.',
    ],
    informationStillNeeded: [
      'Accounts receivable aging ledger with customer names and invoice payment terms.',
      'Sample master service agreements (MSAs) or purchase orders demonstrating completion.',
    ],
    isIllustrative: true,
  });

  // =========================================================================
  // 2. REVOLVING WORKING CAPITAL LINE OF CREDIT
  // =========================================================================
  let locScore = 40;
  const locReasons: string[] = [];

  if (input.purpose === 'working_capital') {
    locScore += 35;
    locReasons.push('Directly matches stated purpose of flexible operational working capital.');
  } else if (input.purpose === 'inventory_purchase') {
    locScore += 25;
    locReasons.push('Enables seasonal inventory stocking with flexible drawdowns.');
  }

  if (input.operatingMonths >= 12) {
    locScore += 15;
    locReasons.push(`Operating duration of ${input.operatingMonths} months meets the typical 1-year minimum line-of-credit threshold.`);
  } else {
    locScore -= 20;
    locReasons.push(`Operating duration (${input.operatingMonths} months) is under the typical 12-month requirement for bank lines of credit.`);
  }

  if (readiness.trailingNetCashFlow > 0) {
    locScore += 15;
    locReasons.push('Positive cash flow supports recurring interest debt servicing.');
  } else {
    locScore -= 15;
    locReasons.push('Negative cash flow will trigger enhanced debt-service scrutiny during underwriting.');
  }

  const locMatchLevel: FinancingMatchLevel =
    locScore >= 70 ? 'strong_match' : locScore >= 45 ? 'potential_match' : 'caution_low_match';

  options.push({
    id: 'opt-line-of-credit',
    name: 'Revolving Business Line of Credit',
    type: 'line_of_credit',
    matchLevel: locMatchLevel,
    matchScore: Math.min(Math.max(locScore, 10), 98),
    typicalUseCase:
      'Continuous flexible credit pool drawn down as needed for payroll, seasonal dips, or unexpected supplier bills.',
    relevanceExplanation: locReasons.join(' '),
    potentialAdvantages: [
      'Interest is charged only on the portion of capital actively drawn down, not the full credit facility.',
      'Funds replenish automatically as the drawn balance is paid down.',
      'Helps smooth cash flow volatility without requiring repeated loan applications.',
    ],
    potentialRisks: [
      'Floating interest rates may increase overall cost of capital during rate hikes.',
      'Lenders frequently require annual facility maintenance fees and periodic line clean-downs.',
      'Often secured by a blanket UCC lien on general business assets and personal guarantee.',
    ],
    typicalRepaymentTerms: 'Revolving 12 to 24 month renewal terms with monthly interest payments',
    verifiedEligibilityCriteria: [
      'Typically minimum 12 to 24 months in active business operations.',
      'Demonstrated recurring annual revenue exceeding $100,000–$250,000.',
      'Satisfactory debt service coverage ratio (DSCR >= 1.25x preferred).',
    ],
    informationStillNeeded: [
      'Recent 6 months of business bank account statements showing cash turnover velocity.',
      'Business credit bureau report and principal owners personal credit history.',
    ],
    isIllustrative: true,
  });

  // =========================================================================
  // 3. EQUIPMENT & MACHINERY FINANCING
  // =========================================================================
  let equipScore = 20;
  const equipReasons: string[] = [];

  if (input.purpose === 'equipment_purchase') {
    equipScore += 65;
    equipReasons.push('Directly matches stated purpose of purchasing machinery, vehicles, or IT equipment.');
  } else {
    equipScore -= 30;
    equipReasons.push('Equipment financing requires capital to be tied directly to a specific physical asset purchase.');
  }

  if (input.preferredRepaymentMonths >= 24) {
    equipScore += 10;
    equipReasons.push('Preferred repayment horizon aligns well with standard equipment depreciation amortization schedules.');
  }

  const equipMatchLevel: FinancingMatchLevel =
    equipScore >= 70 ? 'strong_match' : equipScore >= 40 ? 'potential_match' : 'caution_low_match';

  options.push({
    id: 'opt-equipment-financing',
    name: 'Commercial Equipment & Asset Financing',
    type: 'equipment_financing',
    matchLevel: equipMatchLevel,
    matchScore: Math.min(Math.max(equipScore, 5), 98),
    typicalUseCase:
      'Acquisition of revenue-generating machinery, logistics vehicles, warehouse technology, or industrial equipment.',
    relevanceExplanation: equipReasons.join(' '),
    potentialAdvantages: [
      'The purchased equipment serves as primary collateral, reducing additional security demands.',
      'Preserves existing operating cash reserves for day-to-day payroll and supplier payments.',
      'Potential tax advantages via Section 179 depreciation deductions (verify with CPA).',
    ],
    potentialRisks: [
      'Requires an upfront cash down-payment (typically 10%–20% of equipment purchase value).',
      'Default leads to immediate repossession of essential operating machinery.',
      'Inflexible fixed lease or loan payments continue even during business downturns.',
    ],
    typicalRepaymentTerms: '24 to 60 months tied to useful lifespan of the acquired asset',
    verifiedEligibilityCriteria: [
      'Commercial vendor quote or purchase order for identifiable, insurable equipment.',
      'Operating history of 6 to 12+ months or relevant industry management background.',
      'Business ability to cover monthly lease amortization from operational cash flow.',
    ],
    informationStillNeeded: [
      'Vendor invoice or binding quote specifying equipment make, model, and serial specifications.',
      'Down-payment capability verification from business checking reserves.',
    ],
    isIllustrative: true,
  });

  // =========================================================================
  // 4. REVENUE-BASED FINANCING (RBF)
  // =========================================================================
  let rbfScore = 35;
  const rbfReasons: string[] = [];

  if (input.purpose === 'growth_expansion' || input.purpose === 'inventory_purchase') {
    rbfScore += 30;
    rbfReasons.push('Well suited for growth initiatives where returns scale with sales revenue.');
  } else if (input.purpose === 'working_capital') {
    rbfScore += 15;
    rbfReasons.push('Provides immediate liquidity with repayments linked to cash collection pace.');
  }

  if (readiness.monthlyRevenueEstimate && readiness.monthlyRevenueEstimate > 0) {
    rbfScore += 15;
    rbfReasons.push(`Estimated monthly revenue of ${formatCurrency(readiness.monthlyRevenueEstimate)} supports variable percentage remittances.`);
  }

  if (readiness.trailingNetCashFlow < 0) {
    // RBF flexes down if sales drop, protecting fixed runway
    rbfScore += 10;
    rbfReasons.push('Variable percentage remittance automatically cushions slower revenue months during cash flow deficits.');
  }

  const rbfMatchLevel: FinancingMatchLevel =
    rbfScore >= 65 ? 'strong_match' : rbfScore >= 40 ? 'potential_match' : 'caution_low_match';

  options.push({
    id: 'opt-revenue-based',
    name: 'Revenue-Based Financing / Merchant Capital',
    type: 'revenue_based_financing',
    matchLevel: rbfMatchLevel,
    matchScore: Math.min(Math.max(rbfScore, 10), 95),
    typicalUseCase:
      'Growth capital repaid as a pre-agreed percentage (e.g. 5%–12%) of daily or weekly incoming customer receivables.',
    relevanceExplanation: rbfReasons.join(' '),
    potentialAdvantages: [
      'Repayments automatically decline during slower sales periods, protecting business survival.',
      'No fixed monthly debt principal due dates or hard maturity deadlines.',
      'Fast underwriting turnaround often completed within 48 to 72 hours.',
    ],
    potentialRisks: [
      'Effective annual percentage rate (APR) is significantly higher than conventional bank loans.',
      'Daily or weekly automated ACH sweep directly reduces working cash velocity.',
      'Requires continuous access to bank transaction feed or credit card merchant gateway.',
    ],
    typicalRepaymentTerms: 'Repaid dynamically over 6 to 18 months based on customer sales volume',
    verifiedEligibilityCriteria: [
      'Minimum consistent monthly gross revenue of $15,000–$25,000+.',
      'At least 6 months of daily digital sales history (POS, credit cards, or ACH).',
      'Low concentration of customer chargebacks or returned payments (NSFs).',
    ],
    informationStillNeeded: [
      'Recent 3 to 6 months of merchant processing summaries or digital sales reports.',
      'Bank transaction history verifying daily balance stability.',
    ],
    isIllustrative: true,
  });

  // =========================================================================
  // 5. COMMERCIAL BANK TERM LOAN
  // =========================================================================
  let termScore = 30;
  const termReasons: string[] = [];

  if (input.operatingMonths >= 24) {
    termScore += 25;
    termReasons.push('Satisfies the 2-year minimum operating history standard of traditional commercial banks.');
  } else {
    termScore -= 30;
    termReasons.push(`Underwriters generally decline commercial term loans for businesses under 24 months (${input.operatingMonths} months recorded).`);
  }

  if (readiness.trailingNetCashFlow > 0) {
    termScore += 25;
    termReasons.push('Positive net operating cash flow meets traditional Debt Service Coverage requirements.');
  } else {
    termScore -= 35;
    termReasons.push('Negative historical net cash flow typically leads to bank underwriting rejection unless heavily collateralized.');
  }

  if (input.preferredRepaymentMonths >= 12) {
    termScore += 10;
    termReasons.push('Preferred multi-year repayment timeframe matches structured amortization schedules.');
  }

  const termMatchLevel: FinancingMatchLevel =
    termScore >= 70 ? 'strong_match' : termScore >= 40 ? 'potential_match' : 'caution_low_match';

  options.push({
    id: 'opt-commercial-term-loan',
    name: 'SME Commercial Term Loan',
    type: 'term_loan',
    matchLevel: termMatchLevel,
    matchScore: Math.min(Math.max(termScore, 5), 95),
    typicalUseCase:
      'Lump-sum capital injection amortized over 2 to 5 years for major facility expansion, debt restructuring, or permanent capital.',
    relevanceExplanation: termReasons.join(' '),
    potentialAdvantages: [
      'Lowest overall cost of capital and most competitive annual percentage rates (APR).',
      'Fixed monthly installments allow predictable long-term financial budgeting.',
      'Builds strong institutional commercial credit profile with primary lenders.',
    ],
    potentialRisks: [
      'Rigid underwriting process often takes 30 to 90 days with extensive documentation requirements.',
      'Inflexible fixed monthly debt service continues regardless of revenue drops.',
      'Requires substantial business and personal collateral, plus owner personal guarantees.',
    ],
    typicalRepaymentTerms: '12 to 60 months with equal monthly principal and interest payments',
    verifiedEligibilityCriteria: [
      'Minimum 24 months of verifiable operational tax returns.',
      'Positive net income and Debt Service Coverage Ratio (DSCR >= 1.25x).',
      'Strong credit profile (business and principal personal FICO >= 680+).',
    ],
    informationStillNeeded: [
      '2 to 3 years of audited corporate tax returns and balance sheet filings.',
      'Personal financial statements (PFS) for all owners with >= 20% equity.',
      'Comprehensive schedule of business assets offered for lien collateralization.',
    ],
    isIllustrative: true,
  });

  // Sort matched options by matchScore descending
  return options.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Generates an executive AI explanation synthesizing the calculated readiness and rule-based matches.
 * Uses Gemini if configured; falls back gracefully to a deterministic explanation.
 */
export async function generateFinancingExplanation(
  readiness: FinancingReadinessAssessment,
  input: FinancingAssessmentInput,
  matchedOptions: FinancingOption[]
): Promise<string> {
  // Test mock override
  if (testNarrativeOverride) {
    if (typeof testNarrativeOverride === 'string') {
      return testNarrativeOverride;
    }
    return testNarrativeOverride({ readiness, input, matchedOptions });
  }

  const bestMatch = matchedOptions[0];

  if (isCopilotConfigured()) {
    try {
      const apiKey = process.env.GEMINI_API_KEY!;
      const model = getCopilotModel();
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are FinPilot AI Financing Copilot, an analytical capital decision-support tool.
Explain the following rule-based financing assessment for a business in the ${input.industry} industry (${input.operatingMonths} months in business, seeking ${formatCurrency(input.requestedAmount)} for ${input.purpose}).

CALCULATED READINESS METRICS:
- Operating Cash Balance: ${formatCurrency(readiness.currentCashBalance)}
- Trailing Net Cash Flow: ${formatCurrency(readiness.trailingNetCashFlow)} (${readiness.netCashFlowStatus})
- Outstanding Customer Receivables (AR): ${formatCurrency(readiness.pendingReceivables)}
- Outstanding Supplier Payables (AP): ${formatCurrency(readiness.pendingPayables)}
- Data Quality Verdict: ${readiness.dataQualityVerdict} (${readiness.dataSufficiency.historicalDays} days, ${readiness.dataSufficiency.paidTransactionCount} transactions)
- Key Concerns: ${readiness.readinessConcerns.join('; ')}

MATCHED OPTIONS RANKING:
${matchedOptions.map((o, idx) => `${idx + 1}. ${o.name} (${o.matchLevel.toUpperCase()}, Score: ${o.matchScore}/100) - Reason: ${o.relevanceExplanation}`).join('\n')}

INSTRUCTIONS:
1. Provide a concise, structured executive summary in clean Markdown.
2. Directly explain why the top option (${bestMatch.name}) is ranked highest and what specific trade-offs or risks exist.
3. If net cash flow is negative or cash balance is low, clearly emphasize the danger of fixed monthly debt service.
4. Include a clear, bulleted "Next Steps & Verification Checklist".
5. Do NOT invent approval odds, interest rates, or claim this is a guaranteed loan offer. Emphasize that all options are illustrative benchmarks.${
  input.language === 'bn'
    ? '\n6. LANGUAGE REQUIREMENT: You MUST write your entire executive analysis and recommendations in fluent, professional Bangla (বাংলা) suitable for Bangladeshi SME business owners. Keep authoritative numbers (e.g. **' +
      formatCurrency(readiness.currentCashBalance) +
      '**) formatted clearly.'
    : ''
}`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 1200,
        },
      });

      if (response.text && response.text.trim().length > 0) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn('[Financing Copilot] Gemini narrative error, falling back to deterministic explanation:', err instanceof Error ? err.message : err);
    }
  }

  // Deterministic Fallback Explanation (Bilingual)
  if (input.language === 'bn') {
    return `### **আর্থিক প্রস্তুতি ও মূলধন মূল্যায়ন**

আপনার যাচাইকৃত লেজার রেকর্ড এবং উল্লিখিত অর্থায়ন লক্ষ্যের ওপর ভিত্তি করে, **${bestMatch.name}** আপনার সবচেয়ে উপযুক্ত মূলধন কাঠামো হিসেবে মূল্যায়িত হয়েছে (**${bestMatch.matchScore}/১০০**)।

---

#### **মূল আর্থিক পর্যবেক্ষণ**
* **কার্যকরী তহবিল:** আপনার বর্তমান পরিচালনা নগদ তহবিল **${formatCurrency(readiness.currentCashBalance)}** এবং অতীত নীট অর্থপ্রবাহ **${formatCurrency(readiness.trailingNetCashFlow)}**।
${
  readiness.netCashFlowStatus === 'negative'
    ? '* **ঋণের বোঝা সতর্কতা:** আপনার ব্যবসা বর্তমানে নগদ পরিচালনা ঘাটতিতে রয়েছে। নতুন নির্দিষ্ট মাসিক ঋণের কিস্তি যোগ করা আর্থিক ঝুঁকি বৃদ্ধি করবে। প্রচলিত ব্যাংক ঋণের পরিবর্তে চালান ডিসকাউন্টিং বা রাজস্ব-ভিত্তিক পরিবর্তনশীল অর্থায়ন অধিক নিরাপদ।'
    : '* **নগদ প্রবাহের সুস্থিরতা:** ইতিবাচক নগদ প্রবাহ নিয়মিত ঋণ পরিশোধে সহায়তা প্রদান করে।'
}
* **বকেয়া চালানের সুযোগ:** গ্রাহকদের কাছে **${formatCurrency(readiness.pendingReceivables)}** বকেয়া পাওনা রয়েছে। অনাদায়ী চালান নগদায়নের মাধ্যমে দীর্ঘমেয়াদি দায় ছাড়াই কার্যকরী মূলধনের চাহিদা পূরণ করা সম্ভব।

---

#### **সুপারিশকৃত পরবর্তী পদক্ষেপ**
1. **আন্ডাররাইটিং কাগজপত্র প্রস্তুত করুন:** বাণিজ্যিক ঋণদাতাদের সাথে যোগাযোগের পূর্বে নিচে প্রদত্ত **আবেদন-পূর্ব চেকলিস্টের** নথিপত্র সংগ্রহ করুন।
2. **বাণিজ্যিক শর্তাবলী যাচাই করুন:** প্রদর্শিত সকল বিকল্প নমুনা শিল্প মানদণ্ড। আনুষ্ঠানিক সুদের হার (এপিআর), ফি ও শর্তাবলী যাচাই করতে সরাসরি লাইসেন্সপ্রাপ্ত ঋণদাতাদের সাথে যোগাযোগ করুন।`;
  }

  return `### **Financing Readiness & Capital Assessment**

Based on your verified ledger records and stated financing parameters, **${bestMatch.name}** ranks as your strongest capital match (**${bestMatch.matchScore}/100**).

---

#### **Key Financial Observations**
* **Operating Position:** Your current operating cash balance is **${formatCurrency(readiness.currentCashBalance)}** with a net cash flow of **${formatCurrency(readiness.trailingNetCashFlow)}**.
${
  readiness.netCashFlowStatus === 'negative'
    ? '* **Debt Burden Warning:** Your business is currently operating at a net cash deficit. Adding fixed monthly loan debt increases cash burn risk. Asset-backed or variable remittance options (such as invoice factoring or revenue-based capital) provide greater flexibility than conventional bank term loans.'
    : '* **Cash Flow Stability:** Positive operational cash velocity supports standard debt service obligations.'
}
* **Receivables Opportunity:** With **${formatCurrency(readiness.pendingReceivables)}** in outstanding customer receivables, monetizing unpaid invoices can bridge working capital without incurring long-term balance-sheet liabilities.

---

#### **Recommended Next Steps**
1. **Prepare Underwriting Documentation:** Assemble the items in your **Missing-Information Checklist** below before contacting commercial providers.
2. **Verify Provider Terms:** All options displayed are illustrative benchmarks. Request formal term sheets from licensed lenders to compare annual percentage rates (APR), factor rates, and covenant restrictions.`;
}

/**
 * Executes a full financing readiness assessment and options match.
 */
export async function executeFinancingAssessment(
  input: FinancingAssessmentInput
): Promise<FinancingAssessmentResponseData> {
  // 1. Authoritative financial readiness analysis from MongoDB records
  const readiness = await assessFinancialReadiness(input);

  // 2. Transparent rule-based option matching
  const matchedOptions = matchFinancingOptions(input, readiness);

  // 3. AI Copilot executive narrative
  const aiExplanation = await generateFinancingExplanation(readiness, input, matchedOptions);

  return {
    userInput: input,
    readiness,
    matchedOptions,
    aiExplanation,
    disclaimers: FINANCING_DISCLAIMERS,
    generatedAt: new Date().toISOString(),
  };
}
