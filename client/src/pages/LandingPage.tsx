import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShieldAlert,
  Landmark,
  Bot,
  ArrowRight,
  CheckCircle,
  Building,
  BarChart3,
  Server,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 py-12 md:py-20">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-medium">
          <StatusBadge variant="demo" size="sm">
            FinTech Competition Entry
          </StatusBadge>
          <span>University Innovation Showcase</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]">
          Intelligent Finance Copilot <br />
          <span className="text-blue-600">for Growing SMEs</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
          Empowering small and medium enterprises to master cash flow velocity, anticipate liquidity
          bottlenecks before they happen, and navigate optimal financing pathways with confidence.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link to="/dashboard">
            <Button
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto text-base px-6 py-3"
            >
              Explore Demo Dashboard
            </Button>
          </Link>
          <a href="#features">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-base px-6 py-3"
            >
              Learn About FinPilot
            </Button>
          </a>
        </div>

        {/* Demo Data Disclaimer Card */}
        <div className="max-w-2xl mx-auto pt-6">
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-left flex items-start gap-3">
            <Building className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700 font-semibold">Competition Sandbox Notice:</strong> This
              application is an MVP proof-of-concept for evaluation. All dashboard figures and company
              profiles represent illustrative demo data designed to showcase real-world SME finance
              workflows.
            </p>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Built for Real-World SME Finance Realities
          </h2>
          <p className="text-sm text-slate-600">
            Traditional accounting software looks backward at tax records. FinPilot AI looks forward
            to safeguard operational solvency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1 */}
          <Card className="p-6 flex flex-col justify-between hover:shadow-card transition-all">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Cash Flow Velocity & Runway
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Continuous 30-to-90 day forward runway visibility that factors in invoice aging,
                recurring payroll, and supplier terms instead of static bank snapshots.
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center text-xs font-medium text-blue-600">
              <Link to="/cash-flow" className="inline-flex items-center gap-1 hover:underline">
                Explore cash flow module <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Pillar 2 */}
          <Card className="p-6 flex flex-col justify-between hover:shadow-card transition-all">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Proactive Risk Early Warning
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated detection of overdue client receivables, liquidity stress points, and
                upcoming tax obligations before they cause operational disruption.
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center text-xs font-medium text-amber-700">
              <Link to="/dashboard" className="inline-flex items-center gap-1 hover:underline">
                View risk alert monitor <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Pillar 3 */}
          <Card className="p-6 flex flex-col justify-between hover:shadow-card transition-all">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                <Landmark className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Financing Readiness & Matching
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Objective eligibility scoring for working capital facilities, invoice discounting,
                and revolving credit to bridge liquidity gaps with fair terms.
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center text-xs font-medium text-teal-700">
              <Link to="/financing" className="inline-flex items-center gap-1 hover:underline">
                Explore financing tools <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Pillar 4 */}
          <Card className="p-6 flex flex-col justify-between hover:shadow-card transition-all">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                AI SME Finance Copilot
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Conversational decision-support interface that answers critical financial questions:
                payroll viability, supplier renegotiation, and hiring runway.
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center text-xs font-medium text-indigo-700">
              <Link to="/copilot" className="inline-flex items-center gap-1 hover:underline">
                Preview Copilot assistant <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Competition & Architecture Section */}
      <section id="competition" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Product Design Philosophy</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Designed for University FinTech Competition
              </h2>

              <p className="text-sm text-slate-600 leading-relaxed">
                This project was created to address a systemic gap in SME banking: small business
                owners spend hours reconciling disparate spreadsheets without a single unified view
                of their cash runway.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Clean separation between frontend presentation and backend API services',
                  'Auditable demo indicators for transparent academic and competition judging',
                  'Modular architecture prepared for upcoming AI forecasting pipeline in Step 2',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Link to="/dashboard">
                  <Button variant="secondary" size="md">
                    Launch Interactive Demo Workspace
                  </Button>
                </Link>
              </div>
            </div>

            {/* Architecture Card */}
            <div id="architecture" className="p-6 bg-slate-50 rounded-xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    System Foundation & Stack (Step 1)
                  </span>
                </div>
                <StatusBadge variant="success" size="sm">
                  Active
                </StatusBadge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200/70">
                  <span className="font-semibold text-slate-900 block">Frontend</span>
                  <span className="text-slate-500">React 18 + Vite + TypeScript</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/70">
                  <span className="font-semibold text-slate-900 block">Design System</span>
                  <span className="text-slate-500">Tailwind CSS + Lucide</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/70">
                  <span className="font-semibold text-slate-900 block">Backend Server</span>
                  <span className="text-slate-500">Node.js + Express + TypeScript</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/70">
                  <span className="font-semibold text-slate-900 block">Validation & Data</span>
                  <span className="text-slate-500">Zod schemas + Central API client</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Health check endpoint:</span>
                <code className="bg-slate-200 px-2 py-0.5 rounded text-slate-800 font-mono text-[10px]">
                  GET /api/health
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
