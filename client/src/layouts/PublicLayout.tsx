import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, ArrowRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import { LanguageSelector } from '../components/common/LanguageSelector';

export const PublicLayout: React.FC = () => {
  const { t } = useTranslation(['landing', 'common', 'nav']);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900 antialiased">
      {/* Public Navbar */}
      <header className="h-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-700 transition-colors">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                FinPilot <span className="text-blue-600">{t('common:brand.ai')}</span>
              </span>
              <span className="block text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                {t('common:brand.tagline', 'SME Finance Copilot')}
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to="/#features" className="hover:text-slate-900 transition-colors">
              {t('nav:items.corePillars', 'Core Pillars')}
            </Link>
            <Link to="/#competition" className="hover:text-slate-900 transition-colors">
              {t('nav:items.competitionContext', 'Competition Context')}
            </Link>
            <Link to="/#architecture" className="hover:text-slate-900 transition-colors">
              {t('nav:items.architecture', 'Architecture')}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link to="/dashboard">
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {t('common:buttons.launchApp', 'Launch App')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Public Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">FinPilot AI</span>
            </div>
            <p className="text-xs text-slate-400 text-center md:text-right max-w-md">
              {t('common:footer.tagline')}
            </p>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div>
              {t('common:footer.copyright', { year: new Date().getFullYear() })}
            </div>
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="hover:text-slate-300 transition-colors">
                {t('common:buttons.exploreDemo', 'Explore Demo Dashboard')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
