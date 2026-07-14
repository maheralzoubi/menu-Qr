import { useState, useEffect } from 'react';
import { applyPrimaryColor } from '../lib/branding';

const STORAGE_KEY = 'restaurant_context';

export interface RestaurantContext {
  restaurantId: string;
  tableName: string;
  restaurantName: string;
  logo: string;
  primaryColor: string;
  currency: string;
}

function readFromStorage(): RestaurantContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(ctx: RestaurantContext) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
}

function applyBranding(name: string, logo: string, primaryColor?: string) {
  document.title = name || 'Menu QR';
  const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const favicon = existing ?? Object.assign(document.createElement('link'), { rel: 'icon' });
  favicon.href = logo || '/favicon.svg';
  if (!existing) document.head.appendChild(favicon);
  if (primaryColor) applyPrimaryColor(primaryColor);
}

export function useRestaurant() {
  const [context, setContextState] = useState<RestaurantContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restaurantId = params.get('restaurant');
    const tableName = params.get('table') ?? '';

    // Restore branding from previous visit even when no URL param.
    const stored = readFromStorage();
    if (stored) {
      applyBranding(stored.restaurantName, stored.logo, stored.primaryColor);
      setContextState(stored);
    }

    // Only fetch fresh data when URL contains a restaurantId (QR scan / deep link).
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    fetch(`/api/restaurants/${restaurantId}/info`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const ctx: RestaurantContext = {
          restaurantId,
          tableName,
          restaurantName: data.name,
          logo: data.logo ?? '',
          primaryColor: data.primaryColor ?? '#9b3f25',
          currency: data.currency ?? 'USD',
        };
        saveToStorage(ctx);
        applyBranding(ctx.restaurantName, ctx.logo, ctx.primaryColor);
        setContextState(ctx);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setContext = (ctx: RestaurantContext) => {
    saveToStorage(ctx);
    applyBranding(ctx.restaurantName, ctx.logo, ctx.primaryColor);
    setContextState(ctx);
  };

  return { context, loading, setContext };
}
