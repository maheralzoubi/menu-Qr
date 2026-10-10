/**
 * Demo vendors for Menu Go — eight fictional restaurants in Amman with full menus,
 * reviews and dine-in tables. Names are invented (not real businesses); addresses use
 * real Amman streets/areas; phone numbers use the unassigned 06-000 exchange.
 *
 *   npm run seed:demo            add any demo vendor that doesn't exist yet
 *   npm run seed:demo -- --reset remove every demo vendor (and its data) and recreate them
 *
 * Not part of the automatic `npm run seed` that runs on every deploy.
 * Every demo admin signs in at /admin with its email below and the password DEMO_PASSWORD.
 * Dish photos: TheMealDB / TheCocktailDB (free food & drink image library).
 */
import '../config/env';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { Review } from '../models/Review';
import { Table } from '../models/Table';

const DEMO_DOMAIN = 'menugo.demo';
const DEMO_PASSWORD = 'MenuGo@2026';

const PHOTO = {
  shawarma: 'https://www.themealdb.com/images/media/meals/hcg6l91763596970.jpg',
  shawarma_wrap: 'https://www.themealdb.com/images/media/meals/swo87v1763595282.jpg',
  shawarma_bread: 'https://www.themealdb.com/images/media/meals/i8l2fu1763742525.jpg',
  shawarma_plate: 'https://www.themealdb.com/images/media/meals/kcv6hj1598733479.jpg',
  falafel: 'https://www.themealdb.com/images/media/meals/u5e9qq1763795441.jpg',
  falafel_pita: 'https://www.themealdb.com/images/media/meals/ae6clc1760524712.jpg',
  hummus: 'https://www.themealdb.com/images/media/meals/gpon5u1763801180.jpg',
  poutine: 'https://www.themealdb.com/images/media/meals/uuyrrx1487327597.jpg',
  fries: 'https://www.themealdb.com/images/media/meals/j223gc1784579841.jpg',
  potatoes: 'https://www.themealdb.com/images/media/meals/1550441882.jpg',
  burger_big: 'https://www.themealdb.com/images/media/meals/urzj1d1587670726.jpg',
  burger_aussie: 'https://www.themealdb.com/images/media/meals/44bzep1761848278.jpg',
  burger_kofta: 'https://www.themealdb.com/images/media/meals/lgmnff1763789847.jpg',
  burger_halloumi: 'https://www.themealdb.com/images/media/meals/vdwloy1713225718.jpg',
  burger_lamb: 'https://www.themealdb.com/images/media/meals/k420tj1585565244.jpg',
  wings: 'https://www.themealdb.com/images/media/meals/feh9k21784665694.jpg',
  wings_cumin: 'https://www.themealdb.com/images/media/meals/4hzyvq1763792564.jpg',
  fried_chicken: 'https://www.themealdb.com/images/media/meals/40r49m1763197022.jpg',
  slaw: 'https://www.themealdb.com/images/media/meals/e2g2r21764367568.jpg',
  mac: 'https://www.themealdb.com/images/media/meals/qrqywr1503066605.jpg',
  pizza: 'https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg',
  carbonara: 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg',
  arrabbiata: 'https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg',
  lasagne: 'https://www.themealdb.com/images/media/meals/wtsvxx1511296896.jpg',
  alfredo: 'https://www.themealdb.com/images/media/meals/0jv5gx1661040802.jpg',
  bolognese: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
  tomato_salad: 'https://www.themealdb.com/images/media/meals/7whfgi1782678933.jpg',
  cheesecake: 'https://www.themealdb.com/images/media/meals/swttys1511385853.jpg',
  choc_souffle: 'https://www.themealdb.com/images/media/meals/twspvx1511784937.jpg',
  shakshuka: 'https://www.themealdb.com/images/media/meals/g373701551450225.jpg',
  pancakes: 'https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg',
  date_cake: 'https://www.themealdb.com/images/media/meals/towo9c1763814590.jpg',
  ful: 'https://www.themealdb.com/images/media/meals/lvn2d51598732465.jpg',
  flatbread: 'https://www.themealdb.com/images/media/meals/8825lo1763815264.jpg',
  syrian_bread: 'https://www.themealdb.com/images/media/meals/54xzk31760524666.jpg',
  quinoa_salad: 'https://www.themealdb.com/images/media/meals/k29viq1585565980.jpg',
  salmon_avocado: 'https://www.themealdb.com/images/media/meals/1549542994.jpg',
  teriyaki_salmon: 'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg',
  shopska: 'https://www.themealdb.com/images/media/meals/bqx8mc1782684286.jpg',
  pomegranate_salad: 'https://www.themealdb.com/images/media/meals/fqpqml1764359125.jpg',
  lamb_wrap: 'https://www.themealdb.com/images/media/meals/jyylmo1763790808.jpg',
  kunafa: 'https://www.themealdb.com/images/media/meals/yh3sg71763741307.jpg',
  baklava: 'https://www.themealdb.com/images/media/meals/ytme8t1764111401.jpg',
  pistachio_cake: 'https://www.themealdb.com/images/media/meals/xvgpng1764121726.jpg',
  ice_cream: 'https://www.themealdb.com/images/media/meals/1xscby1764790242.jpg',
  mandi: 'https://www.themealdb.com/images/media/meals/1nalo51765188375.jpg',
  lamb_tagine: 'https://www.themealdb.com/images/media/meals/yuwtuu1511295751.jpg',
  moussaka: 'https://www.themealdb.com/images/media/meals/ctg8jd1585563097.jpg',
  iced_coffee: 'https://www.thecocktaildb.com/images/media/drink/ytprxy1454513855.jpg',
  thai_coffee: 'https://www.thecocktaildb.com/images/media/drink/wquwxs1441247025.jpg',
  strawberry_lemonade: 'https://www.thecocktaildb.com/images/media/drink/spvvxp1468924425.jpg',
  banana_shake: 'https://www.thecocktaildb.com/images/media/drink/rtwwsx1472720307.jpg',
  fruit_shake: 'https://www.thecocktaildb.com/images/media/drink/q0fg2m1484430704.jpg',
  orangeade: 'https://www.thecocktaildb.com/images/media/drink/ytsxxw1441167732.jpg',
  mango_lassi: 'https://www.thecocktaildb.com/images/media/drink/1bw6sd1487603816.jpg',
  sweet_lassi: 'https://www.thecocktaildb.com/images/media/drink/9jeifz1487603885.jpg',
  kiwi_smoothie: 'https://www.thecocktaildb.com/images/media/drink/jogv4w1487603571.jpg',
  thai_iced_tea: 'https://www.thecocktaildb.com/images/media/drink/trvwpu1441245568.jpg',
  hot_choc: 'https://www.thecocktaildb.com/images/media/drink/u6jrdf1487603173.jpg',
  moonmint: 'https://www.thecocktaildb.com/images/media/drink/znald61487604035.jpg',
} as const;

type Photo = keyof typeof PHOTO;
interface Item {
  name: string; price: number; description: string; ingredients: string[]; allergens: string[];
  photo?: Photo; featured?: boolean; longDescription?: string;
}
interface Vendor {
  slug: string; name: string; admin: string; cuisine: string[]; address: string; phone: string;
  primaryColor: string; openTime: string; closeTime: string; prepTime: string; tables: number;
  menu: { category: string; description: string; items: Item[] }[];
  reviews: [name: string, rating: number, comment: string, date: string][];
}

const it = (name: string, price: number, description: string, ingredients: string[], allergens: string[] = [], photo?: Photo, featured = false): Item =>
  ({ name, price, description, ingredients, allergens, photo, featured });

const VENDORS: Vendor[] = [
  {
    slug: 'baitalshawarma', name: 'Bait Al Shawarma', admin: 'Rami Haddad',
    cuisine: ['Shawarma', 'Chicken'], address: 'Rainbow Street, Jabal Amman', phone: '+962 6 000 0101',
    primaryColor: '#C2410C', openTime: '00:00', closeTime: '23:59', prepTime: '10–15', tables: 8,
    menu: [
      { category: 'Shawarma', description: 'Slow-roasted on the spit, sliced to order', items: [
        it('Chicken Shawarma Sandwich', 2.25, 'Marinated chicken, toum, pickles and fries in saj bread', ['chicken', 'saj bread', 'garlic toum', 'pickles', 'fries'], ['gluten', 'eggs'], 'shawarma', true),
        it('Beef Shawarma Sandwich', 2.75, 'Spiced beef, tahini, parsley, tomato and onion', ['beef', 'tahini', 'parsley', 'tomato', 'onion', 'saj bread'], ['gluten', 'sesame'], 'shawarma_wrap'),
        it('Arabi Shawarma Meal', 4.50, 'Chicken shawarma cut into bites, fries, toum and pickles', ['chicken', 'saj bread', 'fries', 'garlic toum', 'pickles'], ['gluten', 'eggs'], 'shawarma_bread', true),
        it('Double Chicken Shawarma', 3.50, 'Twice the chicken, extra toum, toasted on the grill', ['chicken', 'saj bread', 'garlic toum', 'pickles'], ['gluten', 'eggs'], 'shawarma'),
      ]},
      { category: 'Plates', description: 'Served with rice or fries, salad and bread', items: [
        it('Chicken Shawarma Plate', 5.50, 'Sliced chicken over rice with garlic sauce and salad', ['chicken', 'rice', 'garlic toum', 'salad', 'bread'], ['gluten', 'eggs'], 'shawarma_plate'),
        it('Mixed Shawarma Plate', 6.75, 'Chicken and beef shawarma, tahini, toum, fries', ['chicken', 'beef', 'fries', 'tahini', 'garlic toum'], ['gluten', 'eggs', 'sesame'], 'shawarma_plate', true),
        it('Falafel Plate', 2.50, 'Six falafel, hummus, salad and pickled turnips', ['falafel', 'hummus', 'salad', 'pickles', 'bread'], ['gluten', 'sesame'], 'falafel'),
      ]},
      { category: 'Sides', description: 'To share, or not', items: [
        it('Hummus', 1.75, 'Creamy chickpeas, tahini, lemon and olive oil', ['chickpeas', 'tahini', 'lemon', 'olive oil'], ['sesame'], 'hummus'),
        it('Loaded Shawarma Fries', 2.75, 'Fries topped with chicken, cheese sauce and toum', ['fries', 'chicken', 'cheese sauce', 'garlic toum'], ['dairy', 'eggs'], 'poutine'),
        it('Fries', 1.25, 'Crispy, lightly salted', ['potatoes', 'salt'], [], 'fries'),
        it('Extra Toum', 0.35, 'House garlic sauce', ['garlic', 'oil', 'lemon', 'egg white'], ['eggs']),
      ]},
      { category: 'Drinks', description: 'Cold and fresh', items: [
        it('Lemon Mint', 1.75, 'Fresh lemon blended with mint and ice', ['lemon', 'mint', 'sugar', 'ice'], [], 'moonmint', true),
        it('Ayran', 0.75, 'Chilled salted yoghurt drink', ['yoghurt', 'water', 'salt'], ['dairy'], 'sweet_lassi'),
        it('Soft Drink', 0.60, 'Cola, orange or lemon soda', ['carbonated soft drink']),
      ]},
    ],
    reviews: [
      ['Omar Khalil', 5, 'Best chicken shawarma on Rainbow Street, the toum is unreal.', '2 days ago'],
      ['Lina Saleh', 4, 'Arabi meal is huge for the price. Gets busy after 10pm.', '1 week ago'],
      ['Yazan Odeh', 5, 'Fast pickup and still hot when I got home.', '3 weeks ago'],
      ['Dana Nasser', 4, 'Loaded fries are a must. Wish there were more seats.', '1 month ago'],
    ],
  },
  {
    slug: 'emberandbun', name: 'Ember & Bun', admin: 'Karim Mansour',
    cuisine: ['Burgers'], address: 'Wakalat Street, Sweifieh', phone: '+962 6 000 0102',
    primaryColor: '#B45309', openTime: '12:00', closeTime: '00:00', prepTime: '15–20', tables: 10,
    menu: [
      { category: 'Smash Burgers', description: 'Two thin patties, smashed hard on the griddle', items: [
        it('Classic Smash', 5.50, 'Double beef patty, American cheese, pickles, onion, house sauce', ['beef', 'brioche bun', 'American cheese', 'pickles', 'onion', 'house sauce'], ['gluten', 'dairy', 'eggs', 'sesame'], 'burger_big', true),
        it('Double Trouble', 7.25, 'Four patties, four slices of cheese, caramelised onion', ['beef', 'brioche bun', 'cheddar', 'caramelised onion'], ['gluten', 'dairy', 'sesame'], 'burger_aussie'),
        it('Truffle Mushroom', 7.50, 'Swiss cheese, sautéed mushrooms, truffle mayo', ['beef', 'brioche bun', 'Swiss cheese', 'mushrooms', 'truffle mayo'], ['gluten', 'dairy', 'eggs'], 'burger_lamb', true),
        it('Spicy Jalapeño', 6.25, 'Pepper jack, pickled jalapeños, chipotle sauce', ['beef', 'brioche bun', 'pepper jack', 'jalapeños', 'chipotle sauce'], ['gluten', 'dairy', 'eggs'], 'burger_kofta'),
      ]},
      { category: 'Chicken', description: 'Buttermilk-brined, double-dipped', items: [
        it('Crispy Chicken Burger', 5.75, 'Fried chicken thigh, slaw, pickles, honey mustard', ['chicken thigh', 'brioche bun', 'slaw', 'pickles', 'honey mustard'], ['gluten', 'eggs', 'dairy'], 'burger_halloumi'),
        it('Nashville Hot', 6.50, 'Cayenne-glazed chicken, pickles, ranch', ['chicken thigh', 'brioche bun', 'hot glaze', 'pickles', 'ranch'], ['gluten', 'eggs', 'dairy']),
      ]},
      { category: 'Sides', description: 'Made to go with everything', items: [
        it('Shoestring Fries', 1.75, 'Thin, crispy, sea salt', ['potatoes', 'sea salt'], [], 'fries'),
        it('Cheese Fries', 2.75, 'Fries with cheddar sauce and crispy shallots', ['potatoes', 'cheddar sauce', 'shallots'], ['dairy'], 'poutine'),
        it('Onion Rings', 2.25, 'Beer-free batter, served with smoky mayo', ['onion', 'batter', 'smoky mayo'], ['gluten', 'eggs']),
      ]},
      { category: 'Shakes', description: 'Thick, cold, made with real ice cream', items: [
        it('Vanilla Shake', 3.25, 'Madagascar vanilla ice cream and whole milk', ['vanilla ice cream', 'milk'], ['dairy'], 'banana_shake'),
        it('Oreo Shake', 3.75, 'Cookies and cream, topped with crumbled cookies', ['vanilla ice cream', 'milk', 'chocolate cookies'], ['dairy', 'gluten'], 'fruit_shake', true),
      ]},
    ],
    reviews: [
      ['Tareq Abbadi', 5, 'Proper smash burgers, crispy edges, great sauce.', '4 days ago'],
      ['Sara Qasem', 4, 'Truffle mushroom is my favourite. Fries could be hotter.', '2 weeks ago'],
      ['Hamza Zoubi', 5, 'Ordered for the office — arrived on time, everyone loved it.', '3 weeks ago'],
      ['Noor Hijazi', 3, 'Good burgers but the wait was 30 minutes on Friday.', '1 month ago'],
      ['Ahmad Shami', 5, 'Oreo shake alone is worth the trip.', '2 months ago'],
    ],
  },
  {
    slug: 'fornononna', name: 'Forno Nonna', admin: 'Luca Bianchi',
    cuisine: ['Pizza', 'Pasta'], address: 'Abdoun Circle, Abdoun', phone: '+962 6 000 0103',
    primaryColor: '#15803D', openTime: '13:00', closeTime: '23:30', prepTime: '20–25', tables: 12,
    menu: [
      { category: 'Pizza', description: 'Neapolitan-style, 48-hour dough, wood-fired', items: [
        it('Margherita', 6.50, 'San Marzano tomato, fior di latte, basil, olive oil', ['pizza dough', 'San Marzano tomato', 'fior di latte', 'basil'], ['gluten', 'dairy'], 'pizza', true),
        it('Diavola', 8.00, 'Spicy beef salami, mozzarella, chilli oil', ['pizza dough', 'tomato', 'mozzarella', 'beef salami', 'chilli oil'], ['gluten', 'dairy'], 'pizza'),
        it('Quattro Formaggi', 8.50, 'Mozzarella, gorgonzola, parmesan and fontina, white base', ['pizza dough', 'mozzarella', 'gorgonzola', 'parmesan', 'fontina'], ['gluten', 'dairy'], 'pizza'),
        it('Truffle & Mushroom', 9.50, 'Wild mushrooms, truffle cream, rocket', ['pizza dough', 'mushrooms', 'truffle cream', 'rocket', 'mozzarella'], ['gluten', 'dairy'], 'pizza', true),
      ]},
      { category: 'Pasta', description: 'Fresh pasta made every morning', items: [
        it('Spaghetti Carbonara', 7.50, 'Egg yolk, pecorino, black pepper, crispy beef bacon', ['spaghetti', 'egg yolk', 'pecorino', 'beef bacon', 'black pepper'], ['gluten', 'eggs', 'dairy'], 'carbonara', true),
        it('Penne Arrabbiata', 6.00, 'Spicy tomato sauce, garlic, parsley', ['penne', 'tomato', 'garlic', 'chilli', 'parsley'], ['gluten'], 'arrabbiata'),
        it('Fettuccine Alfredo', 7.25, 'Butter, parmesan and cream, finished with pepper', ['fettuccine', 'butter', 'parmesan', 'cream'], ['gluten', 'dairy', 'eggs'], 'alfredo'),
        it('Lasagna al Forno', 8.25, 'Slow-cooked beef ragù, béchamel, parmesan', ['pasta sheets', 'beef ragù', 'béchamel', 'parmesan'], ['gluten', 'dairy', 'eggs'], 'lasagne'),
        it('Spaghetti Bolognese', 7.00, 'Classic beef ragù, parmesan', ['spaghetti', 'beef', 'tomato', 'carrot', 'celery', 'parmesan'], ['gluten', 'dairy'], 'bolognese'),
      ]},
      { category: 'Starters', description: 'Antipasti to share', items: [
        it('Burrata & Tomatoes', 6.75, 'Creamy burrata, heirloom tomatoes, basil oil', ['burrata', 'tomatoes', 'basil oil'], ['dairy'], 'tomato_salad'),
        it('Garlic Focaccia', 3.00, 'Rosemary, garlic and sea salt, warm from the oven', ['focaccia', 'rosemary', 'garlic', 'olive oil'], ['gluten']),
      ]},
      { category: 'Dolci', description: 'Something sweet', items: [
        it('Tiramisu', 4.25, 'Mascarpone, espresso-soaked savoiardi, cocoa', ['mascarpone', 'savoiardi', 'espresso', 'cocoa'], ['gluten', 'dairy', 'eggs']),
        it('Chocolate Soufflé', 4.75, 'Baked to order — allow 12 minutes', ['dark chocolate', 'eggs', 'butter', 'sugar'], ['dairy', 'eggs'], 'choc_souffle'),
      ]},
    ],
    reviews: [
      ['Rania Aziz', 5, 'The margherita is as close to Naples as it gets in Amman.', '1 day ago'],
      ['Faris Qudah', 5, 'Carbonara done right, no cream. Lovely terrace.', '1 week ago'],
      ['Maya Haddad', 4, 'Great food, a bit pricey. Soufflé was worth the wait.', '2 weeks ago'],
      ['Khaled Masri', 4, 'Dine-in service was friendly, pizza came out fast.', '1 month ago'],
    ],
  },
  {
    slug: 'qahwahouse', name: 'Qahwa House', admin: 'Hala Nabulsi',
    cuisine: ['Coffee', 'Breakfast', 'Desserts'], address: 'Paris Square, Jabal Al Weibdeh', phone: '+962 6 000 0104',
    primaryColor: '#7C4A1E', openTime: '07:00', closeTime: '23:00', prepTime: '5–10', tables: 6,
    menu: [
      { category: 'Hot Coffee', description: 'Specialty beans roasted in Amman', items: [
        it('Espresso', 1.75, 'Double shot, single-origin', ['espresso'], []),
        it('Cappuccino', 2.75, 'Espresso, steamed milk, thick foam', ['espresso', 'milk'], ['dairy'], undefined, true),
        it('Spanish Latte', 3.25, 'Espresso with sweetened condensed milk', ['espresso', 'milk', 'condensed milk'], ['dairy'], undefined, true),
        it('Arabic Coffee', 1.50, 'Lightly roasted with cardamom, served in a finjan', ['arabic coffee', 'cardamom'], []),
        it('Hot Chocolate', 2.75, 'Belgian chocolate and steamed milk', ['dark chocolate', 'milk'], ['dairy'], 'hot_choc'),
      ]},
      { category: 'Iced Drinks', description: 'Cold brew steeped for 18 hours', items: [
        it('Iced Latte', 3.00, 'Espresso over ice with cold milk', ['espresso', 'milk', 'ice'], ['dairy'], 'iced_coffee', true),
        it('Cold Brew', 3.25, 'Smooth, low-acid, served black', ['cold brew coffee', 'ice'], [], 'thai_coffee'),
        it('Iced Tea Peach', 2.50, 'Black tea, peach and lemon', ['black tea', 'peach', 'lemon'], [], 'thai_iced_tea'),
      ]},
      { category: 'Breakfast', description: 'Served until 1pm', items: [
        it('Shakshuka', 4.25, 'Eggs poached in spiced tomato, with warm bread', ['eggs', 'tomato', 'peppers', 'cumin', 'bread'], ['eggs', 'gluten'], 'shakshuka', true),
        it('Buttermilk Pancakes', 4.00, 'Three pancakes, maple syrup, berries', ['flour', 'buttermilk', 'eggs', 'maple syrup', 'berries'], ['gluten', 'dairy', 'eggs'], 'pancakes'),
        it('Zaatar Manousheh', 1.50, 'Thyme, sumac, sesame and olive oil on fresh dough', ['dough', 'zaatar', 'olive oil'], ['gluten', 'sesame'], 'flatbread'),
      ]},
      { category: 'Pastries', description: 'Baked every morning', items: [
        it('Date & Walnut Cake', 2.50, 'Moist sponge with Medjool dates', ['dates', 'walnuts', 'flour', 'eggs', 'butter'], ['gluten', 'nuts', 'dairy', 'eggs'], 'date_cake'),
        it('Pistachio Cake', 3.00, 'Pistachio sponge with rose cream', ['pistachio', 'flour', 'eggs', 'cream', 'rose water'], ['gluten', 'nuts', 'dairy', 'eggs'], 'pistachio_cake'),
        it('New York Cheesecake', 3.50, 'Baked cheesecake, berry compote', ['cream cheese', 'biscuit base', 'eggs', 'berries'], ['gluten', 'dairy', 'eggs'], 'cheesecake'),
      ]},
    ],
    reviews: [
      ['Leen Khatib', 5, 'Spanish latte and the view over Paris Square — perfect morning.', '3 days ago'],
      ['Mohammad Rawashdeh', 4, 'Good cold brew. Can get crowded on weekends.', '1 week ago'],
      ['Aya Batayneh', 5, 'Shakshuka is the best breakfast in Weibdeh.', '2 weeks ago'],
    ],
  },
  {
    slug: 'greenbowl', name: 'Green Bowl Kitchen', admin: 'Nadine Ayoub',
    cuisine: ['Salads', 'Healthy'], address: 'Abdul Hameed Sharaf Street, Shmeisani', phone: '+962 6 000 0105',
    primaryColor: '#4D7C0F', openTime: '10:00', closeTime: '22:00', prepTime: '10–15', tables: 6,
    menu: [
      { category: 'Bowls', description: 'Balanced, filling, made to order', items: [
        it('Grilled Chicken Quinoa Bowl', 6.50, 'Quinoa, grilled chicken, feta, cucumber, lemon herb dressing', ['quinoa', 'chicken', 'feta', 'cucumber', 'tomato', 'lemon dressing'], ['dairy'], 'quinoa_salad', true),
        it('Salmon Avocado Bowl', 8.75, 'Seared salmon, avocado, greens, sesame soy dressing', ['salmon', 'avocado', 'mixed greens', 'sesame', 'soy dressing'], ['fish', 'soy', 'sesame'], 'salmon_avocado', true),
        it('Teriyaki Salmon Rice Bowl', 8.50, 'Honey teriyaki salmon, jasmine rice, edamame', ['salmon', 'rice', 'teriyaki', 'edamame'], ['fish', 'soy', 'gluten'], 'teriyaki_salmon'),
        it('Falafel Buddha Bowl', 5.50, 'Baked falafel, hummus, roasted veg, tahini', ['falafel', 'hummus', 'roasted vegetables', 'tahini'], ['sesame', 'gluten'], 'falafel'),
      ]},
      { category: 'Salads', description: 'Crisp, seasonal, generous', items: [
        it('Fattoush', 3.50, 'Mixed greens, radish, sumac, crispy bread, pomegranate molasses', ['lettuce', 'tomato', 'cucumber', 'radish', 'sumac', 'pita chips'], ['gluten'], 'pomegranate_salad'),
        it('Shopska Salad', 3.75, 'Tomato, cucumber, peppers and grated white cheese', ['tomato', 'cucumber', 'peppers', 'white cheese'], ['dairy'], 'shopska'),
        it('Chicken Caesar', 5.25, 'Romaine, grilled chicken, parmesan, croutons', ['romaine', 'chicken', 'parmesan', 'croutons', 'caesar dressing'], ['gluten', 'dairy', 'eggs', 'fish']),
      ]},
      { category: 'Wraps', description: 'Whole-wheat tortillas', items: [
        it('Spiced Lamb Wrap', 5.50, 'Cumin lamb, crunchy slaw, yoghurt sauce', ['lamb', 'tortilla', 'slaw', 'yoghurt sauce'], ['gluten', 'dairy'], 'lamb_wrap'),
        it('Falafel Pita', 3.25, 'Falafel, tahini, pickles, tomato in pita', ['falafel', 'pita', 'tahini', 'pickles'], ['gluten', 'sesame'], 'falafel_pita'),
      ]},
      { category: 'Juices & Smoothies', description: 'Cold-pressed daily', items: [
        it('Kiwi Papaya Smoothie', 3.00, 'Kiwi, papaya, banana and yoghurt', ['kiwi', 'papaya', 'banana', 'yoghurt'], ['dairy'], 'kiwi_smoothie', true),
        it('Mango Lassi', 2.75, 'Mango, yoghurt and cardamom', ['mango', 'yoghurt', 'cardamom'], ['dairy'], 'mango_lassi'),
        it('Fresh Orange', 2.25, 'Just oranges', ['oranges'], [], 'orangeade'),
      ]},
    ],
    reviews: [
      ['Julia Farah', 5, 'Finally a healthy lunch spot near the office that is actually filling.', '2 days ago'],
      ['Basel Hamdan', 4, 'Salmon bowl is great. Portions of dressing are small.', '10 days ago'],
      ['Reem Suleiman', 5, 'The quinoa bowl is my weekly order.', '1 month ago'],
    ],
  },
  {
    slug: 'sukkarsweets', name: 'Sukkar Nabulsi Sweets', admin: 'Sami Tamimi',
    cuisine: ['Desserts'], address: 'King Faisal Street, Downtown', phone: '+962 6 000 0106',
    primaryColor: '#BE185D', openTime: '09:00', closeTime: '00:00', prepTime: '5–10', tables: 4,
    menu: [
      { category: 'Kunafa', description: 'Baked fresh through the day with Nabulsi cheese', items: [
        it('Nabulsi Kunafa', 2.50, 'Fine kataifi, stretchy Nabulsi cheese, sugar syrup', ['kataifi', 'Nabulsi cheese', 'butter', 'sugar syrup', 'pistachio'], ['gluten', 'dairy', 'nuts'], 'kunafa', true),
        it('Kunafa Khishneh', 2.50, 'Coarse, crunchy kunafa with cheese', ['semolina kataifi', 'Nabulsi cheese', 'sugar syrup'], ['gluten', 'dairy']),
        it('Pistachio Kunafa Cake', 4.50, 'Kunafa layered with pistachio cream and chocolate', ['kataifi', 'pistachio cream', 'chocolate'], ['gluten', 'dairy', 'nuts'], 'kunafa'),
      ]},
      { category: 'Eastern Sweets', description: 'By the plate or by weight', items: [
        it('Baklava Assortment (250g)', 4.50, 'Walnut, pistachio and cashew baklava', ['filo', 'walnuts', 'pistachio', 'cashews', 'ghee', 'syrup'], ['gluten', 'nuts', 'dairy'], 'baklava', true),
        it('Qatayef with Cream', 3.00, 'Half-moon pancakes filled with ashta', ['qatayef', 'ashta cream', 'syrup', 'pistachio'], ['gluten', 'dairy', 'nuts']),
        it('Halawet el Jibn', 3.50, 'Sweet cheese rolls, ashta and rose syrup', ['semolina', 'cheese', 'ashta', 'rose syrup'], ['gluten', 'dairy']),
        it('Mafroukeh', 3.25, 'Semolina with butter, topped with cream and nuts', ['semolina', 'butter', 'ashta', 'pistachio', 'almonds'], ['gluten', 'dairy', 'nuts']),
      ]},
      { category: 'Ice Cream', description: 'Arabic booza, pounded by hand', items: [
        it('Booza with Pistachio', 2.75, 'Mastic and sahlab ice cream rolled in pistachio', ['milk', 'mastic', 'sahlab', 'pistachio'], ['dairy', 'nuts'], 'ice_cream'),
      ]},
      { category: 'Drinks', description: 'Traditional and cold', items: [
        it('Tamarind', 1.50, 'Chilled tamarind juice', ['tamarind', 'sugar', 'water']),
        it('Strawberry Lemonade', 2.00, 'Fresh strawberries and lemon', ['strawberries', 'lemon', 'sugar'], [], 'strawberry_lemonade'),
      ]},
    ],
    reviews: [
      ['Mahmoud Jaber', 5, 'Kunafa comes out of the oven every 20 minutes — always hot.', '1 day ago'],
      ['Tala Hourani', 5, 'Took a baklava box to my family, it was gone in minutes.', '1 week ago'],
      ['Adam Kurdi', 4, 'Great sweets, parking downtown is the hard part.', '3 weeks ago'],
      ['Yara Salem', 5, 'Booza with pistachio is a childhood memory.', '1 month ago'],
    ],
  },
  {
    slug: 'crispycoop', name: 'Crispy Coop', admin: 'Fadi Shalabi',
    cuisine: ['Chicken'], address: 'Mecca Street, Um Uthaina', phone: '+962 6 000 0107',
    primaryColor: '#A16207', openTime: '12:00', closeTime: '01:00', prepTime: '15–20', tables: 8,
    menu: [
      { category: 'Buckets', description: 'Pressure-fried, crunchy all the way through', items: [
        it('8-Piece Crispy Bucket', 9.50, 'Eight pieces, two sides and four dips', ['chicken', 'seasoned flour', 'fries', 'coleslaw'], ['gluten', 'eggs'], 'fried_chicken', true),
        it('Spicy Wings (10 pcs)', 4.50, 'Crispy wings tossed in hot sauce', ['chicken wings', 'hot sauce'], ['gluten'], 'wings', true),
        it('Lemon Garlic Wings (10 pcs)', 4.50, 'Cumin, lemon and garlic, oven-finished', ['chicken wings', 'cumin', 'lemon', 'garlic'], [], 'wings_cumin'),
      ]},
      { category: 'Sandwiches', description: 'Toasted buns, pickles, sauce', items: [
        it('Crispy Chicken Sandwich', 4.25, 'Fried fillet, lettuce, mayo, pickles', ['chicken fillet', 'bun', 'lettuce', 'mayo', 'pickles'], ['gluten', 'eggs', 'sesame'], 'burger_halloumi'),
        it('Chicken Tenders (5 pcs)', 4.75, 'Hand-breaded tenders with honey mustard', ['chicken breast', 'breading', 'honey mustard'], ['gluten', 'eggs']),
      ]},
      { category: 'Sides', description: 'Classic comfort', items: [
        it('Coleslaw', 1.25, 'Creamy cabbage and carrot slaw', ['cabbage', 'carrot', 'mayo'], ['eggs'], 'slaw'),
        it('Mac & Cheese', 2.50, 'Baked with three cheeses', ['macaroni', 'cheddar', 'mozzarella', 'milk'], ['gluten', 'dairy'], 'mac'),
        it('Seasoned Potatoes', 1.75, 'Crispy potato cubes with paprika salt', ['potatoes', 'paprika', 'salt'], [], 'potatoes'),
      ]},
      { category: 'Dips & Drinks', description: 'Complete the meal', items: [
        it('Honey Mustard Dip', 0.35, 'Sweet and tangy', ['honey', 'mustard', 'mayo'], ['eggs']),
        it('Fresh Lemonade', 1.75, 'Squeezed to order', ['lemon', 'sugar', 'water'], [], 'moonmint'),
      ]},
    ],
    reviews: [
      ['Hussam Obeidat', 4, 'Bucket feeds four easily. Coleslaw is great.', '5 days ago'],
      ['Nour Abu Ghazaleh', 5, 'Spicy wings are addictive.', '2 weeks ago'],
      ['Omar Sweis', 3, 'Tasty, but my order was missing a dip.', '1 month ago'],
    ],
  },
  {
    slug: 'sajandoven', name: 'Saj & Oven', admin: 'Walid Qteishat',
    cuisine: ['Breakfast'], address: 'Wasfi Al Tal Street, Khalda', phone: '+962 6 000 0108',
    primaryColor: '#0F766E', openTime: '06:30', closeTime: '15:00', prepTime: '10–15', tables: 6,
    menu: [
      { category: 'Saj', description: 'Thin dough cooked on the dome', items: [
        it('Labneh Saj Wrap', 1.50, 'Labneh, mint, cucumber and olives', ['saj bread', 'labneh', 'mint', 'cucumber', 'olives'], ['gluten', 'dairy'], 'flatbread'),
        it('Sujuk & Cheese Saj', 2.25, 'Spicy beef sujuk with melted mozzarella', ['saj bread', 'beef sujuk', 'mozzarella'], ['gluten', 'dairy'], 'flatbread', true),
        it('Chicken & Garlic Saj', 2.50, 'Grilled chicken, toum and pickles', ['saj bread', 'chicken', 'garlic toum', 'pickles'], ['gluten', 'eggs'], 'shawarma_bread'),
      ]},
      { category: 'Manakeesh', description: 'From the stone oven', items: [
        it('Zaatar Manousheh', 0.75, 'Zaatar and olive oil', ['dough', 'zaatar', 'olive oil'], ['gluten', 'sesame'], 'flatbread', true),
        it('Cheese Manousheh', 1.25, 'Akkawi and mozzarella blend', ['dough', 'akkawi', 'mozzarella'], ['gluten', 'dairy'], 'syrian_bread'),
        it('Half & Half', 1.00, 'Half zaatar, half cheese', ['dough', 'zaatar', 'cheese'], ['gluten', 'dairy', 'sesame'], 'flatbread'),
      ]},
      { category: 'Breakfast Plates', description: 'Served with bread, vegetables and olives', items: [
        it('Foul Medammas', 2.00, 'Fava beans, lemon, garlic, olive oil', ['fava beans', 'lemon', 'garlic', 'olive oil'], [], 'ful', true),
        it('Hummus with Meat', 3.50, 'Hummus topped with sautéed minced beef and pine nuts', ['chickpeas', 'tahini', 'minced beef', 'pine nuts'], ['sesame', 'nuts'], 'hummus'),
        it('Falafel Plate', 2.25, 'Six falafel, tahini, pickles', ['falafel', 'tahini', 'pickles'], ['sesame', 'gluten'], 'falafel'),
        it('Shakshuka', 3.00, 'Eggs in spiced tomato sauce', ['eggs', 'tomato', 'onion', 'peppers'], ['eggs'], 'shakshuka'),
      ]},
      { category: 'Hot Drinks', description: 'Tea the way it is done at home', items: [
        it('Mint Tea', 0.75, 'Black tea with fresh mint', ['black tea', 'mint', 'sugar']),
        it('Sage Tea', 0.75, 'Black tea with maramiya', ['black tea', 'sage', 'sugar']),
      ]},
    ],
    reviews: [
      ['Ibrahim Nsour', 5, 'Sujuk saj at 7am before work — the best start.', '3 days ago'],
      ['Rasha Daoud', 4, 'Foul and hummus plates are generous. Closes early.', '2 weeks ago'],
      ['Zaid Hammad', 5, 'Manakeesh straight from the oven, cheap and great.', '1 month ago'],
    ],
  },
];

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

async function removeDemoVendors() {
  const admins = await User.find({ email: new RegExp(`\\.${DEMO_DOMAIN.replace(/\./g, '\\.')}$`) }).select('restaurantId');
  const ids = admins.map(a => a.restaurantId).filter(Boolean);
  await Promise.all([
    Category.deleteMany({ restaurantId: { $in: ids } }),
    MenuItem.deleteMany({ restaurantId: { $in: ids } }),
    Review.deleteMany({ restaurantId: { $in: ids } }),
    Table.deleteMany({ restaurantId: { $in: ids } }),
    Restaurant.deleteMany({ _id: { $in: ids } }),
  ]);
  await User.deleteMany({ _id: { $in: admins.map(a => a._id) } });
  console.log(`Removed ${ids.length} demo vendors`);
}

async function createVendor(v: Vendor) {
  const email = `${v.admin.split(' ')[0].toLowerCase()}@${v.slug}.${DEMO_DOMAIN}`;
  if (await User.exists({ email })) {
    console.log(`• ${v.name} already exists — skipped`);
    return email;
  }
  const restaurant = await Restaurant.create({
    name: v.name,
    contactEmail: email,
    contactPhone: v.phone,
    address: `${v.address}, Amman`,
    status: 'active',
    cuisine: v.cuisine,
    currency: 'JOD',
    timezone: 'Asia/Amman',
    openTime: v.openTime,
    closeTime: v.closeTime,
    prepTime: v.prepTime,
    primaryColor: v.primaryColor,
    adminId: new mongoose.Types.ObjectId(),
  });
  const admin = await User.create({
    email, password: DEMO_PASSWORD, role: 'admin', name: v.admin, title: 'Owner',
    phone: v.phone, restaurantId: restaurant._id, emailVerified: true,
  });
  restaurant.adminId = admin._id as any;
  await restaurant.save();

  await Category.insertMany(v.menu.map(s => ({ name: s.category, description: s.description, restaurantId: restaurant._id })));
  // Each photo appears once per restaurant; later dishes sharing it show the placeholder.
  const usedPhotos = new Set<Photo>();
  const photoFor = (p?: Photo) => {
    if (!p || usedPhotos.has(p)) return '';
    usedPhotos.add(p);
    return PHOTO[p];
  };
  const items = v.menu.flatMap(s => s.items.map(i => ({
    name: i.name, category: s.category, price: i.price, description: i.description,
    longDescription: i.longDescription ?? '', ingredients: i.ingredients, allergens: i.allergens,
    image: photoFor(i.photo), featured: i.featured, restaurantId: restaurant._id,
  })));
  await MenuItem.insertMany(items);
  await Review.insertMany(v.reviews.map(([userName, rating, comment, date]) => ({
    userName, userInitials: initials(userName), rating, comment, date, restaurantId: restaurant._id,
  })));
  await Table.insertMany(Array.from({ length: v.tables }, (_, i) => ({ name: `Table ${i + 1}`, restaurantId: restaurant._id })));

  console.log(`✓ ${v.name}: ${v.menu.length} categories, ${items.length} dishes, ${v.reviews.length} reviews, ${v.tables} tables`);
  return email;
}

export async function seedDemoVendors({ reset = false } = {}) {
  if (reset) await removeDemoVendors();
  const logins: string[] = [];
  for (const v of VENDORS) logins.push(await createVendor(v));
  console.log(`\nDemo admin logins (password: ${DEMO_PASSWORD}):`);
  logins.forEach(l => console.log(`  ${l}`));
}

if (process.argv[1]?.endsWith('seedDemoVendors.ts')) {
  const reset = process.argv.includes('--reset');
  const target = env.MONGODB_URI.replace(/\/\/[^@]*@/, '//<credentials>@');
  console.log(`Seeding demo vendors into ${target}${reset ? ' (reset)' : ''}\n`);
  mongoose.connect(env.MONGODB_URI)
    .then(() => seedDemoVendors({ reset }))
    .then(() => mongoose.disconnect())
    .catch(err => { console.error(err); process.exit(1); });
}
