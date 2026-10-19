import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CopilotChatRequestSchema,
  FinancingAssessmentInputSchema,
} from '../../types';
import {
  buildCopilotSystemInstruction,
} from '../copilotService';
import {
  generateFinancingExplanation,
} from '../financingService';

// Path to client translation bundles
const CLIENT_LOCALES_DIR = path.resolve(__dirname, '../../../../client/src/i18n/locales');
const EN_DIR = path.join(CLIENT_LOCALES_DIR, 'en');
const BN_DIR = path.join(CLIENT_LOCALES_DIR, 'bn');

// Helper to extract nested keys
function getNestedKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getNestedKeys(v as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe('Step 7: Internationalization (i18n) Architecture & Translations', () => {
  const namespaces = [
    'common.json',
    'nav.json',
    'dashboard.json',
    'transactions.json',
    'cashflow.json',
    'financing.json',
    'copilot.json',
    'landing.json',
  ];

  test('All 8 required translation resource bundles exist for both en and bn', () => {
    assert.ok(fs.existsSync(EN_DIR), 'en locales directory must exist');
    assert.ok(fs.existsSync(BN_DIR), 'bn locales directory must exist');

    for (const ns of namespaces) {
      assert.ok(fs.existsSync(path.join(EN_DIR, ns)), `English bundle ${ns} must exist`);
      assert.ok(fs.existsSync(path.join(BN_DIR, ns)), `Bangla bundle ${ns} must exist`);
    }
  });

  test('Translation files are strictly valid JSON with no comments or syntax errors', () => {
    for (const ns of namespaces) {
      const enRaw = fs.readFileSync(path.join(EN_DIR, ns), 'utf8');
      const bnRaw = fs.readFileSync(path.join(BN_DIR, ns), 'utf8');

      assert.doesNotThrow(() => JSON.parse(enRaw), `en/${ns} must be valid JSON`);
      assert.doesNotThrow(() => JSON.parse(bnRaw), `bn/${ns} must be valid JSON`);
    }
  });

  test('Complete 1:1 translation key parity between English and Bangla (0 missing keys in either locale)', () => {
    for (const ns of namespaces) {
      const enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, ns), 'utf8'));
      const bnObj = JSON.parse(fs.readFileSync(path.join(BN_DIR, ns), 'utf8'));

      const enKeys = getNestedKeys(enObj);
      const bnKeys = getNestedKeys(bnObj);

      const missingInBn = enKeys.filter((k) => !bnKeys.includes(k));
      const missingInEn = bnKeys.filter((k) => !enKeys.includes(k));

      assert.deepEqual(
        missingInBn,
        [],
        `Namespace ${ns} has keys present in English but missing in Bangla: ${missingInBn.join(', ')}`
      );
      assert.deepEqual(
        missingInEn,
        [],
        `Namespace ${ns} has keys present in Bangla but missing in English: ${missingInEn.join(', ')}`
      );
    }
  });

  test('No empty translation strings in English or Bangla resource files', () => {
    for (const ns of namespaces) {
      const enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, ns), 'utf8'));
      const bnObj = JSON.parse(fs.readFileSync(path.join(BN_DIR, ns), 'utf8'));

      function checkNonEmpty(obj: Record<string, unknown>, nsName: string, lang: string, prefix = '') {
        for (const [k, v] of Object.entries(obj)) {
          const pathKey = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'string') {
            assert.ok(
              v.trim().length > 0,
              `Empty translation string at [${lang}/${nsName}] -> "${pathKey}"`
            );
          } else if (v && typeof v === 'object' && !Array.isArray(v)) {
            checkNonEmpty(v as Record<string, unknown>, nsName, lang, pathKey);
          }
        }
      }

      checkNonEmpty(enObj, ns, 'en');
      checkNonEmpty(bnObj, ns, 'bn');
    }
  });
});

describe('Locale-Aware Currency and Date Formatting Logic', () => {
  // Pure implementations of client formatting functions to test localized formatting
  function formatCurrency(amount: number, locale = 'en-US'): string {
    const isNegative = amount < 0;
    const abs = Math.abs(amount);
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(abs);
    return isNegative ? `-$${formatted}` : `$${formatted}`;
  }

  function formatNumber(value: number, locale = 'en-US'): string {
    return new Intl.NumberFormat(locale).format(value);
  }

  test('English mode formats currency in standard US notation with $ symbol', () => {
    assert.equal(formatCurrency(125000, 'en-US'), '$125,000.00');
    assert.equal(formatCurrency(-4500.5, 'en-US'), '-$4,500.50');
    assert.equal(formatCurrency(0, 'en-US'), '$0.00');
  });

  test('Bangla mode formats numbers with Bengali digits while preserving $ USD currency symbol', () => {
    const formattedBn = formatCurrency(125000, 'bn-BD');
    // Must start with $ and contain Bengali numerals
    assert.ok(formattedBn.startsWith('$'), `Bangla currency must keep $ symbol: got ${formattedBn}`);
    assert.ok(
      formattedBn.includes('১২৫') || formattedBn.includes('১,২৫'),
      `Bangla currency must use Bengali numerals: got ${formattedBn}`
    );

    const negativeBn = formatCurrency(-5000, 'bn-BD');
    assert.ok(negativeBn.startsWith('-$'), `Negative Bangla currency must start with -$: got ${negativeBn}`);
  });

  test('Integer formatting uses appropriate localized numerals', () => {
    const enNum = formatNumber(45000, 'en-US');
    const bnNum = formatNumber(45000, 'bn-BD');
    assert.equal(enNum, '45,000');
    assert.ok(bnNum.includes('৪৫'), `Expected Bengali numerals in ${bnNum}`);
  });
});

describe('Gemini Copilot & Financing Backend Language Grounding', () => {
  const dummyContext = {
    workspaceName: 'Acme Logistics LLC',
    asOfDate: '2026-05-31',
    isOpeningBalanceConfigured: true,
    openingBalance: 100000,
    currentCashBalance: 125000,
    totalPaidIncome: 180000,
    totalPaidExpenses: 155000,
    netCashFlow: 25000,
    pendingReceivables: 32000,
    pendingPayables: 14000,
    forecastEndingBalance: 138000,
    forecastNetChange: 13000,
    dailyAverageBurnOrGain: 433,
    dataSufficiency: {
      isSufficient: true,
      historicalDays: 90,
      paidTransactionCount: 45,
      statusMessage: 'Adequate historical ledger data.',
    },
    totalTransactionsCount: 45,
    overallRiskLevel: 'low' as const,
    activeAlerts: [],
    recentTransactions: [],
    topIncomeCategories: [],
    topExpenseCategories: [],
    recentPendingItems: [],
  };

  test('Copilot system prompt in English instructs English communication', () => {
    const promptEn = buildCopilotSystemInstruction(dummyContext, 'en');
    assert.ok(
      promptEn.includes('LANGUAGE & LOCALIZATION (ENGLISH REQUIREMENT)'),
      'Prompt must specify English requirement'
    );
    assert.ok(
      promptEn.includes('Respond in concise, professional English'),
      'Prompt must instruct English response'
    );
  });

  test('Copilot system prompt in Bangla instructs natural, professional Bangla communication', () => {
    const promptBn = buildCopilotSystemInstruction(dummyContext, 'bn');
    assert.ok(
      promptBn.includes('LANGUAGE & LOCALIZATION (BANGLA REQUIREMENT)'),
      'Prompt must specify Bangla requirement'
    );
    assert.ok(
      promptBn.includes('professional Bangla (বাংলা)'),
      'Prompt must instruct natural Bangla output'
    );
    assert.ok(
      promptBn.includes('Preserve currency amounts with dollar sign in bold'),
      'Prompt must protect currency amounts'
    );
  });

  test('CopilotChatRequestSchema accepts and validates language parameter', () => {
    const parsedEn = CopilotChatRequestSchema.parse({
      message: 'What is my current runway?',
      language: 'en',
    });
    assert.equal(parsedEn.language, 'en');

    const parsedBn = CopilotChatRequestSchema.parse({
      message: 'আমার বর্তমান নগদ ব্যালেন্স কত?',
      language: 'bn',
    });
    assert.equal(parsedBn.language, 'bn');

    // Defaults gracefully if omitted
    const parsedDefault = CopilotChatRequestSchema.parse({
      message: 'Hello',
    });
    assert.equal(parsedDefault.language, undefined);
  });

  test('FinancingAssessmentInputSchema accepts and validates language parameter', () => {
    const basePayload = {
      businessType: 'Limited Liability Company (LLC)',
      industry: 'Wholesale & Distribution',
      operatingMonths: 24,
      requestedAmount: 50000,
      purpose: 'working_capital' as const,
      preferredRepaymentMonths: 12,
    };

    const parsedEn = FinancingAssessmentInputSchema.parse({
      ...basePayload,
      language: 'en',
    });
    assert.equal(parsedEn.language, 'en');

    const parsedBn = FinancingAssessmentInputSchema.parse({
      ...basePayload,
      language: 'bn',
    });
    assert.equal(parsedBn.language, 'bn');
  });

  test('Financing fallback explanation generates natural Bangla narrative when language is bn', async () => {
    const dummyReadiness = {
      asOfDate: '2026-05-31',
      currentCashBalance: 75000,
      trailingNetCashFlow: 15000,
      netCashFlowStatus: 'positive' as const,
      pendingReceivables: 20000,
      pendingPayables: 8000,
      dataQualityVerdict: 'sufficient' as const,
      dataSufficiency: {
        isSufficient: true,
        historicalDays: 90,
        paidTransactionCount: 45,
        minimumRequiredDays: 30,
        minimumRequiredTransactions: 10,
        statusMessage: 'Adequate historical ledger data.',
      },
      operatingRunwayMonths: 6,
      monthlyRevenueEstimate: 40000,
      monthlyRevenueSource: 'verified_ledger' as const,
      debtServiceBurdenRatio: 0.1,
      overallRiskLevel: 'low' as const,
      totalPaidIncome: 180000,
      totalPaidExpenses: 165000,
      isOpeningBalanceConfigured: true,
      openingBalance: 100000,
      activeRiskCount: 0,
      readinessHighlights: ['Strong positive cash velocity'],
      readinessConcerns: [],
      missingInformationChecklist: [],
    };

    const dummyOptions = [
      {
        id: 'opt-line-of-credit',
        name: 'Revolving Business Line of Credit',
        type: 'line_of_credit',
        matchLevel: 'strong_match' as const,
        matchScore: 88,
        typicalUseCase: 'Flexible working capital',
        relevanceExplanation: 'Supports flexible liquidity.',
        potentialAdvantages: ['Only pay interest on drawn funds'],
        potentialRisks: ['Annual maintenance fees apply'],
        typicalRepaymentTerms: '12-month revolving review cycle',
        verifiedEligibilityCriteria: ['Positive operating balance'],
        informationStillNeeded: ['Last 3 months statements'],
        isIllustrative: true as const,
      },
    ];

    const inputEn = {
      businessType: 'Limited Liability Company (LLC)',
      industry: 'Wholesale & Distribution',
      operatingMonths: 24,
      requestedAmount: 50000,
      purpose: 'working_capital' as const,
      preferredRepaymentMonths: 12,
      language: 'en' as const,
    };

    const inputBn = {
      ...inputEn,
      language: 'bn' as const,
    };

    // Temporarily ensure API key is unset to test deterministic fallback
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const explanationEn = await generateFinancingExplanation(
        dummyReadiness,
        inputEn,
        dummyOptions
      );
      assert.ok(
        explanationEn.includes('Financing Readiness & Capital Assessment'),
        'En explanation has English title'
      );

      const explanationBn = await generateFinancingExplanation(
        dummyReadiness,
        inputBn,
        dummyOptions
      );
      assert.ok(
        explanationBn.includes('আর্থিক প্রস্তুতি ও মূলধন মূল্যায়ন'),
        'Bn explanation has Bangla title'
      );
      assert.ok(
        explanationBn.includes('মূল আর্থিক পর্যবেক্ষণ'),
        'Bn explanation has Bangla section header'
      );
    } finally {
      if (origKey) process.env.GEMINI_API_KEY = origKey;
    }
  });
});
