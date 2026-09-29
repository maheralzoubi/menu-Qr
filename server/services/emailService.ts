import { env } from '../config/env';

/** Thrown when Resend rejects or can't be reached; the error handler maps it to 502 EMAIL_FAILED. */
export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

type Lang = 'en' | 'ar';

interface CodeEmail {
  subject: string;
  heading: string;
  intro: string;
  expiry: string;
  footnote: string;
}

const COPY: Record<'verify' | 'login' | 'reset', Record<Lang, CodeEmail>> = {
  verify: {
    en: {
      subject: 'Your Menu Go verification code',
      heading: 'Verify your email',
      intro: 'Thanks for signing up for Menu Go. Enter this code to verify your email address:',
      expiry: 'This code expires in 15 minutes.',
      footnote: "If you didn't create a Menu Go account, you can ignore this email.",
    },
    ar: {
      subject: 'رمز التحقق من منيو قو',
      heading: 'تأكيد بريدك الإلكتروني',
      intro: 'شكراً لتسجيلك في منيو قو. أدخل هذا الرمز لتأكيد بريدك الإلكتروني:',
      expiry: 'ينتهي هذا الرمز خلال 15 دقيقة.',
      footnote: 'إذا لم تقم بإنشاء حساب في منيو قو، يمكنك تجاهل هذه الرسالة.',
    },
  },
  login: {
    en: {
      subject: 'Your Menu Go sign-in code',
      heading: 'Your sign-in code',
      intro: 'Use this code to sign in to Menu Go:',
      expiry: 'This code expires in 10 minutes.',
      footnote: "If you didn't request this code, you can ignore this email.",
    },
    ar: {
      subject: 'رمز الدخول إلى منيو قو',
      heading: 'رمز تسجيل الدخول',
      intro: 'استخدم هذا الرمز لتسجيل الدخول إلى منيو قو:',
      expiry: 'ينتهي هذا الرمز خلال 10 دقائق.',
      footnote: 'إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.',
    },
  },
  reset: {
    en: {
      subject: 'Reset your Menu Go password',
      heading: 'Reset your password',
      intro: 'We received a request to reset your Menu Go password. Your reset code is:',
      expiry: 'This code expires in 15 minutes.',
      footnote: "If you didn't request a password reset, you can safely ignore this email — your password won't change.",
    },
    ar: {
      subject: 'إعادة تعيين كلمة مرور منيو قو',
      heading: 'إعادة تعيين كلمة المرور',
      intro: 'تلقينا طلباً لإعادة تعيين كلمة مرورك في منيو قو. رمز إعادة التعيين هو:',
      expiry: 'ينتهي هذا الرمز خلال 15 دقيقة.',
      footnote: 'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة ولن تتغير كلمة مرورك.',
    },
  },
};

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Brand colours from the Menu Go kit: Go Orange #FF5E1A, Ink #1A120D, Paper #FAF6F1.
function renderCodeEmail(c: CodeEmail, code: string, lang: Lang): { html: string; text: string } {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const align = lang === 'ar' ? 'right' : 'left';
  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#FAF6F1;">
  <div style="display:none;max-height:0;overflow:hidden;">${escape(c.intro)} ${code}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6F1;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #E7E1D9;border-radius:16px;overflow:hidden;font-family:'Readex Pro',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1A120D;">
        <tr><td style="background:#FF5E1A;padding:20px 28px;text-align:${align};">
          <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">Menu Go</span>
        </td></tr>
        <tr><td dir="${dir}" style="padding:28px;text-align:${align};">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:28px;font-weight:700;">${escape(c.heading)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:22px;color:#5F5650;">${escape(c.intro)}</p>
          <div dir="ltr" style="margin:0 0 20px;padding:16px;background:#FFF1EA;border-radius:12px;text-align:center;font-size:32px;line-height:36px;font-weight:700;letter-spacing:8px;color:#1A120D;">${code}</div>
          <p style="margin:0 0 8px;font-size:14px;line-height:20px;color:#5F5650;">${escape(c.expiry)}</p>
          <p style="margin:0;font-size:13px;line-height:20px;color:#8A817B;">${escape(c.footnote)}</p>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #E7E1D9;font-size:12px;color:#8A817B;text-align:${align};">© ${new Date().getFullYear()} Menu Go</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `${c.heading}\n\n${c.intro}\n\n${code}\n\n${c.expiry}\n${c.footnote}\n\n— Menu Go`;
  return { html, text };
}

async function sendEmail(to: string, subject: string, html: string, text: string, devLog: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === 'production') throw new EmailDeliveryError('Email is not configured (RESEND_API_KEY missing).');
    console.warn(`RESEND_API_KEY not set — ${devLog}`);
    return;
  }

  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error(`Resend request failed for ${to}:`, (e as Error).message);
    throw new EmailDeliveryError('Could not reach the email service.');
  }
  if (!res.ok) {
    console.error(`Resend rejected email to ${to}: ${res.status} ${await res.text()}`);
    throw new EmailDeliveryError('The email service rejected the message.');
  }
}

async function sendCodeEmail(kind: keyof typeof COPY, to: string, code: string, lang: Lang = 'en') {
  const copy = COPY[kind][lang] ?? COPY[kind].en;
  const { html, text } = renderCodeEmail(copy, code, lang);
  await sendEmail(to, copy.subject, html, text, `${kind} code for ${to}: ${code}`);
}

export const sendVerificationCode = (to: string, code: string) => sendCodeEmail('verify', to, code);
export const sendPasswordResetCode = (to: string, code: string) => sendCodeEmail('reset', to, code);
export const sendLoginCode = (to: string, code: string, lang: Lang = 'en') => sendCodeEmail('login', to, code, lang);
