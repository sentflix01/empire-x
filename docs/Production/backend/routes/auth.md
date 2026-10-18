# backend/routes/auth.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Authentication and account lifecycle: register with OTP email verification, verify/resend code, login (bcrypt + timing-equalized), Google OAuth linking, /me profile fetch, forgot/reset password (hashed single-use tokens), change password, refresh rotation, logout and logout-all.

## 3. What does it do?


### Endpoints (19)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/auth/register` | public | 219 |
| `POST` | `/api/auth/verify-otp` | public | 318 |
| `POST` | `/api/auth/resend-otp` | public | 409 |
| `POST` | `/api/auth/demo` | public | 446 |
| `POST` | `/api/auth/demo/exit` | public | 515 |
| `POST` | `/api/auth/demo/reset` | public | 535 |
| `POST` | `/api/auth/workspace` | auth | 553 |
| `POST` | `/api/auth/onboarding-mode` | public | 559 |
| `POST` | `/api/auth/login` | public | 566 |
| `POST` | `/api/auth/google` | public | 683 |
| `GET` | `/api/auth/me` | auth | 837 |
| `GET` | `/api/auth/me/export` | auth | 880 |
| `DELETE` | `/api/auth/me` | auth | 893 |
| `POST` | `/api/auth/forgot-password` | public | 943 |
| `POST` | `/api/auth/reset-password` | public | 979 |
| `PUT` | `/api/auth/change-password` | auth | 1033 |
| `POST` | `/api/auth/refresh` | public | 1076 |
| `POST` | `/api/auth/logout` | public | 1159 |
| `POST` | `/api/auth/logout-all` | auth | 1199 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
