import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n from '../i18n';

/**
 * Merges class names safely with tailwind-merge and clsx.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Returns active BCP 47 locale tag based on active language or override.
 */
export function getActiveLocale(customLang?: string): string {
  const lang = customLang || i18n.language;
  return lang === 'bn' ? 'bn-BD' : 'en-US';
}

/**
 * Formats a numeric value into USD currency format ($), respecting active locale for digits.
 * Preserves actual currency ($) and numerical magnitude while rendering localized digits in Bangla mode.
 */
export function formatCurrency(
  amount: number,
  minimumFractionDigits = 0,
  lang?: string
): string {
  if (!Number.isFinite(amount)) return '$0';
  const locale = getActiveLocale(lang);
  const absFormatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(Math.abs(amount));

  const sign = amount < 0 ? '-' : '';
  return `${sign}$${absFormatted}`;
}

/**
 * Formats a generic number with locale-aware thousand separators and digits.
 */
export function formatNumber(
  value: number,
  minimumFractionDigits = 0,
  lang?: string
): string {
  if (!Number.isFinite(value)) return '0';
  const locale = getActiveLocale(lang);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(value);
}

/**
 * Formats a percentage number with +/- sign and localized numerals.
 */
export function formatPercent(
  value: number,
  includeSign = true,
  lang?: string
): string {
  if (!Number.isFinite(value)) return '0.0%';
  const locale = getActiveLocale(lang);
  const sign = includeSign && value > 0 ? '+' : '';
  const formattedNum = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${sign}${formattedNum}%`;
}

/**
 * Formats a Date object or ISO string to readable localized date string.
 * English: "May 15, 2026"
 * Bangla: "১৫ মে, ২০২৬"
 */
export function formatDate(dateString: string | Date, lang?: string): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return String(dateString);
  const locale = getActiveLocale(lang);
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
