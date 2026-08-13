# v1.1 — Onboarding & Auth

> **Theme:** First Impression
> **Goal:** A new user registers, verifies, sets up their profile, and completes their first meaningful action — all within 3 minutes, with zero confusion.

---

## Why This Matters

The onboarding flow is the single highest-leverage UX investment. Apps that guide new users to their "aha moment" fast have dramatically higher retention. Apps that dump users on a blank screen after registration lose 60–80% of them within 24 hours.

---

## Scope

| Section | File |
|---------|------|
| Registration flow | [audit.md](./registration/audit.md) · [tasks.md](./registration/tasks.md) |
| OTP verification UX | [audit.md](./otp-verification/audit.md) · [tasks.md](./otp-verification/tasks.md) |
| Progressive onboarding | [audit.md](./progressive-onboarding/audit.md) · [tasks.md](./progressive-onboarding/tasks.md) |
| Profile setup | [audit.md](./profile-setup/audit.md) · [tasks.md](./profile-setup/tasks.md) |
| Login & session UX | [audit.md](./login-session/audit.md) · [tasks.md](./login-session/tasks.md) |

---

## Success Criteria

- [ ] Registration → OTP → onboarding → first action in under 3 minutes
- [ ] OTP input auto-advances between digits, auto-submits on 6th digit
- [ ] Onboarding wizard (3–4 steps max) collects: name, avatar, interests, account type
- [ ] User sees a personalized feed or relevant content immediately after onboarding
- [ ] "Skip" option available on non-critical onboarding steps
- [ ] Google OAuth works end-to-end including profile pre-fill
- [ ] Session persists correctly across page refresh and app restart
- [ ] "Remember me" or token refresh works invisibly

---

## Dependencies

- Backend: `/api/auth/*` routes (already exist)
- Backend: profile completion endpoint (may need update)
- Frontend: onboarding wizard pages (may need creation)
