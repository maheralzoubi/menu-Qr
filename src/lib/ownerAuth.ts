const TOKEN_KEY = 'owner_token';

export const getOwnerToken = () => localStorage.getItem(TOKEN_KEY);

export const setOwnerToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);

export const clearOwnerToken = () => localStorage.removeItem(TOKEN_KEY);

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
