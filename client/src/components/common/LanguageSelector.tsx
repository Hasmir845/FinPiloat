import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check, ChevronDown } from 'lucide-react';
import { setAppLanguage, SupportedLanguage } from '../../i18n';
import { cn } from '../../lib/utils';

interface LanguageSelectorProps {
  variant?: 'pill' | 'dropdown' | 'compact';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'pill',
  className,
}) => {
  const { i18n, t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = (i18n.language === 'bn' ? 'bn' : 'en') as SupportedLanguage;

  const handleSelect = async (lang: SupportedLanguage) => {
    if (lang === currentLang) {
      setIsOpen(false);
      return;
    }
    await setAppLanguage(lang);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Compact toggle button variant (quick one-click swap or dropdown)
  if (variant === 'compact') {
    return (
      <div className={cn('relative inline-flex items-center', className)} ref={containerRef}>
        <button
          type="button"
          onClick={() => handleSelect(currentLang === 'en' ? 'bn' : 'en')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={t('language.selectorLabel')}
          title={currentLang === 'en' ? t('language.switchToBn') : t('language.switchToEn')}
        >
          <Languages className="w-3.5 h-3.5 text-blue-600" />
          <span>{currentLang === 'en' ? 'English' : 'বাংলা'}</span>
          <span className="text-[10px] text-slate-400 font-normal uppercase">
            ({currentLang === 'en' ? 'EN' : 'BN'})
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn('relative inline-block text-left', className)}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('language.selectorLabel')}
        id="language-selector-button"
      >
        <Languages className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className="font-semibold text-slate-900">
          {currentLang === 'en' ? 'English' : 'বাংলা'}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-36 rounded-lg bg-white border border-slate-200 shadow-dropdown py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          role="listbox"
          aria-labelledby="language-selector-button"
        >
          <button
            type="button"
            role="option"
            aria-selected={currentLang === 'en'}
            onClick={() => handleSelect('en')}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors',
              currentLang === 'en'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🇺🇸</span>
              <span>English</span>
            </div>
            {currentLang === 'en' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
          </button>

          <button
            type="button"
            role="option"
            aria-selected={currentLang === 'bn'}
            onClick={() => handleSelect('bn')}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors',
              currentLang === 'bn'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🇧🇩</span>
              <span>বাংলা</span>
            </div>
            {currentLang === 'bn' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
};
