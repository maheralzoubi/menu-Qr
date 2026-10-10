import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { CartProvider, useCart } from './contexts/CartContext';
import { NavCtx, routeFromSearch, routeToSearch, TAB_ROUTES, type Nav, type Route, type Tab } from './navigation';
import { useViewport } from './hooks/useViewport';
import { applyPrimaryColor } from './lib/branding';
import { BottomNav, CartBar, WebFooter, WebHeader } from './components/mg/Chrome';
import { Toast } from './components/mg/ui';
import { HomeScreen } from './screens/HomeScreen';
import { RestaurantScreen } from './screens/RestaurantScreen';
import { CartScreen } from './screens/CartScreen';
import { OrderTrackingScreen } from './screens/OrderTrackingScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { SignInScreen } from './screens/SignInScreen';
import { getStoredUser } from './lib/appAuth';

interface QrContext { restaurantId: string; table: string; fromUrl: boolean }

/** Table QR links look like ?restaurant=ID&table=T. The table is kept for this session only. */
function readQr(): QrContext | null {
  const p = new URLSearchParams(window.location.search);
  const restaurantId = p.get('restaurant');
  if (restaurantId) {
    const ctx = { restaurantId, table: p.get('table') ?? '' };
    try { sessionStorage.setItem('mg_qr', JSON.stringify(ctx)); } catch { /* ignore */ }
    return { ...ctx, fromUrl: true };
  }
  try {
    const raw = sessionStorage.getItem('mg_qr');
    if (raw) return { ...JSON.parse(raw), fromUrl: false };
  } catch { /* ignore */ }
  return null;
}

type HistState = { route: Route; depth: number };

export default function App() {
  const qr = useMemo(readQr, []);
  return (
    <AppProvider initialOrderType={qr?.table ? 'dinein' : undefined} initialTable={qr?.table || undefined}>
      <CartProvider>
        <Shell qr={qr} />
      </CartProvider>
    </AppProvider>
  );
}

function initialRoute(qr: QrContext | null, small: boolean): Route {
  if (qr?.fromUrl) return { name: 'rest', id: qr.restaurantId };
  const fromUrl = routeFromSearch(window.location.search);
  if (fromUrl) return fromUrl;
  // The phone design opens on sign-in the first time (with "Skip for Now").
  let onboarded = true;
  try { onboarded = localStorage.getItem('mg_onboarded') === '1'; } catch { /* ignore */ }
  if (small && !onboarded && !getStoredUser()) return { name: 'signin', after: 'home' };
  return { name: 'home' };
}

function Shell({ qr }: { qr: QrContext | null }) {
  const { small, mid, wide, narrow } = useViewport();
  const { restaurantById, orders, toastMsg, lang } = useApp();
  const cart = useCart();

  const [route, setRoute] = useState<Route>(() => initialRoute(qr, small));
  const depth = useRef(0);

  // Seed history. A QR deep link sits on top of home so "back" lands on the restaurant list.
  useEffect(() => {
    if (qr?.fromUrl) {
      window.history.replaceState({ route: { name: 'home' }, depth: 0 } satisfies HistState, '', routeToSearch({ name: 'home' }));
      window.history.pushState({ route, depth: 1 } satisfies HistState, '', routeToSearch(route));
      depth.current = 1;
    } else {
      window.history.replaceState({ route, depth: 0 } satisfies HistState, '', window.location.href);
    }
    const onPop = (e: PopStateEvent) => {
      const st = e.state as HistState | null;
      setRoute(st?.route ?? routeFromSearch(window.location.search) ?? { name: 'home' });
      depth.current = st?.depth ?? 0;
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback<Nav['go']>((next, opts) => {
    if (opts?.replace) {
      window.history.replaceState({ route: next, depth: depth.current } satisfies HistState, '', routeToSearch(next));
    } else {
      depth.current += 1;
      window.history.pushState({ route: next, depth: depth.current } satisfies HistState, '', routeToSearch(next));
    }
    setRoute(next);
  }, []);

  const tab = useCallback((t: Tab) => {
    go({ name: t }, { replace: TAB_ROUTES.includes(route.name) });
  }, [go, route.name]);

  const back = useCallback(() => {
    if (depth.current > 0) window.history.back();
    else go({ name: 'home' }, { replace: true });
  }, [go]);

  const nav = useMemo<Nav>(() => ({ route, go, tab, back }), [route, go, tab, back]);

  const routeKey = JSON.stringify(route);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [routeKey]);

  // Restaurant screens take the restaurant's brand colour; everything else is Menu Go orange.
  const brandRestaurantId =
    route.name === 'rest' ? route.id
    : route.name === 'cart' ? cart.restaurantId
    : route.name === 'track' ? orders.find(o => o._id === route.orderId)?.restaurantId
    : null;
  const brandRestaurant = restaurantById(brandRestaurantId);
  useEffect(() => { applyPrimaryColor(brandRestaurant?.primaryColor); }, [brandRestaurant?.primaryColor]);
  useEffect(() => {
    document.title = route.name === 'rest' && brandRestaurant ? `${brandRestaurant.name} · Menu Go` : 'Menu Go';
  }, [route.name, brandRestaurant]);

  const table = qr && route.name === 'rest' && route.id === qr.restaurantId ? qr.table : '';

  let screen: React.ReactNode;
  switch (route.name) {
    case 'home': screen = <HomeScreen />; break;
    case 'orders': screen = <OrdersScreen />; break;
    case 'profile': screen = <ProfileScreen />; break;
    case 'rest': screen = <RestaurantScreen restaurantId={route.id} qrTable={table} />; break;
    case 'cart': screen = <CartScreen />; break;
    case 'track': screen = <OrderTrackingScreen orderId={route.orderId} />; break;
    case 'notifs': screen = <NotificationsScreen />; break;
    case 'signin': screen = <SignInScreen after={route.after} />; break;
  }

  const hasCart = cart.items.length > 0;
  const onCartScreens = route.name === 'home' || route.name === 'rest';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (mid) {
    return (
      <NavCtx.Provider value={nav}>
        <div dir={dir} className="min-h-screen bg-bg text-fg font-sans">
          <WebHeader wide={wide} />
          <main key={routeKey}>{screen}</main>
          <WebFooter />
          {hasCart && narrow && onCartScreens && <CartBar web />}
          <Toast msg={toastMsg} web />
        </div>
      </NavCtx.Provider>
    );
  }

  const showNav = TAB_ROUTES.includes(route.name);
  return (
    <NavCtx.Provider value={nav}>
      <div dir={dir} className="min-h-screen bg-bg text-fg font-sans" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div key={routeKey}>{screen}</div>
        {hasCart && onCartScreens && <CartBar aboveNav={showNav} />}
        {showNav && <BottomNav />}
        <Toast msg={toastMsg} web={false} />
      </div>
    </NavCtx.Provider>
  );
}
