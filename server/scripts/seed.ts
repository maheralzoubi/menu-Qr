import '../config/env';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Plan } from '../models/Plan';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { env } from '../config/env';

const FAKE_CATEGORIES = [
  { name: 'Starters',  description: 'Light bites and appetizers to kick off your meal' },
  { name: 'Mains',     description: 'Hearty main courses crafted with fresh ingredients' },
  { name: 'Burgers',   description: 'Juicy handcrafted burgers stacked high' },
  { name: 'Pizza',     description: 'Stone-baked pizzas with house-made tomato sauce' },
  { name: 'Pasta',     description: 'Classic Italian pasta dishes made fresh daily' },
  { name: 'Salads',    description: 'Crisp seasonal salads and grain bowls' },
  { name: 'Desserts',  description: 'Sweet endings to your perfect meal' },
  { name: 'Drinks',    description: 'Refreshing beverages, cocktails and mocktails' },
];

const FAKE_MENU_ITEMS = [
  // Starters
  { name: 'Bruschetta al Pomodoro', category: 'Starters', price: 8.50, image: 'https://picsum.photos/seed/bruschetta/400/300', description: 'Toasted sourdough topped with fresh tomato, basil and olive oil', ingredients: ['sourdough bread', 'cherry tomatoes', 'fresh basil', 'garlic', 'extra virgin olive oil'], allergens: ['gluten'], featured: false },
  { name: 'Crispy Calamari', category: 'Starters', price: 12.00, image: 'https://picsum.photos/seed/calamari/400/300', description: 'Golden fried squid rings with lemon aioli', ingredients: ['squid', 'flour', 'lemon', 'aioli', 'parsley'], allergens: ['gluten', 'eggs', 'fish'], featured: false },
  { name: 'Soup of the Day', category: 'Starters', price: 7.00, image: 'https://picsum.photos/seed/soup/400/300', description: 'Ask your server for today\'s freshly made soup', ingredients: ['seasonal vegetables', 'stock', 'herbs'], allergens: [], featured: false },
  // Mains
  { name: 'Grilled Salmon', category: 'Mains', price: 22.00, image: 'https://picsum.photos/seed/salmon/400/300', description: 'Atlantic salmon fillet with roasted vegetables and lemon butter sauce', ingredients: ['salmon', 'asparagus', 'cherry tomatoes', 'butter', 'lemon'], allergens: ['fish', 'dairy'], featured: true },
  { name: 'Chicken Parmigiana', category: 'Mains', price: 18.50, image: 'https://picsum.photos/seed/chickenparm/400/300', description: 'Crumbed chicken breast, napoli sauce, mozzarella, served with fries', ingredients: ['chicken breast', 'breadcrumbs', 'mozzarella', 'tomato sauce', 'fries'], allergens: ['gluten', 'dairy', 'eggs'], featured: true },
  { name: 'Beef Tenderloin', category: 'Mains', price: 34.00, image: 'https://picsum.photos/seed/tenderloin/400/300', description: '200g tenderloin with truffle mash and red wine jus', ingredients: ['beef tenderloin', 'potatoes', 'truffle oil', 'red wine', 'shallots'], allergens: ['dairy', 'sulphites'], featured: true },
  // Burgers
  { name: 'Classic Smash Burger', category: 'Burgers', price: 15.00, image: 'https://picsum.photos/seed/smashburger/400/300', description: 'Double smash patty, American cheese, pickles, special sauce', ingredients: ['beef patty', 'brioche bun', 'American cheese', 'pickles', 'lettuce', 'special sauce'], allergens: ['gluten', 'dairy', 'eggs', 'sesame'], featured: true },
  { name: 'BBQ Bacon Burger', category: 'Burgers', price: 17.50, image: 'https://picsum.photos/seed/bbqburger/400/300', description: 'Beef patty, crispy bacon, cheddar, onion rings, BBQ sauce', ingredients: ['beef patty', 'brioche bun', 'bacon', 'cheddar', 'onion rings', 'BBQ sauce'], allergens: ['gluten', 'dairy', 'eggs'], featured: false },
  { name: 'Mushroom Swiss Burger', category: 'Burgers', price: 16.00, image: 'https://picsum.photos/seed/mushroomburger/400/300', description: 'Beef patty, sautéed mushrooms, Swiss cheese, garlic aioli', ingredients: ['beef patty', 'brioche bun', 'mushrooms', 'Swiss cheese', 'garlic aioli'], allergens: ['gluten', 'dairy', 'eggs'], featured: false },
  // Pizza
  { name: 'Margherita', category: 'Pizza', price: 14.00, image: 'https://picsum.photos/seed/margherita/400/300', description: 'San Marzano tomato, fresh mozzarella, basil, olive oil', ingredients: ['pizza dough', 'San Marzano tomato', 'fresh mozzarella', 'basil'], allergens: ['gluten', 'dairy'], featured: false },
  { name: 'Diavola', category: 'Pizza', price: 16.00, image: 'https://picsum.photos/seed/diavola/400/300', description: 'Spicy salami, mozzarella, chilli flakes, tomato base', ingredients: ['pizza dough', 'tomato sauce', 'mozzarella', 'salami', 'chilli flakes'], allergens: ['gluten', 'dairy'], featured: true },
  { name: 'Quattro Formaggi', category: 'Pizza', price: 17.00, image: 'https://picsum.photos/seed/formaggi/400/300', description: 'Mozzarella, gorgonzola, brie, parmesan on white base', ingredients: ['pizza dough', 'mozzarella', 'gorgonzola', 'brie', 'parmesan'], allergens: ['gluten', 'dairy'], featured: false },
  // Pasta
  { name: 'Spaghetti Carbonara', category: 'Pasta', price: 15.50, image: 'https://picsum.photos/seed/carbonara/400/300', description: 'Guanciale, egg yolk, pecorino, black pepper — the real deal', ingredients: ['spaghetti', 'guanciale', 'egg yolks', 'pecorino romano', 'black pepper'], allergens: ['gluten', 'eggs', 'dairy'], featured: true },
  { name: 'Penne Arrabbiata', category: 'Pasta', price: 13.00, image: 'https://picsum.photos/seed/arrabbiata/400/300', description: 'Spicy tomato sauce, garlic, chilli, fresh parsley', ingredients: ['penne', 'tomato', 'garlic', 'chilli', 'parsley'], allergens: ['gluten'], featured: false },
  { name: 'Tagliatelle al Ragù', category: 'Pasta', price: 17.00, image: 'https://picsum.photos/seed/ragu/400/300', description: 'Slow-cooked beef and pork ragù, fresh egg tagliatelle', ingredients: ['tagliatelle', 'beef mince', 'pork mince', 'tomato', 'carrot', 'celery', 'wine'], allergens: ['gluten', 'eggs', 'sulphites'], featured: false },
  // Salads
  { name: 'Caesar Salad', category: 'Salads', price: 12.00, image: 'https://picsum.photos/seed/caesar/400/300', description: 'Cos lettuce, parmesan shards, house croutons, Caesar dressing', ingredients: ['cos lettuce', 'parmesan', 'croutons', 'Caesar dressing', 'anchovies'], allergens: ['gluten', 'dairy', 'eggs', 'fish'], featured: false },
  { name: 'Greek Salad', category: 'Salads', price: 11.00, image: 'https://picsum.photos/seed/greeksalad/400/300', description: 'Tomato, cucumber, kalamata olives, red onion, feta', ingredients: ['tomatoes', 'cucumber', 'olives', 'red onion', 'feta', 'oregano'], allergens: ['dairy'], featured: false },
  { name: 'Quinoa Power Bowl', category: 'Salads', price: 14.00, image: 'https://picsum.photos/seed/quinoa/400/300', description: 'Tri-colour quinoa, roasted sweet potato, kale, tahini dressing', ingredients: ['quinoa', 'sweet potato', 'kale', 'chickpeas', 'tahini', 'lemon'], allergens: ['sesame'], featured: false },
  // Desserts
  { name: 'Tiramisu', category: 'Desserts', price: 9.00, image: 'https://picsum.photos/seed/tiramisu/400/300', description: 'Classic Italian dessert with mascarpone, espresso, ladyfingers', ingredients: ['mascarpone', 'ladyfingers', 'espresso', 'egg yolks', 'cocoa'], allergens: ['gluten', 'dairy', 'eggs'], featured: true },
  { name: 'Chocolate Lava Cake', category: 'Desserts', price: 10.00, image: 'https://picsum.photos/seed/lavacake/400/300', description: 'Warm chocolate cake with molten centre, vanilla ice cream', ingredients: ['dark chocolate', 'butter', 'eggs', 'flour', 'vanilla ice cream'], allergens: ['gluten', 'dairy', 'eggs'], featured: true },
  { name: 'Panna Cotta', category: 'Desserts', price: 8.00, image: 'https://picsum.photos/seed/pannacotta/400/300', description: 'Vanilla panna cotta with mixed berry coulis', ingredients: ['cream', 'vanilla', 'gelatin', 'mixed berries', 'sugar'], allergens: ['dairy'], featured: false },
  // Drinks
  { name: 'Fresh Orange Juice', category: 'Drinks', price: 5.00, image: 'https://picsum.photos/seed/orangejuice/400/300', description: 'Freshly squeezed orange juice', ingredients: ['oranges'], allergens: [], featured: false },
  { name: 'House Lemonade', category: 'Drinks', price: 4.50, image: 'https://picsum.photos/seed/lemonade/400/300', description: 'Homemade lemonade with fresh mint', ingredients: ['lemon', 'sugar syrup', 'sparkling water', 'mint'], allergens: [], featured: false },
  { name: 'Espresso Martini', category: 'Drinks', price: 14.00, image: 'https://picsum.photos/seed/espressomartini/400/300', description: 'Vodka, espresso, coffee liqueur, vanilla — shaken cold', ingredients: ['vodka', 'espresso', 'Kahlúa', 'vanilla syrup'], allergens: [], featured: true },
];

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
    nameAr: 'مبتدئ',
    description: 'Perfect for single-location restaurants.',
    descriptionAr: 'مثالي للمطاعم ذات الفرع الواحد.',
    monthlyPrice: 29,
    annualPrice: 23,
    restaurantLimit: 1,
    features: ['1 restaurant', '500 orders / month', 'QR code menus', 'Basic analytics', 'Email support'],
    featuresAr: ['مطعم واحد', '500 طلب / شهر', 'قوائم رمز QR', 'تحليلات أساسية', 'دعم عبر البريد الإلكتروني'],
    popular: false,
    active: true,
    sortOrder: 1,
  },
  {
    key: 'pro',
    name: 'Pro',
    nameAr: 'احترافي',
    description: 'For growing brands with multiple locations.',
    descriptionAr: 'للعلامات التجارية المتنامية ذات المواقع المتعددة.',
    monthlyPrice: 79,
    annualPrice: 63,
    restaurantLimit: 5,
    features: ['Up to 5 restaurants', 'Unlimited orders', 'Advanced analytics', 'Custom branding', 'Promo codes', 'Reservations module', 'Priority support'],
    featuresAr: ['حتى 5 مطاعم', 'طلبات غير محدودة', 'تحليلات متقدمة', 'علامة تجارية مخصصة', 'رموز ترويجية', 'وحدة الحجوزات', 'دعم ذو أولوية'],
    popular: true,
    active: true,
    sortOrder: 2,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    nameAr: 'مؤسسي',
    description: 'Unlimited scale for enterprise food groups.',
    descriptionAr: 'نطاق غير محدود لمجموعات الأغذية الكبرى.',
    monthlyPrice: 199,
    annualPrice: 159,
    restaurantLimit: -1,
    features: ['Unlimited restaurants', 'Everything in Pro', 'White-label option', 'Custom integrations', 'Dedicated account manager', '99.9% SLA guarantee'],
    featuresAr: ['مطاعم غير محدودة', 'كل مزايا الخطة الاحترافية', 'خيار العلامة البيضاء', 'تكاملات مخصصة', 'مدير حساب مخصص', 'ضمان 99.9% SLA'],
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
  // Backfill Arabic translations for plans created before nameAr/descriptionAr/featuresAr existed
  for (const p of DEFAULT_PLANS) {
    await Plan.updateOne(
      { key: p.key, nameAr: { $in: ['', null] } },
      { $set: { nameAr: p.nameAr, descriptionAr: p.descriptionAr, featuresAr: p.featuresAr } }
    );
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

  // Seed fake categories and menu items for the demo restaurant
  const demoRestaurant = await Restaurant.findOne({ contactEmail: 'admin@restaurant.com' });
  if (demoRestaurant) {
    const categoryCount = await Category.countDocuments({ restaurantId: demoRestaurant._id });
    if (categoryCount === 0) {
      await Category.insertMany(
        FAKE_CATEGORIES.map(c => ({ ...c, restaurantId: demoRestaurant._id }))
      );
      console.log(`Seeded ${FAKE_CATEGORIES.length} categories`);
    }

    const menuItemCount = await MenuItem.countDocuments({ restaurantId: demoRestaurant._id });
    if (menuItemCount === 0) {
      await MenuItem.insertMany(
        FAKE_MENU_ITEMS.map(item => ({ ...item, restaurantId: demoRestaurant._id }))
      );
      console.log(`Seeded ${FAKE_MENU_ITEMS.length} menu items`);
    } else {
      // Backfill images for existing items that have none
      for (const item of FAKE_MENU_ITEMS) {
        await MenuItem.updateOne(
          { restaurantId: demoRestaurant._id, name: item.name, image: '' },
          { $set: { image: item.image } }
        );
      }
      console.log('Backfilled images for existing menu items');
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
