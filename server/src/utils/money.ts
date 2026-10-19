/**
 * Financial Calculation Utilities
 * 
 * ACCOUNTING RULE:
 * Floating-point arithmetic in JavaScript (IEEE 754) introduces fractional precision errors
 * (e.g. 0.1 + 0.2 = 0.30000000000000004). All calculations in this engine normalize values
 * to integer minor units (cents / integer cents) before addition or subtraction, then convert
 * back to standard currency units.
 */

/**
 * Converts a dollar amount to integer cents (minor unit) safely.
 */
export function toCents(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

/**
 * Converts integer cents back to dollars with 2 decimal places.
 */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

/**
 * Adds an array of dollar values safely via integer cents.
 */
export function sumDollars(values: number[]): number {
  const totalCents = values.reduce((sum, val) => sum + toCents(val), 0);
  return fromCents(totalCents);
}

/**
 * Subtracts two dollar amounts safely (a - b) via integer cents.
 */
export function subtractDollars(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

/**
 * Multiplies a dollar amount by a scalar factor safely.
 */
export function multiplyDollars(dollars: number, factor: number): number {
  return fromCents(Math.round(toCents(dollars) * factor));
}
