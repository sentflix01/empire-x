/**
 * services/credentialEncryption.ts — AES-256-GCM encryption for API credentials at rest.
 * Key: EXTERNAL_API_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Plaintext is NEVER logged or returned in any API response.
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;       // 96-bit IV — recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag — GCM default

export interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

function getKey(context?: string): Buffer {
  const hex = process.env.EXTERNAL_API_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('EXTERNAL_API_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }
  const master = Buffer.from(hex, 'hex');
  // Patent 4 dependent-claim embodiment: derive a distinct key per tenant via
  // HKDF so a compromised credential blob for one tenant cannot be replayed
  // against another tenant's. No context → legacy master-key path (backward
  // compatible with payloads stored before this change).
  if (!context) return master;
  const derived = crypto.hkdfSync(
    'sha256',
    master,
    Buffer.from(context, 'utf8'),            // salt = tenant scope
    Buffer.from('nodbusiness-cred-vault'),   // info
    32,
  ) as ArrayBuffer;
  return Buffer.from(derived);
}

export function encrypt(plaintext: string, context?: string): EncryptedPayload {
  if (typeof plaintext !== 'string') throw new TypeError('encrypt: plaintext must be a string');
  const key = getKey(context);
  const iv  = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex'), ciphertext: encrypted.toString('hex') };
}

export function decrypt(payload: EncryptedPayload, context?: string): string {
  // NOTE: an empty ciphertext is VALID — AES-256-GCM of "" produces zero
  // bytes — so ciphertext must be checked for presence, not truthiness.
  const { iv, authTag, ciphertext } = payload;
  if (!iv || !authTag || ciphertext == null) throw new Error('decrypt: iv, authTag, and ciphertext are all required');
  const key      = getKey(context);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'), { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
