import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { orderTypeOf, shortId, useApp, useMg, type Order } from '../contexts/AppContext';
import { useNav } from '../navigation';
import { useViewport } from '../hooks/useViewport';
import { IArrowLeft, ICheck, IMapPin, IX } from '../components/mg/Icons';
import { Sk, money } from '../components/mg/ui';
import { STATUS_INDEX, stepDefs } from '../components/mg/orderView';

export const OrderTrackingScreen = ({ orderId }: { orderId: string }) => {
  const tm = useMg();
  const nav = useNav();
  const { mid } = useViewport();
  const { orders, restaurantById } = useApp();
  const known = orders.find(o => o._id === orderId);

  const [order, setOrder] = useState<Order | null>(known ?? null);
  const [loading, setLoading] = useState(!known);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setOrder(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin, { path: '/socket.io' });
    socket.emit('order:join', orderId);
    socket.on('order:status', ({ id, status }: { id: string; status: Order['status'] }) => {
      if (id === orderId) setOrder(prev => prev ? { ...prev, status } : prev);
    });
    return () => { socket.disconnect(); };
  }, [orderId]);

  // The app-wide socket may learn about a status change first.
  useEffect(() => {
    if (known && order && known.status !== order.status) setOrder(o => o ? { ...o, status: known.status } : o);
  }, [known?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const toOrders = () => nav.tab('orders');
  const toHome = () => nav.tab('home');

  if (loading || !order) {
    return (
      <div className={mid ? 'max-w-[1100px] mx-auto px-[clamp(16px,4vw,32px)] pt-8 pb-24' : 'pt-2 px-5 pb-8'}>
        {loading ? (
          <div className="flex flex-col gap-4">
            <Sk className="w-40 h-8 rounded-lg" /><Sk className="h-56 rounded-[14px]" /><Sk className="h-40 rounded-[14px]" />
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <span className="font-semibold text-[16px] leading-[22px]">{tm('notFound')}</span>
            <button onClick={toHome} className="h-12 px-6 border border-line rounded-[14px] bg-bg text-fg font-semibold text-[16px] leading-none hover:bg-accent">{tm('backHome')}</button>
          </div>
        )}
      </div>
    );
  }

  const rest = restaurantById(order.restaurantId);
  const currency = rest?.currency ?? 'USD';
  const type = orderTypeOf(order);
  const idx = STATUS_INDEX[order.status];
  const cancelled = order.status === 'Cancelled';
  const live = idx >= 0 && idx < 3;
  const defs = stepDefs(type, tm);
  const headline = cancelled ? tm('cancelled') : defs[idx][0];
  const sub = cancelled ? tm('cancelledDesc') : defs[idx][1];
  const eta = live && idx < 2 && rest?.prepTime ? `${rest.prepTime} ${tm('min')}` : null;
  const pct = `${((idx + 1) / 4) * 100}%`;
  const steps = defs.map(([label, desc], i) => ({ label, desc, n: i + 1, done: i < idx || idx === 3, cur: i === idx && idx < 3, next: i > idx }));
  const id = '#' + shortId(order._id);
  const date = new Date(order.createdAt).toLocaleDateString();
  const lines = order.items.map((l, i) => ({ key: i, label: `${l.quantity}× ${l.name}`, price: money(l.price * l.quantity, currency) }));
  const detail = order.tableNumber ? `${tm('table')} ${order.tableNumber}` : type === 'delivery' ? order.address : order.pickup_time ? `${tm('pickupTime')} · ${order.pickup_time}` : '';
  const payLabel = order.payment_method === 'CARD' ? tm('payCard') : type === 'delivery' ? tm('payCod') : tm('payCounter');

  // ── Web ───────────────────────────────────────────────────────────
  if (mid) {
    return (
      <div data-screen-label="Tracking" className="max-w-[1100px] mx-auto px-[clamp(16px,4vw,32px)] pt-[clamp(20px,3vw,32px)] pb-24 animate-mg-in-slow">
        <button onClick={toOrders} className="flex items-center gap-1.5 border-0 bg-transparent p-0 text-muted-fg font-medium text-[14px] leading-5 mb-3 hover:text-fg">
          <IArrowLeft size={16} />{tm('orders')}
        </button>
        <div className="flex flex-wrap gap-6 items-start">
          <section aria-live="polite" className="flex-[1.4_1_440px] min-w-0 p-[clamp(24px,4vw,40px)] rounded-[28px] border border-line bg-card shadow-mg-sm flex flex-col gap-6">
            <div className="flex flex-wrap justify-between gap-4 items-start">
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-[14px] leading-5 text-muted-fg">{tm('order')} <span dir="ltr" className="bidi-isolate">{id}</span> · {tm(type)}</span>
                <h1 className={`m-0 font-display font-extrabold text-[clamp(32px,4.4vw,48px)] leading-[1.05] tracking-[-0.035em] ${cancelled ? 'text-destructive' : ''}`}>{headline}</h1>
                <span className="text-[16px] leading-6 text-muted-fg">{sub}</span>
              </div>
              {eta && (
                <div className="px-5 py-3.5 rounded-[20px] bg-acc-soft flex flex-col">
                  <span className="font-medium text-[13px] leading-[18px] text-acc">{tm('eta')}</span>
                  <span className="font-display font-extrabold text-[30px] leading-9 tracking-[-0.03em] text-acc">{eta}</span>
                </div>
              )}
            </div>
            {!cancelled && (
              <>
                <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: pct }} /></div>
                <ol className="list-none m-0 p-0 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
                  {steps.map(st => (
                    <li key={st.n} className="flex flex-col gap-2.5">
                      {st.done && <span className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center"><ICheck size={16} sw={3} /></span>}
                      {st.cur && <span className="w-9 h-9 box-border rounded-full border-2 border-primary flex items-center justify-center"><span className="w-3 h-3 rounded-full bg-primary animate-mg-pulse" /></span>}
                      {st.next && <span className="w-9 h-9 box-border rounded-full border-[1.5px] border-line text-muted-fg flex items-center justify-center font-semibold text-[14px] leading-none">{st.n}</span>}
                      <span className={`text-[15px] leading-[22px] ${st.next ? 'font-medium text-muted-fg' : 'font-semibold'}`}>{st.label}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          <aside className="flex-[1_1_320px] min-w-0 p-6 rounded-[28px] border border-line bg-card flex flex-col gap-3.5">
            <div className="flex justify-between items-baseline">
              <h2 className="m-0 font-display font-bold text-[20px] leading-[26px]">{tm('summary')}</h2>
              <span className="text-[13px] leading-[18px] text-muted-fg">{date}</span>
            </div>
            <div className="flex gap-3 p-3.5 rounded-2xl bg-muted">
              <IMapPin size={18} className="shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-[15px] leading-[22px]">{rest?.name ?? '—'}</span>
                {rest?.address && <span className="text-[13px] leading-[18px] text-muted-fg">{rest.address}</span>}
                {detail && <span className="font-semibold text-[13px] leading-[18px] text-acc">{detail}</span>}
              </div>
            </div>
            {lines.map(l => <div key={l.key} className="flex justify-between text-[15px] leading-[22px]"><span>{l.label}</span><span>{l.price}</span></div>)}
            {(order.discount ?? 0) > 0 && (
              <div className="flex justify-between text-[15px] leading-[22px] text-pos6"><span>{tm('discount')}</span><span>− {money(order.discount!, currency)}</span></div>
            )}
            <div className="flex justify-between font-display font-bold text-[20px] leading-[26px] pt-3 border-t border-line"><span>{tm('total')}</span><span>{money(order.total, currency)}</span></div>
            <span className="text-[13px] leading-[18px] text-muted-fg">{tm('payment')} · {payLabel}</span>
            <button onClick={toHome} className="h-12 border border-line rounded-full bg-card text-fg font-semibold text-[15px] leading-none hover:border-fg">{tm('backHome')}</button>
          </aside>
        </div>
      </div>
    );
  }

  // ── Phone ─────────────────────────────────────────────────────────
  return (
    <div className="pt-2 px-5 pb-8 flex flex-col gap-5 animate-mg-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[12px] leading-4 text-muted-fg">{tm('order')} · {tm(type)}</span>
          <h1 dir="ltr" className="m-0 font-display font-bold text-[24px] leading-8 tracking-[-0.02em] text-start">{id}</h1>
        </div>
        <button aria-label="Close" onClick={toOrders}
          className="w-11 h-11 rounded-[14px] border border-line bg-bg text-fg flex items-center justify-center hover:bg-accent">
          <IX size={20} />
        </button>
      </div>

      <div aria-live="polite" className="p-5 rounded-[14px] border border-line bg-card shadow-mg-sm flex flex-col gap-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex flex-col gap-1">
            <span className={`font-display font-bold text-[24px] leading-8 tracking-[-0.02em] ${cancelled ? 'text-destructive' : ''}`}>{headline}</span>
            <span className="text-[14px] leading-5 text-muted-fg">{sub}</span>
          </div>
          {eta && (
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[12px] leading-4 text-muted-fg">{tm('eta')}</span>
              <span className="font-display font-bold text-[20px] leading-7 tracking-[-0.02em]">{eta}</span>
            </div>
          )}
        </div>
        {!cancelled && (
          <>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-acc transition-[width] duration-[400ms] ease-out" style={{ width: pct }} /></div>
            <ol className="list-none m-0 p-0 flex flex-col">
              {steps.map((st, i) => (
                <li key={st.n} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    {st.done && <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center"><ICheck size={14} sw={3} /></span>}
                    {st.cur && <span className="w-7 h-7 box-border rounded-full border-2 border-acc flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full bg-acc animate-mg-pulse" /></span>}
                    {st.next && <span className="w-7 h-7 box-border rounded-full border-[1.5px] border-line text-muted-fg flex items-center justify-center font-semibold text-[12px] leading-none">{st.n}</span>}
                    {i < 3 && <span className="w-0.5 flex-1 min-h-5 bg-line my-1" />}
                  </div>
                  <div className="pt-[3px] pb-5 flex flex-col gap-0.5">
                    <span className={`text-[14px] leading-5 ${st.next ? 'font-normal text-muted-fg' : 'font-semibold'}`}>{st.label}</span>
                    {st.cur && <span className="text-[12px] leading-4 text-muted-fg">{st.desc}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      <div className="rounded-[14px] border border-line bg-card shadow-mg-sm p-4 flex flex-col gap-2.5">
        <div className="flex justify-between items-center gap-2">
          <h2 className="m-0 font-semibold text-[16px] leading-[22px]">{tm('summary')}</h2>
          <span className="text-[12px] leading-4 text-muted-fg">{date}</span>
        </div>
        <div className="flex gap-2.5 items-start py-2.5 border-y border-line">
          <IMapPin size={18} className="shrink-0 mt-px text-muted-fg" />
          <div className="flex flex-col">
            <span className="font-semibold text-[14px] leading-5">{rest?.name ?? '—'}</span>
            {rest?.address && <span className="text-[12px] leading-4 text-muted-fg">{rest.address}</span>}
            {detail && <span className="font-semibold text-[12px] leading-4 mt-0.5">{detail}</span>}
          </div>
        </div>
        {lines.map(l => <div key={l.key} className="flex justify-between text-[14px] leading-5"><span>{l.label}</span><span>{l.price}</span></div>)}
        {(order.discount ?? 0) > 0 && (
          <div className="flex justify-between text-[14px] leading-5 text-pos6"><span>{tm('discount')}</span><span>− {money(order.discount!, currency)}</span></div>
        )}
        <div className="flex justify-between font-semibold text-[16px] leading-[22px] pt-2.5 border-t border-line"><span>{tm('total')}</span><span>{money(order.total, currency)}</span></div>
        <span className="text-[12px] leading-4 text-muted-fg">{tm('payment')} · {payLabel}</span>
      </div>

      <button onClick={toHome} className="h-12 border border-line rounded-[14px] bg-bg text-fg font-semibold text-[16px] leading-none hover:bg-accent">{tm('backHome')}</button>
    </div>
  );
};
