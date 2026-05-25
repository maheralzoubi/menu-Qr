import Stripe from 'stripe';
import { env } from '../config/env.js';

export const stripe: Stripe | null = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;

export const PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: env.STRIPE_PRICE_STARTER_MONTHLY,
    annual:  env.STRIPE_PRICE_STARTER_ANNUAL,
  },
  pro: {
    monthly: env.STRIPE_PRICE_PRO_MONTHLY,
    annual:  env.STRIPE_PRICE_PRO_ANNUAL,
  },
  enterprise: {
    monthly: env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    annual:  env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  },
};
