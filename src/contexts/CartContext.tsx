import React, { createContext, useContext, useState, useCallback } from 'react';
import type { MenuItem } from '../types';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  note: string;
  category: string;
  description: string;
  featured: boolean;
  ingredients: string[];
  allergens: string[];
}

interface CartCtx {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string;
  restaurantLogo: string;
  addItem: (item: MenuItem, restaurantId: string, restaurantName: string, restaurantLogo?: string) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  updateNote: (id: string, note: string) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
}

const Ctx = createContext<CartCtx | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantLogo, setRestaurantLogo] = useState('');

  const addItem = useCallback((item: MenuItem, rId: string, rName: string, rLogo = '') => {
    if (restaurantId && restaurantId !== rId) {
      setItems([]);
    }
    setRestaurantId(rId);
    setRestaurantName(rName);
    setRestaurantLogo(rLogo);
    setItems(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, image: item.image, note: '', category: item.category, description: item.description, featured: item.featured ?? false, ingredients: item.ingredients, allergens: item.allergens }];
    });
  }, [restaurantId]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      if (next.length === 0) { setRestaurantId(null); setRestaurantName(''); setRestaurantLogo(''); }
      return next;
    });
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  }, [removeItem]);

  const updateNote = useCallback((id: string, note: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, note } : i));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]); setRestaurantId(null); setRestaurantName(''); setRestaurantLogo('');
  }, []);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, restaurantId, restaurantName, restaurantLogo, addItem, removeItem, updateQty, updateNote, clearCart, itemCount, total }}>
      {children}
    </Ctx.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
