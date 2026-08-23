# proxy.ts - Route Gating Middleware (Next 16)

## 1. What is this?

**Documentation page.** Runs edge-side before pages.

## 2. Why does it exist?

Runs edge-side before pages. Reads ONLY the non-sensitive nb_auth hint cookie (value 1) - the JWT itself never exists client-side (TD-014). Rules: logged-in users hitting /login//register etc. redirect to /feed; anonymous users hitting protected routes redirect to /login?from=<path>. Public paths allowlist includes

## 3. What does it do?

Runs edge-side before pages. Reads ONLY the non-sensitive nb_auth hint cookie
(value 1) - the JWT itself never exists client-side (TD-014). Rules: logged-in
users hitting /login//register etc. redirect to /feed; anonymous users hitting
protected routes redirect to /login?from=<path>. Public paths allowlist includes
landing, product/showroom public pages, /p/[username]. Matcher skips _next,
api, dotfiles.

## 4. What does it touch?

Inline references only — nothing external.
