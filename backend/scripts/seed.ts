import '../config/env';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';

async function seed() {
  await mongoose.connect(env.MONGODB_URI);

  const existing = await User.findOne({ email: 'superadmin@app.com' });
  if (existing) {
    console.log('Superadmin already exists: superadmin@app.com');
  } else {
    await User.create({
      email: 'superadmin@app.com',
      password: 'superadmin123',
      role: 'superadmin',
      name: 'App Owner',
    });
    console.log('Superadmin created: superadmin@app.com / superadmin123');
  }

  await mongoose.disconnect();
}

seed().catch(console.error);
