'use strict';

// Outbound email. SMTP settings come from env; when SMTP_HOST is unset the
// message is logged to the server console instead so local flows still work.

const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function isConfigured() {
  return Boolean(env.smtp.host);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Minimal editorial template shared by every transactional email.
function renderHtml({ heading, paragraphs = [], cta = null, footer = null }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#1e1b15;">${escapeHtml(p)}</p>`).join('');
  const button = cta
    ? `<p style="margin:22px 0;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:600;letter-spacing:.04em;">${escapeHtml(cta.label)}</a></p>
       <p style="margin:0 0 14px;font-size:12px;color:#6b665e;">Or copy this link: ${escapeHtml(cta.url)}</p>`
    : '';
  const foot = footer ? `<p style="margin:22px 0 0;font-size:12px;color:#6b665e;">${escapeHtml(footer)}</p>` : '';
  return `<!doctype html><html><body style="margin:0;background:#fff8f1;padding:32px 16px;font-family:Manrope,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e0d9cf;border-radius:8px;padding:32px;">
    <p style="margin:0 0 20px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#a88f5f;">${escapeHtml(env.appName)}</p>
    <h1 style="margin:0 0 18px;font-family:Georgia,'Newsreader',serif;font-weight:500;font-size:24px;color:#0a0a0a;">${escapeHtml(heading)}</h1>
    ${body}${button}${foot}
  </div></body></html>`;
}

async function sendMail({ to, subject, heading, paragraphs, cta, footer }) {
  const text = [
    heading,
    '',
    ...paragraphs,
    cta ? `\n${cta.label}: ${cta.url}` : '',
    footer ? `\n${footer}` : '',
  ].join('\n');
  const html = renderHtml({ heading, paragraphs, cta, footer });

  const t = getTransporter();
  if (!t) {
    console.log(`[email] SMTP not configured — message not sent.\n  To: ${to}\n  Subject: ${subject}\n${text.replace(/^/gm, '  ')}`);
    return { sent: false, configured: false };
  }
  await t.sendMail({ from: env.smtp.from, to, subject, text, html });
  return { sent: true, configured: true };
}

function appLink(path) {
  return `${env.appUrl.replace(/\/$/, '')}${path}`;
}

async function sendPasswordResetEmail({ to, displayName, token, ttlHours }) {
  const url = appLink(`/auth/reset-password?token=${encodeURIComponent(token)}`);
  return sendMail({
    to,
    subject: `Reset your ${env.appName} password`,
    heading: 'Reset your password',
    paragraphs: [
      `Hi ${displayName || 'there'},`,
      `We received a request to reset the password for your ${env.appName} account. Use the button below to choose a new one.`,
      `This link is valid for ${ttlHours} hour${ttlHours === 1 ? '' : 's'} and can be used once.`,
    ],
    cta: { label: 'Choose a new password', url },
    footer: 'If you did not request a password reset, you can safely ignore this email — your password will stay the same.',
  });
}

async function sendStaffInviteEmail({ to, displayName, roleLabel, token, ttlHours }) {
  const loginUrl = appLink('/auth/login');
  const resetUrl = appLink(`/auth/reset-password?token=${encodeURIComponent(token)}`);
  return sendMail({
    to,
    subject: `Your ${env.appName} staff account`,
    heading: 'Your staff account is ready',
    paragraphs: [
      `Hi ${displayName || 'there'},`,
      `An administrator created a ${env.appName} staff account for you${roleLabel ? ` (${roleLabel})` : ''}. Sign in at ${loginUrl} with this email address and the password your administrator shared with you.`,
      `We recommend choosing your own password right away — use the button below (valid for ${ttlHours} hours) or "Forgot password?" on the sign-in page at any time.`,
    ],
    cta: { label: 'Set my password', url: resetUrl },
    footer: 'Keep this email private. Only people with access to it can use the link above.',
  });
}

module.exports = { isConfigured, sendMail, sendPasswordResetEmail, sendStaffInviteEmail, appLink };
