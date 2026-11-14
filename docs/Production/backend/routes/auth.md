# backend/routes/auth.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Authentication and account lifecycle: register with OTP email verification, verify/resend code, login (bcrypt + timing-equalized), Google OAuth linking, /me profile fetch, forgot/reset password (hashed single-use tokens), change password, refresh rotation, logout and logout-all.

## 3. What does it do?


### Endpoints (21)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/auth/register` | public | 240 |
| `POST` | `/api/auth/verify-otp` | public | 335 |
| `POST` | `/api/auth/resend-otp` | public | 427 |
| `POST` | `/api/auth/demo` | public | 464 |
| `POST` | `/api/auth/demo/exit` | public | 533 |
| `POST` | `/api/auth/demo/reset` | public | 553 |
| `POST` | `/api/auth/workspace` | auth | 571 |
| `POST` | `/api/auth/onboarding-mode` | public | 577 |
| `POST` | `/api/auth/login` | public | 584 |
| `POST` | `/api/auth/mfa/verify` | public | 703 |
| `POST` | `/api/auth/google` | public | 766 |
| `GET` | `/api/auth/me` | auth | 921 |
| `GET` | `/api/auth/me/export` | auth | 966 |
| `DELETE` | `/api/auth/me` | auth | 979 |
| `POST` | `/api/auth/forgot-password` | public | 1034 |
| `POST` | `/api/auth/reset-password` | public | 1070 |
| `PUT` | `/api/auth/update-name` | auth | 1121 |
| `PUT` | `/api/auth/change-password` | auth | 1143 |
| `POST` | `/api/auth/refresh` | public | 1182 |
| `POST` | `/api/auth/logout` | public | 1265 |
| `POST` | `/api/auth/logout-all` | auth | 1305 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
