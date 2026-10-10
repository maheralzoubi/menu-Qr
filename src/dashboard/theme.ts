// Light/dark for the dashboards. An explicit choice is stored; otherwise follow the OS.
export type DashTheme = 'light' | 'dark';
const KEY = 'mg_dash_theme';

export function initialDashTheme(): DashTheme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyDashTheme(theme: DashTheme, persist = false) {
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) { try { localStorage.setItem(KEY, theme); } catch { /* ignore */ } }
}
