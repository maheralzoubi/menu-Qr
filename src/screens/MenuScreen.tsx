import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useFmt } from '../hooks/useCurrency';
import { Category, MenuItem } from '../types';
import { Skeleton } from '../components/Skeleton';
import { ItemDetailsModal } from '../components/ItemDetailsModal';

export const MenuScreen = ({ addToCart, restaurantId }: { addToCart: (item: MenuItem) => void; restaurantId: string }) => {
  const { t, i18n } = useTranslation();
  const fmt = useFmt();
  const isRTL = i18n.language === 'ar';

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, catRes] = await Promise.all([
          fetch(`/api/menu?restaurantId=${restaurantId}`),
          fetch(`/api/categories?restaurantId=${restaurantId}`)
        ]);
        const menuData = await menuRes.json();
        const catData = await catRes.json();
        setMenuItems(menuData);
        setCategories(catData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, menuItems]);

  const specialItem = useMemo(() => {
    return menuItems.find(item => item.category === 'Mains') || menuItems[0];
  }, [menuItems]);

  if (isLoading) {
    return (
      <div className="pt-20 pb-32 px-6 max-w-md mx-auto space-y-6">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="flex gap-2 py-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <Skeleton className="h-7 w-32" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface-container-lowest rounded-xl p-4 flex gap-4 shadow-sm">
              <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
              <div className="flex flex-col justify-between flex-grow py-1">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="w-8 h-8 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-32 px-6 max-w-md mx-auto space-y-6">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" />
        </div>
        <input
          type="text"
          placeholder={t('menu.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-low border-none rounded-2xl py-4 ps-12 pe-4 text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-300 font-body text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 end-4 flex items-center text-on-surface-variant/40 hover:text-on-surface"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 py-2">
        {[t('menu.all'), ...categories.map(c => c.name)].map((cat, idx) => {
          const catKey = idx === 0 ? 'All' : categories[idx - 1].name;
          return (
            <button
              key={catKey}
              onClick={() => setActiveCategory(catKey)}
              className={`whitespace-nowrap px-5 py-2 rounded-full font-label text-sm font-semibold tracking-tight transition-all ${activeCategory === catKey ? 'bg-primary text-white' : 'bg-surface-container-highest text-on-surface-variant'}`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {!searchQuery && activeCategory !== 'All' && specialItem && (
        <section className="relative rounded-2xl overflow-hidden aspect-[4/3] group shadow-xl">
          <img
            src={specialItem.image}
            alt={t('menu.todaySpecial')}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
            <span className="text-white text-xs font-bold uppercase tracking-widest mb-2 opacity-90">{t('menu.todaySpecial')}</span>
            <h2 className="text-white font-headline text-2xl font-bold leading-tight mb-2">{specialItem.name}</h2>
            <div className="flex justify-between items-end">
              <p className="text-white/80 text-sm max-w-[70%]">{specialItem.description}</p>
              <span className="text-white font-headline text-xl font-bold">${specialItem.price}</span>
            </div>
          </div>
        </section>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-end px-1">
          <h3 className="font-headline text-xl font-bold text-on-surface-variant">
            {searchQuery ? t('menu.searchResults') : activeCategory}
          </h3>
          {searchQuery && (
            <span className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest">
              {filteredItems.length} {t('menu.found')}
            </span>
          )}
        </div>

        <AnimatePresence mode="popLayout">
          {filteredItems.map(item => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={item.id}
              className="bg-surface-container-lowest rounded-xl p-4 flex gap-4 shadow-sm"
            >
              <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col justify-between flex-grow py-1">
                <div>
                  <h4 className="font-headline font-bold text-on-surface leading-tight mb-1">{item.name}</h4>
                  <p className="text-on-surface-variant text-xs leading-relaxed line-clamp-2 mb-2">{item.description}</p>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline"
                  >
                    {t('menu.viewDetails')} <ChevronRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-headline font-bold text-primary">{fmt(item.price)}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-8 h-8 rounded-full bg-surface-container-highest text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto text-on-surface-variant/20">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-on-surface-variant font-medium">{t('menu.noResults')}</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
              className="text-primary font-bold text-sm"
            >
              {t('menu.clearFilters')}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <ItemDetailsModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onAddToCart={() => addToCart(selectedItem)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
