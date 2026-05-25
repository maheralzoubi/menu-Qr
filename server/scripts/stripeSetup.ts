/**
 * One-time script — creates MenuQR products and prices in Stripe,
 * then prints the .env lines to paste into your .env file.
 *
 * Run:  npx tsx server/scripts/stripeSetup.ts
 */

import 'dotenv/config';
import Stripe from 'stripe';

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error('STRIPE_SECRET_KEY is not set in .env');
  process.exit(1);
}

const stripe = new Stripe(secret);

const PLANS = [
  {
    id:          'starter',
    name:        'MenuQR Starter',
    description: 'Perfect for single-location restaurants.',
    monthly:     2900,   // cents
    annual:      2300,
  },
  {
    id:          'pro',
    name:        'MenuQR Pro',
    description: 'For growing restaurants that need more.',
    monthly:     7900,
    annual:      6300,
  },
  {
    id:          'enterprise',
    name:        'MenuQR Enterprise',
    description: 'Multi-location operations at scale.',
    monthly:     19900,
    annual:      15900,
  },
];

async function run() {
  const priceIds: Record<string, string> = {};

  for (const plan of PLANS) {
    console.log(`\nCreating product: ${plan.name}`);

    const product = await stripe.products.create({
      name:        plan.name,
      description: plan.description,
      metadata:    { planId: plan.id },
    });

    console.log(`  ✓ Product: ${product.id}`);

    const monthlyPrice = await stripe.prices.create({
      product:    product.id,
      unit_amount: plan.monthly,
      currency:   'usd',
      recurring:  { interval: 'month' },
      nickname:   `${plan.id} monthly`,
    });

    const annualPrice = await stripe.prices.create({
      product:    product.id,
      unit_amount: plan.annual * 12,
      currency:   'usd',
      recurring:  { interval: 'year' },
      nickname:   `${plan.id} annual`,
    });

    console.log(`  ✓ Monthly price: ${monthlyPrice.id}`);
    console.log(`  ✓ Annual price:  ${annualPrice.id}`);

    priceIds[`STRIPE_PRICE_${plan.id.toUpperCase()}_MONTHLY`] = monthlyPrice.id;
    priceIds[`STRIPE_PRICE_${plan.id.toUpperCase()}_ANNUAL`]  = annualPrice.id;
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log('Add these lines to your .env file:\n');
  for (const [key, value] of Object.entries(priceIds)) {
    console.log(`${key}="${value}"`);
  }
  console.log('─────────────────────────────────────────────────\n');
}

run().catch(e => { console.error(e); process.exit(1); });
