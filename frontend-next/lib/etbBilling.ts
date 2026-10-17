/**
 * Client side of prepaid ETB plans paid through Chapa
 * (backend: routes/subscriptionsEtb.ts, docs/backend/SUBSCRIPTIONS.md).
 * Amounts and periods always come from the server's quote.
 */
import client from '@/api/client';

export type PaidTier = 'normal' | 'premium' | 'pro';
export type PaymentKind = 'new' | 'renewal' | 'upgrade';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired';

export const PREPAY_MONTHS = [1, 3, 6, 12] as const;

export interface EtbQuote {
  kind: PaymentKind;
  tier: PaidTier;
  months: number;
  amount: number;
  periodStart: string;
  periodEnd: string;
  currency: 'ETB';
  businessId: string;
}

export interface SubscriptionPayment {
  id: string;
  kind: PaymentKind;
  tier: PaidTier;
  months: number;
  amount: string;
  currency: string;
  status: PaymentStatus;
  provider: string;
  receipt_number: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PaymentStatusResult {
  outcome: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  tier: PaidTier;
  months: number;
  kind: PaymentKind;
  receipt_number: string | null;
  period_end: string | null;
  business_id: string;
  payment_id: string;
  draft_id: string | null;
}

export interface SubscriptionReceipt {
  receipt_number: string;
  business_name: string;
  business_id: string;
  plan: string;
  tier: PaidTier;
  kind: PaymentKind;
  months: number;
  amount: string;
  currency: string;
  provider: string;
  provider_ref: string;
  paid_at: string;
  period_start: string;
  period_end: string;
}

export const TIER_LABEL: Record<PaidTier, string> = { normal: 'Normal', premium: 'Premium', pro: 'Pro' };

export function formatBirr(amount: number | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ETB`;
}

export function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export function describePayment(p: { kind: PaymentKind; tier: PaidTier; months: number }): string {
  const plan = TIER_LABEL[p.tier] ?? p.tier;
  const months = p.months ? `${p.months} month${p.months === 1 ? '' : 's'}` : '';
  if (p.kind === 'upgrade') return months ? `Upgrade to ${plan} + ${months}` : `Upgrade to ${plan}`;
  return `${plan} · ${months}${p.kind === 'renewal' ? ' (renewal)' : ''}`;
}

export async function getQuote(businessId: string, plan: PaidTier, months: number): Promise<EtbQuote> {
  const { data } = await client.get('/api/subscriptions/quote', { params: { businessId, plan, months } });
  return data as EtbQuote;
}

export async function startChapaCheckout(input: { businessId: string; plan: PaidTier; months: number; draftId?: string | null }): Promise<{ checkout_url: string; tx_ref: string }> {
  const { data } = await client.post('/api/subscriptions/checkout', {
    business_id: input.businessId,
    plan: input.plan,
    months: input.months,
    ...(input.draftId ? { draft_id: input.draftId } : {}),
  });
  return data as { checkout_url: string; tx_ref: string };
}

export async function getPaymentStatus(txRef: string): Promise<PaymentStatusResult> {
  const { data } = await client.get(`/api/subscriptions/payments/${encodeURIComponent(txRef)}/status`);
  return data as PaymentStatusResult;
}

export async function getPayments(businessId: string): Promise<SubscriptionPayment[]> {
  const { data } = await client.get('/api/subscriptions/payments', { params: { businessId } });
  const payments = (data as { payments?: unknown } | null)?.payments;
  return Array.isArray(payments) ? (payments as SubscriptionPayment[]) : [];
}

export async function getReceipt(paymentId: string): Promise<SubscriptionReceipt> {
  const { data } = await client.get(`/api/subscriptions/payments/${encodeURIComponent(paymentId)}/receipt`);
  return data as SubscriptionReceipt;
}
