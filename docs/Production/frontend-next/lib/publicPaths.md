# frontend-next/lib/publicPaths

## 1. What is this?

**Shared frontend library.** The route visibility policy the edge proxy (`frontend-next/proxy.ts`) uses to decide which pages a signed-out visitor may open.

Size: roughly 100 lines of source.

## 2. Why does it exist?

Guests can browse discovery pages (feed, marketplace, showrooms, public profiles and products) but must sign in for anything personal or for building. One module keeps that policy in one place.

## 3. What does it do?

- `isPublicPath(pathname)`: true for pages a guest may open (exact public paths plus public prefixes such as `/products/`, `/showroom/`, `/p/`, `/order/`). Auth-only prefixes (including the product builder pages `/products/create`, `/products/edit`, `/products/scan`, audit F-012) and showroom builder pages always return false.
- `SIGN_IN_ROOTS` and `requiresSignIn(pathname)`: true only for non-public paths under the top-level segments of real app pages that need sign-in (`orders`, `wallet`, `settings`, `admin`, …). The proxy redirects guests to `/login?return=…` only when this is true. Every other unknown path reaches the not-found page with status 404 (audit F-036); before, every unknown path sent guests to sign-in.
- `isGuestBrowsablePath(pathname)`: pages a guest can read where write actions prompt sign-up.

**Adding a page:** if the new page is not public and lives under a new top-level segment, add that segment to `SIGN_IN_ROOTS`. `test/proxy.test.ts` walks `app/` and fails if any page is neither public nor listed.

## 4. What does it touch?

**Used by:** `proxy.ts`, `components/layout/AppLayout.tsx`

**Tests:** `test/proxy.test.ts`, `e2e/not-found.spec.ts`

**Source:** `frontend-next/lib/publicPaths.ts`
