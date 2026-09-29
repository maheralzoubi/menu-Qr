// App chrome: phone bottom nav + floating cart bar (Menu Go v2), web header + footer (Menu Go Web).
import { ACTIVE_STATUSES, useApp, useMg, type OrderType } from '../../contexts/AppContext';
import { useCart } from '../../contexts/CartContext';
import { useNav, type Tab } from '../../navigation';
import { IBag, IBell, IHome, IReceipt, ISearch, IUser, IX } from './Icons';
import { Segmented, money } from './ui';

export const BRAND_ICON = '/brand/menugo-icon.svg';

function useCartTotals() {
  const { itemCount, total, restaurantId } = useCart();
  const { restaurantById } = useApp();
  return { count: itemCount, label: money(total, restaurantById(restaurantId)?.currency) };
}

export function useOrderTypes() {
  const tm = useMg();
  return (['pickup', 'dinein', 'delivery'] as OrderType[]).map(k => ({ key: k, label: tm(k) }));
}

// ── Phone ───────────────────────────────────────────────────────────
export function BottomNav() {
  const tm = useMg();
  const { route, tab } = useNav();
  const { orders } = useApp();
  const hasActive = orders.some(o => ACTIVE_STATUSES.includes(o.status));
  const items: { k: Tab; label: string; icon: React.ReactNode }[] = [
    { k: 'home', label: tm('home'), icon: <IHome size={22} /> },
    { k: 'orders', label: tm('orders'), icon: <IReceipt size={22} /> },
    { k: 'profile', label: tm('profile'), icon: <IUser size={22} /> },
  ];
  return (
    <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-30 grid grid-cols-3 px-3 pt-1.5 border-t border-line bg-bg"
      style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
      {items.map(it => {
        const cur = route.name === it.k;
        return (
          <button key={it.k} aria-current={cur ? 'page' : undefined} onClick={() => tab(it.k)}
            className={`relative h-[52px] border-0 bg-transparent flex flex-col items-center justify-center gap-1 text-[12px] leading-4 ${cur ? 'text-acc font-semibold' : 'text-muted-fg font-normal'}`}>
            {it.icon}
            <span>{it.label}</span>
            {it.k === 'orders' && hasActive && (
              <span className="absolute top-1 start-[calc(50%+6px)] w-2 h-2 rounded-full bg-acc border-2 border-bg box-content" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function CartBar({ aboveNav, web }: { aboveNav?: boolean; web?: boolean }) {
  const tm = useMg();
  const { go } = useNav();
  const { count, label } = useCartTotals();
  if (web) {
    return (
      <div className="fixed inset-x-4 bottom-6 z-[35] flex justify-center animate-mg-in">
        <button onClick={() => go({ name: 'cart' })}
          className="w-full max-w-[520px] h-[58px] ps-4 pe-[22px] border-0 rounded-full bg-primary text-white shadow-mg-lg flex items-center gap-3 font-semibold text-[16px] leading-none">
          <span className="min-w-[30px] h-[30px] px-2 box-border rounded-full bg-white/[.22] flex items-center justify-center text-[14px]">{count}</span>
          <span className="flex-1 text-start">{tm('viewCart')}</span><span>{label}</span>
        </button>
      </div>
    );
  }
  return (
    <div className="fixed inset-x-4 z-20 animate-mg-in"
      style={{ bottom: `calc(${aboveNav ? 92 : 24}px + env(safe-area-inset-bottom, 0px))` }}>
      <button onClick={() => go({ name: 'cart' })}
        className="w-full h-14 px-4 border-0 rounded-[14px] bg-primary text-on-primary shadow-mg-lg flex items-center gap-3 font-semibold text-[16px] leading-none hover:opacity-95">
        <span className="min-w-7 h-7 px-2 box-border rounded-full bg-on-primary/15 flex items-center justify-center text-[13px]">{count}</span>
        <span className="flex-1 text-start">{tm('viewCart')}</span>
        <span>{label}</span>
      </button>
    </div>
  );
}

// ── Web ─────────────────────────────────────────────────────────────
export function WebHeader({ wide }: { wide: boolean }) {
  const tm = useMg();
  const nav = useNav();
  const { unread, orders, orderType, setOrderType, query, setQuery } = useApp();
  const { count, label } = useCartTotals();
  const types = useOrderTypes();
  const hasActive = orders.some(o => ACTIVE_STATUSES.includes(o.status));

  const onSearch = (v: string) => {
    setQuery(v);
    if (nav.route.name !== 'home') nav.tab('home');
  };

  return (
    <header className="sticky top-0 z-30 bg-bg border-b border-line">
      <div className="max-w-[1240px] mx-auto px-[clamp(16px,4vw,32px)] h-[72px] flex items-center gap-[clamp(12px,2vw,24px)]">
        <button onClick={() => nav.tab('home')} aria-label="Menu Go home" className="flex items-center gap-2.5 border-0 bg-transparent p-0 text-fg shrink-0">
          <img src={BRAND_ICON} alt="" className="w-[38px] h-[38px] rounded-[10px] block" />
          <span className="font-display font-extrabold text-[22px] leading-none tracking-[-0.03em]">{tm('appName')}</span>
        </button>
        {wide && <Segmented variant="pill" label={tm('orderType')} options={types} value={orderType} onChange={setOrderType} />}
        <label className="flex-1 min-w-0 max-w-[460px] flex items-center gap-2.5 h-11 px-4 rounded-full border border-line bg-card text-muted-fg">
          <ISearch size={18} className="shrink-0" />
          <input aria-label={tm('searchPh')} value={query} onChange={e => onSearch(e.target.value)} placeholder={tm('searchPh')}
            className="flex-1 min-w-0 border-0 outline-none bg-transparent text-fg text-[15px] leading-none" />
          {query && (
            <button aria-label={tm('clear')} onClick={() => setQuery('')} className="w-7 h-7 border-0 rounded-full bg-muted text-fg flex items-center justify-center">
              <IX size={12} sw={2.5} />
            </button>
          )}
        </label>
        <div className="flex-1" />
        <nav aria-label="Account" className="flex items-center gap-1 shrink-0">
          <button aria-label={tm('notifications')} onClick={() => nav.go({ name: 'notifs' })}
            className="relative w-11 h-11 rounded-full border-0 bg-transparent text-fg flex items-center justify-center hover:bg-accent">
            <IBell size={20} />
            {unread > 0 && (
              <span className="absolute top-1.5 end-1.5 min-w-4 h-4 px-1 box-border rounded-full bg-primary text-white text-[10px] leading-4 font-semibold text-center">{unread}</span>
            )}
          </button>
          <button onClick={() => nav.tab('orders')} aria-current={nav.route.name === 'orders' ? 'page' : undefined}
            className="h-11 px-3.5 rounded-full border-0 bg-transparent text-fg font-medium text-[14px] leading-none flex items-center gap-2 hover:bg-accent">
            <IReceipt size={18} short />{tm('orders')}
            {hasActive && <span className="w-2 h-2 rounded-full bg-primary" />}
          </button>
          <button aria-label={tm('profile')} onClick={() => nav.tab('profile')}
            className="w-11 h-11 rounded-full border border-line bg-card text-fg flex items-center justify-center hover:bg-accent">
            <IUser size={18} />
          </button>
          <button onClick={() => nav.go({ name: 'cart' })}
            className="ms-1.5 h-11 ps-3.5 pe-4 rounded-full border-0 bg-fg text-bg font-semibold text-[14px] leading-none flex items-center gap-2.5 hover:opacity-90">
            <IBag size={18} />
            <span>{count}</span>
            {count > 0 && <span className="opacity-70 font-medium">· {label}</span>}
          </button>
        </nav>
      </div>
      {!wide && (
        <div className="max-w-[1240px] mx-auto px-[clamp(16px,4vw,32px)] pb-3">
          <Segmented variant="pillGrid" label={tm('orderType')} options={types} value={orderType} onChange={setOrderType} />
        </div>
      )}
    </header>
  );
}

export function WebFooter() {
  const tm = useMg();
  return (
    <footer className="border-t border-line mt-6">
      <div className="max-w-[1240px] mx-auto px-[clamp(16px,4vw,32px)] pt-7 pb-24 flex flex-wrap justify-between gap-3 text-[13px] leading-[18px] text-muted-fg">
        <span className="font-display font-extrabold text-[16px] leading-none text-fg tracking-[-0.02em]">{tm('appName')}</span>
        <span>{tm('copyright', { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}
