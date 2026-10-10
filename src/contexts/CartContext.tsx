import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { MenuItem } from '../types';

export interface CartItem {
  /** Line identity: the same dish with a different special request is its own line. */
  key: string;
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

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string;
  restaurantLogo: string;
}

interface CartCtx extends CartState {
  /** Returns true when the cart held another restaurant's items and was replaced. */
  addItem: (item: MenuItem, restaurantId: string, restaurantName: string, restaurantLogo?: string, opts?: { qty?: number; note?: string }) => boolean;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  /** Set the total quantity of a dish across all its lines; 0 removes it. */
  setItemQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  qtyFor: (itemId: string) => number;
  itemCount: number;
  total: number;
}

const STORAGE_KEY = 'mg_cart';
const EMPTY: CartState = { items: [], restaurantId: null, restaurantName: '', restaurantLogo: '' };

function load(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const s = raw ? JSON.parse(raw) : null;
    if (s && Array.isArray(s.items)) return { ...EMPTY, ...s };
  } catch { /* ignore */ }
  return EMPTY;
}

const Ctx = createContext<CartCtx | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CartState>(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const addItem = useCallback<CartCtx['addItem']>((item, rId, rName, rLogo = '', opts = {}) => {
    const qty = Math.max(1, opts.qty ?? 1);
    const note = (opts.note ?? '').trim();
    const key = `${item.id}::${note}`;
    const replaced = !!state.restaurantId && state.restaurantId !== rId && state.items.length > 0;
    setState(prev => {
      const base = prev.restaurantId && prev.restaurantId !== rId ? [] : prev.items;
      const existing = base.find(l => l.key === key);
      const items = existing
        ? base.map(l => l.key === key ? { ...l, quantity: l.quantity + qty } : l)
        : [...base, {
            key, id: item.id, name: item.name, price: item.price, quantity: qty, image: item.image ?? '', note,
            category: item.category ?? '', description: item.description ?? '', featured: item.featured ?? false,
            ingredients: item.ingredients ?? [], allergens: item.allergens ?? [],
          }];
      return { items, restaurantId: rId, restaurantName: rName, restaurantLogo: rLogo };
    });
    return replaced;
  }, [state.restaurantId, state.items.length]);

  const removeItem = useCallback((key: string) => {
    setState(prev => {
      const items = prev.items.filter(i => i.key !== key);
      return items.length ? { ...prev, items } : EMPTY;
    });
  }, []);

  const updateQty = useCallback((key: string, qty: number) => {
    if (qty <= 0) { removeItem(key); return; }
    setState(prev => ({ ...prev, items: prev.items.map(i => i.key === key ? { ...i, quantity: qty } : i) }));
  }, [removeItem]);

  const setItemQty = useCallback((itemId: string, qty: number) => {
    setState(prev => {
      const lines = prev.items.filter(i => i.id === itemId);
      if (!lines.length) return prev;
      const rest = prev.items.filter(i => i.id !== itemId);
      const items = qty > 0 ? [...rest, { ...lines[0], quantity: qty }] : rest;
      return items.length ? { ...prev, items } : EMPTY;
    });
  }, []);

  const clearCart = useCallback(() => setState(EMPTY), []);

  const qtyFor = useCallback((itemId: string) =>
    state.items.filter(i => i.id === itemId).reduce((s, i) => s + i.quantity, 0), [state.items]);

  const itemCount = state.items.reduce((s, i) => s + i.quantity, 0);
  const total = state.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <Ctx.Provider value={{ ...state, addItem, removeItem, updateQty, setItemQty, clearCart, qtyFor, itemCount, total }}>
      {children}
    </Ctx.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
