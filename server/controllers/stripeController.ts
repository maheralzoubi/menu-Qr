import { Request, Response, NextFunction } from 'express';
import type Stripe from 'stripe';
import { stripe, PRICE_IDS } from '../services/stripe.js';
import { User } from '../models/User.js';
import { Plan } from '../models/Plan.js';
import { env } from '../config/env.js';

export const createIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!stripe) {
      res.status(503).json({ message: 'Stripe is not configured on this server.' });
      return;
    }

    const { plan, billing, name, email, restaurantName } = req.body as Record<string, string>;

    if (!plan || !billing || !name?.trim() || !email?.trim() || !restaurantName?.trim()) {
      res.status(400).json({ message: 'All fields are required.' });
      return;
    }

    const validPlans = ['starter', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      res.status(400).json({ message: 'Invalid plan.' });
      return;
    }

    // Prefer the live Price ID stored in the Plan document (updated whenever the admin
    // changes the price). Fall back to the env-var Price ID for backwards compatibility.
    const planDoc = await Plan.findOne({ key: plan }).select('stripePriceIdMonthly stripePriceIdAnnual');
    const priceId =
      (billing === 'monthly'
        ? planDoc?.stripePriceIdMonthly
        : planDoc?.stripePriceIdAnnual)
      || PRICE_IDS[plan]?.[billing];

    if (!priceId) {
      res.status(400).json({ message: `Stripe price not configured for ${plan}/${billing}.` });
      return;
    }

    // Reject if email is already a registered user
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    // Reuse existing Stripe customer if present (handles retries)
    const existingCustomers = await stripe.customers.list({ email: email.toLowerCase().trim(), limit: 1 });
    let customer: Stripe.Customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email.toLowerCase().trim(),
        name: name.trim(),
        metadata: { restaurantName: restaurantName.trim(), plan, billing },
      });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice'],
    });

    // Stripe API ≥2026: invoice no longer exposes payment_intent directly.
    // The PaymentIntent is linked to the invoice via payment_details.order_reference.
    let clientSecret: string | null = null;

    const rawInvoice = subscription.latest_invoice;
    const invoiceId: string | null =
      typeof rawInvoice === 'object' && rawInvoice !== null
        ? (rawInvoice as any).id
        : typeof rawInvoice === 'string'
        ? rawInvoice
        : null;

    if (invoiceId) {
      const pis = await stripe.paymentIntents.list({ customer: customer.id, limit: 10 });
      const pi = pis.data.find(p => (p as any).payment_details?.order_reference === invoiceId);
      if (pi) clientSecret = pi.client_secret ?? null;
    }

    if (!clientSecret) {
      res.status(500).json({ message: 'Failed to initialise payment. Please try again.' });
      return;
    }

    res.json({
      clientSecret,
      subscriptionId: subscription.id,
      customerId:     customer.id,
    });
  } catch (e) { next(e); }
};

export const webhook = async (req: Request, res: Response) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) { res.sendStatus(400); return; }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      req.headers['stripe-signature'] as string,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (e: any) {
    console.error('Webhook signature error:', e.message);
    res.status(400).send(`Webhook Error: ${e.message}`);
    return;
  }

  switch (event.type) {
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await User.findOneAndUpdate({ stripeSubscriptionId: sub.id }, { planStatus: 'canceled' }).catch(console.error);
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      await User.findOneAndUpdate({ stripeCustomerId: inv.customer as string }, { planStatus: 'past_due' }).catch(console.error);
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const statusMap: Record<string, string> = {
        active: 'active', trialing: 'trialing', past_due: 'past_due', canceled: 'canceled',
      };
      const planStatus = statusMap[sub.status];
      if (planStatus) {
        await User.findOneAndUpdate({ stripeSubscriptionId: sub.id }, { planStatus }).catch(console.error);
      }
      break;
    }
  }

  res.sendStatus(200);
};
