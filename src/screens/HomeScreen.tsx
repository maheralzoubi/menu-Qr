import { useState, useEffect } from 'react';
import { Search, Bell, ChevronRight, Clock, Star, RefreshCw, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface Restaurant {
  _id: string;
  name: string;
  logo?: string;
  address?: string;
  status: string;
  averageRating: number;
}

interface Props {
  onOpenRestaurant: (id: string, name: string, logo?: string) => void;
  onOpenTracking: (orderId: string) => void;
}

const FOOD_CATEGORIES = [
  { key: 'All',       emoji: '⚡' },
  { key: 'Coffee',    emoji: '☕' },
  { key: 'Burgers',   emoji: '🍔' },
  { key: 'Pizza',     emoji: '🍕' },
  { key: 'Pasta',     emoji: '🍝' },
  { key: 'Shawarma',  emoji: '🌯' },
  { key: 'Salads',    emoji: '🥗' },
  { key: 'Desserts',  emoji: '🍰' },
  { key: 'Drinks',    emoji: '🥤' },
  { key: 'Breakfast', emoji: '🍳' },
  { key: 'Chicken',   emoji: '🍗' },
  { key: 'Healthy',   emoji: '🌿' },
];

const PROMOS = [
  { label: 'Free Pickup',   sub: 'All orders this week' },
  { label: '20% Off Mains', sub: 'On orders over $30'   },
  { label: 'New Arrivals',  sub: 'Try our latest menu'  },
];

const PREP_TIMES = ['10–15', '15–20', '20–25', '25–30'];

export const HomeScreen = ({ onOpenRestaurant, onOpenTracking }: Props) => {
  const { t, i18n } = useTranslation();
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
    const timer = setInterval(() => setPromoIdx(i => (i + 1) % PROMOS.length), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-surface min-h-screen pb-4">
      {/* Sticky Header */}
      <div className="bg-surface px-5 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <img src="/logo-dark.svg" alt="Monar" className="h-7 w-auto" />
          <button className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
            <Bell className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>
        <button className="w-full flex items-center gap-3 bg-surface-container rounded-2xl px-4 py-3 text-on-surface-variant">
          <Search className="w-4 h-4 shrink-0" />
          <span className="text-sm">{t('app.searchPlaceholder')}</span>
        </button>
      </div>

      <div className="px-5 pt-5 space-y-6">
        {/* Promo Slider */}
        <div>
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500"
              style={{ transform: `translateX(${isRTL ? '' : '-'}${promoIdx * 100}%)` }}
            >
              {PROMOS.map((p, i) => (
                <div key={i} className="min-w-full bg-gradient-to-r from-primary to-primary-container rounded-2xl p-5 flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-xl font-extrabold">{p.label}</p>
                    <p className="text-sm opacity-80 mt-0.5">{p.sub}</p>
                  </div>
                  <span className="text-5xl">🛍️</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-1.5 mt-2.5">
            {PROMOS.map((_, i) => (
              <button key={i} onClick={() => setPromoIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === promoIdx ? 'w-5 bg-primary' : 'w-1.5 bg-surface-container-high'}`} />
            ))}
          </div>
        </div>

        {/* Food Categories */}
        <div>
          <h2 className="text-base font-extrabold mb-3">{t('app.craving')}</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {FOOD_CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setSelectedCategory(cat.key)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl transition-all active:scale-95 ${
                  selectedCategory === cat.key ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-surface-container text-on-surface-variant'
                }`}>
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[10px] font-bold">{cat.key}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold">{t('app.recentOrders')}</h2>
              <button className="text-xs text-primary font-bold flex items-center gap-0.5">
                {t('app.viewAll')} <ChevronRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {recentOrders.map(order => (
                <motion.button key={order._id} whileTap={{ scale: 0.96 }}
                  onClick={() => onOpenTracking(order._id)}
                  className="flex-shrink-0 w-44 bg-surface-container rounded-2xl p-3.5 text-start">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">#{order._id?.slice(-4).toUpperCase()}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      order.status === 'Delivered' ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-on-surface-variant'
                    }`}>{order.status}</span>
                  </div>
                  <p className="text-xs font-bold truncate">{order.items?.slice(0,2).map((i: any) => i.name).join(', ')}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-extrabold text-primary">${order.total?.toFixed(2)}</span>
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <RefreshCw className="w-3 h-3" /><span className="text-[10px] font-bold">{t('app.reorder')}</span>
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
            <h2 className="text-base font-extrabold">{t('app.nearYou')}</h2>
            <span className="text-xs text-on-surface-variant">{restaurants.length} {t('app.available')}</span>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-surface-container rounded-2xl h-24 animate-pulse" />)}</div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <p className="text-4xl mb-3">🍽️</p><p className="text-sm">{t('app.noRestaurants')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {restaurants.map((r, idx) => {
                const isOpen = r.status !== 'inactive';
                return (
                  <motion.button key={r._id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => isOpen && onOpenRestaurant(r._id, r.name, r.logo)}
                    className={`w-full bg-surface-container rounded-2xl overflow-hidden text-start flex items-center gap-4 p-4 ${!isOpen ? 'opacity-60' : ''}`}>
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container-high shrink-0 flex items-center justify-center">
                      {r.logo ? <img src={r.logo} alt={r.name} className="w-full h-full object-cover" /> : <span className="text-3xl">🍽️</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-extrabold text-sm truncate">{r.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isOpen ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          {isOpen ? t('common.open') : t('common.closed')}
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
                            <Star className="w-3 h-3 text-primary fill-primary" />
                            <span className="text-xs font-bold">{r.averageRating}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-on-surface-variant">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{PREP_TIMES[idx % PREP_TIMES.length]} {t('common.min')}</span>
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
