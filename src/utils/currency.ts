/**
 * Format number as Philippine Peso (PHP)
 * @param amount - Number to format
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted currency string
 */
export function formatPHP(amount: number, showDecimals: boolean = true): string {
  if (showDecimals) {
    return new Intl.NumberFormat('fil-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  
  return new Intl.NumberFormat('fil-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number as compact currency (e.g., ₱1.2K, ₱5M)
 * @param amount - Number to format
 * @returns Compact formatted string
 */
export function formatPHPCompact(amount: number): string {
  const formatter = new Intl.NumberFormat('fil-PH', {
    style: 'currency',
    currency: 'PHP',
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return formatter.format(amount);
}

/**
 * Parse currency string to number
 * @param value - Currency string (e.g., "₱1,234.56" or "1234.56")
 * @returns Number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbol, commas, and spaces
  const cleaned = value.replace(/[₱,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format number as simple number with commas (no currency symbol)
 * @param amount - Number to format
 * @returns Formatted number string
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('fil-PH').format(amount);
}

/**
 * Get currency symbol for PHP
 * @returns Currency symbol string
 */
export function getCurrencySymbol(): string {
  return '₱';
}

/**
 * Validate if input is a valid positive currency amount
 * @param input - String input from form
 * @returns True if valid
 */
export function isValidCurrencyInput(input: string): boolean {
  const parsed = parseCurrency(input);
  return !isNaN(parsed) && parsed > 0;
}

/**
 * Format amount for display in inputs (no currency symbol)
 * @param amount - Number to format
 * @returns String without currency symbol
 */
export function formatInputAmount(amount: number): string {
  return amount.toFixed(2);
}