# API Key System — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Database Migration

- [ ] Create `backend/db/migrate30.js` — `api_keys` table:
  ```sql
  CREATE TABLE IF NOT EXISTS api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,               -- "My Shopify Integration"
    key_hash    TEXT NOT NULL UNIQUE,        -- SHA-256 hash of actual key
    key_prefix  TEXT NOT NULL,              -- "hale_live_xxxx" first 16 chars (for display)
    tier        TEXT NOT NULL DEFAULT 'free'
                CHECK (tier IN ('free','pro','enterprise')),
    rate_limit  INTEGER NOT NULL DEFAULT 100, -- req/hour
    last_used_at TIMESTAMPTZ,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ                  -- NULL = never expires
  );
  CREATE INDEX IF NOT EXISTS idx_api_keys_user  ON api_keys(user_id);
  CREATE INDEX IF NOT EXISTS idx_api_keys_hash  ON api_keys(key_hash);
  ```

---

## Step 2 — API Key Generation

- [ ] Create `backend/lib/apiKey.js`:
  ```js
  const crypto = require('crypto');

  function generateKey() {
    // Format: hale_live_[32 random hex chars]
    const raw = crypto.randomBytes(16).toString('hex');
    return `hale_live_${raw}`;
  }

  function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  function keyPrefix(key) {
    return key.slice(0, 16) + '...';
  }

  module.exports = { generateKey, hashKey, keyPrefix };
  ```

- [ ] **Security rule:** The actual key is shown ONCE on creation and never stored.
  Only the SHA-256 hash is stored in the DB. If lost, user must regenerate.

---

## Step 3 — API Key Routes

- [ ] Create `backend/routes/developer.js`:
  ```
  GET    /api/developer/keys          — list user's keys (shows prefix only)
  POST   /api/developer/keys          — create new key (returns actual key ONCE)
  PUT    /api/developer/keys/:id      — rename key
  DELETE /api/developer/keys/:id      — revoke key
  GET    /api/developer/keys/:id/usage — request count, last used
  ```

---

## Step 4 — API Key Authentication Middleware

- [ ] Create `backend/middleware/apiKeyAuth.js`:
  ```js
  // Accepts: Authorization: Bearer hale_live_xxxxxxxxxxxx
  // Looks up key hash → finds user → sets req.user
  // Increments usage counter
  // Checks rate limit (Redis counter per key per hour)
  // Returns 401 if key invalid/revoked
  // Returns 429 if rate limited
  ```

- [ ] Update `backend/middleware/auth.js`:
  - `requireAuth` middleware checks BOTH JWT token AND API key
  - If Authorization header starts with `hale_live_` → use API key auth
  - Otherwise → use JWT auth (existing behavior)
  - This is backward compatible — no existing code changes needed

---

## Step 5 — Rate Limiting Per Key

- [ ] Per-key rate limiting using Redis:
  ```js
  // Key: `rate:${api_key_id}:${currentHour}`
  // TTL: 3600 seconds
  // Increment on each request, check against tier limit
  ```
- [ ] If Redis not configured → use in-memory counter (less accurate but functional)
- [ ] Rate limit headers on every API response:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 87
  X-RateLimit-Reset: 1722870000
  ```

---

## Step 6 — Developer Dashboard (Frontend)

- [ ] Create `frontend-next/app/(app)/developers/page.tsx`
- [ ] Sections:
  - **API Keys:** list of keys (prefix only), create button, revoke button
  - **Usage Stats:** requests today, this week, this month
  - **Documentation link:** external API docs
  - **Rate limit display:** current tier + limits
- [ ] Create key modal: enter key name → show key ONCE with copy button and warning
  "This key will not be shown again. Save it somewhere safe."

---

## Step 7 — Verify

- [ ] Create a key, copy it, make an API call: `curl -H "Authorization: Bearer hale_live_xxx" https://halehame.vercel.app/api/posts`
- [ ] Verify 401 on invalid key
- [ ] Verify 429 when rate limit exceeded
- [ ] Verify key shows as prefix-only in dashboard after creation
- [ ] Verify revoked key returns 401 immediately
