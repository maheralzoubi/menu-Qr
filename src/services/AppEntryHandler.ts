import type { RestaurantContext } from '../hooks/useRestaurant';

/** Returns the restaurantId from URL params, or null for normal app opens. */
export function detectInitialRestaurant(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('restaurant');
}

/**
 * Parses a QR code string into a restaurantId.
 * Supports:
 *   - restaurant://<id>
 *   - JSON: { "restaurantId": "..." }
 *   - URL: https://...?restaurant=<id>
 */
export function parseQRCode(qrData: string): string | null {
  const trimmed = qrData.trim();

  if (trimmed.startsWith('restaurant://')) {
    const id = trimmed.slice('restaurant://'.length).trim();
    return id || null;
  }

  try {
    const json = JSON.parse(trimmed);
    if (typeof json.restaurantId === 'string' && json.restaurantId) {
      return json.restaurantId;
    }
  } catch {}

  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get('restaurant');
    if (id) return id;
  } catch {}

  return null;
}

/** Fetches full restaurant context from the API by restaurantId. */
export async function fetchRestaurantContext(
  restaurantId: string,
  tableName = '',
): Promise<RestaurantContext | null> {
  try {
    const res = await fetch(`/api/restaurants/${restaurantId}/info`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      restaurantId,
      tableName,
      restaurantName: data.name,
      logo: data.logo ?? '',
      primaryColor: data.primaryColor ?? '#9b3f25',
    };
  } catch {
    return null;
  }
}
