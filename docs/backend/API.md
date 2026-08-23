# Nodbusiness — API Overview & Conventions

> **Full endpoint catalog: [`API_REFERENCE.md`](API_REFERENCE.md)** — auto-generated from the
> route sources (255+ endpoints across 44 modules). Regenerate with `cd backend && npm run docs:api`
> after any route change and commit it in the same PR.
> This page covers what generation cannot: conventions, auth model, and money-endpoint caveats.
> Last updated: 2026-08-23

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| JWT | JSON Web Token |
| CRUD | Create, Read, Update, Delete |
| CORS | Cross-Origin Resource Sharing |
| ETB | Ethiopian Birr — ledger currency |
| COD | Cash on Delivery |

---

## Authentication model

| Mechanism | Detail |
|---|---|
| Access token | JWT, **15 min**, `{ sub, type: 'access', jti }` signed HS256. Sent as `Authorization: Bearer …`. Refresh tokens (`type:'refresh'`) are rejected as Bearer credentials. |
| Refresh token | JWT, 7 days, **HttpOnly Secure cookie** scoped to `path=/api/auth`. Rotate-on-use; old jti revoked. |
| Revocation | Redis `revoked:{jti}` + `revoke_before:{userId}` checked per request (fail-open) and on socket handshakes (fail-closed). Banned users are rejected via cached user lookup. |
| Google OAuth | Server-side ID-token verification with audience check; account-linking by verified email. |

Auth levels used in the catalog: 🔒 `auth` · 👑 `admin` · ⚪ `optional` · 🌐 `public`.

## Conventions every endpoint follows

1. **Errors**: `{ error, code, request_id? }` — `422 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `500 INTERNAL_ERROR`. 5xx messages are always generic (no internals leaked).
2. **Versioning header**: every response carries `API-Version: 1`.
3. **Pagination**: keyset cursor on high-volume lists (`orders`, `posts`: `cursor` + `limit`; response includes `next_cursor`). Older modules use plain `limit`/`offset`.
4. **Rate limits** (production): 500 req/15 min global on `/api/*`; 20 req/15 min on login/register. Responses carry standard `Ratelimit-*` headers. Development skips both limiters.
5. **Validation**: manual guards returning 422; client JSON body keys are never trusted as column names (field allowlists + `sanitizeColumn`).
6. **Ownership**: mutations check resource ownership; money endpoints add role rules below.

## Money endpoints — extra rules

See `docs/architecture/CURRENCY_AND_COMMISSION.md` for the full money model.

| Endpoint | Rule |
|---|---|
| `POST /api/wallet/topup` | 🔒 but **admin-only in production** (self-service top-ups go through Stripe/Chapa checkout flows) |
| `POST /api/wallet/debit`, `/refund` | 👑 admin-only everywhere |
| `POST /api/orders` (COD) | Field allowlist; server forces `status='pending'`, `currency='ETB'`, `payment_provider='cod'`; price validated positive/finite |
| `PUT /api/orders/:id` | Role-scoped status transitions (buyer: cancel/dispute/complete; seller: confirm→deliver/cancel); money + ownership columns stripped for everyone except limited admin fields |
| Chapa verify/status | Public by design (Chapa calls them server-to-server); confirmation flips orders exactly once |

## Operational endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness + dependency summary (`database`, `redis`, `ai`, `email`, `storage`) — may return 503 `degraded` |
| `GET /metrics` | 👑 DB pool stats |
| `GET /api/docs` | Machine-readable module catalog (base paths only) |
| `POST /api/devops/errors/report` | Frontend error intake (rate-limited; no auth) |

## Related pages

- `backend/SECURITY.md` — controls behind these conventions
- `architecture/API_VERSIONING.md` — version policy + changelog
- `backend/PAYMENT_INTEGRATION.md` — Stripe/Chapa flows in depth
