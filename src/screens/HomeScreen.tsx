import { useState, useEffect } from 'react';
import { Search, Bell, ChevronRight, Clock, Star, RefreshCw, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface Restaurant {
  _id: string;
  name: string;
  logo?: string;
  address?: string;
  status: string;
  cuisine: string[];
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

const FALLBACK_PROMOS = [
  { title: 'Free Pickup',   subtitle: 'All orders this week', emoji: '🛍️' },
  { title: '20% Off Mains', subtitle: 'On orders over $30',   emoji: '🎉' },
  { title: 'New Arrivals',  subtitle: 'Try our latest menu',  emoji: '✨' },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [banners, setBanners] = useState<{ title: string; subtitle: string; emoji: string }[]>([]);

  useEffect(() => {
    fetch('/api/restaurants/public')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setRestaurants(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/banners/public')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (data.length) setBanners(data); })
      .catch(() => { /* keep fallback */ });
  }, []);

  useEffect(() => {
    try {
      const history: string[] = JSON.parse(localStorage.getItem('order_history') || '[]');
      if (!history.length) return;
      Promise.all(history.slice(0, 3).map(id => fetch(`/api/orders/${id}`).then(r => r.ok ? r.json() : null)))
        .then(orders => setRecentOrders(orders.filter(Boolean)));
    } catch { /* ignore */ }
  }, []);

  const slides = banners.length ? banners : FALLBACK_PROMOS;
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setPromoIdx(i => (i + 1) % slides.length), 3500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const filteredRestaurants = restaurants.filter(r => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q);
    const matchCategory = selectedCategory === 'All' || (r.cuisine ?? []).includes(selectedCategory);
    return matchSearch && matchCategory;
  });

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
        <div className="flex items-center gap-3 bg-surface-container rounded-2xl px-4 py-3 text-on-surface-variant">
          <Search className="w-4 h-4 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('app.searchPlaceholder')}
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-on-surface-variant text-xs font-bold">✕</button>
          )}
        </div>
      </div>

      <div className="px-5 pt-5 space-y-6">
        {/* Promo Slider */}
        <div>
          <div className="relative overflow-hidden rounded-3xl" style={{ height: 148 }}>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={promoIdx}
                initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 40 : -40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50) setPromoIdx(i => (i + 1) % slides.length);
                  else if (info.offset.x > 50) setPromoIdx(i => (i - 1 + slides.length) % slides.length);
                }}
                className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-container rounded-3xl px-6 py-5 flex items-center justify-between cursor-grab active:cursor-grabbing select-none overflow-hidden"
              >
                {/* Background decoration */}
                <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/10" />
                <div className="absolute -bottom-8 right-10 w-24 h-24 rounded-full bg-white/5" />

                {/* Text */}
                <div className="relative z-10 flex-1 min-w-0 pr-4">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white px-2.5 py-1 rounded-full mb-2">
                    {`${promoIdx + 1} / ${slides.length}`}
                  </span>
                  <p className="text-2xl font-extrabold text-white leading-tight">{slides[promoIdx].title}</p>
                  {slides[promoIdx].subtitle && (
                    <p className="text-sm text-white/75 mt-1 leading-snug">{slides[promoIdx].subtitle}</p>
                  )}
                </div>

                {/* Emoji bubble */}
                <div className="relative z-10 w-20 h-20 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <span className="text-4xl">{slides[promoIdx].emoji}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot indicators */}
          {slides.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setPromoIdx(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === promoIdx ? 'w-6 bg-primary' : 'w-1.5 bg-surface-container-high'}`} />
              ))}
            </div>
          )}
        </div>

        {/* Food Categories */}
        <div>
          <h2 className="text-base font-extrabold mb-3">{t('app.craving')}</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {FOOD_CATEGORIES.map(cat => {
              const count = cat.key === 'All'
                ? restaurants.length
                : restaurants.filter(r => (r.cuisine ?? []).includes(cat.key)).length;
              const active = selectedCategory === cat.key;
              if (cat.key !== 'All' && count === 0) return null;
              return (
                <motion.button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  whileTap={{ scale: 0.92 }}
                  className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-colors ${
                    active
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="text-2xl leading-none">{cat.emoji}</span>
                  <span className="text-[10px] font-extrabold tracking-wide leading-none">{cat.key}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    active ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {count}
                  </span>
                </motion.button>
              );
            })}
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
            <span className="text-xs text-on-surface-variant">{filteredRestaurants.length} {t('app.available')}</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-surface-container rounded-2xl h-28 animate-pulse flex gap-4 p-4">
                  <div className="w-20 h-20 rounded-2xl bg-surface-container-high shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-surface-container-high rounded-full w-2/3" />
                    <div className="h-2.5 bg-surface-container-high rounded-full w-1/2" />
                    <div className="h-2 bg-surface-container-high rounded-full w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-on-surface-variant">
              <p className="text-5xl mb-4">🍽️</p>
              <p className="text-sm font-medium">{searchQuery || selectedCategory !== 'All' ? t('restaurantList.noFound') : t('app.noRestaurants')}</p>
              {selectedCategory !== 'All' && (
                <button onClick={() => setSelectedCategory('All')} className="mt-3 text-xs text-primary font-bold">
                  Clear filter
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredRestaurants.map((r, idx) => {
                  const isOpen = r.status !== 'inactive';
                  return (
                    <motion.button
                      key={r._id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => isOpen && onOpenRestaurant(r._id, r.name, r.logo)}
                      className={`w-full bg-surface-container rounded-2xl overflow-hidden text-start flex items-center gap-4 p-4 ${!isOpen ? 'opacity-50' : ''}`}
                    >
                      {/* Logo */}
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-container-high shrink-0 flex items-center justify-center">
                        {r.logo
                          ? <img src={r.logo} alt={r.name} className="w-full h-full object-cover" />
                          : <span className="text-4xl">🍽️</span>}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-extrabold text-sm leading-tight truncate">{r.name}</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isOpen ? 'bg-primary/15 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                            {isOpen ? t('common.open') : t('common.closed')}
                          </span>
                        </div>

                        {r.address && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <MapPin className="w-3 h-3 text-on-surface-variant shrink-0" />
                            <p className="text-xs text-on-surface-variant truncate">{r.address}</p>
                          </div>
                        )}

                        {/* Cuisine tags */}
                        {r.cuisine?.length > 0 && (
                          <div className="flex gap-1 flex-wrap mb-1.5">
                            {r.cuisine.slice(0, 3).map(c => (
                              <span key={c} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          {r.averageRating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-primary fill-primary" />
                              <span className="text-xs font-extrabold">{r.averageRating}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-on-surface-variant">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">{PREP_TIMES[idx % PREP_TIMES.length]} {t('common.min')}</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 text-on-surface-variant/30 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
