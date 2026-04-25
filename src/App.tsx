/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Screen } from './types';
import { useCart } from './hooks/useCart';
import { getCustomerToken, clearCustomerToken } from './lib/customerAuth';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { MenuScreen } from './screens/MenuScreen';
import { CartScreen } from './screens/CartScreen';
import { PaymentScreen } from './screens/PaymentScreen';
import { StatusScreen } from './screens/StatusScreen';
import { ReviewsScreen } from './screens/ReviewsScreen';
import { WriteReviewScreen } from './screens/WriteReviewScreen';
import { ReservationScreen } from './screens/ReservationScreen';
import { CustomerLoginScreen } from './screens/CustomerLoginScreen';
import { CustomerRegisterScreen } from './screens/CustomerRegisterScreen';
import { CustomerProfileScreen } from './screens/CustomerProfileScreen';

type AccountView = 'login' | 'register' | 'profile';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [accountView, setAccountView] = useState<AccountView>('login');
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(!!getCustomerToken());
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const { cart, addToCart, updateQuantity, removeFromCart, cartCount, subtotal, clearCart } = useCart();

  const totalWithTaxAndTip = subtotal + tipAmount;

  const handlePlaceOrder = async () => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, total: totalWithTaxAndTip }),
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentOrderId(data._id);
        clearCart();
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
    switch (screen) {
      case 'menu': return 'The Artisan Kitchen • Table 12';
      case 'cart': return 'Your Selection';
      case 'payment': return 'Payment';
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
          onLogout={() => {
            clearCustomerToken();
            setIsCustomerLoggedIn(false);
            setScreen('home');
          }}
        />
      );
    }
    if (accountView === 'register') {
      return (
        <CustomerRegisterScreen
          onSuccess={() => { setIsCustomerLoggedIn(true); setAccountView('profile'); }}
          onBack={() => setScreen('home')}
          onLoginClick={() => setAccountView('login')}
        />
      );
    }
    return (
      <CustomerLoginScreen
        onSuccess={() => { setIsCustomerLoggedIn(true); setAccountView('profile'); }}
        onBack={() => setScreen('home')}
        onRegisterClick={() => setAccountView('register')}
      />
    );
  };

  return (
    <div className="min-h-screen bg-surface-dim flex justify-center">
      <div className="w-full max-w-md bg-surface min-h-screen relative shadow-[0_0_100px_rgba(0,0,0,0.1)] overflow-x-hidden">
        {screen !== 'home' && <Header title={getHeaderTitle()} />}

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
                <HomeScreen onStart={() => setScreen('menu')} onReserve={() => setScreen('reservation')} />
              )}
              {screen === 'menu' && <MenuScreen addToCart={addToCart} />}
              {screen === 'cart' && (
                <CartScreen cart={cart} updateQuantity={updateQuantity} removeFromCart={removeFromCart} tipAmount={tipAmount} setTipAmount={setTipAmount} />
              )}
              {screen === 'payment' && <PaymentScreen total={totalWithTaxAndTip} onComplete={handlePlaceOrder} />}
              {screen === 'status' && <StatusScreen orderId={currentOrderId} />}
              {screen === 'reviews' && <ReviewsScreen onWriteReview={() => setScreen('write-review')} />}
              {screen === 'write-review' && <WriteReviewScreen onSubmit={() => setScreen('reviews')} />}
              {screen === 'reservation' && <ReservationScreen onComplete={() => setScreen('home')} />}
              {screen === 'account' && renderAccountScreen()}
            </motion.div>
          </AnimatePresence>
        </main>

        {screen !== 'home' && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-4 pb-8 flex flex-col gap-4">
            {screen === 'cart' && cart.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-primary rounded-[2rem] p-1 shadow-2xl shadow-primary/20">
                <button onClick={() => setScreen('payment')} className="w-full h-[64px] bg-primary active:scale-[0.98] transition-all duration-300 rounded-[1.75rem] flex items-center justify-between px-8 text-white">
                  <div className="flex flex-col items-start">
                    <span className="font-headline font-bold text-lg leading-tight">Place Order</span>
                    <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Instant Table Service</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-px bg-white/20"></div>
                    <span className="font-headline font-extrabold text-xl">${totalWithTaxAndTip.toFixed(2)}</span>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              </motion.div>
            )}
            <BottomNav
              activeScreen={screen}
              setScreen={(s) => {
                if (s === 'account') { handleAccountNav(); return; }
                setScreen(s);
              }}
              cartCount={cartCount}
              isLoggedIn={isCustomerLoggedIn}
            />
          </div>
        )}
      </div>
    </div>
  );
}
