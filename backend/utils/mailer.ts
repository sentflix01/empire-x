/**
 * utils/mailer.ts — Transactional email
 *
 * Provider priority:
 *   1. Resend (RESEND_API_KEY)           — recommended, 3K free/month
 *   2. SMTP  (SMTP_HOST/USER/PASS)       — any SMTP provider
 *   3. Console fallback                  — dev only, prints to terminal
 */
import nodemailer from 'nodemailer';
import { getPrimaryFrontendUrl } from '../lib/frontendUrl';
import logger from '../lib/logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderLike {
  product_title: string;
  quantity: number;
  total_price?: number;
  currency?: string;
}

// ── Resend ────────────────────────────────────────────────────────────────────

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY as string}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'Nodbusiness <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(`Resend error: ${err.message ?? res.statusText}`);
  }
}

// ── SMTP ──────────────────────────────────────────────────────────────────────

async function sendViaSMTP(to: string, subject: string, html: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? 'Nodbusiness <noreply@nodbusiness.app>',
    to,
    subject,
    html,
  });
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(to, subject, html);
  }

  const smtpSettings = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS];
  if (smtpSettings.every(Boolean)) {
    return sendViaSMTP(to, subject, html);
  }
  if (smtpSettings.some(Boolean)) {
    throw new Error('SMTP is partially configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  }

  // Dev-only console fallback
  if (process.env.NODE_ENV !== 'production') {
    console.warn('\n⚠️  No email provider configured (set RESEND_API_KEY or SMTP_*)');
    console.log(`📧  To: ${to} | Subject: ${subject}\n`);
    return;
  }

  throw new Error('Email provider not configured. Set RESEND_API_KEY or SMTP_* in .env');
}

// ── Public functions ──────────────────────────────────────────────────────────

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#d97706;font-size:28px;margin:0;">👑 Nodbusiness</h1>
        <p style="color:#6b7280;margin:4px 0 0;">The Global Superapp</p>
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:24px;text-align:center;">
        <p style="color:#374151;font-size:16px;margin:0 0 16px;">Your verification code is:</p>
        <div style="font-size:42px;font-weight:bold;letter-spacing:10px;color:#d97706;padding:8px 0;">${otp}</div>
        <p style="color:#6b7280;font-size:13px;margin:16px 0 0;">Expires in <strong>15 minutes</strong></p>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
        If you didn't create a Nodbusiness account, you can safely ignore this email.
      </p>
    </div>`;

  await sendEmail(to, 'Your Nodbusiness verification code', html);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n📧 \x1b[33mDEV OTP for ${to}: ${otp}\x1b[0m\n`);
  }
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${getPrimaryFrontendUrl()}/reset-password?token=${token}`;
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
    </div>`;

  await sendEmail(to, 'Reset your Nodbusiness password', html);
}

export async function sendOrderConfirmation(to: string, order: OrderLike): Promise<void> {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#d97706;font-size:28px;margin:0;">👑 Nodbusiness</h1>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;">
        <h2 style="color:#166534;margin:0 0 12px;">✅ Order Confirmed!</h2>
        <p style="color:#374151;margin:0;"><strong>${order.product_title}</strong></p>
        <p style="color:#6b7280;margin:4px 0 0;">Qty: ${order.quantity} · Total: ${order.total_price?.toLocaleString() ?? '—'} ${order.currency ?? 'ETB'}</p>
      </div>
      <p style="color:#374151;font-size:14px;margin-top:20px;">
        Your order has been placed successfully. The seller will process it shortly.
      </p>
    </div>`;

  await sendEmail(to, `✅ Order confirmed: ${order.product_title}`, html).catch((err: Error) => {
    console.error('Order confirmation email failed:', err.message);
  });
}

module.exports = { sendOtpEmail, sendPasswordResetEmail, sendOrderConfirmation };

/**
 * sendCustomEmail - generic transactional send (Resend first, SMTP fallback).
 * Used by operational features (e.g. weekly Showroom Doctor digests).
 */
export async function sendCustomEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await sendViaResend(to, subject, html);
  } catch (resendErr) {
    logger.warn({ err: (resendErr as Error).message, to }, 'Resend failed — falling back to SMTP');
    await sendViaSMTP(to, subject, html);
  }
}