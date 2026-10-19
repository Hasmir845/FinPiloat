import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['landing', 'common', 'nav']);

  return (
    <div className="space-y-24 py-12 md:py-20">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-medium">
          <StatusBadge variant="demo" size="sm">
            {t('common:badges.competitionSandbox')}
          </StatusBadge>
          <span>{t('landing:hero.badge')}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]">
          {t('landing:hero.titlePrefix')} <br />
          <span className="text-blue-600">{t('landing:hero.titleHighlight')}</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
          {t('landing:hero.subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link to="/dashboard">
            <Button
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto text-base px-6 py-3"
            >
              {t('landing:hero.launchApp', 'Explore Demo Dashboard')}
            </Button>
          </Link>
          <a href="#features">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-base px-6 py-3"
            >
              {t('landing:hero.viewFeatures', 'Inspect Architecture')}
            </Button>
          </a>
        </div>

        {/* Demo Data Disclaimer Card */}
        <div className="max-w-2xl mx-auto pt-6">
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-left flex items-start gap-3">
            <Building className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700 font-semibold">{t('common:badges.competitionSandbox')}:</strong>{' '}
              {t('landing:hero.trustNotice')}
            </p>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t('landing:pillars.title')}
          </h2>
          <p className="text-sm text-slate-600">
            {t('landing:pillars.subtitle')}
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
                {t('landing:pillars.pillar1Title')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('landing:pillars.pillar1Desc')}
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center text-xs font-medium text-blue-600">
              <Link to="/cash-flow" className="inline-flex items-center gap-1 hover:underline">
                {t('common:buttons.viewDetails')} <ArrowRight className="w-3.5 h-3.5" />
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
                {t('landing:pillars.pillar3Title')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('landing:pillars.pillar3Desc')}
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center text-xs font-medium text-amber-700">
              <Link to="/dashboard" className="inline-flex items-center gap-1 hover:underline">
                {t('common:buttons.viewDetails')} <ArrowRight className="w-3.5 h-3.5" />
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
                {t('nav:items.financing')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('landing:competition.point3Desc')}
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center text-xs font-medium text-teal-700">
              <Link to="/financing" className="inline-flex items-center gap-1 hover:underline">
                {t('common:buttons.viewDetails')} <ArrowRight className="w-3.5 h-3.5" />
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
                {t('landing:pillars.pillar4Title')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('landing:pillars.pillar4Desc')}
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center text-xs font-medium text-indigo-700">
              <Link to="/copilot" className="inline-flex items-center gap-1 hover:underline">
                {t('common:buttons.viewDetails')} <ArrowRight className="w-3.5 h-3.5" />
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
                <span>{t('landing:competition.title')}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {t('landing:competition.subtitle')}
              </h2>

              <p className="text-sm text-slate-600 leading-relaxed">
                {t('landing:hero.subtitle')}
              </p>

              <div className="space-y-3 pt-2">
                {[
                  t('landing:competition.point1Title') + ' — ' + t('landing:competition.point1Desc'),
                  t('landing:competition.point2Title') + ' — ' + t('landing:competition.point2Desc'),
                  t('landing:competition.point3Title') + ' — ' + t('landing:competition.point3Desc'),
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
                    {t('landing:cta.button', 'Launch Live Application')}
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
                    {t('landing:architecture.title')}
                  </span>
                </div>
                <StatusBadge variant="success" size="sm">
                  {t('common:status.active', 'Active')}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200/70">
                  <span className="font-semibold text-slate-900 block">{t('landing:architecture.frontend')}</span>
                  <span className="text-slate-500">{t('landing:architecture.frontendStack')}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/70">
                  <span className="font-semibold text-slate-900 block">{t('landing:architecture.i18n')}</span>
                  <span className="text-slate-500">{t('landing:architecture.i18nStack')}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/70">
                  <span className="font-semibold text-slate-900 block">{t('landing:architecture.backend')}</span>
                  <span className="text-slate-500">{t('landing:architecture.backendStack')}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/70">
                  <span className="font-semibold text-slate-900 block">{t('landing:architecture.database')}</span>
                  <span className="text-slate-500">{t('landing:architecture.databaseStack')}</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>{t('common:apiStatus.label')} {t('landing:architecture.healthEndpoint')}</span>
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
