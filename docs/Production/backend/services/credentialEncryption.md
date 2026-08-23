# services/credentialEncryption.ts - AES-256-GCM Credential Vault
Encrypts tenant API credentials at rest: random 96-bit IV, verified auth tag, empty ciphertext is legal (GCM of empty string). getKey(context) HKDF-SHA256-derives DISTINCT keys per showroom tenant - Patent 4 dependent claim; legacy master-key payloads still decrypt. Requires EXTERNAL_API_ENCRYPTION_KEY (64 hex chars).
