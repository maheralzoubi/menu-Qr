import { useEffect, useMemo, useState } from 'react';
import { useApp, useMg } from '../contexts/AppContext';
import { useCart } from '../contexts/CartContext';
import { useNav } from '../navigation';
import { useViewport } from '../hooks/useViewport';
import type { Category, MenuItem } from '../types';
import { IArrowLeft, IBag, IChevronRight, IClock, IMapPin, IPlus, ISearch, IStar, IUtensils } from '../components/mg/Icons';
import { ItemSheet } from '../components/mg/ItemSheet';
import { useCuisineLabel, closedLabel } from '../components/mg/RestaurantCard';
import { Img, Sk, Stepper, money, monogram } from '../components/mg/ui';

interface Info {
  name: string;
  logo?: string;
  currency: string;
  address: string;
  contactPhone: string;
  cuisine: string[];
  openTime: string | null;
  closeTime: string | null;
  prepTime: string | null;
  isOpen: boolean;
  averageRating: number;
  reviewCount: number;
}

interface Props { restaurantId: string; qrTable: string }

export const RestaurantScreen = ({ restaurantId, qrTable }: Props) => {
  const tm = useMg();
  const nav = useNav();
  const { mid, wide } = useViewport();
  const { restaurantById, toast, setOrderType, setTable, lang } = useApp();
  const cart = useCart();
  const cuisineLabel = useCuisineLabel();
  const listed = restaurantById(restaurantId);

  const [info, setInfo] = useState<Info | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'menu' | 'info'>('menu');
  const [mq, setMq] = useState('');
  const [sheet, setSheet] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (qrTable) { setOrderType('dinein'); setTable(qrTable); }
  }, [qrTable, setOrderType, setTable]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/menu?restaurantId=${restaurantId}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/categories?restaurantId=${restaurantId}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/restaurants/${restaurantId}/info`).then(r => r.ok ? r.json() : null),
    ]).then(([menu, cats, inf]) => {
      setItems(Array.isArray(menu) ? menu : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setInfo(inf);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [restaurantId]);

  const R = {
    name: info?.name ?? listed?.name ?? '',
    logo: info?.logo ?? listed?.logo,
    currency: info?.currency ?? listed?.currency ?? 'USD',
    address: info?.address ?? listed?.address ?? '',
    phone: info?.contactPhone ?? '',
    cuisine: info?.cuisine ?? listed?.cuisine ?? [],
    openTime: info?.openTime ?? listed?.openTime ?? null,
    closeTime: info?.closeTime ?? listed?.closeTime ?? null,
    prepTime: info?.prepTime ?? listed?.prepTime ?? null,
    open: info?.isOpen ?? listed?.isOpen ?? true,
    rating: info?.averageRating ?? listed?.averageRating ?? 0,
    reviews: info?.reviewCount ?? listed?.reviewCount ?? 0,
  };
  const mono = monogram(R.name || '?');
  const hours = R.openTime && R.closeTime ? `${R.openTime} – ${R.closeTime}` : tm('noHours');
  const time = R.prepTime ? `${R.prepTime} ${tm('min')}` : null;
  const directions = R.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(R.address)}` : undefined;
  const call = R.phone ? `tel:${R.phone.replace(/\s/g, '')}` : undefined;

  // Menu sections in category order; items in unknown categories go last.
  const sections = useMemo(() => {
    const q = mq.trim().toLowerCase();
    const shown = q ? items.filter(i => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)) : items;
    const order = categories.map(c => c.name);
    shown.forEach(i => { if (!order.includes(i.category)) order.push(i.category); });
    return order
      .map((name, si) => ({ title: name || tm('other'), anchor: `mg-sec-${si}`, items: shown.filter(i => i.category === name) }))
      .filter(s => s.items.length);
  }, [items, categories, mq, tm]);

  const add = (item: MenuItem, qty = 1, note = '') => {
    if (!R.open) return;
    const replaced = cart.addItem(item, restaurantId, R.name, R.logo ?? '', { qty, note });
    toast(replaced ? `${tm('replaced')} ${R.name}` : tm('added'));
  };
  const openItem = (item: MenuItem) => { if (R.open) setSheet(item); };

  const jump = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior: 'smooth' });
  };

  const sheetEl = sheet && (
    <ItemSheet item={sheet} currency={R.currency} inCart={cart.qtyFor(sheet.id)} web={mid}
      onClose={() => setSheet(null)} onAdd={(qty, note) => { add(sheet, qty, note); setSheet(null); }} />
  );

  const addButton = (item: MenuItem, web: boolean) => {
    if (!R.open) return null;
    const q = cart.qtyFor(item.id);
    const onClick = (e: React.MouseEvent) => { e.stopPropagation(); add(item); };
    if (web) {
      return q > 0
        ? <button aria-label="Add" onClick={onClick} className="absolute bottom-2 end-2 min-w-9 h-9 px-2.5 rounded-full border-0 bg-primary text-white font-semibold text-[14px] leading-none shadow-mg-md">{q}</button>
        : <button aria-label="Add" onClick={onClick} className="absolute bottom-2 end-2 w-9 h-9 rounded-full border-0 bg-card text-fg shadow-mg-md flex items-center justify-center hover:bg-primary hover:text-white"><IPlus size={18} sw={2.25} /></button>;
    }
    return q > 0
      ? <button aria-label="Add" onClick={onClick} className="absolute -bottom-2 -end-2 min-w-9 h-9 px-2.5 rounded-full border-2 border-bg bg-primary text-on-primary font-semibold text-[14px] leading-none">{q}</button>
      : <button aria-label="Add" onClick={onClick} className="absolute -bottom-2 -end-2 w-9 h-9 rounded-full border border-line bg-bg text-fg shadow-mg-md flex items-center justify-center hover:bg-accent"><IPlus size={18} sw={2.25} /></button>;
  };

  const popular = (item: MenuItem, web: boolean) => item.featured && (
    <span className={`rounded-full bg-acc-soft text-acc font-semibold text-[12px] leading-4 ${web ? 'px-[9px] py-0.5' : 'px-2 py-px'}`}>{tm('popular')}</span>
  );

  const noItems = !loading && sections.length === 0;

  // ── Web ───────────────────────────────────────────────────────────
  if (mid) {
    return (
      <div data-screen-label="Restaurant" className="max-w-[1240px] mx-auto px-[clamp(16px,4vw,32px)] pt-[clamp(16px,3vw,28px)] pb-[120px] animate-mg-in-slow">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px] leading-5 text-muted-fg mb-4">
          <button onClick={() => nav.tab('home')} className="border-0 bg-transparent p-0 text-inherit hover:text-fg">{tm('home')}</button>
          <IChevronRight size={14} />
          <span aria-current="page" className="text-fg font-medium">{R.name}</span>
        </nav>

        <section className="rounded-[28px] overflow-hidden border border-line bg-card">
          <div className="relative h-[clamp(120px,16vw,200px)] bg-acc-soft overflow-hidden">
            <span dir="ltr" className="absolute end-[4%] bottom-[-20%] font-display font-extrabold text-[clamp(120px,18vw,240px)] leading-none tracking-[-0.06em] text-acc opacity-[.18]">{mono}</span>
          </div>
          <div className="relative -mt-11 px-[clamp(20px,3vw,32px)] pb-[clamp(20px,3vw,28px)] flex flex-wrap items-end gap-x-8 gap-y-5">
            <div className="w-24 h-24 rounded-3xl bg-primary text-white flex items-center justify-center font-display font-extrabold text-[34px] leading-none tracking-[-0.04em] border-4 border-card shrink-0 overflow-hidden box-border" dir="ltr">
              <Img src={R.logo} alt={R.name} className="w-full h-full object-cover" fallback={mono} />
            </div>
            <div className="flex-[1_1_280px] flex flex-col gap-1.5 min-w-0">
              <h1 className="m-0 font-display font-extrabold text-[clamp(30px,4vw,44px)] leading-[1.05] tracking-[-0.035em]">{R.name}</h1>
              <div className="flex items-center gap-3 flex-wrap text-[15px] leading-[22px] text-muted-fg">
                {R.cuisine.length > 0 && <span>{R.cuisine.map(cuisineLabel).join(' · ')}</span>}
                {R.reviews > 0 && (
                  <span className="flex items-center gap-1 text-fg font-semibold"><IStar size={14} />{R.rating.toFixed(1)} <span className="font-normal text-muted-fg">({R.reviews})</span></span>
                )}
                {time && <span>{time}</span>}
                {R.open
                  ? <span className="px-2.5 py-[3px] rounded-full bg-pos1 text-pos7 font-semibold text-[13px] leading-4">{tm('open')} · <span dir="ltr" className="bidi-isolate">{hours}</span></span>
                  : <span className="px-2.5 py-[3px] rounded-full bg-muted text-muted-fg font-semibold text-[13px] leading-4">{closedLabel(R, tm)}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {R.address && <span className="flex items-center gap-2 text-[14px] leading-5 text-muted-fg me-2"><IMapPin size={16} />{R.address}</span>}
              <a href={directions} target="_blank" rel="noreferrer" aria-disabled={!directions}
                className={`h-10 px-4 rounded-full border border-line bg-card text-fg font-semibold text-[14px] leading-none inline-flex items-center hover:border-fg ${directions ? '' : 'opacity-50 pointer-events-none'}`}>{tm('directions')}</a>
              <a href={call} aria-disabled={!call}
                className={`h-10 px-4 rounded-full border border-line bg-card text-fg font-semibold text-[14px] leading-none inline-flex items-center hover:border-fg ${call ? '' : 'opacity-50 pointer-events-none'}`}>{tm('call')}</a>
            </div>
          </div>
        </section>

        {!R.open && (
          <div role="status" className="mt-4 px-[18px] py-3.5 rounded-2xl bg-warn1 text-warn7 text-[15px] leading-[22px] flex gap-3 items-center">
            <IClock size={20} className="shrink-0" />
            <span><strong className="font-semibold">{closedLabel(R, tm)}.</strong> {tm('unavailable')}</span>
          </div>
        )}

        <div className="flex gap-8 items-start mt-7">
          {wide && (
            <aside aria-label={tm('menu')} className="sticky top-24 w-[190px] shrink-0 flex flex-col gap-0.5">
              <span className="font-semibold text-[12px] leading-4 uppercase tracking-[.08em] text-muted-fg px-3 pb-2">{tm('menu')}</span>
              {sections.map(sec => (
                <button key={sec.anchor} onClick={() => jump(sec.anchor)}
                  className="text-start h-10 px-3 border-0 rounded-xl bg-transparent text-fg font-medium text-[15px] leading-none hover:bg-accent">{sec.title}</button>
              ))}
            </aside>
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <label className="flex items-center gap-2.5 h-12 px-4 rounded-full bg-muted text-muted-fg max-w-[440px]">
              <ISearch size={16} />
              <input aria-label="Search menu" value={mq} onChange={e => setMq(e.target.value)} placeholder={tm('searchPh')}
                className="flex-1 min-w-0 border-0 outline-none bg-transparent text-fg text-[15px] leading-none" />
            </label>
            {loading ? (
              <div aria-busy="true" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4 mt-6">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4 p-4 rounded-[20px] border border-line">
                    <div className="flex-1 flex flex-col gap-2.5">
                      <Sk className="w-3/5 h-4 rounded-md" /><Sk className="w-[90%] h-3 rounded-md" /><Sk className="w-[30%] h-3.5 rounded-md" />
                    </div>
                    <Sk className="w-[104px] h-[104px] rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {sections.map(sec => (
                  <section key={sec.anchor} id={sec.anchor} className="pt-6 flex flex-col gap-3.5">
                    <h2 className="m-0 font-display font-bold text-[24px] leading-[30px] tracking-[-0.025em]">{sec.title}</h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4">
                      {sec.items.map(item => (
                        <div key={item.id} role="button" tabIndex={0} onClick={() => openItem(item)} onKeyDown={e => e.key === 'Enter' && openItem(item)}
                          className={`flex gap-4 items-stretch p-4 rounded-[20px] border border-line bg-card transition-[box-shadow,border-color] duration-[160ms] hover:shadow-mg-md hover:border-input ${R.open ? 'cursor-pointer' : 'cursor-default'}`}>
                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[16px] leading-[22px]">{item.name}</span>
                              {popular(item, true)}
                            </div>
                            {item.description && <span className="text-[14px] leading-5 text-muted-fg text-pretty">{item.description}</span>}
                            <span className="flex-1" />
                            <span className="font-semibold text-[15px] leading-5">{money(item.price, R.currency)}</span>
                          </div>
                          <div className="relative w-[104px] h-[104px] shrink-0 rounded-2xl bg-acc-soft flex items-center justify-center text-acc">
                            <Img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-2xl"
                              fallback={<IUtensils size={26} sw={1.5} className="opacity-55" />} />
                            {addButton(item, true)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
                {noItems && (
                  <div className="py-14 px-5 text-center flex flex-col gap-2 items-center">
                    <span className="font-display font-bold text-[20px] leading-[26px]">{tm('noResults')}</span>
                    <span className="text-[14px] leading-5 text-muted-fg max-w-[320px]">{tm('noResultsSub')}</span>
                    {mq && <button onClick={() => setMq('')} className="mt-2 h-11 px-5 rounded-full border border-line bg-card text-fg font-semibold text-[14px] leading-none">{tm('clear')}</button>}
                  </div>
                )}
              </>
            )}
          </div>

          {wide && <CartAside />}
        </div>
        {sheetEl}
      </div>
    );
  }

  // ── Phone ─────────────────────────────────────────────────────────
  const today = new Date().getDay();
  const weekFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { weekday: lang === 'ar' ? 'long' : 'short' });
  const week = [6, 0, 1, 2, 3, 4, 5].map(d => ({ d, name: weekFmt.format(new Date(2024, 0, 7 + d)) })); // 7 Jan 2024 was a Sunday

  const tabBtn = (k: 'menu' | 'info', label: string) => (
    <button role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
      className={`h-11 p-0 border-0 border-b-2 bg-transparent font-semibold text-[14px] leading-none ${tab === k ? 'border-primary text-fg' : 'border-transparent text-muted-fg hover:text-fg'}`}>
      {label}
    </button>
  );

  return (
    <div className="pb-[120px] animate-mg-in">
      <div className="sticky top-0 z-[5] bg-bg pt-2 px-5 border-b border-line">
        <div className="flex items-center gap-3">
          <button aria-label="Back" onClick={nav.back}
            className="w-11 h-11 shrink-0 rounded-[14px] border border-line bg-bg text-fg flex items-center justify-center hover:bg-accent">
            <IArrowLeft size={20} />
          </button>
          <span className="flex-1 min-w-0 font-semibold text-[16px] leading-[22px] truncate">{R.name}</span>
        </div>
        <div role="tablist" className="flex gap-6 mt-2">
          {tabBtn('menu', tm('menu'))}
          {tabBtn('info', tm('info'))}
        </div>
      </div>

      <div className="pt-5 px-5 flex gap-3.5 items-center">
        <div dir="ltr" className="w-16 h-16 shrink-0 rounded-[14px] bg-muted flex items-center justify-center font-semibold text-[18px] leading-none text-muted-fg overflow-hidden">
          <Img src={R.logo} alt={R.name} className="w-full h-full object-cover" fallback={mono} />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="m-0 font-display font-bold text-[24px] leading-8 tracking-[-0.02em]">{R.name}</h1>
          <div className="flex items-center gap-2.5 flex-wrap text-[14px] leading-5 text-muted-fg">
            {R.reviews > 0 && (
              <span className="flex items-center gap-1 text-fg font-semibold"><IStar size={14} />{R.rating.toFixed(1)} <span className="font-normal text-muted-fg">({R.reviews})</span></span>
            )}
            {time && <span>{time}</span>}
            {R.open
              ? <span className="px-2 py-0.5 rounded-full bg-pos1 text-pos7 font-semibold text-[12px] leading-4">{tm('open')}</span>
              : <span className="px-2 py-0.5 rounded-full bg-muted text-muted-fg font-semibold text-[12px] leading-4">{tm('closed')}</span>}
          </div>
        </div>
      </div>

      {!R.open && (
        <div role="status" className="mt-4 mx-5 px-3.5 py-3 rounded-[14px] bg-warn1 text-warn7 text-[14px] leading-5 flex gap-2.5 items-start">
          <IClock size={18} className="shrink-0 mt-px" />
          <span><strong className="font-semibold">{closedLabel(R, tm)}</strong><br />{tm('unavailable')}</span>
        </div>
      )}

      {tab === 'menu' ? (
        <>
          <div className="pt-4 px-5">
            <label className="flex items-center gap-2.5 h-11 px-3.5 rounded-[14px] bg-muted text-muted-fg">
              <ISearch size={16} />
              <input aria-label="Search menu" value={mq} onChange={e => setMq(e.target.value)} placeholder={tm('searchPh')}
                className="flex-1 min-w-0 border-0 outline-none bg-transparent text-fg text-[16px] leading-none" />
            </label>
          </div>
          {loading ? (
            <div aria-busy="true" className="py-6 px-5 flex flex-col gap-5">
              <Sk className="w-24 h-[18px] rounded" />
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex gap-3.5 items-center">
                  <div className="flex-1 flex flex-col gap-2">
                    <Sk className="w-3/5 h-4 rounded" /><Sk className="w-[90%] h-3 rounded" /><Sk className="w-[30%] h-3.5 rounded" />
                  </div>
                  <Sk className="w-[88px] h-[88px] rounded-[14px]" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {sections.map(sec => (
                <section key={sec.anchor} className="pt-6 px-5">
                  <h2 className="m-0 mb-1 font-display font-bold text-[20px] leading-7 tracking-[-0.02em]">{sec.title}</h2>
                  {sec.items.map(item => (
                    <div key={item.id} role="button" tabIndex={0} onClick={() => openItem(item)} onKeyDown={e => e.key === 'Enter' && openItem(item)}
                      className={`flex gap-3.5 items-start py-4 border-b border-line ${R.open ? 'cursor-pointer' : 'cursor-default'}`}>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[16px] leading-[22px]">{item.name}</span>
                          {popular(item, false)}
                        </div>
                        {item.description && <span className="text-[14px] leading-5 text-muted-fg text-pretty">{item.description}</span>}
                        <span className="font-semibold text-[14px] leading-5 mt-1">{money(item.price, R.currency)}</span>
                      </div>
                      <div className="relative w-24 h-24 shrink-0 rounded-[18px] bg-acc-soft flex items-center justify-center text-muted-fg">
                        <Img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-[18px]"
                          fallback={<IUtensils size={24} sw={1.5} className="opacity-60" />} />
                        {addButton(item, false)}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
              {noItems && (
                <div className="py-10 px-5 text-center flex flex-col gap-2 items-center">
                  <span className="font-semibold text-[16px] leading-[22px]">{tm('noResults')}</span>
                  <span className="text-[14px] leading-5 text-muted-fg max-w-[260px]">{tm('noResultsSub')}</span>
                  {mq && <button onClick={() => setMq('')} className="mt-2 h-11 px-4 rounded-[14px] border border-line bg-bg text-fg font-semibold text-[14px] leading-none">{tm('clear')}</button>}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="p-5 flex flex-col gap-4">
          <div className="border border-line rounded-[14px] overflow-hidden bg-card shadow-mg-sm">
            <div className="h-[140px] bg-muted flex items-center justify-center text-muted-fg"><IMapPin size={28} /></div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-[12px] leading-4 text-muted-fg">{tm('location')}</span>
                <span className="text-[14px] leading-5">{R.address || '—'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={directions} target="_blank" rel="noreferrer" aria-disabled={!directions}
                  className={`h-11 rounded-[14px] bg-primary text-on-primary font-semibold text-[14px] leading-none flex items-center justify-center ${directions ? '' : 'opacity-50 pointer-events-none'}`}>{tm('directions')}</a>
                <a href={call} aria-disabled={!call}
                  className={`h-11 rounded-[14px] border border-line bg-bg text-fg font-semibold text-[14px] leading-none flex items-center justify-center hover:bg-accent ${call ? '' : 'opacity-50 pointer-events-none'}`}>{tm('call')}</a>
              </div>
            </div>
          </div>
          <div className="border border-line rounded-[14px] bg-card shadow-mg-sm p-4">
            <h3 className="m-0 mb-2 font-semibold text-[16px] leading-[22px]">{tm('hours')}</h3>
            {week.map(({ d, name }) => d === today ? (
              <div key={d} className="flex justify-between py-2 font-semibold text-[14px] leading-5"><span>{name} · {tm('today')}</span><span dir="ltr">{hours}</span></div>
            ) : (
              <div key={d} className="flex justify-between py-2 text-[14px] leading-5 text-muted-fg"><span>{name}</span><span dir="ltr">{hours}</span></div>
            ))}
          </div>
        </div>
      )}
      {sheetEl}
    </div>
  );
};

/** Sticky cart sidebar on wide web layouts. */
function CartAside() {
  const tm = useMg();
  const nav = useNav();
  const cart = useCart();
  const { restaurantById } = useApp();
  const currency = restaurantById(cart.restaurantId)?.currency ?? 'USD';
  const count = `${cart.itemCount} ${cart.itemCount === 1 ? tm('item') : tm('items')}`;
  return (
    <aside aria-label={tm('cart')} className="sticky top-24 w-[340px] shrink-0 rounded-3xl border border-line bg-card shadow-mg-sm flex flex-col max-h-[calc(100vh-120px)]">
      <div className="pt-5 px-5 pb-3 flex justify-between items-baseline gap-2">
        <h2 className="m-0 font-display font-bold text-[22px] leading-7 tracking-[-0.02em]">{tm('cart')}</h2>
        {cart.items.length > 0 && <span className="text-[13px] leading-[18px] text-muted-fg">{count}</span>}
      </div>
      {cart.items.length === 0 ? (
        <div className="pt-6 px-5 pb-8 flex flex-col items-center text-center gap-2">
          <span className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-fg"><IBag size={24} /></span>
          <span className="font-semibold text-[15px] leading-[22px]">{tm('emptyCart')}</span>
          <span className="text-[13px] leading-[18px] text-muted-fg">{tm('emptyCartSub')}</span>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-5">
            {cart.items.map(l => (
              <div key={l.key} className="flex gap-3 items-center py-3 border-t border-line">
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="font-semibold text-[14px] leading-5">{l.name}</span>
                  {l.note && <span className="text-[12px] leading-4 text-muted-fg"><bdi>“{l.note}”</bdi></span>}
                  <span className="font-medium text-[13px] leading-[18px]">{money(l.price * l.quantity, currency)}</span>
                </div>
                <Stepper variant="webLine" qty={l.quantity} onDec={() => cart.updateQty(l.key, l.quantity - 1)} onInc={() => cart.updateQty(l.key, l.quantity + 1)} />
              </div>
            ))}
          </div>
          <div className="pt-4 px-5 pb-5 border-t border-line flex flex-col gap-3">
            <div className="flex justify-between font-semibold text-[16px] leading-[22px]"><span>{tm('subtotal')}</span><span>{money(cart.total, currency)}</span></div>
            <button onClick={() => nav.go({ name: 'cart' })} className="h-[52px] border-0 rounded-full bg-primary text-white font-semibold text-[16px] leading-none hover:opacity-[.92]">{tm('viewCart')}</button>
          </div>
        </>
      )}
    </aside>
  );
}
