import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ACTIVE_STATUSES, useApp, useMg } from '../contexts/AppContext';
import { useNav } from '../navigation';
import { useViewport } from '../hooks/useViewport';
import { BRAND_ICON, useOrderTypes } from '../components/mg/Chrome';
import { IBell, IChevronRight, IClock, ISearch, IX } from '../components/mg/Icons';
import { RestaurantCard, RestaurantCardSkeleton } from '../components/mg/RestaurantCard';
import { Segmented } from '../components/mg/ui';
import { describeOrder } from '../components/mg/orderView';

const CATEGORIES = ['All', 'Coffee', 'Burgers', 'Pizza', 'Pasta', 'Shawarma', 'Salads', 'Desserts', 'Drinks', 'Breakfast', 'Chicken', 'Healthy'];

interface Promo { title: string; subtitle?: string }

function usePromos(): Promo[] {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<Promo[]>([]);
  useEffect(() => {
    fetch('/api/banners/public')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length) setBanners(data); })
      .catch(() => { /* keep fallback */ });
  }, []);
  if (banners.length) return banners;
  return ['freePickup', 'offMains', 'newArrivals'].map(k => ({ title: t(`home.promos.${k}.title`), subtitle: t(`home.promos.${k}.subtitle`) }));
}

export const HomeScreen = () => {
  const tm = useMg();
  const { t } = useTranslation();
  const nav = useNav();
  const { mid } = useViewport();
  const { restaurants, restaurantsLoading, restaurantById, orders, unread, orderType, setOrderType, query, setQuery, cat, setCat } = useApp();
  const types = useOrderTypes();
  const promos = usePromos();

  // Promo carousel: auto-advance every 4.5s, dots and swipe to pick.
  const [promoI, setPromoI] = useState(0);
  useEffect(() => {
    if (promos.length <= 1) return;
    const id = setInterval(() => setPromoI(i => i + 1), 4500);
    return () => clearInterval(id);
  }, [promos.length]);
  const pi = promos.length ? promoI % promos.length : 0;
  const promo = promos[pi];
  const touchX = useRef<number | null>(null);
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      touchX.current = null;
      if (Math.abs(dx) < 40) return;
      const rtl = document.documentElement.dir === 'rtl';
      setPromoI(i => (i + ((dx < 0) !== rtl ? 1 : -1) + promos.length) % promos.length);
    },
  };

  const cats = CATEGORIES.filter(c => c === 'All' || restaurants.some(r => r.cuisine?.includes(c)));
  const q = query.trim().toLowerCase();
  const list = useMemo(() => restaurants.filter(r =>
    (cat === 'All' || r.cuisine?.includes(cat)) &&
    (!q || r.name.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q) || r.cuisine?.some(c => c.toLowerCase().includes(q)))
  ), [restaurants, cat, q]);

  const active = orders.find(o => ACTIVE_STATUSES.includes(o.status));
  const activeView = active && describeOrder(active, tm);
  const activeRest = active && restaurantById(active.restaurantId)?.name;
  const clear = () => { setQuery(''); setCat('All'); };
  const open = (id: string) => nav.go({ name: 'rest', id });

  const dots = (h: string) => promos.length > 1 && (
    <div className="relative flex gap-1.5 mt-2.5">
      {promos.map((_, i) => (
        <button key={i} aria-label="Offer" onClick={() => setPromoI(i)}
          className={`p-0 border-0 rounded-full transition-[width] duration-200 ${h} ${i === pi ? 'w-[22px] bg-white' : 'w-1.5 bg-white/45'}`} />
      ))}
    </div>
  );

  const catLabel = (c: string) => t(`home.categories.${c}`, { defaultValue: c });

  // ── Web ───────────────────────────────────────────────────────────
  if (mid) {
    return (
      <div data-screen-label="Home" className="max-w-[1240px] mx-auto px-[clamp(16px,4vw,32px)] pt-[clamp(20px,3vw,32px)] pb-[120px] flex flex-col gap-[clamp(28px,4vw,44px)] animate-mg-in-slow">
        {!q && promo && (
          <section aria-label="Offers" {...swipe}
            className="relative overflow-hidden rounded-[32px] bg-primary text-white p-[clamp(28px,5vw,56px)] min-h-[clamp(220px,28vw,320px)] box-border flex flex-col justify-end gap-2.5">
            <span className="absolute end-[-8%] top-[-30%] w-[clamp(240px,38vw,480px)] aspect-square rounded-full bg-white/[.12]" />
            <span className="absolute end-[14%] bottom-[-40%] w-[clamp(160px,22vw,300px)] aspect-square rounded-full bg-white/[.09]" />
            <span dir="ltr" className="relative self-start px-3 py-1 rounded-full bg-white/20 font-semibold text-[13px] leading-[18px]">{pi + 1} / {promos.length}</span>
            <h1 className="relative m-0 font-display font-extrabold text-[clamp(36px,6vw,72px)] leading-none tracking-[-0.04em] max-w-[12ch] text-balance">{promo.title}</h1>
            {promo.subtitle && <p className="relative m-0 text-[clamp(15px,1.6vw,18px)] leading-[1.45] opacity-[.92] max-w-[40ch]">{promo.subtitle}</p>}
            {dots('h-2')}
          </section>
        )}

        {active && activeView && (
          <button onClick={() => nav.go({ name: 'track', orderId: active._id })}
            className="flex flex-wrap items-center gap-x-6 gap-y-4 text-start px-[22px] py-[18px] border border-line rounded-[20px] bg-card text-fg shadow-mg-sm hover:shadow-mg-md">
            <span className="w-11 h-11 rounded-[14px] bg-acc-soft text-acc flex items-center justify-center shrink-0"><IClock size={22} /></span>
            <span className="flex-[1_1_200px] flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold text-[13px] leading-[18px] text-acc">{tm('activeOrder')} · <span dir="ltr" className="bidi-isolate">{activeView.id}</span></span>
              <span className="font-display font-bold text-[18px] leading-6 tracking-[-0.02em]">{activeRest} — {activeView.status}</span>
            </span>
            <span className="flex-[1_1_220px] grid grid-cols-4 gap-1.5 max-w-[320px]">
              {activeView.steps.map((on, i) => <span key={i} className={`h-1.5 rounded-full ${on ? 'bg-primary' : 'bg-muted'}`} />)}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-[14px] leading-none">{tm('track')}<IChevronRight size={16} /></span>
          </button>
        )}

        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="m-0 font-display font-bold text-[clamp(26px,3vw,34px)] leading-[1.1] tracking-[-0.03em]">{tm('nearby')}</h2>
            <div className="flex gap-2 flex-wrap">
              {cats.map(c => (
                <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}
                  className={`h-10 px-[18px] rounded-full border text-[14px] leading-none ${cat === c
                    ? 'border-fg bg-fg text-bg font-semibold'
                    : 'border-line bg-card text-fg font-medium hover:border-fg'}`}>
                  {catLabel(c)}
                </button>
              ))}
            </div>
          </div>
          {restaurantsLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
              {[0, 1, 2].map(i => <RestaurantCardSkeleton key={i} web />)}
            </div>
          ) : list.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
              {list.map(r => <RestaurantCard key={r._id} r={r} web onOpen={() => open(r._id)} />)}
            </div>
          ) : (
            <div className="py-16 px-6 flex flex-col items-center gap-2.5 text-center border border-dashed border-input rounded-3xl">
              <span className="font-display font-bold text-[22px] leading-7">{tm('noResults')}</span>
              <span className="text-[15px] leading-[22px] text-muted-fg max-w-[360px]">{tm('noResultsSub')}</span>
              <button onClick={clear} className="mt-2 h-11 px-5 rounded-full border border-line bg-card text-fg font-semibold text-[14px] leading-none hover:border-fg">{tm('clear')}</button>
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── Phone ─────────────────────────────────────────────────────────
  return (
    <div className="pt-2 px-5 pb-[120px] flex flex-col gap-5 animate-mg-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img src={BRAND_ICON} alt="Menu Go" className="w-9 h-9 rounded-[9px] block" />
          <span className="font-display font-bold text-[20px] leading-7 tracking-[-0.02em]">{tm('appName')}</span>
        </div>
        <button aria-label={tm('notifications')} onClick={() => nav.go({ name: 'notifs' })}
          className="relative w-11 h-11 rounded-[14px] border border-line bg-bg text-fg flex items-center justify-center hover:bg-accent">
          <IBell size={20} />
          {unread > 0 && (
            <span className="absolute top-1.5 end-1.5 min-w-4 h-4 px-1 box-border rounded-full bg-neg5 text-white font-semibold text-[10px] leading-4 text-center">{unread}</span>
          )}
        </button>
      </div>

      <Segmented label={tm('orderType')} options={types} value={orderType} onChange={setOrderType} />

      <label className="flex items-center gap-2.5 h-12 px-3.5 border border-input rounded-[14px] text-muted-fg">
        <ISearch size={18} className="shrink-0" />
        <input aria-label={tm('searchPh')} value={query} onChange={e => setQuery(e.target.value)} placeholder={tm('searchPh')}
          className="flex-1 min-w-0 border-0 outline-none bg-transparent text-fg text-[16px] leading-none" />
        {query && (
          <button aria-label={tm('clear')} onClick={clear} className="w-8 h-8 border-0 rounded-full bg-muted text-fg flex items-center justify-center">
            <IX size={14} sw={2.5} />
          </button>
        )}
      </label>

      {active && activeView && (
        <button onClick={() => nav.go({ name: 'track', orderId: active._id })}
          className="text-start border border-line rounded-[14px] bg-card text-fg shadow-mg-sm p-4 flex flex-col gap-3 hover:bg-accent">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold text-[12px] leading-4 text-acc">{tm('activeOrder')} · <span dir="ltr" className="bidi-isolate">{activeView.id}</span></span>
              <span className="font-semibold text-[16px] leading-[22px]">{activeRest}</span>
            </div>
            <span className="flex items-center gap-1 font-semibold text-[14px] leading-5">{activeView.status}<IChevronRight size={16} /></span>
          </div>
          <div className="grid grid-cols-4 gap-1 w-full">
            {activeView.steps.map((on, i) => <span key={i} className={`h-1 rounded-full ${on ? 'bg-acc' : 'bg-muted'}`} />)}
          </div>
        </button>
      )}

      {!q && promo && (
        <div {...swipe} className="relative overflow-hidden rounded-3xl bg-primary text-on-primary pt-[22px] px-[22px] pb-5 flex flex-col gap-1.5 min-h-[148px] box-border">
          <span className="absolute end-[-40px] top-[-40px] w-[180px] h-[180px] rounded-full bg-white/[.12]" />
          <span className="absolute end-[30px] bottom-[-70px] w-[140px] h-[140px] rounded-full bg-white/[.08]" />
          <span dir="ltr" className="relative self-start px-2.5 py-[3px] rounded-full bg-white/20 font-semibold text-[12px] leading-4">{pi + 1} / {promos.length}</span>
          <span className="relative mt-1.5 font-display font-extrabold text-[28px] leading-8 tracking-[-0.03em]">{promo.title}</span>
          {promo.subtitle && <span className="relative text-[14px] leading-5 opacity-[.92]">{promo.subtitle}</span>}
          {dots('h-1.5')}
        </div>
      )}

      <div className="mg-scroll flex gap-2 overflow-x-auto -mx-5 px-5">
        {cats.map(c => (
          <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}
            className={`shrink-0 h-9 px-4 rounded-full border text-[14px] leading-none ${cat === c
              ? 'border-primary bg-primary text-on-primary font-semibold'
              : 'border-line bg-bg text-fg font-normal hover:bg-accent'}`}>
            {catLabel(c)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 font-display font-bold text-[20px] leading-7 tracking-[-0.02em]">{tm('nearby')}</h2>
        {restaurantsLoading ? (
          <div className="flex flex-col gap-4">{[0, 1, 2].map(i => <RestaurantCardSkeleton key={i} web={false} />)}</div>
        ) : list.length > 0 ? (
          <div className="flex flex-col gap-4">
            {list.map(r => <RestaurantCard key={r._id} r={r} web={false} onOpen={() => open(r._id)} />)}
          </div>
        ) : (
          <div className="py-10 px-4 flex flex-col items-center gap-2 text-center border border-dashed border-line rounded-[14px]">
            <ISearch size={28} className="text-muted-fg" />
            <span className="font-semibold text-[16px] leading-[22px]">{tm('noResults')}</span>
            <span className="text-[14px] leading-5 text-muted-fg max-w-[260px]">{tm('noResultsSub')}</span>
            <button onClick={clear} className="mt-2 h-11 px-4 rounded-[14px] border border-line bg-bg text-fg font-semibold text-[14px] leading-none hover:bg-accent">{tm('clear')}</button>
          </div>
        )}
      </div>
    </div>
  );
};
