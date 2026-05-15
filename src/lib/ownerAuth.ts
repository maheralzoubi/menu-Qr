const TOKEN_KEY = 'owner_token';

export const getOwnerToken = () => localStorage.getItem(TOKEN_KEY);
export const setOwnerToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearOwnerToken = () => localStorage.removeItem(TOKEN_KEY);

const decodePayload = (token: string): Record<string, any> | null => {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch { return null; }
};

export const getOwnerRole = (): string | null => {
  const token = getOwnerToken();
  return token ? (decodePayload(token)?.role ?? null) : null;
};

export const getOwnerEmail = (): string | null => {
  const token = getOwnerToken();
  return token ? (decodePayload(token)?.email ?? null) : null;
};

export const isSuperAdmin = (): boolean => getOwnerRole() === 'superadmin';

export const ownerFetch = (url: string, options: RequestInit = {}) => {
  const token = getOwnerToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
};
