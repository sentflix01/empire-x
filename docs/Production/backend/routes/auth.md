# backend/routes/auth.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Authentication and account lifecycle: register with OTP email verification, verify/resend code, login (bcrypt + timing-equalized), Google OAuth linking, /me profile fetch, forgot/reset password (hashed single-use tokens), change password, refresh rotation, logout and logout-all.

## 3. What does it do?


### Endpoints (16)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/auth/register` | public | 151 |
| `POST` | `/api/auth/verify-otp` | public | 245 |
| `POST` | `/api/auth/resend-otp` | public | 336 |
| `POST` | `/api/auth/demo` | public | 401 |
| `POST` | `/api/auth/demo/exit` | public | 469 |
| `POST` | `/api/auth/demo/reset` | public | 489 |
| `POST` | `/api/auth/onboarding-mode` | auth | 506 |
| `POST` | `/api/auth/login` | public | 527 |
| `POST` | `/api/auth/google` | public | 656 |
| `GET` | `/api/auth/me` | auth | 790 |
| `POST` | `/api/auth/forgot-password` | public | 831 |
| `POST` | `/api/auth/reset-password` | public | 866 |
| `PUT` | `/api/auth/change-password` | auth | 929 |
| `POST` | `/api/auth/refresh` | public | 981 |
| `POST` | `/api/auth/logout` | public | 1066 |
| `POST` | `/api/auth/logout-all` | auth | 1106 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
