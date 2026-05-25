import 'dotenv/config';
import Stripe from 'stripe';

async function main() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY!;
  console.log('priceId:', priceId);

  const customer = await stripe.customers.create({ email: 'test_direct_99@test.com', name: 'Test' });
  console.log('customer:', customer.id);

  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });

  console.log('sub.status:', sub.status);
  console.log('latest_invoice type:', typeof sub.latest_invoice);
  const inv = sub.latest_invoice as any;
  console.log('invoice id:', inv?.id);
  console.log('payment_intent type:', typeof inv?.payment_intent);
  console.log('payment_intent id/obj:', typeof inv?.payment_intent === 'object'
    ? JSON.stringify(inv?.payment_intent)?.slice(0, 300)
    : inv?.payment_intent
  );
}

main().catch(console.error);
