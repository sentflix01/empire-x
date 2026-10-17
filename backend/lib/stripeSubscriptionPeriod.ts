/**
 * Billing-period dates from Stripe objects across API versions. Older
 * versions put current_period_start/end on the subscription; newer ones
 * (2025-03-31 "basil" and later, the default for stripe-node 18+) moved them
 * to each subscription item. Invoices carry them per line (`period`).
 * Returns null for anything missing or invalid, never an Invalid Date.
 */
type Obj = Record<string, unknown> | null | undefined;

function toDate(seconds: unknown): Date | null {
  const n = typeof seconds === 'number' ? seconds : Number.NaN;
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : null;
}

const firstItem = (sub: Obj): Obj => {
  const items = (sub?.items as { data?: unknown[] } | undefined)?.data;
  return Array.isArray(items) ? (items[0] as Obj) : null;
};

export function subscriptionPeriod(sub: Obj): { start: Date | null; end: Date | null } {
  const item = firstItem(sub);
  return {
    start: toDate(sub?.current_period_start) ?? toDate(item?.current_period_start),
    end: toDate(sub?.current_period_end) ?? toDate(item?.current_period_end),
  };
}

/** The subscription an invoice belongs to (old: `subscription`; new: `parent.subscription_details.subscription`). */
export function invoiceSubscriptionId(invoice: Obj): string | null {
  const direct = invoice?.subscription;
  if (typeof direct === 'string' && direct) return direct;
  if (direct && typeof direct === 'object' && typeof (direct as { id?: unknown }).id === 'string') return (direct as { id: string }).id;
  const nested = ((invoice?.parent as Obj)?.subscription_details as Obj)?.subscription;
  if (typeof nested === 'string' && nested) return nested;
  return null;
}

/** The period an invoice pays for: its subscription line's period. */
export function invoicePeriod(invoice: Obj): { start: Date | null; end: Date | null } {
  const lines = (invoice?.lines as { data?: unknown[] } | undefined)?.data;
  const line = Array.isArray(lines) ? (lines.find((l) => (l as Obj)?.period) as Obj) : null;
  const period = line?.period as Obj;
  return { start: toDate(period?.start), end: toDate(period?.end) };
}
