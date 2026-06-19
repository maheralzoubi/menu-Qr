import { useState, useEffect } from 'react';
import { Search, Bell, ChevronRight, Clock, Star, RefreshCw, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { CustomerInfo } from '../lib/customerAuth';

interface Restaurant {
  _id: string;
  name: string;
  logo?: string;
  address?: string;
  status: string;
  averageRating: number;
}

interface Props {
  customer: CustomerInfo | null;
  onOpenRestaurant: (id: string, name: string, logo?: string) => void;
  onOpenTracking: (orderId: string) => void;
  onLoginRequest: () => void;
}

const FOOD_CATEGORIES = [
  { label: 'All',       emoji: '⚡' },
  { label: 'Coffee',    emoji: '☕' },
  { label: 'Burgers',   emoji: '🍔' },
  { label: 'Pizza',     emoji: '🍕' },
  { label: 'Pasta',     emoji: '🍝' },
  { label: 'Shawarma',  emoji: '🌯' },
  { label: 'Salads',    emoji: '🥗' },
  { label: 'Desserts',  emoji: '🍰' },
  { label: 'Drinks',    emoji: '🥤' },
  { label: 'Breakfast', emoji: '🍳' },
  { label: 'Chicken',   emoji: '🍗' },
  { label: 'Healthy',   emoji: '🌿' },
];

const PROMOS = [
  { label: 'Free Pickup',   sub: 'All orders this week',  emoji: '🛍️', from: 'from-primary to-primary/70' },
  { label: '20% Off Mains', sub: 'On orders over $30',    emoji: '🍽️', from: 'from-amber-500 to-orange-400' },
  { label: 'New Arrivals',  sub: 'Try our latest menu',   emoji: '✨', from: 'from-violet-500 to-indigo-400' },
];

const PREP_TIMES = ['10–15 min', '15–20 min', '20–25 min', '25–30 min'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return '🌙 Good night';
  if (h < 12) return '☀️ Good morning';
  if (h < 17) return '🌤️ Good afternoon';
  return '🌙 Good evening';
}

export const HomeScreen = ({ customer, onOpenRestaurant, onOpenTracking }: Props) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [promoIdx, setPromoIdx] = useState(0);

  useEffect(() => {
    fetch('/api/restaurants/public')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setRestaurants(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      const history: string[] = JSON.parse(localStorage.getItem('order_history') || '[]');
      if (!history.length) return;
      Promise.all(history.slice(0, 3).map(id => fetch(`/api/orders/${id}`).then(r => r.ok ? r.json() : null)))
        .then(orders => setRecentOrders(orders.filter(Boolean)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPromoIdx(i => (i + 1) % PROMOS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const firstName = customer?.name?.split(' ')[0] || '';

  return (
    <div className="bg-gray-50 min-h-screen pb-4">
      {/* Sticky Header */}
      <div className="bg-surface px-5 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-on-surface-variant">{getGreeting()}</p>
            <h1 className="text-xl font-extrabold font-headline">{firstName ? `Hi, ${firstName}!` : 'Monar'}</h1>
          </div>
          <button className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
            <Bell className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>
        <button className="w-full flex items-center gap-3 bg-surface-container rounded-2xl px-4 py-3 text-on-surface-variant">
          <Search className="w-4 h-4 shrink-0" />
          <span className="text-sm">Search restaurants or dishes...</span>
        </button>
      </div>

      <div className="px-5 pt-5 space-y-6">
        {/* Promo Slider */}
        <div>
          <div className="overflow-hidden rounded-2xl">
            <div className="flex transition-transform duration-500" style={{ transform: `translateX(${isRTL ? '' : '-'}${promoIdx * 100}%)` }}>
              {PROMOS.map((p, i) => (
                <div key={i} className={`min-w-full bg-gradient-to-r ${p.from} rounded-2xl p-5 flex items-center justify-between`}>
                  <div className="text-white">
                    <p className="text-xl font-extrabold">{p.label}</p>
                    <p className="text-sm opacity-80 mt-0.5">{p.sub}</p>
                  </div>
                  <span className="text-5xl">{p.emoji}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-1.5 mt-2.5">
            {PROMOS.map((_, i) => (
              <button key={i} onClick={() => setPromoIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === promoIdx ? 'w-5 bg-primary' : 'w-1.5 bg-surface-container'}`} />
            ))}
          </div>
        </div>

        {/* Food Categories */}
        <div>
          <h2 className="text-base font-extrabold mb-3">What are you craving?</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {FOOD_CATEGORIES.map(cat => (
              <button key={cat.label} onClick={() => setSelectedCategory(cat.label)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl transition-all active:scale-95 ${
                  selectedCategory === cat.label ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-surface text-on-surface-variant'
                }`}>
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[10px] font-bold">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold">Recent Orders</h2>
              <button className="text-xs text-primary font-bold flex items-center gap-0.5">View all <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {recentOrders.map(order => (
                <motion.button key={order._id} whileTap={{ scale: 0.96 }}
                  onClick={() => onOpenTracking(order._id)}
                  className="flex-shrink-0 w-44 bg-surface rounded-2xl p-3.5 text-left shadow-sm border border-surface-container">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">#{order._id?.slice(-4).toUpperCase()}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{order.status}</span>
                  </div>
                  <p className="text-xs font-bold truncate">{order.items?.slice(0,2).map((i: any) => i.name).join(', ')}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-extrabold text-primary">${order.total?.toFixed(2)}</span>
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <RefreshCw className="w-3 h-3" /><span className="text-[10px] font-bold">Reorder</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Restaurants */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold">
              {selectedCategory === 'All' ? 'Restaurants Near You' : `${selectedCategory} Places`}
            </h2>
            <span className="text-xs text-on-surface-variant">{restaurants.length} available</span>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-surface rounded-2xl h-24 animate-pulse" />)}</div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <p className="text-4xl mb-3">🍽️</p><p className="text-sm">No restaurants available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {restaurants.map((r, idx) => {
                const isOpen = r.status !== 'inactive';
                return (
                  <motion.button key={r._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    whileTap={{ scale: 0.98 }} onClick={() => isOpen && onOpenRestaurant(r._id, r.name, r.logo)}
                    className={`w-full bg-surface rounded-2xl overflow-hidden shadow-sm border border-surface-container text-left flex items-center gap-4 p-4 ${!isOpen ? 'opacity-60' : ''}`}>
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container shrink-0 flex items-center justify-center">
                      {r.logo ? <img src={r.logo} alt={r.name} className="w-full h-full object-cover" /> : <span className="text-3xl">🍽️</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-extrabold text-sm truncate">{r.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      {r.address && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-on-surface-variant shrink-0" />
                          <p className="text-xs text-on-surface-variant truncate">{r.address}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {r.averageRating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-bold">{r.averageRating}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-on-surface-variant">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{PREP_TIMES[idx % PREP_TIMES.length]}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-on-surface-variant/40 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
