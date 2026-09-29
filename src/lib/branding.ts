// Restaurant brand colour support for the customer app. The design tokens
// (src/styles/app.css) define Menu Go orange; a restaurant screen can swap in
// the restaurant's own primary colour. Derived tokens (accent text, soft
// background) are recomputed for the active light/dark theme.

const BRAND_TOKENS = ['--color-primary', '--color-ring', '--color-acc', '--color-acc-soft'] as const;
const DEFAULT_BRANDS = ['#fe5722', '#ff5e1a', '#9b3f25'];

let activeBrand: string | null = null;

type RGB = [number, number, number];

function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

const toHex = (c: RGB) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

function paint() {
  const root = document.documentElement;
  const rgb = activeBrand ? parseHex(activeBrand) : null;
  if (!rgb) {
    BRAND_TOKENS.forEach(t => root.style.removeProperty(t));
    return;
  }
  const dark = isDark();
  const primary = dark ? mix(rgb, [255, 255, 255], 0.12) : rgb;
  const acc = dark ? mix(rgb, [255, 255, 255], 0.25) : mix(rgb, [0, 0, 0], 0.08);
  const soft = dark ? mix([24, 20, 17], rgb, 0.2) : mix([255, 255, 255], rgb, 0.1);
  root.style.setProperty('--color-primary', toHex(primary));
  root.style.setProperty('--color-ring', toHex(primary));
  root.style.setProperty('--color-acc', toHex(acc));
  root.style.setProperty('--color-acc-soft', toHex(soft));
}

/** Use a restaurant's colour as the app primary. Menu Go's own defaults are ignored. */
export function applyPrimaryColor(hex: string | null | undefined) {
  const next = hex && !DEFAULT_BRANDS.includes(hex.toLowerCase()) && parseHex(hex) ? hex : null;
  if (next === activeBrand) return;
  activeBrand = next;
  paint();
}

export function restoreDefaultColor() {
  applyPrimaryColor(null);
}

/** Re-derive brand tokens after a light/dark switch. */
export function repaintBrand() {
  paint();
}
