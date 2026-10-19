import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import {
  Landmark,
  Percent,
  FileCheck2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const FinancingPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              SME Financing & Capital Matcher
            </h1>
            <StatusBadge variant="info" size="md">
              Upcoming Feature
            </StatusBadge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data-driven capital readiness evaluation and tailored financing options for SMEs
          </p>
        </div>

        <Link to="/dashboard">
          <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Feature Explainer Hero */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-card">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Planned for Step 2 Architecture</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Fair, Transparent Financing for Underbanked SMEs
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Many viable SMEs struggle to access affordable credit because traditional underwriting
            relies exclusively on historical collateral and audited tax filings from previous years.
            FinPilot AI will calculate continuous, verifiable cash flow readiness scores to match
            businesses with suitable working capital partners.
          </p>
        </div>
      </div>

      {/* Illustrative Financing Options Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Invoice Factoring & Discounting
            </h3>
            <StatusBadge variant="demo" size="sm">Demo Concept</StatusBadge>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Unlock up to 85% of outstanding B2B invoices immediately rather than waiting 30–90 days
            for client payment cycles.
          </p>
          <div className="pt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Typical term:</span> 30 to 90 days
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Revolving Working Capital Line
            </h3>
            <StatusBadge variant="demo" size="sm">Demo Concept</StatusBadge>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Flexible liquidity reserve drawn down dynamically only when seasonal payroll or
            inventory demands exceed cash reserves.
          </p>
          <div className="pt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Typical term:</span> 6 to 18 months
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Percent className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Revenue-Based Financing
            </h3>
            <StatusBadge variant="demo" size="sm">Demo Concept</StatusBadge>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Repay capital as a fixed percentage of daily/weekly receivables, safeguarding cash flow
            during slower operational periods.
          </p>
          <div className="pt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Repayment:</span> Tied to revenue velocity
          </div>
        </Card>
      </div>

      {/* Readiness Assessment Flow */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Intelligent Financing Readiness Workflow</CardTitle>
            <CardDescription>
              How FinPilot AI assists business owners in loan readiness preparation
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="font-bold text-blue-600 block mb-1">01. Health Audit</span>
              <p className="text-slate-600">
                Aggregates debt service coverage ratio (DSCR), monthly turnover consistency, and burn rate.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="font-bold text-blue-600 block mb-1">02. Readiness Score</span>
              <p className="text-slate-600">
                Calculates an objective readiness score highlighting specific flags needing improvement.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="font-bold text-blue-600 block mb-1">03. Partner Matching</span>
              <p className="text-slate-600">
                Matches the SME with pre-qualified institutional and fintech lenders matching risk profile.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="font-bold text-blue-600 block mb-1">04. Audit Pack</span>
              <p className="text-slate-600">
                Generates a lender-ready financial audit package in one click, drastically shortening approval.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
