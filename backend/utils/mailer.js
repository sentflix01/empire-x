const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendOtpEmail(to, otp) {
  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Empire X <noreply@empirex.app>',
    to,
    subject: 'Your Empire X verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#d97706;">👑 Empire X</h2>
        <p>Your email verification code is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#d97706;padding:24px 0;">${otp}</div>
        <p style="color:#6b7280;">This code expires in 15 minutes.</p>
        <p style="color:#6b7280;font-size:12px;">If you didn't create an Empire X account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(to, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Empire X <noreply@empirex.app>',
    to,
    subject: 'Reset your Empire X password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#d97706;">👑 Empire X</h2>
        <p>We received a request to reset your password.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#6b7280;">This link expires in 1 hour.</p>
        <p style="color:#6b7280;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail, sendPasswordResetEmail };
