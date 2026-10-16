/**
 * lib/privateReceipts.ts — Private storage for payment receipts.
 *
 * Receipts can show bank or mobile-money details, so they live in a private
 * Supabase bucket (RECEIPTS_SUPABASE_BUCKET, never the public SUPABASE_BUCKET)
 * and are only ever served through short-lived signed URLs to the order's
 * buyer and seller. Demo orders use the already-private Demo bucket.
 * Without a configured bucket, receipt upload is unavailable; buyers can still
 * report a payment with a transaction reference.
 */
import crypto from 'crypto';
import { getCurrentDatabaseEnvironment } from '../db/pool';
import { getSupabaseProjectUrl, getSupabaseStorageAuthHeaders } from '../middleware/upload';

interface ReceiptStore { projectUrl: string; bucket: string; key: string }

function receiptStore(): ReceiptStore | null {
  if (getCurrentDatabaseEnvironment() === 'demo') {
    const projectUrl = getSupabaseProjectUrl('demo');
    const bucket = process.env.DEMO_SUPABASE_BUCKET?.trim();
    const key = process.env.DEMO_SUPABASE_STORAGE_KEY;
    return projectUrl && bucket && key ? { projectUrl, bucket, key } : null;
  }
  const projectUrl = getSupabaseProjectUrl('real');
  const bucket = process.env.RECEIPTS_SUPABASE_BUCKET?.trim();
  const key = process.env.SUPABASE_STORAGE_KEY;
  if (!projectUrl || !bucket || !key) return null;
  // Never write receipts into the public site-media bucket.
  if (bucket.toLowerCase() === process.env.SUPABASE_BUCKET?.trim().toLowerCase()) return null;
  return { projectUrl, bucket, key };
}

export function receiptUploadsAvailable(): boolean {
  return receiptStore() !== null;
}

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
export const RECEIPT_MIME_TYPES = Object.keys(EXTENSIONS);

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');

/** Stores the receipt and returns its storage key (not a URL). */
export async function uploadReceipt(orderId: string, buffer: Buffer, mimeType: string): Promise<string> {
  const store = receiptStore();
  if (!store) throw Object.assign(new Error('Receipt uploads are not configured'), { statusCode: 503 });
  const objectKey = `receipts/${orderId}/${crypto.randomUUID()}.${EXTENSIONS[mimeType] ?? 'bin'}`;
  const response = await fetch(`${store.projectUrl}/storage/v1/object/${encodeURIComponent(store.bucket)}/${encodeKey(objectKey)}`, {
    method: 'POST',
    headers: { ...getSupabaseStorageAuthHeaders(store.key), 'Content-Type': mimeType, 'Cache-Control': 'private, no-store', 'x-upsert': 'false' },
    body: new Uint8Array(buffer),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Receipt upload failed [${response.status}]`);
  return objectKey;
}

/** A signed URL valid for a short time, for the order's buyer or seller only. */
export async function signedReceiptUrl(objectKey: string, expiresInSeconds = 120): Promise<string> {
  const store = receiptStore();
  if (!store) throw Object.assign(new Error('Receipt storage is not configured'), { statusCode: 503 });
  const response = await fetch(`${store.projectUrl}/storage/v1/object/sign/${encodeURIComponent(store.bucket)}/${encodeKey(objectKey)}`, {
    method: 'POST',
    headers: { ...getSupabaseStorageAuthHeaders(store.key), 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Could not sign receipt URL [${response.status}]`);
  const signed = await response.json() as { signedURL?: string; signedUrl?: string };
  const path = signed.signedURL ?? signed.signedUrl;
  if (!path) throw new Error('Storage returned no signed URL');
  return /^https:\/\//i.test(path) ? path : `${store.projectUrl}/storage/v1${path.startsWith('/') ? path : `/${path}`}`;
}
