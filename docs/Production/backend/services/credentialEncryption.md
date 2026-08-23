# services/credentialEncryption.ts - AES-256-GCM Credential Vault

## 1. What is this?

**Backend service.** Encrypts tenant API credentials at rest: random 96-bit IV, verified auth tag, empty ciphertext is legal (GCM of empty string).

## 2. Why does it exist?

Encrypts tenant API credentials at rest: random 96-bit IV, verified auth tag, empty ciphertext is legal (GCM of empty string). getKey(context) HKDF-SHA256-derives DISTINCT keys per showroom tenant - Patent 4 dependent claim; legacy master-key payloads still decrypt. Requires EXTERNAL_API_ENCRYPTION_KEY (64 hex chars).

## 3. What does it do?

Encrypts tenant API credentials at rest: random 96-bit IV, verified auth tag, empty ciphertext is legal (GCM of empty string). getKey(context) HKDF-SHA256-derives DISTINCT keys per showroom tenant - Patent 4 dependent claim; legacy master-key payloads still decrypt. Requires EXTERNAL_API_ENCRYPTION_KEY (64 hex chars).

## 4. What does it touch?

Inline references only — nothing external.
