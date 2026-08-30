# backend/routes/auth.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Authentication and account lifecycle: register with OTP email verification, verify/resend code, login (bcrypt + timing-equalized), Google OAuth linking, /me profile fetch, forgot/reset password (hashed single-use tokens), change password, refresh rotation, logout and logout-all.

## 3. What does it do?


### Endpoints (12)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/auth/register` | public | 133 |
| `POST` | `/api/auth/verify-otp` | public | 209 |
| `POST` | `/api/auth/resend-otp` | public | 256 |
| `POST` | `/api/auth/login` | public | 299 |
| `POST` | `/api/auth/google` | public | 369 |
| `GET` | `/api/auth/me` | auth | 446 |
| `POST` | `/api/auth/forgot-password` | public | 480 |
| `POST` | `/api/auth/reset-password` | public | 515 |
| `PUT` | `/api/auth/change-password` | auth | 554 |
| `POST` | `/api/auth/refresh` | public | 588 |
| `POST` | `/api/auth/logout` | public | 629 |
| `POST` | `/api/auth/logout-all` | auth | 647 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
