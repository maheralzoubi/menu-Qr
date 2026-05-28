import '../config/env';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Plan } from '../models/Plan';
import { env } from '../config/env';

// Stripe Price IDs from env vars — used to seed the Plan docs on first run
const ENV_PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  starter:    { monthly: env.STRIPE_PRICE_STARTER_MONTHLY,    annual: env.STRIPE_PRICE_STARTER_ANNUAL },
  pro:        { monthly: env.STRIPE_PRICE_PRO_MONTHLY,        annual: env.STRIPE_PRICE_PRO_ANNUAL },
  enterprise: { monthly: env.STRIPE_PRICE_ENTERPRISE_MONTHLY, annual: env.STRIPE_PRICE_ENTERPRISE_ANNUAL },
};

const DEFAULT_PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'Perfect for single-location restaurants.',
    monthlyPrice: 29,
    annualPrice: 23,
    restaurantLimit: 1,
    features: ['1 restaurant', '500 orders / month', 'QR code menus', 'Basic analytics', 'Email support'],
    popular: false,
    active: true,
    sortOrder: 1,
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'For growing brands with multiple locations.',
    monthlyPrice: 79,
    annualPrice: 63,
    restaurantLimit: 5,
    features: ['Up to 5 restaurants', 'Unlimited orders', 'Advanced analytics', 'Custom branding', 'Promo codes', 'Reservations module', 'Priority support'],
    popular: true,
    active: true,
    sortOrder: 2,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited scale for enterprise food groups.',
    monthlyPrice: 199,
    annualPrice: 159,
    restaurantLimit: -1,
    features: ['Unlimited restaurants', 'Everything in Pro', 'White-label option', 'Custom integrations', 'Dedicated account manager', '99.9% SLA guarantee'],
    popular: false,
    active: true,
    sortOrder: 3,
  },
];

export async function runSeed() {
  // Create superadmin (app owner)
  const existingOwner = await User.findOne({ email: 'superadmin@app.com' });
  if (!existingOwner) {
    await User.create({ email: 'superadmin@app.com', password: 'superadmin123', role: 'superadmin', name: 'App Owner' });
    console.log('Created: superadmin@app.com / superadmin123');
  }

  // Seed default plans (upsert so edits are not overwritten)
  for (const p of DEFAULT_PLANS) {
    await Plan.findOneAndUpdate({ key: p.key }, { $setOnInsert: p }, { upsert: true });
  }
  // Backfill Stripe Price IDs from env vars for any plan that doesn't have them yet
  for (const [key, ids] of Object.entries(ENV_PRICE_IDS)) {
    if (ids.monthly || ids.annual) {
      await Plan.updateOne(
        { key, stripePriceIdMonthly: { $exists: false } },
        { $set: { ...(ids.monthly ? { stripePriceIdMonthly: ids.monthly } : {}), ...(ids.annual ? { stripePriceIdAnnual: ids.annual } : {}) } }
      );
    }
  }

  // Create demo restaurant + admin if none exist
  const restaurantCount = await Restaurant.countDocuments();
  if (restaurantCount === 0) {
    const existingAdmin = await User.findOne({ email: 'admin@restaurant.com' });
    if (!existingAdmin) {
      const restaurant = await Restaurant.create({
        name: 'Demo Restaurant',
        contactEmail: 'admin@restaurant.com',
        status: 'active',
        adminId: '000000000000000000000000',
      });
      const admin = await User.create({
        email: 'admin@restaurant.com',
        password: 'admin123',
        role: 'admin',
        name: 'Restaurant Admin',
        restaurantId: restaurant._id,
      });
      restaurant.adminId = admin._id as any;
      await restaurant.save();
      console.log('Demo restaurant created: admin@restaurant.com / admin123');
    }
  }
}

// Allow running directly: tsx server/scripts/seed.ts
if (process.argv[1]?.endsWith('seed.ts')) {
  import('mongoose').then(({ default: mongoose }) =>
    import('../config/env').then(({ env }) =>
      mongoose.connect(env.MONGODB_URI).then(runSeed).then(() => mongoose.disconnect())
    )
  ).catch(console.error);
}
