const DEFAULT_PRIMARY   = '#fe5722';
const DEFAULT_CONTAINER = '#d94a1c';

function darken(hex: string, amount = 0.15): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 0xff) * (1 - amount));
  const g = Math.round(((n >> 8)  & 0xff) * (1 - amount));
  const b = Math.round((n & 0xff) * (1 - amount));
  return '#' + [r, g, b].map(c => Math.max(0, c).toString(16).padStart(2, '0')).join('');
}

export function applyPrimaryColor(hex: string) {
  if (!hex) return;
  const container = darken(hex);
  const root = document.documentElement;
  root.style.setProperty('--color-primary',           hex);
  root.style.setProperty('--color-primary-container', container);
  root.style.setProperty('--color-tertiary',           hex);
  root.style.setProperty('--color-tertiary-container', container);
}

export function restoreDefaultColor() {
  const root = document.documentElement;
  root.style.setProperty('--color-primary',           DEFAULT_PRIMARY);
  root.style.setProperty('--color-primary-container', DEFAULT_CONTAINER);
  root.style.setProperty('--color-tertiary',           DEFAULT_PRIMARY);
  root.style.setProperty('--color-tertiary-container', DEFAULT_CONTAINER);
}
