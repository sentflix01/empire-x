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

function getKey(): Buffer {
  const hex = process.env.EXTERNAL_API_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('EXTERNAL_API_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext: string): EncryptedPayload {
  if (typeof plaintext !== 'string') throw new TypeError('encrypt: plaintext must be a string');
  const key = getKey();
  const iv  = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex'), ciphertext: encrypted.toString('hex') };
}

export function decrypt({ iv, authTag, ciphertext }: EncryptedPayload): string {
  // NOTE: an empty ciphertext is VALID — AES-256-GCM of "" produces zero
  // bytes — so ciphertext must be checked for presence, not truthiness.
  if (!iv || !authTag || ciphertext == null) throw new Error('decrypt: iv, authTag, and ciphertext are all required');
  const key      = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'), { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
