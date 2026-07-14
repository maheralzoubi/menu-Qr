import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { CartProvider } from './contexts/CartContext';
import { HomeScreen } from './screens/HomeScreen';
import { RestaurantScreen } from './screens/RestaurantScreen';
import { CartScreen } from './screens/CartScreen';
import { OrderTrackingScreen } from './screens/OrderTrackingScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { BottomNav } from './components/BottomNav';
import { useRestaurant } from './hooks/useRestaurant';
import { restoreDefaultColor } from './lib/branding';

export type MainTab = 'home' | 'orders' | 'profile';
export type Overlay =
  | null
  | { type: 'restaurant'; id: string; name: string; logo?: string }
  | { type: 'cart' }
  | { type: 'tracking'; orderId: string };

type NavState = { tab: MainTab; overlay: Overlay };

const slideUp = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } },
};

function buildSearch(state: NavState): string {
  const params = new URLSearchParams();
  params.set('tab', state.tab);
  if (state.overlay?.type === 'restaurant') {
    params.set('screen', 'restaurant');
    params.set('rid', state.overlay.id);
    params.set('rname', state.overlay.name);
    if (state.overlay.logo) params.set('rlogo', state.overlay.logo);
  } else if (state.overlay?.type === 'cart') {
    params.set('screen', 'cart');
  } else if (state.overlay?.type === 'tracking') {
    params.set('screen', 'tracking');
    params.set('orderId', state.overlay.orderId);
  }
  return `?${params.toString()}`;
}

function parseSearch(search: string): NavState {
  const params = new URLSearchParams(search);
  const rawTab = params.get('tab');
  const tab: MainTab = rawTab === 'orders' || rawTab === 'profile' ? rawTab : 'home';

  const screen = params.get('screen');
  let overlay: Overlay = null;
  if (screen === 'restaurant') {
    const id = params.get('rid');
    const name = params.get('rname');
    if (id && name) overlay = { type: 'restaurant', id, name, logo: params.get('rlogo') || undefined };
  } else if (screen === 'cart') {
    overlay = { type: 'cart' };
  } else if (screen === 'tracking') {
    const orderId = params.get('orderId');
    if (orderId) overlay = { type: 'tracking', orderId };
  }
  return { tab, overlay };
}

export default function App() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [splash, setSplash] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>(() => parseSearch(window.location.search).tab);
  const [overlay, setOverlay] = useState<Overlay>(() => parseSearch(window.location.search).overlay);
  const mainTabRef = useRef(mainTab);
  useEffect(() => { mainTabRef.current = mainTab; }, [mainTab]);

  // Attach nav state to the current history entry without touching the URL,
  // so QR-link params (?restaurant=&table=) below stay intact for useRestaurant to read.
  useEffect(() => {
    window.history.replaceState({ tab: mainTab, overlay } satisfies NavState, '', window.location.href);
  }, []);

  // Sync browser/hardware back & forward navigation with in-app screen state.
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = (e.state as NavState | null) ?? parseSearch(window.location.search);
      setMainTab(state.tab);
      setOverlay(state.overlay);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const pushNav = useCallback((next: NavState, replace: boolean) => {
    const url = buildSearch(next);
    if (replace) window.history.replaceState(next, '', url);
    else window.history.pushState(next, '', url);
  }, []);

  const changeTab = useCallback((tab: MainTab) => {
    setMainTab(tab);
    setOverlay(null);
    pushNav({ tab, overlay: null }, true);
  }, [pushNav]);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1000);
    return () => clearTimeout(t);
  }, []);

  const { context: qrContext, loading: qrLoading } = useRestaurant();

  const openRestaurant = useCallback((id: string, name: string, logo?: string) => {
    const next: Overlay = { type: 'restaurant', id, name, logo };
    setOverlay(next);
    pushNav({ tab: mainTabRef.current, overlay: next }, false);
  }, [pushNav]);

  // Auto-open restaurant when the page is loaded via a QR code URL (?restaurant=&table=)
  useEffect(() => {
    if (!qrLoading && qrContext) {
      openRestaurant(qrContext.restaurantId, qrContext.restaurantName, qrContext.logo || undefined);
    }
  }, [qrLoading, qrContext, openRestaurant]);

  const openCart = useCallback(() => {
    const next: Overlay = { type: 'cart' };
    setOverlay(next);
    pushNav({ tab: mainTabRef.current, overlay: next }, false);
  }, [pushNav]);

  const openTracking = useCallback((orderId: string) => {
    const next: Overlay = { type: 'tracking', orderId };
    setOverlay(next);
    pushNav({ tab: mainTabRef.current, overlay: next }, false);
  }, [pushNav]);

  const closeOverlay = useCallback(() => {
    restoreDefaultColor();
    window.history.back();
  }, []);

  const handleOrderPlaced = useCallback((orderId: string) => {
    const next: Overlay = { type: 'tracking', orderId };
    setOverlay(next);
    // Replaces the cart's history entry so "back" from tracking skips the now-emptied cart.
    pushNav({ tab: mainTabRef.current, overlay: next }, true);
  }, [pushNav]);

  return (
    <CartProvider>
      <AnimatePresence>
        {splash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] bg-surface flex items-center justify-center"
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            <motion.img
              src="/logo-dark.svg"
              alt="Menu QR"
              className="h-14 w-auto"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.35 } }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-surface flex flex-col select-none">
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '5rem' }}>
          <AnimatePresence mode="wait">
            {mainTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HomeScreen onOpenRestaurant={openRestaurant} onOpenTracking={openTracking} onViewAllOrders={() => changeTab('orders')} />
              </motion.div>
            )}
            {mainTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <OrdersScreen onOpenTracking={openTracking} />
              </motion.div>
            )}
            {mainTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProfileScreen />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <BottomNav activeTab={mainTab} onTabChange={changeTab} onCartOpen={openCart} />

        {/* Full-screen Overlays */}
        <AnimatePresence>
          {overlay?.type === 'restaurant' && (
            <motion.div key="restaurant" className="fixed inset-0 z-40 bg-surface" {...slideUp}>
              <RestaurantScreen
                restaurantId={overlay.id}
                restaurantName={overlay.name}
                restaurantLogo={overlay.logo}
                onBack={closeOverlay}
                onCartOpen={openCart}
              />
            </motion.div>
          )}
          {overlay?.type === 'cart' && (
            <motion.div key="cart" className="fixed inset-0 z-50 bg-surface" {...slideUp}>
              <CartScreen onBack={closeOverlay} onOrderPlaced={handleOrderPlaced} />
            </motion.div>
          )}
          {overlay?.type === 'tracking' && (
            <motion.div key="tracking" className="fixed inset-0 z-50 bg-surface" {...slideUp}>
              <OrderTrackingScreen
                orderId={overlay.orderId}
                onClose={closeOverlay}
                onViewOrders={() => { restoreDefaultColor(); changeTab('orders'); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CartProvider>
  );
}
