import { useState, useEffect } from 'react';
import { ArrowRight, Star, Clock, Utensils, BookOpen, CalendarDays, ChefHat } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MenuItem } from '../types';
import { Skeleton } from '../components/Skeleton';

interface HomeScreenProps {
  onStart: () => void;
  onReserve: () => void;
  restaurantName?: string;
  logo?: string;
  restaurantId?: string;
}

const DISH_GRADIENTS = [
  'from-rose-500 to-orange-400',
  'from-violet-500 to-indigo-400',
  'from-emerald-500 to-teal-400',
  'from-sky-500 to-blue-400',
  'from-amber-500 to-yellow-400',
];

export const HomeScreen = ({ onStart, onReserve, restaurantName, logo, restaurantId }: HomeScreenProps) => {
  const { t } = useTranslation();

  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [stats, setStats]                 = useState({ rating: 0, reviews: 0 });

  // Pick one tagline deterministically — no newline split needed
  const taglineKeys = ['tagline_0', 'tagline_1', 'tagline_2', 'tagline_3'] as const;
  const taglineKey = restaurantName
    ? taglineKeys[restaurantName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 4]
    : 'tagline_0';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, reviewRes] = await Promise.allSettled([
          fetch(`/api/menu?restaurantId=${restaurantId}`),
          fetch(`/api/reviews?restaurantId=${restaurantId}`),
        ]);
        if (menuRes.status === 'fulfilled' && menuRes.value.ok) {
          const data: MenuItem[] = await menuRes.value.json();
          setFeaturedItems(data.filter(item => item.featured).slice(0, 3));
        }
        if (reviewRes.status === 'fulfilled' && reviewRes.value.ok) {
          const data = await reviewRes.value.json();
          if (Array.isArray(data) && data.length > 0) {
            const avg = data.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / data.length;
            setStats({ rating: Math.round(avg * 10) / 10, reviews: data.length });
          }
        }
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface">

      {/* ── Gradient hero (no external image) ──────────── */}
      <section
        className="relative overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(160deg, var(--color-primary) 0%, var(--color-primary-container) 55%, #1a0a05 100%)',
          minHeight: '62vh',
        }}
      >
        {/* Decorative blobs */}
        <span className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[0.06]" />
        <span className="pointer-events-none absolute top-1/2 -left-20 w-56 h-56 rounded-full bg-black/[0.12]" />
        <span className="pointer-events-none absolute -bottom-10 right-10 w-40 h-40 rounded-full bg-white/[0.04]" />

        {/* Content */}
        <div className="relative flex-1 flex flex-col items-center justify-between px-7 pt-16 pb-10 text-center">

          {/* ── Brand identity ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Logo */}
            <div className="w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-white/20 shadow-2xl shadow-black/40">
              {logo ? (
                <img src={logo} alt={restaurantName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Utensils className="w-11 h-11 text-white" />
                </div>
              )}
            </div>

            {/* Name */}
            {restaurantName && (
              <div>
                <p className="text-white/55 text-[11px] font-bold uppercase tracking-[0.16em]">
                  {t('home.welcomeTo')}
                </p>
                <h1 className="text-white font-headline font-extrabold text-[1.65rem] leading-tight mt-0.5">
                  {restaurantName}
                </h1>
              </div>
            )}

            {/* Tagline — whiteSpace:pre-line renders \n as line breaks, no split/map needed */}
            <p
              className="text-white/55 text-sm leading-relaxed max-w-[220px]"
              style={{ whiteSpace: 'pre-line' }}
            >
              {t(`home.${taglineKey}`)}
            </p>
          </motion.div>

          {/* ── Stats + CTAs ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, type: 'spring', stiffness: 220, damping: 22 }}
            className="w-full max-w-sm flex flex-col items-center gap-5"
          >
            {/* Stats pills */}
            {(stats.rating > 0) && (
              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                <div className="flex items-center gap-1.5 bg-white/[0.14] backdrop-blur-sm rounded-full px-3.5 py-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-white font-bold text-[12px]">{stats.rating}</span>
                  {stats.reviews > 0 && (
                    <span className="text-white/50 text-[11px]">({stats.reviews})</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 bg-white/[0.14] backdrop-blur-sm rounded-full px-3.5 py-1.5">
                  <Clock className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-white font-bold text-[12px]">{t('home.tableService')}</span>
                </div>
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex gap-3 w-full">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onStart}
                className="flex-1 bg-white font-headline font-bold text-[15px] py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-black/30"
                style={{ color: 'var(--color-primary)' }}
              >
                <BookOpen className="w-4 h-4" />
                {t('home.viewMenu')}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onReserve}
                className="flex-1 bg-white/[0.15] backdrop-blur-md border border-white/25 text-white font-headline font-bold text-[15px] py-3.5 rounded-2xl flex items-center justify-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                {t('home.reserve')}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Curved transition ──────────────────────────── */}
      <div className="h-6 -mt-6 bg-surface rounded-t-[28px] relative z-10" />

      {/* ── Featured Dishes ──────────────────────────────── */}
      <section className="px-6 -mt-2 pb-6 space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline font-extrabold text-[1.2rem] text-on-surface">
              {t('home.chefSelection')}
            </h2>
            <p className="text-on-surface-variant text-[11px] font-medium uppercase tracking-widest mt-0.5">
              {t('home.seasonalFavourites')}
            </p>
          </div>
          <button
            onClick={onStart}
            className="flex items-center gap-1 text-primary text-xs font-bold"
          >
            {t('home.exploreMenu')}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-[130px] rounded-2xl" />)}
          </div>
        ) : featuredItems.length > 0 ? (
          <div className="space-y-3">
            {featuredItems.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStart}
                className="w-full h-[130px] rounded-2xl overflow-hidden flex text-left relative"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
              >
                {/* Image or gradient fallback */}
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-[110px] h-full object-cover shrink-0" />
                ) : (
                  <div className={`w-[110px] h-full bg-gradient-to-br ${DISH_GRADIENTS[i % DISH_GRADIENTS.length]} shrink-0 flex items-center justify-center`}>
                    <ChefHat className="w-10 h-10 text-white/80" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 bg-surface-container-low px-4 py-4 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">
                        {t('home.featured')}
                      </span>
                    </div>
                    <h3 className="font-headline font-bold text-on-surface text-[15px] leading-tight line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="text-on-surface-variant text-[11px] mt-1 line-clamp-1">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="font-headline font-extrabold text-primary text-[15px]">
                      ${item.price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1 bg-primary/10 rounded-full px-2.5 py-1">
                      <span className="text-primary text-[10px] font-bold">{t('home.order')}</span>
                      <ArrowRight className="w-3 h-3 text-primary" />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onStart}
            className="w-full py-5 bg-surface-container-low rounded-2xl flex items-center justify-center gap-2"
          >
            <ChefHat className="w-5 h-5 text-primary" />
            <span className="text-primary font-headline font-bold text-sm">{t('home.exploreMenu')}</span>
            <ArrowRight className="w-4 h-4 text-primary" />
          </motion.button>
        )}
      </section>

      {/* ── Promise strip ───────────────────────────────── */}
      <section className="mx-6 mb-8 bg-surface-container-low rounded-2xl p-5 relative z-10">
        <h3 className="font-headline font-extrabold text-[16px] text-on-surface mb-0.5">
          {t('home.ourPromise')}
        </h3>
        <p className="text-on-surface-variant text-[12px] leading-relaxed mb-5">
          {t('home.promiseDesc')}
        </p>
        <div className="grid grid-cols-3 gap-3 border-t border-outline-variant/20 pt-4">
          {([
            { val: t('home.orgValue'),   label: t('home.organic') },
            { val: t('home.srcValue'),   label: t('home.sourced') },
            { val: t('home.freshValue'), label: t('home.fresh')   },
          ] as const).map(({ val, label }) => (
            <div key={label} className="text-center">
              <p className="font-headline font-extrabold text-primary text-lg">{val}</p>
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="pb-36 pt-2 text-center">
        <p className="text-[10px] font-bold text-on-surface-variant/25 uppercase tracking-[0.18em]">
          © {new Date().getFullYear()} {restaurantName ?? 'Restaurant'}
        </p>
      </footer>
    </div>
  );
};
