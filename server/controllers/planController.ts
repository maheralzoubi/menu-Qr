import { Request, Response, NextFunction } from 'express';
import { Plan } from '../models/Plan';
import { stripe } from '../services/stripe';
import { env } from '../config/env';

// Fallback Price IDs from env vars — used when the Plan doc hasn't been seeded yet
const ENV_PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  starter:    { monthly: env.STRIPE_PRICE_STARTER_MONTHLY,    annual: env.STRIPE_PRICE_STARTER_ANNUAL },
  pro:        { monthly: env.STRIPE_PRICE_PRO_MONTHLY,        annual: env.STRIPE_PRICE_PRO_ANNUAL },
  enterprise: { monthly: env.STRIPE_PRICE_ENTERPRISE_MONTHLY, annual: env.STRIPE_PRICE_ENTERPRISE_ANNUAL },
};

// Retrieve the Stripe Product ID from an existing Price ID
async function getProductId(priceId: string): Promise<string | null> {
  if (!stripe) return null;
  try {
    const price = await stripe.prices.retrieve(priceId);
    return typeof price.product === 'string' ? price.product : (price.product as any).id;
  } catch {
    return null;
  }
}

// Create a new Stripe Price under the same Product and return its ID.
// Returns null if Stripe is not configured or the product can't be found.
async function createStripePrice(
  currentPriceId: string,
  newAmount: number,   // display amount (dollars/month)
  billing: 'monthly' | 'annual',
): Promise<string | null> {
  if (!stripe) return null;
  const productId = await getProductId(currentPriceId);
  if (!productId) return null;
  const unitAmount = billing === 'annual'
    ? Math.round(newAmount * 12 * 100)  // annual total in cents
    : Math.round(newAmount * 100);       // monthly in cents
  try {
    const newPrice = await stripe.prices.create({
      product:   productId,
      unit_amount: unitAmount,
      currency:  'usd',
      recurring: { interval: billing === 'annual' ? 'year' : 'month' },
      metadata:  { billing },
    });
    return newPrice.id;
  } catch (e) {
    console.error('Failed to create Stripe price:', e);
    return null;
  }
}

// Public — returns all active plans ordered by sortOrder
export const getPublicPlans = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await Plan.find({ active: true }).sort({ sortOrder: 1 });
    res.json(plans);
  } catch (e) { next(e); }
};

// Superadmin — returns ALL plans (including inactive) for management
export const getAdminPlans = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await Plan.find().sort({ sortOrder: 1 });
    res.json(plans);
  } catch (e) { next(e); }
};

// Superadmin — update plan fields by key.
// When monthlyPrice or annualPrice changes, a new Stripe Price is created under
// the same Product so new subscribers are charged the updated amount.
export const updatePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { name, description, monthlyPrice, annualPrice, restaurantLimit, features, popular, active } = req.body;

    const current = await Plan.findOne({ key });
    if (!current) { res.status(404).json({ message: 'Plan not found' }); return; }

    const update: Record<string, unknown> = {};
    if (name            !== undefined) update.name            = name;
    if (description     !== undefined) update.description     = description;
    if (restaurantLimit !== undefined) update.restaurantLimit = Number(restaurantLimit);
    if (features        !== undefined) update.features        = features;
    if (popular         !== undefined) update.popular         = Boolean(popular);
    if (active          !== undefined) update.active          = Boolean(active);

    // ── Monthly price changed ────────────────────────────────────────────────
    if (monthlyPrice !== undefined) {
      const newMonthly = Number(monthlyPrice);
      update.monthlyPrice = newMonthly;

      if (newMonthly !== current.monthlyPrice) {
        const existingPriceId =
          current.stripePriceIdMonthly || ENV_PRICE_IDS[key]?.monthly;

        if (existingPriceId) {
          const newPriceId = await createStripePrice(existingPriceId, newMonthly, 'monthly');
          if (newPriceId) update.stripePriceIdMonthly = newPriceId;
        }
      }
    }

    // ── Annual price changed ─────────────────────────────────────────────────
    if (annualPrice !== undefined) {
      const newAnnual = Number(annualPrice);
      update.annualPrice = newAnnual;

      if (newAnnual !== current.annualPrice) {
        const existingPriceId =
          current.stripePriceIdAnnual || ENV_PRICE_IDS[key]?.annual;

        if (existingPriceId) {
          const newPriceId = await createStripePrice(existingPriceId, newAnnual, 'annual');
          if (newPriceId) update.stripePriceIdAnnual = newPriceId;
        }
      }
    }

    const plan = await Plan.findOneAndUpdate({ key }, update, { new: true, runValidators: true });
    res.json(plan);
  } catch (e) { next(e); }
};
