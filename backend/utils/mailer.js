/**
 * mailer.js — Email sending for Nodbusiness
 *
 * Supports two providers (checked in order):
 *   1. Resend (recommended) — set RESEND_API_KEY in .env
 *      Free tier: 3,000 emails/month. Sign up at https://resend.com
 *   2. SMTP (Gmail, Mailgun, etc.) — set SMTP_HOST, SMTP_USER, SMTP_PASS
 *
 * In development with no provider configured, OTP codes are printed to
 * the console in yellow so you can still test without email.
 */

const nodemailer = require('nodemailer');
const { getPrimaryFrontendUrl } = require('../lib/frontendUrl');

/* ── Resend HTTP helper ──────────────────────────────────────────────────── */
async function sendViaResend(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Nodbusiness <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Resend error: ${err.message || res.statusText}`);
  }
  return res.json();
}

/* ── SMTP helper ─────────────────────────────────────────────────────────── */
async function sendViaSMTP(to, subject, html) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Nodbusiness <noreply@nodbusiness.app>',
    to,
    subject,
    html,
  });
}

/* ── Dispatcher — picks the right provider ───────────────────────────────── */
async function sendEmail(to, subject, html) {
  // 1. Resend (recommended for production)
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(to, subject, html);
  }

  // 2. SMTP
  const smtpSettings = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS];
  if (smtpSettings.every(Boolean)) {
    return sendViaSMTP(to, subject, html);
  }

  // A partially configured SMTP transport is never usable.  Do not fall back
  // to the development console here: that would make the API claim an OTP was
  // sent even though the user cannot receive it.
  if (smtpSettings.some(Boolean)) {
    throw new Error('SMTP email is partially configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  }

  // 3. No provider configured — dev console fallback
  if (process.env.NODE_ENV !== 'production') {
    console.warn('\n⚠️  No email provider configured (set RESEND_API_KEY or SMTP_HOST/USER/PASS)');
    console.log(`📧  Would send to: ${to}`);
    console.log(`📧  Subject: ${subject}\n`);
    return; // silently succeed in dev
  }

  throw new Error(
    'Email provider not configured. Set RESEND_API_KEY or SMTP_HOST/USER/PASS in .env'
  );
}

/* ── OTP email ──────────────────────────────────────────────────────────── */
async function sendOtpEmail(to, otp) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#d97706;font-size:28px;margin:0;">👑 Nodbusiness</h1>
        <p style="color:#6b7280;margin:4px 0 0;">The Global Superapp</p>
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:24px;text-align:center;">
        <p style="color:#374151;font-size:16px;margin:0 0 16px;">Your verification code is:</p>
        <div style="font-size:42px;font-weight:bold;letter-spacing:10px;color:#d97706;padding:8px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px;margin:16px 0 0;">Expires in <strong>15 minutes</strong></p>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
        If you didn't create a Nodbusiness account, you can safely ignore this email.
      </p>
    </div>`;

  await sendEmail(to, 'Your Nodbusiness verification code', html);

  // Always print to console in dev so you can test without email
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n📧 \x1b[33mDEV OTP for ${to}: ${otp}\x1b[0m\n`);
  }
}

/* ── Password reset email ────────────────────────────────────────────────── */
async function sendPasswordResetEmail(to, token) {
  const frontendUrl = getPrimaryFrontendUrl();
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#d97706;font-size:28px;margin:0;">👑 Nodbusiness</h1>
        <p style="color:#6b7280;margin:4px 0 0;">Password Reset</p>
      </div>
      <p style="color:#374151;font-size:16px;">We received a request to reset your password.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}"
           style="display:inline-block;background:#d97706;color:#fff;padding:14px 32px;
                  border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">
          Reset Password
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;">
        This link expires in <strong>1 hour</strong>.
        If you didn't request this, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
      <p style="color:#9ca3af;font-size:11px;text-align:center;">
        © 2025 Nodbusiness · The Global Superapp
      </p>
    </div>`;

  await sendEmail(to, 'Reset your Nodbusiness password', html);
}

/* ── Order confirmation email ────────────────────────────────────────────── */
async function sendOrderConfirmation(to, order) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#d97706;font-size:28px;margin:0;">👑 Nodbusiness</h1>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;">
        <h2 style="color:#166534;margin:0 0 12px;">✅ Order Confirmed!</h2>
        <p style="color:#374151;margin:0;"><strong>${order.product_title}</strong></p>
        <p style="color:#6b7280;margin:4px 0 0;">Qty: ${order.quantity} · Total: ${order.total_price?.toLocaleString()} ${order.currency || 'ETB'}</p>
      </div>
      <p style="color:#374151;font-size:14px;margin-top:20px;">
        Your order has been placed successfully. The seller will process it shortly.
      </p>
      <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:32px;">
        © 2025 Nodbusiness · The Global Superapp
      </p>
    </div>`;

  await sendEmail(to, `✅ Order confirmed: ${order.product_title}`, html).catch(err => {
    console.error('Order confirmation email failed:', err.message);
  });
}

module.exports = { sendOtpEmail, sendPasswordResetEmail, sendOrderConfirmation };
