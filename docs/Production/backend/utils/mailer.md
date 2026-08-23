# utils/mailer.ts - Transactional Email
Resend API first, SMTP (nodemailer) fallback, console output last (dev prints OTP in yellow). Templates: sendOtpEmail, sendPasswordResetEmail, sendOrderConfirmation + generic send(). Queueable through lib/queue email jobs; delivery failures are logged, never crash requests.
