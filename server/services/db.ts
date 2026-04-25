import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Category, MenuItem, Review, Reservation, Order } from '../../src/types';

import { CATEGORIES, MENU_ITEMS, REVIEWS } from '../../src/data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../database.json');

export interface DatabaseSchema {
  categories: Category[];
  menuItems: MenuItem[];
  orders: Order[];
  reservations: Reservation[];
  reviews: Review[];
}

const defaultData: DatabaseSchema = {
  categories: CATEGORIES,
  menuItems: MENU_ITEMS,
  orders: [],
  reservations: [],
  reviews: REVIEWS
};

function readDb(): DatabaseSchema {
  if (!fs.existsSync(dbPath)) {
    writeDb(defaultData);
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  } catch (e) {
    return defaultData;
  }
}

function writeDb(data: DatabaseSchema) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

export const dbState = readDb();

export const saveDb = () => {
  writeDb(dbState);
};
