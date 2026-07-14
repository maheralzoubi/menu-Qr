/**
 * Seed real menu categories and dishes for "al maher restaurant"
 * (admin: maherz1080@gmail.com). Run with: npx tsx server/scripts/seedAlMaherMenu.ts
 */
import '../config/env';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';

const CATEGORIES = [
  { name: 'Hot Coffee',      description: 'Freshly brewed espresso-based drinks' },
  { name: 'Cold Coffee',     description: 'Iced and blended coffee favorites' },
  { name: 'Burgers',         description: 'Handcrafted burgers, grilled to order' },
  { name: 'Sides',           description: 'Crispy sides to go with your meal' },
  { name: 'Desserts',        description: 'Sweet treats to finish your visit' },
  { name: 'Cold Beverages',  description: 'Refreshing non-coffee drinks' },
];

const MENU_ITEMS = [
  // ─── HOT COFFEE ────────────────────────────────────────────────────────────
  {
    name: 'Espresso',
    category: 'Hot Coffee',
    price: 2.50,
    description: 'Rich double shot of espresso',
    longDescription: 'A concentrated double shot pulled from freshly ground beans, with a thick golden crema.',
    ingredients: ['Espresso beans'],
    allergens: [],
    image: '/uploads/menu-iced-coffee.jpg',
    featured: false,
  },
  {
    name: 'Cappuccino',
    category: 'Hot Coffee',
    price: 3.50,
    description: 'Espresso with steamed milk and a thick layer of foam',
    longDescription: 'Equal parts espresso, steamed milk and velvety milk foam, dusted with cocoa powder.',
    ingredients: ['Espresso', 'Milk'],
    allergens: ['Dairy'],
    image: '/uploads/menu-iced-coffee.jpg',
    featured: true,
  },
  {
    name: 'Caffe Latte',
    category: 'Hot Coffee',
    price: 3.75,
    description: 'Smooth espresso with steamed milk and light foam',
    longDescription: 'A mellow blend of espresso and generously steamed milk, finished with a thin layer of foam.',
    ingredients: ['Espresso', 'Milk'],
    allergens: ['Dairy'],
    image: '/uploads/menu-iced-coffee.jpg',
    featured: false,
  },
  {
    name: 'Americano',
    category: 'Hot Coffee',
    price: 3.00,
    description: 'Espresso lengthened with hot water',
    longDescription: 'A double espresso shot topped with hot water for a lighter, black-coffee style cup.',
    ingredients: ['Espresso', 'Hot water'],
    allergens: [],
    image: '/uploads/menu-iced-coffee.jpg',
    featured: false,
  },
  {
    name: 'Arabic Coffee',
    category: 'Hot Coffee',
    price: 3.25,
    description: 'Traditional lightly-roasted coffee with cardamom',
    longDescription: 'Classic Levantine-style coffee brewed with cardamom, served in a small cup — a house specialty.',
    ingredients: ['Arabic coffee beans', 'Cardamom'],
    allergens: [],
    image: '/uploads/menu-iced-coffee.jpg',
    featured: true,
  },
  {
    name: 'Turkish Coffee',
    category: 'Hot Coffee',
    price: 3.25,
    description: 'Unfiltered coffee slow-brewed in a copper pot',
    longDescription: 'Finely ground coffee slow-simmered in a traditional copper cezve, served with the grounds settled at the bottom.',
    ingredients: ['Turkish coffee grounds'],
    allergens: [],
    image: '/uploads/menu-iced-coffee.jpg',
    featured: false,
  },

  // ─── COLD COFFEE ───────────────────────────────────────────────────────────
  {
    name: 'Iced Latte',
    category: 'Cold Coffee',
    price: 4.00,
    description: 'Espresso and cold milk over ice',
    longDescription: 'Chilled espresso poured over cold milk and ice for a smooth, refreshing pick-me-up.',
    ingredients: ['Espresso', 'Milk', 'Ice'],
    allergens: ['Dairy'],
    image: '/uploads/menu-iced-coffee.jpg',
    featured: true,
  },
  {
    name: 'Cold Brew',
    category: 'Cold Coffee',
    price: 4.25,
    description: '18-hour steeped cold brew, smooth and low-acid',
    longDescription: 'Slow-steeped for 18 hours and served over ice for a naturally sweet, smooth coffee concentrate.',
    ingredients: ['Cold brew coffee', 'Ice'],
    allergens: [],
    image: '/uploads/menu-iced-coffee.jpg',
    featured: false,
  },
  {
    name: 'Caramel Frappe',
    category: 'Cold Coffee',
    price: 4.75,
    description: 'Blended iced coffee with caramel and whipped cream',
    longDescription: 'Espresso blended with milk, ice and caramel syrup, topped with whipped cream and a caramel drizzle.',
    ingredients: ['Espresso', 'Milk', 'Ice', 'Caramel syrup', 'Whipped cream'],
    allergens: ['Dairy'],
    image: '/uploads/menu-smoothie.jpg',
    featured: true,
  },
  {
    name: 'Spanish Latte',
    category: 'Cold Coffee',
    price: 4.50,
    description: 'Iced espresso with condensed milk',
    longDescription: 'Espresso poured over ice and sweetened condensed milk, stirred for a rich, creamy finish.',
    ingredients: ['Espresso', 'Condensed milk', 'Milk', 'Ice'],
    allergens: ['Dairy'],
    image: '/uploads/menu-iced-coffee.jpg',
    featured: false,
  },

  // ─── BURGERS ───────────────────────────────────────────────────────────────
  {
    name: 'Classic Cheeseburger',
    category: 'Burgers',
    price: 7.50,
    description: 'Beef patty, cheddar, lettuce, tomato and house sauce',
    longDescription: 'A grilled beef patty topped with melted cheddar, lettuce, tomato, pickles and house sauce on a toasted bun. Served with fries.',
    ingredients: ['Beef patty', 'Cheddar cheese', 'Bun', 'Lettuce', 'Tomato', 'Pickles', 'House sauce'],
    allergens: ['Gluten', 'Dairy'],
    image: '/uploads/menu-cheeseburger.jpg',
    featured: true,
  },
  {
    name: 'Double Smash Burger',
    category: 'Burgers',
    price: 9.50,
    description: 'Two smashed beef patties with American cheese and pickles',
    longDescription: 'Two thin, crisp-edged smashed beef patties layered with melted American cheese, pickles and special sauce on a brioche bun.',
    ingredients: ['Beef patty', 'American cheese', 'Brioche bun', 'Pickles', 'Special sauce'],
    allergens: ['Gluten', 'Dairy'],
    image: '/uploads/menu-cheeseburger.jpg',
    featured: true,
  },
  {
    name: 'BBQ Bacon Burger',
    category: 'Burgers',
    price: 10.50,
    description: 'Beef patty, smoked bacon, BBQ sauce and crispy onions',
    longDescription: 'A juicy beef patty topped with smoked bacon, melted cheese, BBQ sauce and crispy fried onions.',
    ingredients: ['Beef patty', 'Bacon', 'Cheese', 'BBQ sauce', 'Crispy onions', 'Bun'],
    allergens: ['Gluten', 'Dairy'],
    image: '/uploads/menu-bbq-burger.jpg',
    featured: false,
  },
  {
    name: 'Mushroom Swiss Burger',
    category: 'Burgers',
    price: 9.75,
    description: 'Beef patty with sautéed mushrooms and Swiss cheese',
    longDescription: 'A grilled beef patty topped with sautéed mushrooms, melted Swiss cheese and garlic aioli.',
    ingredients: ['Beef patty', 'Mushrooms', 'Swiss cheese', 'Garlic aioli', 'Bun'],
    allergens: ['Gluten', 'Dairy'],
    image: '/uploads/menu-cheeseburger.jpg',
    featured: false,
  },
  {
    name: 'Spicy Chicken Burger',
    category: 'Burgers',
    price: 8.50,
    description: 'Crispy fried chicken with spicy mayo and pickles',
    longDescription: 'A crispy fried chicken thigh fillet tossed in hot sauce, served with spicy mayo, lettuce and pickles.',
    ingredients: ['Chicken thigh', 'Hot sauce', 'Spicy mayo', 'Lettuce', 'Pickles', 'Bun'],
    allergens: ['Gluten', 'Egg'],
    image: '/uploads/menu-chicken-sandwich.jpg',
    featured: false,
  },
  {
    name: 'Veggie Burger',
    category: 'Burgers',
    price: 7.75,
    description: 'Grilled vegetable and chickpea patty with tahini sauce',
    longDescription: 'A house-made chickpea and vegetable patty, grilled and topped with lettuce, tomato and tahini sauce.',
    ingredients: ['Chickpeas', 'Mixed vegetables', 'Tahini sauce', 'Lettuce', 'Tomato', 'Bun'],
    allergens: ['Gluten', 'Sesame'],
    image: '/uploads/menu-cheeseburger.jpg',
    featured: false,
  },

  // ─── SIDES ─────────────────────────────────────────────────────────────────
  {
    name: 'French Fries',
    category: 'Sides',
    price: 3.00,
    description: 'Crispy golden fries with sea salt',
    longDescription: 'Classic hand-cut potato fries, fried until golden and crisp, seasoned with sea salt.',
    ingredients: ['Potatoes', 'Sea salt'],
    allergens: [],
    image: '/uploads/menu-spinach-dip.jpg',
    featured: false,
  },
  {
    name: 'Onion Rings',
    category: 'Sides',
    price: 4.00,
    description: 'Beer-battered onion rings with dipping sauce',
    longDescription: 'Thick-cut onion rings in a crispy beer batter, served with house dipping sauce.',
    ingredients: ['Onions', 'Beer batter', 'Flour'],
    allergens: ['Gluten'],
    image: '/uploads/menu-spinach-dip.jpg',
    featured: false,
  },
  {
    name: 'Sweet Potato Fries',
    category: 'Sides',
    price: 4.00,
    description: 'Crispy sweet potato fries with chipotle mayo',
    longDescription: 'Lightly spiced sweet potato fries, fried crisp and served with smoky chipotle mayo.',
    ingredients: ['Sweet potatoes', 'Chipotle mayo'],
    allergens: ['Egg'],
    image: '/uploads/menu-spinach-dip.jpg',
    featured: false,
  },
  {
    name: 'Mozzarella Sticks',
    category: 'Sides',
    price: 4.50,
    description: 'Breaded mozzarella sticks with marinara dip',
    longDescription: 'Golden fried mozzarella sticks with a molten center, served with warm marinara sauce.',
    ingredients: ['Mozzarella', 'Breadcrumbs', 'Marinara sauce'],
    allergens: ['Gluten', 'Dairy'],
    image: '/uploads/menu-spinach-dip.jpg',
    featured: false,
  },

  // ─── DESSERTS ──────────────────────────────────────────────────────────────
  {
    name: 'Chocolate Lava Cake',
    category: 'Desserts',
    price: 5.50,
    description: 'Warm chocolate cake with a molten center',
    longDescription: 'A warm chocolate fondant with a molten dark chocolate center, served with a scoop of vanilla ice cream.',
    ingredients: ['Dark chocolate', 'Butter', 'Eggs', 'Flour', 'Vanilla ice cream'],
    allergens: ['Gluten', 'Dairy', 'Egg'],
    image: '/uploads/menu-lava-cake.jpg',
    featured: true,
  },
  {
    name: 'New York Cheesecake',
    category: 'Desserts',
    price: 5.00,
    description: 'Classic baked cheesecake with berry coulis',
    longDescription: 'A dense, creamy baked cheesecake on a graham cracker crust, served with mixed berry coulis.',
    ingredients: ['Cream cheese', 'Graham crackers', 'Eggs', 'Mixed berries'],
    allergens: ['Gluten', 'Dairy', 'Egg'],
    image: '/uploads/menu-cheesecake.jpg',
    featured: false,
  },
  {
    name: 'Brownie & Ice Cream',
    category: 'Desserts',
    price: 4.75,
    description: 'Warm fudge brownie with vanilla ice cream',
    longDescription: 'A rich, fudgy chocolate brownie served warm with a scoop of vanilla ice cream and chocolate drizzle.',
    ingredients: ['Chocolate', 'Butter', 'Eggs', 'Flour', 'Vanilla ice cream'],
    allergens: ['Gluten', 'Dairy', 'Egg'],
    image: '/uploads/menu-tiramisu.jpg',
    featured: false,
  },

  // ─── COLD BEVERAGES ────────────────────────────────────────────────────────
  {
    name: 'Fresh Lemonade',
    category: 'Cold Beverages',
    price: 2.75,
    description: 'House-made lemonade with fresh mint',
    longDescription: 'Freshly squeezed lemons over ice with a touch of cane sugar and fresh mint leaves.',
    ingredients: ['Lemon juice', 'Cane sugar', 'Mint'],
    allergens: [],
    image: '/uploads/menu-lemonade.jpg',
    featured: false,
  },
  {
    name: 'Mango Smoothie',
    category: 'Cold Beverages',
    price: 4.00,
    description: 'Blended mango smoothie',
    longDescription: 'Ripe mango blended smooth with ice and a touch of milk for a thick, refreshing smoothie.',
    ingredients: ['Mango', 'Milk', 'Ice'],
    allergens: ['Dairy'],
    image: '/uploads/menu-smoothie.jpg',
    featured: false,
  },
  {
    name: 'Sparkling Water',
    category: 'Cold Beverages',
    price: 2.00,
    description: 'Chilled sparkling mineral water',
    longDescription: 'Naturally sparkling mineral water served chilled with a lemon wedge.',
    ingredients: ['Sparkling mineral water'],
    allergens: [],
    image: '/uploads/menu-sparkling-water.jpg',
    featured: false,
  },
  {
    name: 'Soft Drinks',
    category: 'Cold Beverages',
    price: 2.00,
    description: 'Cola, lemon-lime or orange soda',
    longDescription: 'Choice of chilled cola, lemon-lime soda or orange soda, served over ice.',
    ingredients: ['Carbonated soft drink'],
    allergens: [],
    image: '/uploads/menu-sparkling-water.jpg',
    featured: false,
  },
];

async function seedAlMaherMenu() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne({ email: 'maherz1080@gmail.com' });
  if (!user || !user.restaurantId) {
    console.error('User/restaurant not found for maherz1080@gmail.com');
    await mongoose.disconnect();
    process.exit(1);
  }

  const restaurantId = user.restaurantId;
  console.log(`Seeding menu for restaurantId: ${restaurantId}`);

  const categoryDocs = await Category.insertMany(
    CATEGORIES.map((c) => ({ ...c, restaurantId }))
  );
  console.log(`Created ${categoryDocs.length} categories`);

  const itemDocs = await MenuItem.insertMany(
    MENU_ITEMS.map((item) => ({ ...item, restaurantId }))
  );
  console.log(`Created ${itemDocs.length} menu items`);

  console.log('\nSummary:');
  for (const cat of categoryDocs) {
    const count = itemDocs.filter((i) => i.category === cat.name).length;
    console.log(`  ${cat.name}: ${count} items`);
  }

  await mongoose.disconnect();
}

seedAlMaherMenu().catch((err) => {
  console.error(err);
  process.exit(1);
});
