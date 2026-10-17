/**
 * lib/chapaClient.ts — Chapa (ETB) checkout for NodBusiness's own subscription income.
 *
 * Chapa covers telebirr, CBE Birr, bank transfers and cards in one hosted
 * checkout. Each payment is one-time; NodBusiness never sees card or wallet
 * details. A payment counts only after `verifyTransaction` confirms it with
 * Chapa's API — webhooks, callbacks and return pages are just triggers.
 *
 * Env:
 *   CHAPA_SECRET_KEY      CHASECK_TEST-… / CHASECK-…; "SANDBOX" fakes Chapa
 *                         outside production (local dev, CI, browser tests).
 *   CHAPA_WEBHOOK_SECRET  Secret hash set in the Chapa dashboard webhook
 *                         settings; used to check webhook signatures.
 *   API_URL               Public backend URL for callbacks and the sandbox page.
 */
import crypto from 'crypto';

const CHAPA_API = 'https://api.chapa.co/v1';

export interface ChapaCheckoutRequest {
  txRef: string;
  amount: number;
  currency: 'ETB';
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  title: string;
  description: string;
  callbackUrl: string;
  returnUrl: string;
}

export interface ChapaVerification {
  /** True only when Chapa reports the transaction as successful. */
  paid: boolean;
  status: string;
  amount: number | null;
  currency: string | null;
  /** Chapa's own reference, for support. */
  reference: string | null;
}

function secretKey(): string | null {
  const key = process.env.CHAPA_SECRET_KEY?.trim();
  return key ? key : null;
}

/** Test keys (CHASECK_TEST-…) or the sandbox: no real money moves, so the app may show Chapa's test numbers. */
export function isChapaTestMode(): boolean {
  const key = secretKey();
  return Boolean(key) && (key === 'SANDBOX' || key!.startsWith('CHASECK_TEST'));
}

export function isChapaSandbox(): boolean {
  return secretKey() === 'SANDBOX' && process.env.NODE_ENV !== 'production';
}

/**
 * Ready for subscription payments: the sandbox outside production, or a real
 * key together with the webhook secret (both are set when ETB billing is
 * switched on; a key alone may be left over from the retired order checkout).
 */
export function isChapaConfigured(): boolean {
  const key = secretKey();
  if (!key) return false;
  if (key === 'SANDBOX') return isChapaSandbox();
  return Boolean(process.env.CHAPA_WEBHOOK_SECRET?.trim());
}

export function apiBaseUrl(): string {
  return (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

/** Chapa's checkout title is limited to 16 characters, description to letters, numbers, spaces and - _ . */
function chapaText(value: string, max: number): string {
  return value.replace(/[^A-Za-z0-9 ._-]/g, '').slice(0, max).trim() || 'NodBusiness';
}

export async function initializeCheckout(input: ChapaCheckoutRequest): Promise<{ checkoutUrl: string }> {
  if (isChapaSandbox()) {
    const url = `${apiBaseUrl()}/api/subscriptions/chapa/sandbox?tx_ref=${encodeURIComponent(input.txRef)}`
      + `&return_url=${encodeURIComponent(input.returnUrl)}`;
    return { checkoutUrl: url };
  }
  const key = secretKey();
  if (!key) throw new Error('Chapa is not configured');
  const res = await fetch(`${CHAPA_API}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: input.amount.toFixed(2),
      currency: input.currency,
      tx_ref: input.txRef,
      email: input.email || undefined,
      first_name: input.firstName || undefined,
      last_name: input.lastName || undefined,
      phone_number: input.phone || undefined,
      callback_url: input.callbackUrl,
      return_url: input.returnUrl,
      customization: { title: chapaText(input.title, 16), description: chapaText(input.description, 50) },
    }),
  });
  const body = await res.json().catch(() => ({})) as { status?: string; message?: unknown; data?: { checkout_url?: string } };
  const checkoutUrl = body?.data?.checkout_url;
  if (!res.ok || body?.status !== 'success' || typeof checkoutUrl !== 'string') {
    const detail = typeof body?.message === 'string' ? body.message : JSON.stringify(body?.message ?? res.status);
    throw new Error(`Chapa initialize failed: ${detail}`);
  }
  return { checkoutUrl };
}

/**
 * Asks Chapa for the transaction's real status. In the sandbox, a payment
 * counts as paid once the sandbox page confirmed it (see `sandboxConfirm`).
 */
export async function verifyTransaction(txRef: string): Promise<ChapaVerification> {
  if (isChapaSandbox()) {
    const paid = sandboxPaid.has(txRef);
    return { paid, status: paid ? 'success' : 'pending', amount: sandboxPaid.get(txRef) ?? null, currency: 'ETB', reference: paid ? `SANDBOX-${txRef}` : null };
  }
  const key = secretKey();
  if (!key) throw new Error('Chapa is not configured');
  const res = await fetch(`${CHAPA_API}/transaction/verify/${encodeURIComponent(txRef)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = await res.json().catch(() => ({})) as { status?: string; data?: Record<string, unknown> | null };
  const data = body?.data ?? null;
  const status = typeof data?.status === 'string' ? data.status : (res.status === 404 ? 'not_found' : 'unknown');
  const amount = data?.amount === undefined || data?.amount === null ? null : Number(data.amount);
  return {
    paid: res.ok && body?.status === 'success' && status === 'success',
    status,
    amount: Number.isFinite(amount) ? amount : null,
    currency: typeof data?.currency === 'string' ? data.currency : null,
    reference: typeof data?.reference === 'string' ? data.reference : null,
  };
}

/**
 * Chapa signs webhooks with HMAC-SHA256 of the raw body using the webhook
 * secret, in `x-chapa-signature` (and `chapa-signature`). The signature only
 * proves the call came from Chapa; the payment is still re-verified.
 */
export function isValidWebhookSignature(rawBody: Buffer | string, headers: Record<string, unknown>): boolean {
  const secret = process.env.CHAPA_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return ['x-chapa-signature', 'chapa-signature'].some((name) => {
    const given = headers[name];
    if (typeof given !== 'string' || given.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  });
}

// ── Sandbox (never in production) ───────────────────────────────────────────
const sandboxPaid = new Map<string, number>();

/** The sandbox checkout page's "Pay" button. */
export function sandboxConfirm(txRef: string, amount: number): void {
  if (!isChapaSandbox()) throw new Error('Chapa sandbox is not enabled');
  sandboxPaid.set(txRef, amount);
}
