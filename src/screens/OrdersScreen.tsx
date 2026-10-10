import { useEffect, useState } from 'react';
import { ACTIVE_STATUSES, useApp, useMg, type Order } from '../contexts/AppContext';
import { useNav } from '../navigation';
import { useViewport } from '../hooks/useViewport';
import { Sk, money } from '../components/mg/ui';
import { describeOrder } from '../components/mg/orderView';

export const OrdersScreen = () => {
  const tm = useMg();
  const nav = useNav();
  const { mid } = useViewport();
  const { orders, ordersLoading, restaurantById, refreshOrders } = useApp();
  const [tab, setTab] = useState<'active' | 'past'>('active');

  // Statuses may have moved on while the app was in the background.
  useEffect(() => { refreshOrders(); }, [refreshOrders]);

  const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const past = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));
  const view = (o: Order) => {
    const r = restaurantById(o.restaurantId);
    return { ...describeOrder(o, tm), rest: r?.name ?? '—', total: money(o.total, r?.currency) };
  };
  const track = (o: Order) => nav.go({ name: 'track', orderId: o._id });
  const reorder = (o: Order) => nav.go({ name: 'rest', id: o.restaurantId });

  const tabs = [
    { k: 'active' as const, label: `${tm('active')} (${active.length})` },
    { k: 'past' as const, label: `${tm('past')} (${past.length})` },
  ];

  // ── Web ───────────────────────────────────────────────────────────
  if (mid) {
    return (
      <div data-screen-label="Orders" className="max-w-[880px] mx-auto px-[clamp(16px,4vw,32px)] pt-[clamp(20px,3vw,32px)] pb-24 flex flex-col gap-5 animate-mg-in-slow">
        <h1 className="m-0 font-display font-extrabold text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.035em]">{tm('orders')}</h1>
        <div role="tablist" className="flex gap-1 p-1 rounded-full bg-muted self-start">
          {tabs.map(x => (
            <button key={x.k} role="tab" aria-selected={tab === x.k} onClick={() => setTab(x.k)}
              className={`h-10 px-5 border-0 rounded-full text-[14px] leading-none ${tab === x.k ? 'bg-card shadow-mg text-fg font-semibold' : 'bg-transparent text-muted-fg font-medium'}`}>
              {x.label}
            </button>
          ))}
        </div>
        {ordersLoading ? (
          [0, 1].map(i => <Sk key={i} className="h-[92px] rounded-3xl" />)
        ) : tab === 'active' ? (
          active.length ? active.map(o => {
            const v = view(o);
            return (
              <button key={o._id} onClick={() => track(o)}
                className="text-start px-6 py-5 border border-line rounded-3xl bg-card shadow-mg-sm text-fg flex flex-wrap items-center gap-x-6 gap-y-4 hover:shadow-mg-md">
                <span className="flex-[1_1_240px] flex flex-col gap-1 min-w-0">
                  <span className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-display font-bold text-[19px] leading-6 tracking-[-0.02em]">{v.rest}</span>
                    <span className={`px-2.5 py-[3px] rounded-full font-semibold text-[12px] leading-4 ${v.ready ? 'bg-pos1 text-pos7' : 'bg-acc-soft text-acc'}`}>{v.status}</span>
                  </span>
                  <span className="text-[14px] leading-5 text-muted-fg">{v.summary} · <span dir="ltr" className="bidi-isolate">{v.id}</span> · {v.typeLabel}</span>
                </span>
                <span className="flex-[0_1_200px] grid grid-cols-4 gap-[5px]">
                  {v.steps.map((on, i) => <span key={i} className={`h-1.5 rounded-full ${on ? 'bg-primary' : 'bg-muted'}`} />)}
                </span>
                <span className="font-display font-bold text-[18px] leading-6">{v.total}</span>
              </button>
            );
          }) : (
            <div className="py-16 px-6 text-center flex flex-col gap-2 items-center border border-dashed border-input rounded-3xl">
              <span className="font-display font-bold text-[22px] leading-7">{tm('noActive')}</span>
              <span className="text-[15px] leading-[22px] text-muted-fg max-w-[340px]">{tm('noActiveSub')}</span>
              <button onClick={() => nav.tab('home')} className="mt-3 h-[50px] px-[26px] border-0 rounded-full bg-primary text-white font-semibold text-[15px] leading-none">{tm('browse')}</button>
            </div>
          )
        ) : past.length ? past.map(o => {
          const v = view(o);
          return (
            <div key={o._id} className="px-6 py-5 border border-line rounded-3xl bg-card flex flex-wrap items-center gap-x-6 gap-y-4">
              <span className="flex-[1_1_240px] flex flex-col gap-1 min-w-0">
                <span className="flex items-center gap-2.5">
                  <span className="font-display font-bold text-[19px] leading-6 tracking-[-0.02em]">{v.rest}</span>
                  <span className={`px-2.5 py-[3px] rounded-full font-semibold text-[12px] leading-4 bg-muted ${v.cancelled ? 'text-destructive' : 'text-muted-fg'}`}>{v.status}</span>
                </span>
                <span className="text-[14px] leading-5 text-muted-fg">{v.summary} · {v.date} · {v.total}</span>
              </span>
              <div className="flex gap-2">
                <button onClick={() => track(o)} className="h-[42px] px-4 border-0 rounded-full bg-transparent text-fg font-semibold text-[14px] leading-none hover:bg-accent">{tm('summary')}</button>
                <button onClick={() => reorder(o)} className="h-[42px] px-[18px] border-0 rounded-full bg-fg text-bg font-semibold text-[14px] leading-none hover:opacity-90">{tm('reorder')}</button>
              </div>
            </div>
          );
        }) : (
          <div className="py-16 px-6 text-center flex flex-col gap-2 items-center border border-dashed border-input rounded-3xl">
            <span className="font-display font-bold text-[22px] leading-7">{tm('noPast')}</span>
            <span className="text-[15px] leading-[22px] text-muted-fg">{tm('noPastSub')}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Phone ─────────────────────────────────────────────────────────
  return (
    <div className="pt-2 px-5 pb-[120px] flex flex-col gap-4 animate-mg-in">
      <h1 className="m-0 font-display font-bold text-[28px] leading-9 tracking-[-0.02em]">{tm('orders')}</h1>
      <div role="tablist" className="flex gap-6 border-b border-line">
        {tabs.map(x => (
          <button key={x.k} role="tab" aria-selected={tab === x.k} onClick={() => setTab(x.k)}
            className={`h-11 p-0 border-0 border-b-2 -mb-px bg-transparent font-semibold text-[14px] leading-none ${tab === x.k ? 'border-primary text-fg' : 'border-transparent text-muted-fg'}`}>
            {x.label}
          </button>
        ))}
      </div>
      {ordersLoading ? (
        [0, 1].map(i => <Sk key={i} className="h-[132px] rounded-[14px]" />)
      ) : tab === 'active' ? (
        active.length ? active.map(o => {
          const v = view(o);
          return (
            <button key={o._id} onClick={() => track(o)}
              className="text-start p-4 border border-line rounded-[14px] bg-card shadow-mg-sm text-fg flex flex-col gap-2.5 hover:bg-accent">
              <div className="flex justify-between items-center w-full gap-2">
                <span className="font-semibold text-[16px] leading-[22px]">{v.rest}</span>
                <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[12px] leading-4 ${v.ready ? 'bg-pos1 text-pos7' : 'bg-info1 text-info7'}`}>{v.status}</span>
              </div>
              <span className="text-[14px] leading-5 text-muted-fg">{v.summary}</span>
              <div className="grid grid-cols-4 gap-1 w-full">
                {v.steps.map((on, i) => <span key={i} className={`h-1 rounded-full ${on ? 'bg-acc' : 'bg-muted'}`} />)}
              </div>
              <div className="flex justify-between w-full text-[12px] leading-4 text-muted-fg">
                <span dir="ltr">{v.id} · {v.typeLabel}</span>
                <span className="font-semibold text-[14px] leading-5 text-fg">{v.total}</span>
              </div>
            </button>
          );
        }) : (
          <div className="py-16 px-6 text-center flex flex-col gap-2 items-center">
            <span className="font-semibold text-[16px] leading-[22px]">{tm('noActive')}</span>
            <span className="text-[14px] leading-5 text-muted-fg max-w-[260px]">{tm('noActiveSub')}</span>
            <button onClick={() => nav.tab('home')} className="mt-3 h-12 px-6 border-0 rounded-[14px] bg-primary text-on-primary font-semibold text-[16px] leading-none">{tm('browse')}</button>
          </div>
        )
      ) : past.length ? past.map(o => {
        const v = view(o);
        return (
          <div key={o._id} className="p-4 border border-line rounded-[14px] bg-card shadow-mg-sm flex flex-col gap-2.5">
            <div className="flex justify-between items-center gap-2">
              <span className="font-semibold text-[16px] leading-[22px]">{v.rest}</span>
              <span className={`px-2.5 py-0.5 rounded-full bg-muted font-semibold text-[12px] leading-4 ${v.cancelled ? 'text-destructive' : 'text-muted-fg'}`}>{v.status}</span>
            </div>
            <span className="text-[14px] leading-5 text-muted-fg">{v.summary}</span>
            <div className="flex justify-between items-center text-[12px] leading-4 text-muted-fg">
              <span><span dir="ltr" className="bidi-isolate">{v.id}</span> · {v.date} · {v.total}</span>
              <div className="flex gap-2">
                <button onClick={() => track(o)} className="h-9 px-3 border-0 rounded-[14px] bg-transparent text-fg font-semibold text-[14px] leading-none hover:bg-accent">{tm('summary')}</button>
                <button onClick={() => reorder(o)} className="h-9 px-3 border border-line rounded-[14px] bg-bg text-fg font-semibold text-[14px] leading-none hover:bg-accent">{tm('reorder')}</button>
              </div>
            </div>
          </div>
        );
      }) : (
        <div className="py-16 px-6 text-center flex flex-col gap-2 items-center">
          <span className="font-semibold text-[16px] leading-[22px]">{tm('noPast')}</span>
          <span className="text-[14px] leading-5 text-muted-fg">{tm('noPastSub')}</span>
        </div>
      )}
    </div>
  );
};
