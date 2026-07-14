import { formatCurrency } from '../lib/currency';

export function useCurrency(): string {
  try {
    const ctx = JSON.parse(localStorage.getItem('restaurant_context') || 'null');
    return ctx?.currency ?? 'USD';
  } catch { return 'USD'; }
}

export function useFmt(): (amount: number) => string {
  const currency = useCurrency();
  return (amount: number) => formatCurrency(amount, currency);
}
