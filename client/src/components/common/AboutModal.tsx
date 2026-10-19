import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Compass, ShieldCheck, Database, Bot, Globe, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendConnected?: boolean;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  backendConnected = false,
}) => {
  const { t } = useTranslation(['common', 'nav', 'landing']);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200/90 max-w-lg w-full shadow-2xl overflow-hidden animate-scale-up">
        {/* Header banner */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="about-modal-title" className="text-base font-bold text-white tracking-tight">
                  {t('common:brand.name')} <span className="text-blue-400">{t('common:brand.ai')}</span>
                </h2>
                <StatusBadge variant="demo" size="sm">
                  {t('common:badges.fintechMvp')}
                </StatusBadge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {t('common:brand.tagline', 'SME Finance Copilot')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common:buttons.close')}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs text-slate-600">
          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1.5 text-blue-950">
            <span className="font-semibold text-blue-900 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              {t('common:aboutModal.title')}
            </span>
            <p className="leading-relaxed whitespace-pre-line text-xs">
              {t('common:aboutModal.content')}
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-slate-800 block text-xs uppercase tracking-wider">
              {t('nav:items.architecture', 'Architecture & Live Technology Stack')}
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div>
                  <span className="font-medium text-slate-800 block">Frontend / i18n</span>
                  <span className="text-slate-500">React 18 + Vite + i18next</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-medium text-slate-800 block">Backend & DB</span>
                  <span className="text-slate-500">Express + MongoDB Atlas</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50 flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-medium text-slate-800 block">AI Intelligence</span>
                  <span className="text-slate-500">Google Gemini Flash</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <div>
                  <span className="font-medium text-slate-800 block">Live Engine</span>
                  <span className="text-slate-500">{backendConnected ? 'Connected (OK)' : 'Offline'}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic leading-relaxed border-t border-slate-100 pt-3">
            {t('common:footer.tagline')}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            {t('common:buttons.close')}
          </Button>
        </div>
      </div>
    </div>
  );
};
