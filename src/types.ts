/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  longDescription: string;
  ingredients: string[];
  allergens: string[];
  image: string;
  featured?: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Review {
  id: string;
  userName: string;
  userInitials: string;
  rating: number;
  date: string;
  comment: string;
  image?: string;
}

export type Screen = 'home' | 'menu' | 'cart' | 'status' | 'reviews' | 'write-review' | 'reservation' | 'account';

export interface Reservation {
  id: string;
  name: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  createdAt: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'Preparing' | 'Delivered' | 'Pending';
  address: string;
  customerName?: string;
  createdAt: string;
}
