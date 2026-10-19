import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/common/Button';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100 shadow-subtle">
        <Compass className="w-8 h-8" />
      </div>

      <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
        {t('notFound.badge')}
      </span>

      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
        {t('notFound.title')}
      </h1>

      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
        {t('notFound.description')}
      </p>

      <div className="flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="primary" size="md" leftIcon={<Home className="w-4 h-4" />}>
            {t('notFound.dashboardButton')}
          </Button>
        </Link>
        <Link to="/">
          <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            {t('notFound.homeButton')}
          </Button>
        </Link>
      </div>
    </div>
  );
};

