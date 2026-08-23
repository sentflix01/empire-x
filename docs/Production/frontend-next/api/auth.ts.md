# frontend-next/api/auth.ts

> Auth-specific calls (login/me) returning tokens handled by client storeToken.

## Facts
- Size: ~91 lines
- API endpoints touched:
  - `/api/auth/me`
  - `/api/auth/login`
  - `/api/auth/register`
  - `/api/auth/verify-otp`
  - `/api/auth/resend-otp`
  - `/api/auth/forgot-password`

## Notes
- Client-side module; auth handled globally by api/client interceptors.
