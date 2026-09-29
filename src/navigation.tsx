import { createContext, useContext } from 'react';

export type Tab = 'home' | 'orders' | 'profile';
export type SignInAfter = 'home' | 'cart' | 'profile';

export type Route =
  | { name: Tab }
  | { name: 'rest'; id: string }
  | { name: 'cart' }
  | { name: 'track'; orderId: string }
  | { name: 'notifs' }
  | { name: 'signin'; after: SignInAfter };

export const TAB_ROUTES: Route['name'][] = ['home', 'orders', 'profile'];

export interface Nav {
  route: Route;
  /** Push a screen; `replace` swaps the current history entry instead. */
  go: (route: Route, opts?: { replace?: boolean }) => void;
  /** Switch bottom-nav / header tab (replaces history, like the design's tab bar). */
  tab: (tab: Tab) => void;
  back: () => void;
}

export const NavCtx = createContext<Nav | null>(null);

export const useNav = () => {
  const nav = useContext(NavCtx);
  if (!nav) throw new Error('useNav must be inside NavCtx');
  return nav;
};

export function routeToSearch(r: Route): string {
  const p = new URLSearchParams();
  p.set('screen', r.name);
  if (r.name === 'rest') p.set('rid', r.id);
  if (r.name === 'track') p.set('orderId', r.orderId);
  if (r.name === 'signin') p.set('after', r.after);
  return `?${p.toString()}`;
}

export function routeFromSearch(search: string): Route | null {
  const p = new URLSearchParams(search);
  const screen = p.get('screen');
  const tab = p.get('tab');
  // Legacy URLs (?tab=orders&screen=restaurant&rid=…) keep working.
  if ((screen === 'rest' || screen === 'restaurant') && p.get('rid')) return { name: 'rest', id: p.get('rid')! };
  if (screen === 'cart') return { name: 'cart' };
  if ((screen === 'track' || screen === 'tracking') && p.get('orderId')) return { name: 'track', orderId: p.get('orderId')! };
  if (screen === 'notifs') return { name: 'notifs' };
  if (screen === 'signin') {
    const after = p.get('after');
    return { name: 'signin', after: after === 'cart' || after === 'profile' ? after : 'home' };
  }
  const t = screen ?? tab;
  if (t === 'home' || t === 'orders' || t === 'profile') return { name: t };
  return null;
}
