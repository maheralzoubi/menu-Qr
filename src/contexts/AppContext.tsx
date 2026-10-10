import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { io, type Socket } from 'socket.io-client';
import { appFetch, getAppToken, getStoredUser, saveSession, type AppAddress, type AppUser } from '../lib/appAuth';
import { repaintBrand } from '../lib/branding';

export type OrderType = 'pickup' | 'dinein' | 'delivery';
export type PayMethod = 'cash' | 'card';
export type Theme = 'light' | 'dark';

export interface PublicRestaurant {
  _id: string;
  name: string;
  logo?: string;
  address?: string;
  status: string;
  cuisine: string[];
  currency: string;
  isOpen: boolean;
  prepTime: string | null;
  openTime: string | null;
  closeTime: string | null;
  primaryColor?: string;
  averageRating: number;
  reviewCount?: number;
}

export interface OrderLine { id: string; name: string; price: number; quantity: number; note?: string }
export interface Order {
  _id: string;
  items: OrderLine[];
  total: number;
  discount?: number;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
  restaurantId: string;
  tableNumber?: string;
  address?: string;
  order_type?: string;
  payment_method?: string;
  pickup_time?: string;
  createdAt: string;
}

export interface Notif {
  id: string;
  kind: 'placed' | 'status';
  orderId: string;
  status?: Order['status'];
  orderType?: OrderType;
  restaurantId?: string;
  at: number;
  unread: boolean;
}

export const ACTIVE_STATUSES: Order['status'][] = ['Pending', 'Preparing', 'Ready'];
export const shortId = (id: string) => id.slice(-6).toUpperCase();
export const orderTypeOf = (o: Pick<Order, 'order_type'>): OrderType =>
  o.order_type === 'DINE_IN' ? 'dinein' : o.order_type === 'DELIVERY' ? 'delivery' : 'pickup';

interface AppCtx {
  user: AppUser | null;
  signIn: (token: string, user: AppUser) => void;
  signOut: () => void;
  addresses: AppAddress[];
  saveAddresses: (list: AppAddress[]) => Promise<void>;
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: 'en' | 'ar';
  setLang: (l: 'en' | 'ar') => void;
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;
  table: string;
  setTable: (t: string) => void;
  defaultPay: PayMethod;
  setDefaultPay: (p: PayMethod) => void;
  notifOn: boolean;
  setNotifOn: (on: boolean) => void;
  notifs: Notif[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  toastMsg: string | null;
  toast: (msg: string) => void;
  restaurants: PublicRestaurant[];
  restaurantsLoading: boolean;
  restaurantById: (id: string | null | undefined) => PublicRestaurant | undefined;
  orders: Order[];
  ordersLoading: boolean;
  refreshOrders: () => void;
  trackOrder: (order: Order) => void;
  guestCheckout: boolean;
  setGuestCheckout: (on: boolean) => void;
  /** Home search + cuisine filter; shared with the web header search box. */
  query: string;
  setQuery: (q: string) => void;
  cat: string;
  setCat: (c: string) => void;
}

const Ctx = createContext<AppCtx | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function historyIds(): string[] {
  const raw = read<unknown[]>('order_history', []);
  return raw.map((e: any) => typeof e === 'string' ? e : (e?._id ?? e?.id)).filter(Boolean);
}

export function initialTheme(): Theme {
  const stored = read<Theme | null>('mg_theme', null);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  repaintBrand();
}

export const AppProvider: React.FC<{ children: React.ReactNode; initialOrderType?: OrderType; initialTable?: string }> = ({ children, initialOrderType, initialTable }) => {
  const { i18n } = useTranslation();

  const [user, setUser] = useState<AppUser | null>(getStoredUser);
  const [localAddresses, setLocalAddresses] = useState<AppAddress[]>(() => read('mg_addresses', []));
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [orderType, setOrderType] = useState<OrderType>(initialOrderType ?? 'pickup');
  const [table, setTable] = useState(initialTable ?? '');
  const [defaultPay, setDefaultPayState] = useState<PayMethod>(() => read('mg_pay', 'cash'));
  const [notifOn, setNotifOnState] = useState<boolean>(() => read('mg_notif_on', true));
  const [notifs, setNotifs] = useState<Notif[]>(() => read('mg_notifs', []));
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<PublicRestaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [guestCheckout, setGuestCheckout] = useState(false);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');

  const notifOnRef = useRef(notifOn);
  notifOnRef.current = notifOn;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  // ── Theme & language ──────────────────────────────────────────────
  useEffect(() => { applyTheme(theme); write('mg_theme', theme); }, [theme]);
  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  const lang = (i18n.language === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  const setLang = useCallback((l: 'en' | 'ar') => {
    i18n.changeLanguage(l);
    try { localStorage.setItem('lang', l); } catch { /* ignore */ }
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  }, [i18n]);

  // ── Preferences ───────────────────────────────────────────────────
  const setDefaultPay = useCallback((p: PayMethod) => { setDefaultPayState(p); write('mg_pay', p); }, []);
  const setNotifOn = useCallback((on: boolean) => { setNotifOnState(on); write('mg_notif_on', on); }, []);

  // ── Toast ─────────────────────────────────────────────────────────
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200);
  }, []);

  // ── Notifications ─────────────────────────────────────────────────
  useEffect(() => { write('mg_notifs', notifs.slice(0, 50)); }, [notifs]);
  const pushNotif = useCallback((n: Omit<Notif, 'id' | 'at' | 'unread'>) => {
    if (!notifOnRef.current) return;
    setNotifs(prev => [{ ...n, id: `${n.orderId}-${n.kind}-${n.status ?? ''}-${Date.now()}`, at: Date.now(), unread: true }, ...prev].slice(0, 50));
  }, []);
  const markRead = useCallback((id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n)), []);
  const markAllRead = useCallback(() => setNotifs(prev => prev.map(n => ({ ...n, unread: false }))), []);
  const unread = notifs.filter(n => n.unread).length;

  // ── Session ───────────────────────────────────────────────────────
  const signIn = useCallback((token: string, u: AppUser) => {
    saveSession(token, u);
    setUser(u);
    // Carry addresses saved as a guest over to the account.
    if (localAddresses.length && !u.addresses.length) {
      appFetch('/api/app/me', { method: 'PATCH', body: JSON.stringify({ addresses: localAddresses }) })
        .then(r => r.ok ? r.json() : null)
        .then(next => { if (next) { setUser(next); saveSession(null, next); } })
        .catch(() => {});
    }
  }, [localAddresses]);

  const signOut = useCallback(() => {
    saveSession(null, null);
    setUser(null);
    setGuestCheckout(false);
  }, []);

  // Refresh the profile on launch; drop the session if the token is no longer valid.
  useEffect(() => {
    if (!getAppToken()) return;
    appFetch('/api/app/me')
      .then(r => {
        if (r.status === 401) { signOut(); return null; }
        return r.ok ? r.json() : null;
      })
      .then(u => { if (u) { setUser(u); saveSession(null, u); } })
      .catch(() => {});
  }, [signOut]);

  const addresses = user ? user.addresses : localAddresses;
  const saveAddresses = useCallback(async (list: AppAddress[]) => {
    if (!user) {
      setLocalAddresses(list);
      write('mg_addresses', list);
      return;
    }
    setUser({ ...user, addresses: list });
    const r = await appFetch('/api/app/me', { method: 'PATCH', body: JSON.stringify({ addresses: list }) });
    if (r.ok) { const next = await r.json(); setUser(next); saveSession(null, next); }
  }, [user]);

  // ── Restaurants ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/restaurants/public')
      .then(r => r.ok ? r.json() : [])
      .then(data => setRestaurants(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setRestaurantsLoading(false));
  }, []);
  const restaurantById = useCallback((id: string | null | undefined) => restaurants.find(r => r._id === id), [restaurants]);

  // ── Orders ────────────────────────────────────────────────────────
  const refreshOrders = useCallback(() => {
    const ids = historyIds().slice(0, 20);
    const local = Promise.all(ids.map(id => fetch(`/api/orders/${id}`).then(r => r.ok ? r.json() : null).catch(() => null)));
    const remote = getAppToken()
      ? appFetch('/api/app/orders').then(r => r.ok ? r.json() : []).catch(() => [])
      : Promise.resolve([]);
    Promise.all([local, remote]).then(([a, b]) => {
      const byId = new Map<string, Order>();
      [...(b as Order[]), ...(a.filter(Boolean) as Order[])].forEach(o => byId.set(o._id, o));
      setOrders([...byId.values()].sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt)));
    }).finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => { refreshOrders(); }, [refreshOrders, user?.id]);

  const socketRef = useRef<Socket | null>(null);
  const joined = useRef(new Set<string>());

  const trackOrder = useCallback((order: Order) => {
    const ids = historyIds().filter(id => id !== order._id);
    write('order_history', [order._id, ...ids].slice(0, 20));
    setOrders(prev => [order, ...prev.filter(o => o._id !== order._id)]);
    pushNotif({ kind: 'placed', orderId: order._id, orderType: orderTypeOf(order), restaurantId: order.restaurantId });
  }, [pushNotif]);

  // One socket for the app; joins the room of every order that can still change.
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin, { path: '/socket.io' });
    socketRef.current = socket;
    socket.on('connect', () => {
      joined.current.clear();
      ordersRef.current.filter(o => ACTIVE_STATUSES.includes(o.status)).forEach(o => {
        socket.emit('order:join', o._id);
        joined.current.add(o._id);
      });
    });
    socket.on('order:status', ({ id, status }: { id: string; status: Order['status'] }) => {
      const prev = ordersRef.current.find(o => o._id === id);
      if (!prev || prev.status === status) return;
      setOrders(list => list.map(o => o._id === id ? { ...o, status } : o));
      pushNotif({ kind: 'status', orderId: id, status, orderType: orderTypeOf(prev), restaurantId: prev.restaurantId });
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [pushNotif]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    orders.filter(o => ACTIVE_STATUSES.includes(o.status) && !joined.current.has(o._id)).forEach(o => {
      socket.emit('order:join', o._id);
      joined.current.add(o._id);
    });
  }, [orders]);

  const value = useMemo<AppCtx>(() => ({
    user, signIn, signOut, addresses, saveAddresses, theme, setTheme, lang, setLang,
    orderType, setOrderType, table, setTable, defaultPay, setDefaultPay, notifOn, setNotifOn,
    notifs, unread, markRead, markAllRead, toastMsg, toast,
    restaurants, restaurantsLoading, restaurantById, orders, ordersLoading, refreshOrders, trackOrder,
    guestCheckout, setGuestCheckout, query, setQuery, cat, setCat,
  }), [user, signIn, signOut, addresses, saveAddresses, theme, setTheme, lang, setLang, orderType, table, defaultPay, setDefaultPay,
    notifOn, setNotifOn, notifs, unread, markRead, markAllRead, toastMsg, toast, restaurants, restaurantsLoading, restaurantById,
    orders, ordersLoading, refreshOrders, trackOrder, guestCheckout, query, cat]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useApp = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

/** Design copy lives under the `mg` namespace of the customer locale files. */
export function useMg() {
  const { t } = useTranslation();
  return useCallback((key: string, opts?: Record<string, unknown>) => t(`mg.${key}`, opts as any) as string, [t]);
}
