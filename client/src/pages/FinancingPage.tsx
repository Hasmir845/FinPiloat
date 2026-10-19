import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import {
  Landmark,
  FileCheck2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Info,
  ArrowRight,
  Sparkles,
  Calculator,
  Building2,
  AlertCircle,
  ChevronRight,
  Layers,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { apiClient, ApiError } from '../services/api';
import {
  FinancingAssessmentInput,
  FinancingAssessmentResponseData,
  FinancingReadinessAssessment,
  FinancingPurpose,
  FinancingMatchLevel,
} from '../types';
import { formatCurrency } from '../lib/utils';

const PURPOSE_KEYS: Array<{ value: FinancingPurpose; labelKey: string; descKey: string }> = [
  {
    value: 'working_capital',
    labelKey: 'purposes.working_capital',
    descKey: 'purposesDesc.working_capital',
  },
  {
    value: 'invoice_bridge',
    labelKey: 'purposes.invoice_bridge',
    descKey: 'purposesDesc.invoice_bridge',
  },
  {
    value: 'equipment_purchase',
    labelKey: 'purposes.equipment_purchase',
    descKey: 'purposesDesc.equipment_purchase',
  },
  {
    value: 'inventory_purchase',
    labelKey: 'purposes.inventory_purchase',
    descKey: 'purposesDesc.inventory_purchase',
  },
  {
    value: 'growth_expansion',
    labelKey: 'purposes.growth_expansion',
    descKey: 'purposesDesc.growth_expansion',
  },
  {
    value: 'debt_refinancing',
    labelKey: 'purposes.debt_refinancing',
    descKey: 'purposesDesc.debt_refinancing',
  },
];

const INDUSTRY_KEYS: Array<{ value: string; labelKey: string }> = [
  { value: 'Wholesale & Distribution', labelKey: 'industries.wholesale' },
  { value: 'Freight, Logistics & Warehousing', labelKey: 'industries.logistics' },
  { value: 'Manufacturing & Assembly', labelKey: 'industries.manufacturing' },
  { value: 'Technology & Software Services', labelKey: 'industries.technology' },
  { value: 'Construction & Commercial Trades', labelKey: 'industries.construction' },
  { value: 'Retail & Multi-Channel E-Commerce', labelKey: 'industries.retail' },
  { value: 'Professional & Corporate Services', labelKey: 'industries.professional' },
  { value: 'Healthcare & Medical Practices', labelKey: 'industries.healthcare' },
  { value: 'Other Commercial Enterprise', labelKey: 'industries.other' },
];

const BUSINESS_TYPE_KEYS: Array<{ value: string; labelKey: string }> = [
  { value: 'Limited Liability Company (LLC)', labelKey: 'businessTypes.llc' },
  { value: 'Corporation (C-Corp / S-Corp)', labelKey: 'businessTypes.corp' },
  { value: 'Sole Proprietorship', labelKey: 'businessTypes.sole' },
  { value: 'Partnership', labelKey: 'businessTypes.partnership' },
  { value: 'Other', labelKey: 'businessTypes.other' },
];

export const FinancingPage: React.FC = () => {
  const { t, i18n } = useTranslation(['financing', 'common']);
  const { openingBalance } = useFinancial();

  // Readiness preview state
  const [readinessSummary, setReadinessSummary] = useState<FinancingReadinessAssessment | null>(null);

  // Form State
  const [formData, setFormData] = useState<FinancingAssessmentInput>({
    businessType: 'Limited Liability Company (LLC)',
    industry: 'Freight, Logistics & Warehousing',
    operatingMonths: 24,
    requestedAmount: 50000,
    purpose: 'working_capital',
    preferredRepaymentMonths: 12,
    statedMonthlyRevenue: undefined,
    existingMonthlyDebtRepayment: undefined,
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<FinancingAssessmentResponseData | null>(null);
  const [activeTab, setActiveTab] = useState<'comparison' | 'readiness' | 'checklist'>('comparison');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Load initial authoritative readiness preview on mount
  useEffect(() => {
    async function loadReadiness() {
      try {
        const preview = await apiClient.getFinancingReadiness(openingBalance);
        setReadinessSummary(preview);
      } catch (err) {
        console.warn('[Financing] Readiness preview error:', err);
      }
    }
    loadReadiness();
  }, [openingBalance]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.businessType) errors.businessType = t('financing:validation.businessType');
    if (!formData.industry) errors.industry = t('financing:validation.industry');
    if (!formData.operatingMonths || formData.operatingMonths < 1) {
      errors.operatingMonths = t('financing:validation.operatingMonths');
    }
    if (!formData.requestedAmount || formData.requestedAmount <= 0) {
      errors.requestedAmount = t('financing:validation.requestedAmountMin');
    } else if (formData.requestedAmount > 50_000_000) {
      errors.requestedAmount = t('financing:validation.requestedAmountMax');
    }
    if (!formData.purpose) errors.purpose = t('financing:validation.purpose');
    if (!formData.preferredRepaymentMonths || formData.preferredRepaymentMonths < 1) {
      errors.preferredRepaymentMonths = t('financing:validation.preferredRepayment');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: FinancingAssessmentInput = {
        ...formData,
        openingBalance: openingBalance !== null ? openingBalance : undefined,
        language: (i18n.language === 'bn' ? 'bn' : 'en'),
      };

      const result = await apiClient.submitFinancingAssessment(payload);
      setAssessmentResult(result);
      setReadinessSummary(result.readiness);
      if (result.matchedOptions.length > 0) {
        setSelectedOptionId(result.matchedOptions[0].id);
      }
      setActiveTab('comparison');
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : t('financing:validation.defaultError');
      setFormErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMatchBadge = (level: FinancingMatchLevel) => {
    switch (level) {
      case 'strong_match':
        return (
          <StatusBadge variant="success" size="sm" dot>
            {t('financing:matchLevels.strong_match')}
          </StatusBadge>
        );
      case 'potential_match':
        return (
          <StatusBadge variant="info" size="sm" dot>
            {t('financing:matchLevels.potential_match')}
          </StatusBadge>
        );
      case 'caution_low_match':
        return (
          <StatusBadge variant="warning" size="sm" dot>
            {t('financing:matchLevels.caution_low_match')}
          </StatusBadge>
        );
    }
  };

  const activeOption =
    assessmentResult?.matchedOptions.find((o) => o.id === selectedOptionId) ||
    assessmentResult?.matchedOptions[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Landmark className="w-6 h-6 text-blue-600 shrink-0" />
              {t('financing:header.title')}
            </h1>
            <StatusBadge variant="info" size="md">
              {t('financing:badges.ruleBased')}
            </StatusBadge>
            <StatusBadge variant="demo" size="md">
              {t('financing:badges.illustrative')}
            </StatusBadge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('financing:header.description')}
          </p>
        </div>

        <Link to="/dashboard">
          <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
            {t('financing:actions.backToDashboard')}
          </Button>
        </Link>
      </div>

      {/* Illustrative Notice Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 text-xs shadow-card flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-100 text-sm">
            {t('financing:banner.title')}
          </p>
          <p className="text-slate-300 leading-relaxed">
            {t('financing:banner.description')}
          </p>
        </div>
      </div>

      {/* Financial Health Snapshot Banner */}
      {readinessSummary && (
        <Card className="p-4 bg-slate-50/60 border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                {t('financing:snapshot.title')}
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              {t('financing:snapshot.dataQuality')}{' '}
              <span
                className={`font-semibold ${
                  readinessSummary.dataQualityVerdict === 'sufficient'
                    ? 'text-emerald-700'
                    : readinessSummary.dataQualityVerdict === 'limited'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {readinessSummary.dataQualityVerdict.toUpperCase()}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-medium block">
                {t('financing:snapshot.operatingCash')}
              </span>
              <span
                className={`text-base font-bold ${
                  readinessSummary.currentCashBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {formatCurrency(readinessSummary.currentCashBalance)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-medium block">
                {t('financing:snapshot.netCashFlow')}
              </span>
              <span
                className={`text-base font-bold ${
                  readinessSummary.trailingNetCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {readinessSummary.trailingNetCashFlow >= 0 ? '+' : ''}
                {formatCurrency(readinessSummary.trailingNetCashFlow)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-medium block">
                {t('financing:snapshot.pendingReceivables')}
              </span>
              <span className="text-base font-bold text-blue-700">
                {formatCurrency(readinessSummary.pendingReceivables)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-medium block">
                {t('financing:snapshot.pendingPayables')}
              </span>
              <span className="text-base font-bold text-amber-700">
                {formatCurrency(readinessSummary.pendingPayables)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid: Form (Left) & Assessment Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Financing Assessment Form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-subtle border-slate-200">
            <CardHeader className="py-4 px-5 bg-slate-50/70 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    {t('financing:form.title')}
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500">
                    {t('financing:form.subtitle')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              <form onSubmit={handleSubmitAssessment} className="space-y-4 text-xs">
                {formErrors.submit && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formErrors.submit}</span>
                  </div>
                )}

                {/* Section A: Business Profile */}
                <div className="space-y-3 pb-3 border-b border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
                    {t('financing:form.businessProfile')}
                  </span>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('financing:form.businessType')} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {BUSINESS_TYPE_KEYS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {t(`financing:${item.labelKey}`)}
                        </option>
                      ))}
                    </select>
                    {formErrors.businessType && (
                      <span className="text-rose-600 text-[11px] block mt-1">{formErrors.businessType}</span>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('financing:form.industry')} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {INDUSTRY_KEYS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {t(`financing:${item.labelKey}`)}
                        </option>
                      ))}
                    </select>
                    {formErrors.industry && (
                      <span className="text-rose-600 text-[11px] block mt-1">{formErrors.industry}</span>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('financing:form.operatingMonths')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="1200"
                        value={formData.operatingMonths || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            operatingMonths: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        placeholder={t('financing:form.operatingMonthsPlaceholder')}
                        className="w-full border border-slate-200 rounded-lg pl-3 pr-14 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-2 text-slate-400 text-[11px]">
                        {t('financing:form.monthsUnit')}
                      </span>
                    </div>
                    {formErrors.operatingMonths && (
                      <span className="text-rose-600 text-[11px] block mt-1">{formErrors.operatingMonths}</span>
                    )}
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {t('financing:form.operatingMonthsHint')}
                    </span>
                  </div>
                </div>

                {/* Section B: Capital Requirements */}
                <div className="space-y-3 pb-3 border-b border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
                    {t('financing:form.capitalRequirement')}
                  </span>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('financing:form.requestedAmount')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-semibold">$</span>
                      <input
                        type="number"
                        min="1000"
                        max="50000000"
                        step="1000"
                        value={formData.requestedAmount || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requestedAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder={t('financing:form.requestedAmountPlaceholder')}
                        className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {formErrors.requestedAmount && (
                      <span className="text-rose-600 text-[11px] block mt-1">{formErrors.requestedAmount}</span>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('financing:form.purpose')} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.purpose}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          purpose: e.target.value as FinancingPurpose,
                        })
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PURPOSE_KEYS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {t(`financing:${p.labelKey}`)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1 italic">
                      {t(`financing:purposesDesc.${formData.purpose}`)}
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('financing:form.preferredRepayment')} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.preferredRepaymentMonths}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preferredRepaymentMonths: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={3}>{t('financing:repaymentOptions.3')}</option>
                      <option value={6}>{t('financing:repaymentOptions.6')}</option>
                      <option value={12}>{t('financing:repaymentOptions.12')}</option>
                      <option value={24}>{t('financing:repaymentOptions.24')}</option>
                      <option value={36}>{t('financing:repaymentOptions.36')}</option>
                      <option value={60}>{t('financing:repaymentOptions.60')}</option>
                    </select>
                  </div>
                </div>

                {/* Section C: Supplemental Financial Context (User-Provided) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
                      {t('financing:form.supplemental')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {t('financing:form.userProvided')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        {t('financing:form.statedRevenue')}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-semibold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={formData.statedMonthlyRevenue ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              statedMonthlyRevenue: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder={t('financing:form.statedRevenuePlaceholder')}
                          className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        {t('financing:form.existingDebt')}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-semibold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={formData.existingMonthlyDebtRepayment ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              existingMonthlyDebtRepayment: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder={t('financing:form.existingDebtPlaceholder')}
                          className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('financing:form.notes')}
                    </label>
                    <textarea
                      rows={2}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={t('financing:form.notesPlaceholder')}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  leftIcon={
                    isSubmitting ? (
                      <Sparkles className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )
                  }
                  className="w-full py-2.5 mt-2"
                >
                  {isSubmitting
                    ? t('financing:actions.evaluating')
                    : t('financing:actions.runAssessment')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Assessment Results & Comparison */}
        <div className="lg:col-span-7 space-y-4">
          {!assessmentResult ? (
            /* Pre-Assessment Educational State */
            <Card className="p-6 text-center space-y-4 shadow-subtle border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-semibold text-slate-900">
                  {t('financing:preState.title')}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('financing:preState.desc')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {t('financing:preState.pillar1Title')}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {t('financing:preState.pillar1Desc')}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    {t('financing:preState.pillar2Title')}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {t('financing:preState.pillar2Desc')}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    {t('financing:preState.pillar3Title')}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {t('financing:preState.pillar3Desc')}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            /* Post-Assessment Results Interface */
            <div className="space-y-4">
              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'comparison'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {t('financing:tabs.options', { count: assessmentResult.matchedOptions.length })}
                </button>

                <button
                  onClick={() => setActiveTab('readiness')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'readiness'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t('financing:tabs.readiness')}
                </button>

                <button
                  onClick={() => setActiveTab('checklist')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'checklist'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {t('financing:tabs.checklist', {
                    count: assessmentResult.readiness.missingInformationChecklist.length,
                  })}
                </button>
              </div>

              {/* Tab 1: Matched Options Comparison */}
              {activeTab === 'comparison' && (
                <div className="space-y-4">
                  {/* AI Copilot Executive Narrative */}
                  {assessmentResult.aiExplanation && (
                    <Card className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border-blue-200/80 shadow-subtle">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-100">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                          {t('financing:results.aiTitle')}
                        </h4>
                      </div>
                      <div className="prose prose-xs max-w-none text-slate-800">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-700">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700">{children}</ul>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            h3: ({ children }) => <h3 className="text-xs font-bold text-slate-900 mt-2 mb-1">{children}</h3>,
                            h4: ({ children }) => <h4 className="text-xs font-semibold text-slate-900 mt-2 mb-1">{children}</h4>,
                          }}
                        >
                          {assessmentResult.aiExplanation}
                        </ReactMarkdown>
                      </div>
                    </Card>
                  )}

                  {/* Options List */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                      {t('financing:results.rankedStructures')}
                    </span>

                    {assessmentResult.matchedOptions.map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedOptionId === opt.id
                            ? 'border-blue-500 bg-white shadow-card ring-1 ring-blue-500'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-subtle'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{opt.name}</span>
                            {getMatchBadge(opt.matchLevel)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {t('financing:results.matchScore')}{' '}
                              <span className="font-bold text-slate-900">{opt.matchScore}/100</span>
                            </span>
                            <StatusBadge variant="neutral" size="sm">
                              {t('financing:badges.illustrativeTag')}
                            </StatusBadge>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                          <span className="font-semibold text-slate-700">
                            {t('financing:results.relevance')}
                          </span>{' '}
                          {opt.relevanceExplanation}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                          <div>
                            <span className="font-semibold text-emerald-700 block mb-0.5">
                              {t('financing:results.advantages')}
                            </span>
                            <ul className="list-disc pl-3 text-slate-600 space-y-0.5">
                              {opt.potentialAdvantages.slice(0, 2).map((adv, i) => (
                                <li key={i}>{adv}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="font-semibold text-amber-700 block mb-0.5">
                              {t('financing:results.risks')}
                            </span>
                            <ul className="list-disc pl-3 text-slate-600 space-y-0.5">
                              {opt.potentialRisks.slice(0, 2).map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                          <span>
                            <span className="font-medium text-slate-700">
                              {t('financing:results.typicalRepayment')}
                            </span>{' '}
                            {opt.typicalRepaymentTerms}
                          </span>
                          <span className="text-blue-600 font-medium inline-flex items-center gap-0.5">
                            {t('financing:results.viewUnderwritingDetails')}{' '}
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Selected Option Expanded Drawer */}
                  {activeOption && (
                    <Card className="p-4 bg-slate-50 border-slate-200/90 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-bold text-xs text-slate-900">
                          {t('financing:results.prepHeader', { name: activeOption.name })}
                        </span>
                        <StatusBadge variant="info" size="sm">
                          {t('financing:badges.standardGuidelines')}
                        </StatusBadge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1">
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {t('financing:results.verifiedCriteria')}
                          </span>
                          <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-slate-600">
                            {activeOption.verifiedEligibilityCriteria.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1">
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {t('financing:results.infoNeeded')}
                          </span>
                          <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-slate-600">
                            {activeOption.informationStillNeeded.map((n, i) => (
                              <li key={i}>{n}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Tab 2: Financial Readiness Audit */}
              {activeTab === 'readiness' && (
                <div className="space-y-4">
                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <CardTitle className="text-sm">
                          {t('financing:results.auditTitle')}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {t('financing:results.auditDesc')}
                        </CardDescription>
                      </div>
                      <StatusBadge
                        variant={
                          assessmentResult.readiness.overallRiskLevel === 'low'
                            ? 'success'
                            : assessmentResult.readiness.overallRiskLevel === 'critical'
                            ? 'error'
                            : 'warning'
                        }
                        size="md"
                      >
                        {t('financing:results.riskProfile', {
                          level: assessmentResult.readiness.overallRiskLevel.toUpperCase(),
                        })}
                      </StatusBadge>
                    </div>

                    {/* Highlights (Strengths) */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {t('financing:results.strengthsTitle')}
                      </span>
                      {assessmentResult.readiness.readinessHighlights.length > 0 ? (
                        <div className="space-y-1.5">
                          {assessmentResult.readiness.readinessHighlights.map((h, i) => (
                            <div
                              key={i}
                              className="p-2.5 bg-emerald-50/70 border border-emerald-200/70 rounded-lg text-xs text-emerald-900"
                            >
                              {h}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          {t('financing:results.noStrengths')}
                        </p>
                      )}
                    </div>

                    {/* Concerns (Red Flags) */}
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        {t('financing:results.concernsTitle')}
                      </span>
                      {assessmentResult.readiness.readinessConcerns.length > 0 ? (
                        <div className="space-y-1.5">
                          {assessmentResult.readiness.readinessConcerns.map((c, i) => (
                            <div
                              key={i}
                              className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-lg text-xs text-amber-950"
                            >
                              {c}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          {t('financing:results.noConcerns')}
                        </p>
                      )}
                    </div>

                    {/* Metrics Table */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-800 block">
                        {t('financing:results.indicatorsTitle')}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 block uppercase">
                            {t('financing:results.runwayMonths')}
                          </span>
                          <span className="font-bold text-slate-900">
                            {assessmentResult.readiness.operatingRunwayMonths !== null
                              ? `${assessmentResult.readiness.operatingRunwayMonths} ${t('financing:results.monthsUnit')}`
                              : t('financing:results.sustainable')}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 block uppercase">
                            {t('financing:results.monthlyRevEst')}
                          </span>
                          <span className="font-bold text-slate-900">
                            {assessmentResult.readiness.monthlyRevenueEstimate !== null
                              ? formatCurrency(assessmentResult.readiness.monthlyRevenueEstimate)
                              : t('financing:results.unavailable')}
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            {t('financing:results.source', {
                              source: assessmentResult.readiness.monthlyRevenueSource,
                            })}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 block uppercase">
                            {t('financing:results.debtToRevenue')}
                          </span>
                          <span className="font-bold text-slate-900">
                            {assessmentResult.readiness.debtServiceBurdenRatio !== null
                              ? `${Math.round(assessmentResult.readiness.debtServiceBurdenRatio * 100)}%`
                              : t('financing:results.unstated')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Tab 3: Missing Information Checklist */}
              {activeTab === 'checklist' && (
                <div className="space-y-4">
                  <Card className="p-5 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <FileCheck2 className="w-4 h-4 text-blue-600" />
                      <div>
                        <CardTitle className="text-sm">
                          {t('financing:results.checklistTitle')}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {t('financing:results.checklistDesc')}
                        </CardDescription>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t('financing:results.checklistIntro')}
                    </p>

                    <div className="space-y-2 pt-1">
                      {assessmentResult.readiness.missingInformationChecklist.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white border border-slate-200 rounded-lg text-xs flex items-start gap-2.5 shadow-subtle"
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <span className="text-slate-800 leading-relaxed font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Compliance & Disclaimers Footer */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[11px] text-slate-500">
                <div className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  {t('financing:results.disclosuresTitle')}
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {assessmentResult.disclaimers.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
