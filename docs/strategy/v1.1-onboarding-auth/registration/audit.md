# Registration Flow — Audit

## Current Flow (as built)

```
/register → enter email + password → POST /api/auth/register
         → OTP sent to email → /otp page → verify → /onboarding (if exists) → app
```

## Issues to Investigate

| Step | Current State | Global Standard |
|------|--------------|-----------------|
| Register page design | Unknown | Clean single-column form, progress indicator |
| Password field | Has show/hide toggle? | Must have show/hide + strength meter |
| Email validation | On submit only? | Real-time format check on blur |
| Error messages | Unknown tone | Human language ("That email is already taken") |
| Account type selection | `choose-account` page exists | Shown during registration, not before |
| Loading state on submit | Unknown | Button → spinner + disabled while API call runs |
| After register redirect | Unknown | Goes to OTP page smoothly |
| Google OAuth button | Exists | Must be prominent, above "or continue with email" divider |

## Global Standard Registration Page Layout

```
[Logo]
[Heading: "Create your account"]
[Google OAuth Button]  ← Primary for most users
[Divider: "or continue with email"]
[Full Name input]
[Email input]
[Password input + show/hide + strength bar]
[Account Type: Personal / Business toggle]
[Terms checkbox: "I agree to Terms and Privacy Policy"]
[Submit button: "Create Account"]
[Footer: "Already have an account? Sign In"]
```
