import '../config/env';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';

export async function runSeed() {
  // Create superadmin (app owner)
  const existingOwner = await User.findOne({ email: 'superadmin@app.com' });
  if (!existingOwner) {
    await User.create({ email: 'superadmin@app.com', password: 'superadmin123', role: 'superadmin', name: 'App Owner' });
    console.log('Created: superadmin@app.com / superadmin123');
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
