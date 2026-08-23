# OAuth 2.0 "Login with Nodbusiness" — Tasks

## Status: 🔴 Not Started

---

## What This Enables

Any website can add a "Continue with Nodbusiness" button.
Users click it → approve on Nodbusiness → return to the website logged in.
The website gets the user's basic profile (name, avatar, verified status).

This is exactly how "Login with Google" / "Login with Apple" works.

---

## Step 1 — Database Migration

- [ ] Create `backend/db/migrate32.js`:
  ```sql
  -- OAuth applications registered by developers
  CREATE TABLE IF NOT EXISTS oauth_apps (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    description   TEXT,
    logo_url      TEXT,
    client_id     TEXT NOT NULL UNIQUE,   -- public identifier
    client_secret TEXT NOT NULL,          -- hashed, shown once
    redirect_uris TEXT[] NOT NULL,        -- allowed callback URLs
    scopes        TEXT[] NOT NULL DEFAULT ARRAY['profile'],
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Authorization codes (short-lived, 10 min)
  CREATE TABLE IF NOT EXISTS oauth_codes (
    code         TEXT PRIMARY KEY,
    app_id       UUID NOT NULL REFERENCES oauth_apps(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scopes       TEXT[] NOT NULL,
    redirect_uri TEXT NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    used         BOOLEAN NOT NULL DEFAULT FALSE
  );

  -- Access tokens issued to OAuth apps
  CREATE TABLE IF NOT EXISTS oauth_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id        UUID NOT NULL REFERENCES oauth_apps(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token  TEXT NOT NULL UNIQUE,
    scopes        TEXT[] NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    refresh_token TEXT UNIQUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```

---

## Step 2 — OAuth Server Routes

- [ ] Create `backend/routes/oauth.ts`:

  ```
  GET  /oauth/authorize
    Params: client_id, redirect_uri, scope, state, response_type=code
    Shows: Nodbusiness consent screen ("App X wants access to your profile")
    On approve: redirects to redirect_uri?code=xxx&state=xxx
    On deny:    redirects to redirect_uri?error=access_denied

  POST /oauth/token
    Body: grant_type=authorization_code, code, client_id, client_secret, redirect_uri
    Returns: { access_token, token_type: "Bearer", expires_in: 3600, scope }

  POST /oauth/token (refresh)
    Body: grant_type=refresh_token, refresh_token, client_id, client_secret
    Returns: new access_token

  POST /oauth/revoke
    Revoke an access token or refresh token

  GET  /api/oauth/me
    Returns user profile for a valid OAuth access_token
    Scopes:
      profile → id, display_name, avatar_url, is_verified
      email   → + email address
      wallet  → + wallet balance (read-only)
  ```

---

## Step 3 — Consent Screen (Frontend)

- [ ] Create `frontend-next/app/oauth/authorize/page.tsx`
  - Shows: app name + logo, what permissions they're requesting
  - "Allow" and "Deny" buttons
  - Must be server-rendered (no loading flash on OAuth redirects)
  - Design: clean, trustworthy, shows Nodbusiness logo prominently
  - Permission explanations in plain language:
    - `profile` → "See your name and profile photo"
    - `email` → "See your email address"
    - `wallet` → "See your wallet balance (cannot spend)"

---

## Step 4 — App Registration (Developer Dashboard)

- [ ] "Register an App" section in developer dashboard:
  - App name (required)
  - App description
  - Logo upload
  - Redirect URIs (one per line, must be HTTPS in production)
  - Scopes requested (checkboxes)
  - Client ID shown always
  - Client Secret shown ONCE on creation (hash stored in DB)

---

## Step 5 — "Login with Nodbusiness" Button Component

- [ ] Create a copy-paste button code snippet in the docs:
  ```html
  <!-- Add to your website -->
  <a href="https://nodbusiness.vercel.app/oauth/authorize
    ?client_id=YOUR_CLIENT_ID
    &redirect_uri=https://yoursite.com/callback
    &scope=profile
    &response_type=code"
    style="background: #2563eb; color: white; padding: 12px 24px;
           border-radius: 9999px; font-weight: 600; text-decoration: none;">
    Continue with Nodbusiness
  </a>
  ```

- [ ] Provide code examples in:
  - Node.js / Express
  - Python / Flask
  - PHP
  - React (frontend flow)

---

## Step 6 — Verify

- [ ] Register test app, copy client_id + secret
- [ ] Click authorize button → see consent screen
- [ ] Approve → redirected with code
- [ ] Exchange code for token
- [ ] Call `/api/oauth/me` → get user profile
- [ ] Token expires after 1 hour
- [ ] Refresh token works
- [ ] Revoking token returns 401 on next use
