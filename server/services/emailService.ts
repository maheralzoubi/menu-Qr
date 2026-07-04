import { env } from '../config/env';

async function sendCode(to: string, code: string, subject: string, html: string, logLabel: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set — ${logLabel} for ${to}: ${code}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Failed to send ${logLabel} to ${to}: ${res.status} ${body}`);
  }
}

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  await sendCode(
    to,
    code,
    'Your Monar verification code',
    `<p>Thanks for signing up for Monar.</p><p>Your verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p><p>This code expires in 15 minutes.</p>`,
    'verification code'
  );
}

export async function sendPasswordResetCode(to: string, code: string): Promise<void> {
  await sendCode(
    to,
    code,
    'Reset your Monar password',
    `<p>We received a request to reset your Monar password.</p><p>Your reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p><p>This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>`,
    'password reset code'
  );
}
