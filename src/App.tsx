import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { CartProvider } from './contexts/CartContext';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { CustomerLoginScreen } from './screens/CustomerLoginScreen';
import { CustomerRegisterScreen } from './screens/CustomerRegisterScreen';
import { HomeScreen } from './screens/HomeScreen';
import { RestaurantScreen } from './screens/RestaurantScreen';
import { CartScreen } from './screens/CartScreen';
import { OrderTrackingScreen } from './screens/OrderTrackingScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { BottomNav } from './components/BottomNav';
import { getCustomerToken, clearCustomerToken, getCustomerInfo, setCustomerInfo, setCustomerToken } from './lib/customerAuth';
import type { CustomerInfo } from './lib/customerAuth';

type AuthScreen = 'welcome' | 'login' | 'register';
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

  const [authScreen, setAuthScreen] = useState<AuthScreen | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(getCustomerInfo());

  useEffect(() => {
    if (!getCustomerToken()) setAuthScreen('welcome');
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setCustomer(getCustomerInfo());
    setAuthScreen(null);
  }, []);

  const handleLogout = useCallback(() => {
    clearCustomerToken();
    setCustomer(null);
    setOverlay(null);
    setMainTab('home');
    setAuthScreen('welcome');
  }, []);

  const openRestaurant = useCallback((id: string, name: string, logo?: string) => {
    setOverlay({ type: 'restaurant', id, name, logo });
  }, []);

  const openCart = useCallback(() => setOverlay({ type: 'cart' }), []);
  const openTracking = useCallback((orderId: string) => setOverlay({ type: 'tracking', orderId }), []);
  const closeOverlay = useCallback(() => setOverlay(null), []);

  const handleOrderPlaced = useCallback((orderId: string) => {
    setOverlay(null);
    setTimeout(() => setOverlay({ type: 'tracking', orderId }), 50);
  }, []);

  if (authScreen) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-surface">
        <AnimatePresence mode="wait">
          {authScreen === 'welcome' && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WelcomeScreen
                onLogin={() => setAuthScreen('login')}
                onRegister={() => setAuthScreen('register')}
                onGuest={() => setAuthScreen(null)}
              />
            </motion.div>
          )}
          {authScreen === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <CustomerLoginScreen
                restaurantId=""
                onSuccess={handleAuthSuccess}
                onBack={() => setAuthScreen('welcome')}
                onRegisterClick={() => setAuthScreen('register')}
              />
            </motion.div>
          )}
          {authScreen === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <CustomerRegisterScreen
                restaurantId=""
                onSuccess={handleAuthSuccess}
                onBack={() => setAuthScreen('login')}
                onLoginClick={() => setAuthScreen('login')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <CartProvider>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50 flex flex-col select-none">
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '5rem' }}>
          <AnimatePresence mode="wait">
            {mainTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HomeScreen
                  customer={customer}
                  onOpenRestaurant={openRestaurant}
                  onOpenTracking={openTracking}
                  onLoginRequest={() => setAuthScreen('login')}
                />
              </motion.div>
            )}
            {mainTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <OrdersScreen
                  customer={customer}
                  onOpenTracking={openTracking}
                  onLoginRequest={() => setAuthScreen('login')}
                />
              </motion.div>
            )}
            {mainTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProfileScreen
                  customer={customer}
                  onLogout={handleLogout}
                  onLoginRequest={() => setAuthScreen('login')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <BottomNav activeTab={mainTab} onTabChange={setMainTab} onCartOpen={openCart} />

        {/* Full-screen Overlays */}
        <AnimatePresence>
          {overlay?.type === 'restaurant' && (
            <motion.div key="restaurant" className="fixed inset-0 z-40 bg-gray-50" {...slideUp}>
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
              <CartScreen
                onBack={closeOverlay}
                onOrderPlaced={handleOrderPlaced}
                customer={customer}
                onLoginRequest={() => { closeOverlay(); setAuthScreen('login'); }}
              />
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
