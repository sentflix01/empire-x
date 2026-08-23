# utils/mailer.ts - Transactional Email

## 1. What is this?

**Shared utility.** Resend API first, SMTP (nodemailer) fallback, console output last (dev prints OTP in yellow).

## 2. Why does it exist?

Resend API first, SMTP (nodemailer) fallback, console output last (dev prints OTP in yellow). Templates: sendOtpEmail, sendPasswordResetEmail, sendOrderConfirmation + generic send(). Queueable through lib/queue email jobs; delivery failures are logged, never crash requests.

## 3. What does it do?

Resend API first, SMTP (nodemailer) fallback, console output last (dev prints OTP in yellow). Templates: sendOtpEmail, sendPasswordResetEmail, sendOrderConfirmation + generic send(). Queueable through lib/queue email jobs; delivery failures are logged, never crash requests.

## 4. What does it touch?

Inline references only — nothing external.
