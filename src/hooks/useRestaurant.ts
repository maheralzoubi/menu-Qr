import { useState, useEffect } from 'react';

const STORAGE_KEY = 'restaurant_context';

export interface RestaurantContext {
  restaurantId: string;
  tableName: string;
  restaurantName: string;
  logo: string;
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

export function useRestaurant() {
  const [context, setContext] = useState<RestaurantContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restaurantId = params.get('restaurant');
    const tableName = params.get('table') ?? '';

    const init = async () => {
      if (restaurantId) {
        try {
          const res = await fetch(`/api/restaurants/${restaurantId}/info`);
          if (res.ok) {
            const data = await res.json();
            const ctx: RestaurantContext = {
              restaurantId,
              tableName,
              restaurantName: data.name,
              logo: data.logo ?? '',
            };
            saveToStorage(ctx);
            setContext(ctx);
          }
        } catch {
          // Fall through to localStorage
        }
      } else {
        // Try to restore from localStorage
        const stored = readFromStorage();
        if (stored) setContext(stored);
      }
      setLoading(false);
    };

    init();
  }, []);

  return { context, loading };
}
