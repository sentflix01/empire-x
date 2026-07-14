'use strict';

/**
 * Credential Encryption Service
 *
 * AES-256-GCM symmetric encryption for storing API credentials at rest.
 * Key is read from EXTERNAL_API_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 *
 * SECURITY: The plaintext credential is NEVER logged or returned in any API response.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;      // 96-bit IV — recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag — GCM default

/**
 * Derive the 32-byte key buffer from the environment variable.
 * Throws at call time (not at module load time) so the server can start without
 * the key in development and only fail when encryption is actually attempted.
 *
 * @returns {Buffer} 32-byte key
 */
function getKey() {
  const hex = process.env.EXTERNAL_API_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'EXTERNAL_API_ENCRYPTION_KEY must be set to exactly 64 hex characters (32 bytes)'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * A fresh random 96-bit IV is generated on every call, so two encryptions of the
 * same plaintext will always produce different ciphertexts.
 *
 * @param {string} plaintext - The credential string to encrypt.
 * @returns {{ iv: string, authTag: string, ciphertext: string }} All hex-encoded.
 */
function encrypt(plaintext) {
  if (typeof plaintext !== 'string') {
    throw new TypeError('encrypt: plaintext must be a string');
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return {
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

/**
 * Decrypt an encrypted credential object produced by `encrypt`.
 *
 * Throws if the auth tag does not match (tampered data, wrong key, or
 * corrupted ciphertext). Never returns the plaintext via any error path.
 *
 * @param {{ iv: string, authTag: string, ciphertext: string }} obj - Hex-encoded fields.
 * @returns {string} The original plaintext string.
 */
function decrypt({ iv, authTag, ciphertext }) {
  if (iv == null || authTag == null || ciphertext == null) {
    throw new Error('decrypt: iv, authTag, and ciphertext are all required');
  }

  const key = getKey();
  const ivBuf = Buffer.from(iv, 'hex');
  const authTagBuf = Buffer.from(authTag, 'hex');
  const ciphertextBuf = Buffer.from(ciphertext, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTagBuf);

  // createDecipheriv will throw 'Unsupported state or unable to authenticate data'
  // if the auth tag doesn't match — this is the tamper / wrong-key guard.
  const decrypted = Buffer.concat([
    decipher.update(ciphertextBuf),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
