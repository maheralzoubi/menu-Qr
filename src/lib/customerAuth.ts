const TOKEN_KEY = 'customer_token';
const CUSTOMER_KEY = 'customer_info';

export interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  status?: string;
}

export const getCustomerToken = () => localStorage.getItem(TOKEN_KEY);

export const setCustomerToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);

export const clearCustomerToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_KEY);
};

export const getCustomerInfo = (): CustomerInfo | null => {
  const raw = localStorage.getItem(CUSTOMER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const setCustomerInfo = (info: CustomerInfo) =>
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(info));

export const customerFetch = (url: string, options: RequestInit = {}) => {
  const token = getCustomerToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
};
