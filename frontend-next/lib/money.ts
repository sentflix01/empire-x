/**
 * Amounts from the API arrive as numbers or as decimal strings ("100.00",
 * PostgreSQL NUMERIC). Calling toLocaleString on a string does nothing, so
 * 1500000 showed as "1500000.00". Format both the same way: thousands
 * separators, up to two decimals, no trailing ".00".
 */
export function formatAmount(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
