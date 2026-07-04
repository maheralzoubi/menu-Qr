import 'dotenv/config';

const required = ['MONGODB_URI', 'JWT_SECRET'] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  MONGODB_URI: process.env.MONGODB_URI!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  APP_URL: process.env.APP_URL ?? 'http://localhost:5173',
  // Resend — all optional; server logs the verification link instead of sending if absent
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'Monar <onboarding@resend.dev>',
  // Stripe — all optional; server skips Stripe if STRIPE_SECRET_KEY is absent
  STRIPE_SECRET_KEY:               process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_WEBHOOK_SECRET:           process.env.STRIPE_WEBHOOK_SECRET ?? '',
  STRIPE_PRICE_STARTER_MONTHLY:    process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '',
  STRIPE_PRICE_STARTER_ANNUAL:     process.env.STRIPE_PRICE_STARTER_ANNUAL ?? '',
  STRIPE_PRICE_PRO_MONTHLY:        process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
  STRIPE_PRICE_PRO_ANNUAL:         process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
  STRIPE_PRICE_ENTERPRISE_MONTHLY: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? '',
  STRIPE_PRICE_ENTERPRISE_ANNUAL:  process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? '',
};
