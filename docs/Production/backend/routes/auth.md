# backend/routes/auth.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Authentication and account lifecycle: register with OTP email verification, verify/resend code, login (bcrypt + timing-equalized), Google OAuth linking, /me profile fetch, forgot/reset password (hashed single-use tokens), change password, refresh rotation, logout and logout-all.

## 3. What does it do?


### Endpoints (17)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/auth/register` | public | 231 |
| `POST` | `/api/auth/verify-otp` | public | 330 |
| `POST` | `/api/auth/resend-otp` | public | 430 |
| `POST` | `/api/auth/demo` | public | 467 |
| `POST` | `/api/auth/demo/exit` | public | 527 |
| `POST` | `/api/auth/demo/reset` | public | 547 |
| `POST` | `/api/auth/workspace` | auth | 567 |
| `POST` | `/api/auth/onboarding-mode` | public | 668 |
| `POST` | `/api/auth/login` | public | 675 |
| `POST` | `/api/auth/google` | public | 803 |
| `GET` | `/api/auth/me` | auth | 957 |
| `POST` | `/api/auth/forgot-password` | public | 1000 |
| `POST` | `/api/auth/reset-password` | public | 1036 |
| `PUT` | `/api/auth/change-password` | auth | 1099 |
| `POST` | `/api/auth/refresh` | public | 1151 |
| `POST` | `/api/auth/logout` | public | 1234 |
| `POST` | `/api/auth/logout-all` | auth | 1274 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
