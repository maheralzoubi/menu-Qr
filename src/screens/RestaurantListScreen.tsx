import { useState, useEffect, useMemo } from 'react';
import { Search, Star, MapPin, Clock, X, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface Restaurant {
  _id: string;
  name: string;
  logo?: string;
  address?: string;
  status: 'active' | 'inactive';
  averageRating: number;
}

interface Props {
  onSelect: (restaurant: { _id: string; name: string; logo?: string }) => void;
  onBack?: () => void;
}

const CUISINES = ['Italian', 'American', 'Asian', 'Mediterranean', 'Japanese', 'Mexican', 'French', 'Indian'] as const;
type Cuisine = typeof CUISINES[number];

const CUISINE_EMOJIS: Record<Cuisine, string> = {
  Italian: '🍕', American: '🍔', Asian: '🍜', Mediterranean: '🥗',
  Japanese: '🍣', Mexican: '🌮', French: '🥐', Indian: '🍛',
};

const CARD_GRADIENTS = [
  'from-rose-500 to-orange-400', 'from-violet-500 to-indigo-500',
  'from-emerald-500 to-teal-400', 'from-sky-500 to-cyan-400',
  'from-amber-500 to-orange-400', 'from-pink-500 to-rose-400',
  'from-lime-600 to-emerald-500', 'from-fuchsia-500 to-pink-500',
];

const DELIVERY_TIMES = ['10–15', '15–20', '20–30', '25–35', '30–45'];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getCuisine(id: string): Cuisine { return CUISINES[hashStr(id) % CUISINES.length]; }
function getGradient(id: string): string  { return CARD_GRADIENTS[hashStr(id + 'g') % CARD_GRADIENTS.length]; }
function getDelivery(id: string): string  { return DELIVERY_TIMES[hashStr(id + 't') % DELIVERY_TIMES.length]; }

const CATEGORY_KEYS = [
  { key: 'all',     emoji: '✨', cuisine: 'all'          as const },
  { key: 'pizza',   emoji: '🍕', cuisine: 'Italian'      as Cuisine },
  { key: 'burgers', emoji: '🍔', cuisine: 'American'     as Cuisine },
  { key: 'asian',   emoji: '🍜', cuisine: 'Asian'        as Cuisine },
  { key: 'healthy', emoji: '🥗', cuisine: 'Mediterranean' as Cuisine },
  { key: 'sushi',   emoji: '🍣', cuisine: 'Japanese'     as Cuisine },
  { key: 'mexican', emoji: '🌮', cuisine: 'Mexican'      as Cuisine },
  { key: 'french',  emoji: '🥐', cuisine: 'French'       as Cuisine },
  { key: 'indian',  emoji: '🍛', cuisine: 'Indian'       as Cuisine },
];

type Enriched = Restaurant & { cuisine: Cuisine; gradient: string; delivery: string };

const Pulse = ({ className }: { className: string }) => (
  <div className={`bg-surface-container-high animate-pulse rounded-xl ${className}`} />
);

export const RestaurantListScreen = ({ onSelect, onBack }: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [activeCat, setActiveCat]     = useState<string>('all');
  const [loadingId, setLoadingId]     = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/restaurants/public')
      .then(r => r.ok ? r.json() : [])
      .then(setRestaurants)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() =>
    restaurants.map(r => ({
      ...r,
      cuisine:  getCuisine(r._id),
      gradient: getGradient(r._id),
      delivery: getDelivery(r._id),
    })),
    [restaurants]
  );

  const featured = useMemo(() => enriched.filter(r => r.status === 'active').slice(0, 6), [enriched]);

  const filtered = useMemo(() => enriched.filter(r => {
    const matchCat  = activeCat === 'all' || r.cuisine === activeCat;
    const matchText = r.name.toLowerCase().includes(search.toLowerCase()) ||
                      (r.address ?? '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  }), [enriched, activeCat, search]);

  function handleSelect(r: Enriched) {
    if (!r.status || r.status !== 'active' || loadingId) return;
    setLoadingId(r._id);
    onSelect({ _id: r._id, name: r.name, logo: r.logo });
  }

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'common.greetings.morning' : hour < 17 ? 'common.greetings.afternoon' : 'common.greetings.evening';

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">

        {/* STICKY HEADER */}
        <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-xl px-5 pt-14 pb-3">

          <div className="flex items-center justify-between mb-4">
            {onBack ? (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-on-surface-variant text-sm font-semibold"
              >
                <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t('restaurants.back')}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Utensils className="w-4 h-4 text-white" />
                </div>
                <span className="font-headline font-extrabold text-base text-on-surface">{t('restaurants.appName')}</span>
              </div>
            )}
          </div>

          <h1 className="font-headline font-extrabold text-[1.65rem] leading-tight text-on-surface">
            {t(greetingKey)} 👋<br />
            <span className="text-on-surface-variant font-bold text-[1.2rem]">{t('restaurants.findMeal')}</span>
          </h1>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveCat('all'); }}
              placeholder={t('restaurants.searchPlaceholder')}
              className="w-full bg-surface-container-low rounded-2xl py-3.5 ps-11 pe-10 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => setSearch('')}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto pb-10">

          {/* Category pills */}
          <div className="flex gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
            {CATEGORY_KEYS.map(cat => (
              <button
                key={cat.cuisine}
                onClick={() => { setActiveCat(cat.cuisine); setSearch(''); }}
                className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-semibold transition-all shrink-0 ${
                  activeCat === cat.cuisine
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                <span>{cat.emoji}</span>
                {t(`restaurants.categories.${cat.key}`)}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : search || activeCat !== 'all' ? (
            <section className="px-5 pt-2">
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">
                {filtered.length === 1 ? t('restaurants.result', { count: filtered.length }) : t('restaurants.results', { count: filtered.length })}
              </p>
              <div className="flex flex-col gap-3">
                {filtered.length > 0 ? (
                  filtered.map((r, i) => (
                    <RestaurantRow key={r._id} restaurant={r} index={i} loading={loadingId === r._id} onSelect={handleSelect} />
                  ))
                ) : (
                  <EmptyState onClear={() => { setSearch(''); setActiveCat('all'); }} />
                )}
              </div>
            </section>
          ) : (
            <>
              {featured.length > 0 && (
                <section className="mt-1">
                  <SectionHeader title={t('restaurants.featured')} subtitle={t('restaurants.topPicks')} />
                  <div className="flex gap-3.5 px-5 overflow-x-auto no-scrollbar pb-2">
                    {featured.map((r, i) => (
                      <FeaturedCard key={r._id} restaurant={r} index={i} loading={loadingId === r._id} onSelect={handleSelect} />
                    ))}
                  </div>
                </section>
              )}

              <section className="px-5 mt-6">
                <SectionHeader
                  title={t('restaurants.allRestaurants')}
                  subtitle={t('restaurants.locations', { count: enriched.length })}
                />
                <div className="flex flex-col gap-3">
                  {enriched.map((r, i) => (
                    <RestaurantRow key={r._id} restaurant={r} index={i} loading={loadingId === r._id} onSelect={handleSelect} />
                  ))}
                  {enriched.length === 0 && (
                    <div className="text-center py-16 space-y-2">
                      <Utensils className="w-10 h-10 mx-auto text-on-surface-variant/20" />
                      <p className="text-on-surface-variant font-medium text-sm">{t('restaurants.noRestaurants')}</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-5 mb-3">
      <h2 className="font-headline font-extrabold text-[17px] text-on-surface">{title}</h2>
      <p className="text-on-surface-variant text-xs font-medium mt-0.5">{subtitle}</p>
    </div>
  );
}

function FeaturedCard({ restaurant: r, index, loading, onSelect }: {
  restaurant: Enriched; index: number; loading: boolean; onSelect: (r: Enriched) => void; key?: string;
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const isActive = r.status === 'active';
  return (
    <motion.button
      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(r)}
      disabled={!isActive || loading}
      className="shrink-0 w-[220px] rounded-2xl overflow-hidden text-start card-shadow relative"
    >
      <div className={`h-[150px] w-full bg-gradient-to-br ${r.gradient} relative`}>
        {r.logo && <img src={r.logo} alt={r.name} className="w-full h-full object-cover absolute inset-0" />}
        {!isActive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold uppercase tracking-widest">{t('common.closed')}</span>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <div className="absolute top-2.5 start-2.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
          <span className="text-white text-[10px] font-bold">{CUISINE_EMOJIS[r.cuisine]} {r.cuisine}</span>
        </div>
      </div>
      <div className="bg-surface-container-low p-3">
        <h3 className="font-headline font-bold text-sm text-on-surface line-clamp-1">{r.name}</h3>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1">
            <Star className={`w-3 h-3 ${r.averageRating > 0 ? 'fill-amber-400 text-amber-400' : 'text-on-surface-variant/30'}`} />
            <span className="text-[11px] font-bold text-on-surface-variant">
              {r.averageRating > 0 ? r.averageRating.toFixed(1) : t('common.new')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-on-surface-variant/40" />
            <span className="text-[11px] text-on-surface-variant">{r.delivery} {t('common.min')}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function RestaurantRow({ restaurant: r, index, loading, onSelect }: {
  restaurant: Enriched; index: number; loading: boolean; onSelect: (r: Enriched) => void; key?: string;
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const isActive = r.status === 'active';
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(r)}
      disabled={!isActive || loading}
      className={`w-full text-start bg-surface-container-low rounded-2xl overflow-hidden flex gap-0 card-shadow ${!isActive ? 'opacity-60' : ''}`}
    >
      <div className={`w-[88px] h-[88px] shrink-0 bg-gradient-to-br ${r.gradient} relative flex items-center justify-center`}>
        {r.logo ? (
          <img src={r.logo} alt={r.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-headline font-extrabold text-2xl">{r.name.charAt(0).toUpperCase()}</span>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-headline font-bold text-[14px] text-on-surface line-clamp-1 flex-1">{r.name}</h3>
          <div className={`flex items-center gap-0.5 shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface-container text-on-surface-variant/50'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full me-0.5 ${isActive ? 'bg-emerald-500' : 'bg-on-surface-variant/30'}`} />
            {isActive ? t('common.open') : t('common.closed')}
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[11px] text-on-surface-variant">{CUISINE_EMOJIS[r.cuisine]} {r.cuisine}</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <Star className={`w-3 h-3 ${r.averageRating > 0 ? 'fill-amber-400 text-amber-400' : 'text-on-surface-variant/25'}`} />
            <span className="text-[11px] font-bold text-on-surface-variant">
              {r.averageRating > 0 ? r.averageRating.toFixed(1) : t('common.new')}
            </span>
          </div>
          <span className="text-on-surface-variant/20 text-xs">·</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-on-surface-variant/30" />
            <span className="text-[11px] text-on-surface-variant">{r.delivery} {t('common.min')}</span>
          </div>
          {r.address && (
            <>
              <span className="text-on-surface-variant/20 text-xs">·</span>
              <div className="flex items-center gap-0.5 min-w-0">
                <MapPin className="w-3 h-3 text-on-surface-variant/30 shrink-0" />
                <span className="text-[11px] text-on-surface-variant truncate">{r.address}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16 space-y-3">
      <div className="w-14 h-14 bg-surface-container rounded-2xl flex items-center justify-center mx-auto">
        <Search className="w-7 h-7 text-on-surface-variant/25" />
      </div>
      <p className="font-headline font-bold text-on-surface-variant">{t('restaurants.noFound')}</p>
      <button onClick={onClear} className="text-primary font-bold text-sm">{t('restaurants.clearFilters')}</button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-5 pt-2 space-y-6">
      <div>
        <Pulse className="h-5 w-28 mb-3" />
        <div className="flex gap-3.5 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="shrink-0 w-[220px] rounded-2xl overflow-hidden">
              <Pulse className="h-[150px] rounded-none" />
              <div className="bg-surface-container-low p-3 space-y-2">
                <Pulse className="h-4 w-3/4" />
                <Pulse className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Pulse className="h-5 w-36 mb-3" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-0 rounded-2xl overflow-hidden bg-surface-container-low">
              <Pulse className="w-[88px] h-[88px] rounded-none" />
              <div className="flex-1 p-3 space-y-2">
                <Pulse className="h-4 w-3/4" />
                <Pulse className="h-3 w-1/2" />
                <Pulse className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
