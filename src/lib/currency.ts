export const CURRENCIES = [
  { code: 'USD', symbol: '$',  decimals: 2, label: 'US Dollar (USD)' },
  { code: 'JOD', symbol: 'JD', decimals: 3, label: 'Jordanian Dinar (JOD)' },
  { code: 'SAR', symbol: 'SR', decimals: 2, label: 'Saudi Riyal (SAR)' },
  { code: 'AED', symbol: 'AED', decimals: 2, label: 'UAE Dirham (AED)' },
  { code: 'EUR', symbol: '€',  decimals: 2, label: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£',  decimals: 2, label: 'British Pound (GBP)' },
];

export function formatCurrency(amount: number, currency = 'USD'): string {
  const cur = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];
  return `${cur.symbol} ${amount.toFixed(cur.decimals)}`;
}

export function getCurrencySymbol(currency = 'USD'): string {
  return CURRENCIES.find(c => c.code === currency)?.symbol ?? '$';
}

export function getCurrencyDecimals(currency = 'USD'): number {
  return CURRENCIES.find(c => c.code === currency)?.decimals ?? 2;
}
