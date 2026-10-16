# backend/routes/auth.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Authentication and account lifecycle: register with OTP email verification, verify/resend code, login (bcrypt + timing-equalized), Google OAuth linking, /me profile fetch, forgot/reset password (hashed single-use tokens), change password, refresh rotation, logout and logout-all.

## 3. What does it do?


### Endpoints (19)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/auth/register` | public | 233 |
| `POST` | `/api/auth/verify-otp` | public | 332 |
| `POST` | `/api/auth/resend-otp` | public | 432 |
| `POST` | `/api/auth/demo` | public | 469 |
| `POST` | `/api/auth/demo/exit` | public | 538 |
| `POST` | `/api/auth/demo/reset` | public | 558 |
| `POST` | `/api/auth/workspace` | auth | 576 |
| `POST` | `/api/auth/onboarding-mode` | public | 582 |
| `POST` | `/api/auth/login` | public | 589 |
| `POST` | `/api/auth/google` | public | 717 |
| `GET` | `/api/auth/me` | auth | 871 |
| `GET` | `/api/auth/me/export` | auth | 914 |
| `DELETE` | `/api/auth/me` | auth | 927 |
| `POST` | `/api/auth/forgot-password` | public | 980 |
| `POST` | `/api/auth/reset-password` | public | 1016 |
| `PUT` | `/api/auth/change-password` | auth | 1079 |
| `POST` | `/api/auth/refresh` | public | 1131 |
| `POST` | `/api/auth/logout` | public | 1214 |
| `POST` | `/api/auth/logout-all` | auth | 1254 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
