import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Search, X, Star, Clock, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { applyPrimaryColor } from '../lib/branding';
import { formatCurrency } from '../lib/currency';
import type { MenuItem, Category } from '../types';

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo?: string;
  onBack: () => void;
  onCartOpen: () => void;
}

export const RestaurantScreen = ({ restaurantId, restaurantName, restaurantLogo, onBack, onCartOpen }: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { addItem, itemCount, total, restaurantId: cartRestId } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/menu?restaurantId=${restaurantId}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/categories?restaurantId=${restaurantId}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/restaurants/${restaurantId}/info`).then(r => r.ok ? r.json() : null),
    ]).then(([items, cats, info]) => {
      setAllItems(items);
      setCategories(cats);
      if (info?.primaryColor) applyPrimaryColor(info.primaryColor);
      if (info?.currency) setCurrency(info.currency);
      // Always write currency + branding to localStorage so CartScreen
      // picks them up regardless of whether this was a QR or home-screen flow
      try {
        const raw = localStorage.getItem('restaurant_context');
        const existing = raw ? JSON.parse(raw) : {};
        // If context belongs to a different restaurant, start fresh for this one
        const base = existing.restaurantId === restaurantId ? existing : { restaurantId, tableName: '' };
        localStorage.setItem('restaurant_context', JSON.stringify({
          ...base,
          restaurantName: info?.name ?? restaurantName,
          logo: info?.logo ?? restaurantLogo ?? '',
          primaryColor: info?.primaryColor ?? '#fe5722',
          currency: info?.currency ?? 'USD',
        }));
      } catch { /* ignore */ }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [restaurantId]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setHeaderCollapsed(scrollRef.current.scrollTop > 80);
  }, []);

  const scrollToCategory = (catName: string) => {
    setActiveCategory(catName);
    const el = categoryRefs.current[catName];
    if (el && scrollRef.current) {
      const offset = el.offsetTop - 110;
      scrollRef.current.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };

  const filteredItems = search
    ? allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  const categoryNames = ['All', ...categories.map(c => c.name)];
  const itemsByCategory = categoryNames.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    acc[cat] = cat === 'All' ? filteredItems : filteredItems.filter(i => i.category === cat);
    return acc;
  }, {});

  const showCart = cartRestId === restaurantId && itemCount > 0;

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Sticky Header */}
      <div className={`bg-surface z-20 transition-all duration-300 ${headerCollapsed ? 'shadow-md' : ''}`}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform shrink-0">
            <ArrowLeft className={`w-5 h-5 rtl:rotate-180`} />
          </button>
          <AnimatePresence>
            {headerCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="font-extrabold text-sm truncate">{restaurantName}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex-1" />
          <button onClick={() => {/* future search toggle */}} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
            <Search className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        {/* Restaurant info (visible when not collapsed) */}
        <AnimatePresence>
          {!headerCollapsed && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="px-5 pb-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface-container shrink-0 flex items-center justify-center">
                {restaurantLogo ? <img src={restaurantLogo} alt={restaurantName} className="w-full h-full object-cover" /> : <span className="text-3xl">🍽️</span>}
              </div>
              <div>
                <h1 className="text-xl font-extrabold font-headline">{restaurantName}</h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="text-xs font-bold">4.5</span></div>
                  <div className="flex items-center gap-1 text-on-surface-variant"><Clock className="w-3.5 h-3.5" /><span className="text-xs">15–20 min</span></div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{t('common.open')}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('restaurantPage.searchMenu')}
              className="w-full bg-surface-container rounded-xl ps-9 pe-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            )}
          </div>
        </div>

        {/* Category sticky tabs */}
        {!search && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar border-b border-surface-container">
            {categoryNames.map(cat => (
              <button key={cat} onClick={() => scrollToCategory(cat)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === cat ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto pb-32">
        {loading ? (
          <div className="p-5 space-y-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="bg-surface rounded-2xl h-20 animate-pulse" />)}
          </div>
        ) : (
          <div className="p-5 space-y-8">
            {categoryNames
              .filter(cat => itemsByCategory[cat]?.length > 0)
              .map(cat => (
                <div key={cat} ref={el => { categoryRefs.current[cat] = el; }}>
                  {cat !== 'All' && (
                    <h2 className="text-base font-extrabold mb-3 text-on-surface">{cat}</h2>
                  )}
                  <div className="space-y-3">
                    {itemsByCategory[cat].map(item => (
                      <MenuItemCard key={item.id} item={item} currency={currency}
                        onSelect={() => setSelectedItem(item)}
                        onQuickAdd={() => addItem(item, restaurantId, restaurantName, restaurantLogo)}
                      />
                    ))}
                  </div>
                </div>
              ))
            }
            {filteredItems.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm">{t('restaurantPage.noItems')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Cart Bar */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 z-30 px-5 pb-6">
            <button onClick={onCartOpen}
              className="w-full btn-gradient text-white rounded-2xl py-4 flex items-center justify-between px-5 shadow-xl shadow-primary/30">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs font-extrabold w-6 h-6 rounded-lg flex items-center justify-center">{itemCount}</span>
                <span className="font-extrabold text-sm">{t('restaurantPage.viewCart')}</span>
              </div>
              <span className="font-extrabold text-sm">{formatCurrency(total, currency)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <ProductDetailModal
            item={selectedItem}
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            restaurantLogo={restaurantLogo}
            onClose={() => setSelectedItem(null)}
            onCartOpen={onCartOpen}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuItemCard: React.FC<{ item: MenuItem; currency: string; onSelect: () => void; onQuickAdd: () => void }> = ({ item, currency, onSelect, onQuickAdd }) => (
  <motion.div whileTap={{ scale: 0.98 }}
    className="bg-surface rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border border-surface-container active:shadow-none">
    <button onClick={onSelect} className="flex-1 flex items-center gap-3 text-left min-w-0">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container shrink-0">
        {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍴</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-on-surface">{item.name}</p>
        {item.description && <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{item.description}</p>}
        <p className="text-sm font-extrabold text-primary mt-1.5">{formatCurrency(item.price, currency)}</p>
      </div>
    </button>
    <button onClick={e => { e.stopPropagation(); onQuickAdd(); }}
      className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors shrink-0 active:scale-90">
      <Plus className="w-5 h-5" />
    </button>
  </motion.div>
);
