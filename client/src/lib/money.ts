/**
 * Client Financial Calculation Utilities
 * 
 * ACCOUNTING RULE:
 * Floating-point arithmetic in JavaScript introduces fractional precision errors.
 * All financial aggregations use integer minor units (cents) to avoid precision errors.
 */

export function toCents(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

export function sumDollars(values: number[]): number {
  const totalCents = values.reduce((sum, val) => sum + toCents(val), 0);
  return fromCents(totalCents);
}

export function subtractDollars(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

export function multiplyDollars(dollars: number, factor: number): number {
  return fromCents(Math.round(toCents(dollars) * factor));
}
