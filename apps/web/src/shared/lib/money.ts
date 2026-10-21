/** Formats minor units (cents) with Intl, e.g. 19900 → "$199". */
export function formatMoney(cents: number, currency = 'USD'): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
