# backend/routes/auth.ts - Authentication and account lifecycle: register with OTP email verification, verify/resend code, login (bcrypt + timing-equalized), Google OAuth linking, /me profile fetch, forgot/reset password (hashed single-use tokens), change password, refresh rotation, logout and logout-all.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (12)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/auth/register` | public | 133 |
| `POST` | `/api/auth/verify-otp` | public | 209 |
| `POST` | `/api/auth/resend-otp` | public | 256 |
| `POST` | `/api/auth/login` | public | 299 |
| `POST` | `/api/auth/google` | public | 369 |
| `GET` | `/api/auth/me` | auth | 440 |
| `POST` | `/api/auth/forgot-password` | public | 474 |
| `POST` | `/api/auth/reset-password` | public | 509 |
| `PUT` | `/api/auth/change-password` | auth | 548 |
| `POST` | `/api/auth/refresh` | public | 582 |
| `POST` | `/api/auth/logout` | public | 623 |
| `POST` | `/api/auth/logout-all` | auth | 641 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

