/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { io as socketIO } from 'socket.io-client';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Screen } from './types';
import { useCart } from './hooks/useCart';
import { useRestaurant } from './hooks/useRestaurant';
import { getCustomerToken, clearCustomerToken } from './lib/customerAuth';
import { requestFCMToken, onMessage, messaging } from './lib/firebase';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { RestaurantListScreen } from './screens/RestaurantListScreen';
import { ModeSelectionScreen } from './screens/ModeSelectionScreen';
import { QRScannerScreen } from './screens/QRScannerScreen';
import { fetchRestaurantContext } from './services/AppEntryHandler';
import { HomeScreen } from './screens/HomeScreen';
import { MenuScreen } from './screens/MenuScreen';
import { CartScreen } from './screens/CartScreen';
import { StatusScreen } from './screens/StatusScreen';
import { ReviewsScreen } from './screens/ReviewsScreen';
import { WriteReviewScreen } from './screens/WriteReviewScreen';
import { ReservationScreen } from './screens/ReservationScreen';
import { CustomerLoginScreen } from './screens/CustomerLoginScreen';
import { CustomerRegisterScreen } from './screens/CustomerRegisterScreen';
import { CustomerProfileScreen } from './screens/CustomerProfileScreen';

type AccountView = 'login' | 'register' | 'profile';
type EntryScreen = 'mode-selection' | 'qr-scanner' | 'restaurant-list';

function lightenHex(hex: string, amount = 0.22): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(Math.min(255, r + (255 - r) * amount));
  const lg = Math.round(Math.min(255, g + (255 - g) * amount));
  const lb = Math.round(Math.min(255, b + (255 - b) * amount));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

export default function App() {
  const { context, loading, setContext } = useRestaurant();
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [liveLogo, setLiveLogo] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof socketIO> | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [accountView, setAccountView] = useState<AccountView>('login');
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(!!getCustomerToken());
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [promoCode, setPromoCode] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [entryScreen, setEntryScreen] = useState<EntryScreen>('mode-selection');
  const { cart, addToCart, updateQuantity, removeFromCart, cartCount, subtotal, clearCart } = useCart();

  const totalWithTaxAndTip = subtotal - discount + tipAmount;
  const restaurantId = context?.restaurantId ?? '';
  const tableName = context?.tableName ?? '';
  const effectiveLogo = liveLogo ?? context?.logo ?? '';

  // Restore a pending order from localStorage when restaurant context loads
  useEffect(() => {
    if (!restaurantId) return;
    const raw = localStorage.getItem('pending_order');
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { orderId: string; restaurantId: string; savedAt: number };
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (saved.restaurantId === restaurantId && Date.now() - saved.savedAt < oneDayMs) {
        setCurrentOrderId(saved.orderId);
        setScreen('status');
      } else {
        localStorage.removeItem('pending_order');
      }
    } catch {
      localStorage.removeItem('pending_order');
    }
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Request FCM token once when restaurant context is available
  useEffect(() => {
    if (!restaurantId) return;
    requestFCMToken().then(token => { if (token) setFcmToken(token); });
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle foreground FCM messages (app is open) via browser Notification API
  useEffect(() => {
    const unsubscribe = onMessage(null, (payload) => {
      const title = payload.notification?.title ?? 'Order Update';
      const body = payload.notification?.body ?? '';
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    });
    return unsubscribe;
  }, []);

  // Apply restaurant primary color as CSS variables
  useEffect(() => {
    const color = primaryColor ?? context?.primaryColor ?? '#9b3f25';
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-container', lightenHex(color));
  }, [primaryColor, context?.primaryColor]);

  // Join restaurant socket room and listen for live branding updates
  useEffect(() => {
    if (!context?.restaurantId) return;
    const socket = socketIO();
    socketRef.current = socket;
    socket.emit('restaurant:join', context.restaurantId);
    socket.on('branding:updated', ({ primaryColor: color, logo }: { primaryColor: string; logo?: string }) => {
      setPrimaryColor(color);
      if (logo !== undefined) setLiveLogo(logo);
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [context?.restaurantId]);

  // Detecting URL/localStorage context
  if (loading) return null;

  // ── Flow 1: No context → entry hub ───────────────────────────────────────
  if (!context) {
    if (entryScreen === 'qr-scanner') {
      return (
        <QRScannerScreen
          onBack={() => setEntryScreen('mode-selection')}
          onScan={setContext}
        />
      );
    }
    if (entryScreen === 'restaurant-list') {
      return (
        <RestaurantListScreen
          onBack={() => setEntryScreen('mode-selection')}
          onSelect={(r) => {
            fetchRestaurantContext(r._id).then(ctx => { if (ctx) setContext(ctx); });
          }}
        />
      );
    }
    return (
      <ModeSelectionScreen
        onInsideRestaurant={() => setEntryScreen('qr-scanner')}
        onBrowseRestaurants={() => setEntryScreen('restaurant-list')}
      />
    );
  }

  // ── Flow 2: Context loaded (from QR scan) → full restaurant app ───────────

  const handlePlaceOrder = async () => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          total: totalWithTaxAndTip,
          discount: discount || undefined,
          promoCode: promoCode || undefined,
          restaurantId,
          tableNumber: tableName || undefined,
          fcmToken: fcmToken || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentOrderId(data._id);
        localStorage.setItem('pending_order', JSON.stringify({
          orderId: data._id,
          restaurantId,
          savedAt: Date.now(),
        }));
        clearCart();
        setPromoCode('');
        setDiscount(0);
        setScreen('status');
      }
    } catch (error) {
      console.error('Failed to place order:', error);
    }
  };

  const handleAccountNav = () => {
    setAccountView(isCustomerLoggedIn ? 'profile' : 'login');
    setScreen('account');
  };

  const getHeaderTitle = () => {
    const base = context.restaurantName;
    const tableLabel = tableName ? ` • ${tableName}` : '';
    switch (screen) {
      case 'menu': return `${base}${tableLabel}`;
      case 'cart': return 'Your Selection';
      case 'reviews': return 'Guest Notes';
      case 'write-review': return 'Write a Review';
      case 'status': return 'Order Status';
      case 'reservation': return 'Book a Table';
      case 'account': return isCustomerLoggedIn ? 'My Account' : 'Sign In';
      default: return '';
    }
  };

  const renderAccountScreen = () => {
    if (isCustomerLoggedIn) {
      return (
        <CustomerProfileScreen
          onLogout={() => { clearCustomerToken(); setIsCustomerLoggedIn(false); setScreen('home'); }}
        />
      );
    }
    if (accountView === 'register') {
      return (
        <CustomerRegisterScreen
          onSuccess={() => { setIsCustomerLoggedIn(true); setAccountView('profile'); }}
          onBack={() => setScreen('home')}
          onLoginClick={() => setAccountView('login')}
          restaurantId={restaurantId}
        />
      );
    }
    return (
      <CustomerLoginScreen
        onSuccess={() => { setIsCustomerLoggedIn(true); setAccountView('profile'); }}
        onBack={() => setScreen('home')}
        onRegisterClick={() => setAccountView('register')}
        restaurantId={restaurantId}
      />
    );
  };

  return (
    <div className="min-h-screen bg-surface-dim flex justify-center">
      <div className="w-full max-w-md bg-surface min-h-screen relative shadow-[0_0_100px_rgba(0,0,0,0.1)] overflow-x-hidden">
        {screen !== 'home' && (
          <Header
            title={getHeaderTitle()}
            logo={effectiveLogo || undefined}
            restaurantName={context.restaurantName}
          />
        )}

        <main className="min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="min-h-screen"
            >
              {screen === 'home' && (
                <HomeScreen
                  onStart={() => setScreen('menu')}
                  onReserve={() => setScreen('reservation')}
                  restaurantName={context.restaurantName}
                  logo={effectiveLogo || undefined}
                  restaurantId={restaurantId}
                />
              )}
              {screen === 'menu' && <MenuScreen addToCart={addToCart} restaurantId={restaurantId} />}
              {screen === 'cart' && (
                <CartScreen
                  cart={cart}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                  tipAmount={tipAmount}
                  setTipAmount={setTipAmount}
                  restaurantId={restaurantId}
                  discount={discount}
                  promoCode={promoCode}
                  onPromoApplied={(code, amount) => { setPromoCode(code); setDiscount(amount); }}
                />
              )}
{screen === 'status' && <StatusScreen orderId={currentOrderId} />}
              {screen === 'reviews' && <ReviewsScreen onWriteReview={() => setScreen('write-review')} restaurantId={restaurantId} />}
              {screen === 'write-review' && <WriteReviewScreen onSubmit={() => setScreen('reviews')} restaurantId={restaurantId} />}
              {screen === 'reservation' && <ReservationScreen onComplete={() => setScreen('home')} restaurantId={restaurantId} />}
              {screen === 'account' && renderAccountScreen()}
            </motion.div>
          </AnimatePresence>
        </main>

        {screen !== 'home' && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-4 pb-8 flex flex-col gap-4">
            {screen === 'cart' && cart.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-primary rounded-[2rem] p-1 shadow-2xl shadow-primary/20">
                <button onClick={handlePlaceOrder} className="w-full h-[64px] bg-primary active:scale-[0.98] transition-all duration-300 rounded-[1.75rem] flex items-center justify-between px-8 text-white">
                  <div className="flex flex-col items-start">
                    <span className="font-headline font-bold text-lg leading-tight">Place Order</span>
                    <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Instant Table Service</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-px bg-white/20" />
                    <span className="font-headline font-extrabold text-xl">${totalWithTaxAndTip.toFixed(2)}</span>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              </motion.div>
            )}
            <BottomNav
              activeScreen={screen}
              setScreen={(s) => { if (s === 'account') { handleAccountNav(); return; } setScreen(s); }}
              cartCount={cartCount}
              isLoggedIn={isCustomerLoggedIn}
            />
          </div>
        )}
      </div>
    </div>
  );
}
