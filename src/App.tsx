import { useState, useCallback, useEffect } from 'react';
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

const slideUp = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } },
};

export default function App() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [mainTab, setMainTab] = useState<MainTab>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);

  const { context: qrContext, loading: qrLoading } = useRestaurant();

  const openRestaurant = useCallback((id: string, name: string, logo?: string) => {
    setOverlay({ type: 'restaurant', id, name, logo });
  }, []);

  // Auto-open restaurant when the page is loaded via a QR code URL (?restaurant=&table=)
  useEffect(() => {
    if (!qrLoading && qrContext) {
      openRestaurant(qrContext.restaurantId, qrContext.restaurantName, qrContext.logo || undefined);
    }
  }, [qrLoading, qrContext, openRestaurant]);

  const openCart = useCallback(() => setOverlay({ type: 'cart' }), []);
  const openTracking = useCallback((orderId: string) => setOverlay({ type: 'tracking', orderId }), []);
  const closeOverlay = useCallback(() => { setOverlay(null); restoreDefaultColor(); }, []);

  const handleOrderPlaced = useCallback((orderId: string) => {
    setOverlay(null);
    setTimeout(() => setOverlay({ type: 'tracking', orderId }), 50);
  }, []);

  return (
    <CartProvider>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-surface flex flex-col select-none">
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '5rem' }}>
          <AnimatePresence mode="wait">
            {mainTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HomeScreen onOpenRestaurant={openRestaurant} onOpenTracking={openTracking} onViewAllOrders={() => setMainTab('orders')} />
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

        <BottomNav activeTab={mainTab} onTabChange={setMainTab} onCartOpen={openCart} />

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
                onViewOrders={() => { closeOverlay(); setMainTab('orders'); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CartProvider>
  );
}
