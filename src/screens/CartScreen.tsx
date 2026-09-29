import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp, useMg, type Order, type OrderType, type PayMethod } from '../contexts/AppContext';
import { useCart } from '../contexts/CartContext';
import { useNav } from '../navigation';
import { useViewport } from '../hooks/useViewport';
import { appFetch } from '../lib/appAuth';
import { useOrderTypes } from '../components/mg/Chrome';
import { AddressSheet } from '../components/mg/AddressSheet';
import { IArrowLeft, IBag, ICheck, IMapPin } from '../components/mg/Icons';
import { RadioDot, Segmented, Stepper, money } from '../components/mg/ui';

const TIMES = ['asap', '15', '30', '45'] as const;
const TIPS = [0, 10, 15, 20];
const TAX_RATE = 0.10;

interface AppliedPromo { code: string; discountAmount: number }

const ORDER_TYPE_API: Record<OrderType, string> = { pickup: 'PICKUP', dinein: 'DINE_IN', delivery: 'DELIVERY' };

export const CartScreen = () => {
  const tm = useMg();
  const { t } = useTranslation();
  const nav = useNav();
  const { mid } = useViewport();
  const app = useApp();
  const cart = useCart();
  const types = useOrderTypes();
  const { orderType, setOrderType, table, setTable, addresses, user } = app;

  const currency = app.restaurantById(cart.restaurantId)?.currency ?? 'USD';
  const M = (n: number) => money(n, currency);

  const [pickupTime, setPickupTime] = useState<typeof TIMES[number]>('asap');
  const [tableErr, setTableErr] = useState(false);
  const [note, setNote] = useState('');
  const [pay, setPay] = useState<PayMethod>(app.defaultPay);
  const [tip, setTip] = useState(0);
  const [promoIn, setPromoIn] = useState('');
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoErr, setPromoErr] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [addressId, setAddressId] = useState<string | null>(addresses[0]?.id ?? null);
  const [addrErr, setAddrErr] = useState(false);
  const [addrSheet, setAddrSheet] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!addresses.some(a => a.id === addressId)) setAddressId(addresses[0]?.id ?? null);
  }, [addresses, addressId]);
  const address = addresses.find(a => a.id === addressId) ?? null;

  const sub = cart.total;
  const disc = promo?.discountAmount ?? 0;
  const dinein = orderType === 'dinein';
  const tax = dinein ? +(sub * TAX_RATE).toFixed(2) : 0;
  const tipAmt = dinein ? +(sub * tip / 100).toFixed(2) : 0;
  const total = Math.max(0, +(sub - disc + tax + tipAmt).toFixed(2));

  const validatePromo = async (code: string, silent = false) => {
    if (!code) return;
    if (!silent) { setPromoErr(''); setPromoBusy(true); }
    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, restaurantId: cart.restaurantId, subtotal: sub }),
      });
      const data = await res.json();
      if (data.valid) { setPromo({ code: code.toUpperCase(), discountAmount: data.discountAmount }); setPromoIn(''); }
      else { setPromo(null); setPromoErr(data.message || t('cart.promoInvalid')); }
    } catch {
      if (!silent) setPromoErr(t('cart.promoError'));
    } finally { setPromoBusy(false); }
  };

  // Re-check an applied code when the basket changes (discounts depend on the subtotal).
  const lastSub = useRef(sub);
  useEffect(() => {
    if (lastSub.current === sub) return;
    lastSub.current = sub;
    if (promo && sub > 0) validatePromo(promo.code, true);
  }, [sub]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickType = (k: OrderType) => { setOrderType(k); setTableErr(false); setAddrErr(false); };

  const place = async () => {
    if (!cart.items.length || placing) return;
    if (dinein && !table.trim()) { setTableErr(true); return; }
    if (orderType === 'delivery' && !address) { setAddrErr(true); return; }
    if (!user && !app.guestCheckout) { nav.go({ name: 'signin', after: 'cart' }); return; }
    setError(''); setPlacing(true);
    try {
      const payload: Record<string, unknown> = {
        items: cart.items.map(({ key: _key, ...line }) => line),
        total,
        restaurantId: cart.restaurantId,
        customerName: user?.name || user?.email || 'Guest',
        order_source: 'CUSTOMER_APP',
        order_type: ORDER_TYPE_API[orderType],
        payment_method: pay === 'card' ? 'CARD' : 'PAY_LATER',
        payment_status: pay === 'card' ? 'PENDING_CARD_PAYMENT' : 'UNPAID',
        order_note: note.trim() || undefined,
        tableNumber: dinein ? table.trim() : undefined,
        address: orderType === 'delivery' && address ? (address.label ? `${address.label} · ${address.line}` : address.line) : undefined,
        pickup_time: orderType === 'pickup' ? (pickupTime === 'asap' ? 'ASAP' : `${pickupTime} min`) : undefined,
      };
      if (promo) { payload.discount = promo.discountAmount; payload.promoCode = promo.code; payload.discount_type = 'CODE'; }
      const res = await appFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message || tm('orderFailed'));
        return;
      }
      const order: Order = await res.json();
      app.trackOrder(order);
      cart.clearCart();
      app.toast(tm('orderPlaced'));
      nav.go({ name: 'track', orderId: order._id }, { replace: true });
    } catch { setError(tm('networkError')); }
    finally { setPlacing(false); }
  };

  const payOptions: { k: PayMethod; label: string; sub: string }[] = [
    { k: 'cash', label: orderType === 'delivery' ? tm('payCod') : tm('payCounter'), sub: orderType === 'delivery' ? tm('payCodSub') : tm('payCounterSub') },
    { k: 'card', label: tm('payCard'), sub: orderType === 'delivery' ? tm('payCardDeliverySub') : tm('payCardCounterSub') },
  ];
  const timeLabel = (k: typeof TIMES[number]) => k === 'asap' ? tm('asap') : `${k} ${tm('min')}`;
  const tipLabel = (p: number) => p === 0 ? tm('noTip') : `${p}%`;
  const addressText = address ? (address.label ? `${address.label} · ${address.line}` : address.line) : tm('addAddress');

  const summaryRows = (web: boolean) => (
    <>
      <div className="flex justify-between"><span className="text-muted-fg">{tm('subtotal')}</span><span>{M(sub)}</span></div>
      {promo && <div className="flex justify-between text-pos6"><span>{tm('discount')}</span><span>− {M(disc)}</span></div>}
      {dinein && <div className="flex justify-between"><span className="text-muted-fg">{tm('taxService')}</span><span>{M(tax)}</span></div>}
      {tipAmt > 0 && <div className="flex justify-between"><span className="text-muted-fg">{tm('tip')} ({tip}%)</span><span>{M(tipAmt)}</span></div>}
      <div className={`flex justify-between ${web ? 'font-display font-bold text-[22px] leading-7 mt-1.5' : 'font-semibold text-[16px] leading-[22px] mt-1'}`}>
        <span>{tm('total')}</span><span>{M(total)}</span>
      </div>
    </>
  );

  const promoApplied = (web: boolean) => promo && (
    <div role="status" className={`flex items-center gap-2.5 rounded-[14px] bg-pos1 text-pos7 ${web ? 'px-4 py-3' : 'px-3.5 py-3'}`}>
      <ICheck size={18} sw={2.5} />
      <span className="flex-1 font-semibold text-[14px] leading-5">{promo.code} · {t('cart.promoApplied', { value: M(disc) })}</span>
      <button onClick={() => { setPromo(null); setPromoIn(''); }}
        className={`border-0 bg-transparent text-inherit font-semibold underline ${web ? 'text-[13px] leading-none py-1.5' : 'text-[12px] leading-4 py-2'}`}>{tm('remove')}</button>
    </div>
  );

  const addressSheet = addrSheet && (
    <AddressSheet web={mid} onClose={() => setAddrSheet(false)} selectedId={addressId} onSelect={id => { setAddressId(id); setAddrErr(false); }} />
  );

  // ── Web ───────────────────────────────────────────────────────────
  if (mid) {
    const card = 'p-6 rounded-3xl border border-line bg-card flex flex-col';
    const h2 = 'm-0 font-display font-bold text-[20px] leading-[26px] tracking-[-0.02em]';
    const chip = (on: boolean) => `h-10 px-[18px] rounded-full border text-[14px] leading-none ${on ? 'border-fg bg-fg text-bg font-semibold' : 'border-line bg-card text-fg font-medium hover:border-fg'}`;
    return (
      <div data-screen-label="Checkout" className="max-w-[1100px] mx-auto px-[clamp(16px,4vw,32px)] pt-[clamp(20px,3vw,32px)] pb-24 animate-mg-in-slow">
        {cart.restaurantId && (
          <button onClick={() => nav.go({ name: 'rest', id: cart.restaurantId! })}
            className="flex items-center gap-1.5 border-0 bg-transparent p-0 text-muted-fg font-medium text-[14px] leading-5 mb-3 hover:text-fg">
            <IArrowLeft size={16} />{cart.restaurantName}
          </button>
        )}
        <h1 className="m-0 mb-7 font-display font-extrabold text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.035em]">{tm('cart')}</h1>

        {cart.items.length === 0 ? (
          <div className="py-20 px-6 flex flex-col items-center text-center gap-2.5 border border-dashed border-input rounded-[28px]">
            <span className="w-[72px] h-[72px] rounded-full bg-acc-soft text-acc flex items-center justify-center mb-2"><IBag size={30} /></span>
            <span className="font-display font-bold text-[24px] leading-[30px]">{tm('emptyCart')}</span>
            <span className="text-[15px] leading-[22px] text-muted-fg max-w-[360px]">{tm('emptyCartSub')}</span>
            <button onClick={() => nav.tab('home')} className="mt-4 h-[52px] px-7 border-0 rounded-full bg-primary text-white font-semibold text-[16px] leading-none">{tm('browse')}</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-8 items-start">
            <div className="flex-[1_1_480px] min-w-0 flex flex-col gap-5">
              <section className={`${card} gap-4`}>
                <h2 className={h2}>{tm('orderType')}</h2>
                <Segmented variant="cards" options={types} value={orderType} onChange={pickType} />
                {orderType === 'pickup' && (
                  <>
                    <span className="font-semibold text-[14px] leading-5 text-muted-fg">{tm('pickupTime')}</span>
                    <div className="flex gap-2 flex-wrap">
                      {TIMES.map(k => <button key={k} aria-pressed={pickupTime === k} onClick={() => setPickupTime(k)} className={chip(pickupTime === k)}>{timeLabel(k)}</button>)}
                    </div>
                  </>
                )}
                {dinein && (
                  <>
                    <label htmlFor="mg-table" className="font-semibold text-[14px] leading-5 text-muted-fg">{tm('tableNo')}</label>
                    <input id="mg-table" value={table} onChange={e => { setTable(e.target.value.slice(0, 20)); setTableErr(false); }} placeholder={tm('tablePh')}
                      aria-invalid={tableErr} className={`h-[52px] max-w-[240px] px-4 border rounded-[14px] bg-card text-fg text-[16px] leading-none ${tableErr ? 'border-destructive' : 'border-input'}`} />
                    {tableErr && <span role="alert" className="font-medium text-[13px] leading-[18px] text-destructive">{tm('tableErr')}</span>}
                  </>
                )}
                {orderType === 'delivery' && (
                  <>
                    <div className={`flex items-center gap-3.5 p-4 border rounded-2xl ${addrErr ? 'border-destructive' : 'border-line'}`}>
                      <span className="w-10 h-10 rounded-xl bg-acc-soft text-acc flex items-center justify-center shrink-0"><IMapPin size={20} /></span>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="font-semibold text-[15px] leading-[22px]">{tm('address')}</span>
                        <span className="text-[13px] leading-[18px] text-muted-fg">{addressText}</span>
                      </div>
                      <button onClick={() => setAddrSheet(true)} className="h-9 px-3.5 border-0 rounded-full bg-transparent text-acc font-semibold text-[14px] leading-none hover:bg-acc-soft">{tm('change')}</button>
                    </div>
                    {addrErr && <span role="alert" className="font-medium text-[13px] leading-[18px] text-destructive">{tm('addressErr')}</span>}
                  </>
                )}
              </section>

              {dinein && (
                <section className={`${card} gap-3.5`}>
                  <h2 className={h2}>{tm('addTip')}</h2>
                  <div className="flex gap-2 flex-wrap">
                    {TIPS.map(p => <button key={p} aria-pressed={tip === p} onClick={() => setTip(p)} className={chip(tip === p)}>{tipLabel(p)}</button>)}
                  </div>
                </section>
              )}

              <section className={`${card} gap-3.5`}>
                <h2 className={h2}>{tm('payment')}</h2>
                <div role="radiogroup" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
                  {payOptions.map(p => (
                    <button key={p.k} role="radio" aria-checked={pay === p.k} onClick={() => setPay(p.k)}
                      className={`flex items-center gap-3 p-4 rounded-2xl text-fg text-start ${pay === p.k ? 'border-2 border-primary bg-acc-soft' : 'border border-line bg-card hover:border-fg'}`}>
                      <RadioDot on={pay === p.k} web />
                      <span className="flex flex-col">
                        <span className="font-semibold text-[15px] leading-5">{p.label}</span>
                        <span className="text-[13px] leading-[18px] text-muted-fg">{p.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className={`${card} gap-3`}>
                <label htmlFor="mg-note" className="font-display font-bold text-[20px] leading-[26px] tracking-[-0.02em]">
                  {tm('note')} <span className="font-sans font-normal text-[13px] leading-none text-muted-fg tracking-normal">· {tm('optional')}</span>
                </label>
                <textarea id="mg-note" rows={3} value={note} onChange={e => setNote(e.target.value.slice(0, 500))} placeholder={tm('notePh')}
                  className="resize-y px-4 py-3.5 border border-input rounded-[14px] bg-card text-fg text-[16px] leading-[22px]" />
              </section>
            </div>

            <aside className="flex-[1_1_340px] min-w-0 sticky top-24 p-6 rounded-3xl border border-line bg-card shadow-mg-md flex flex-col gap-[18px]">
              <h2 className={h2}>{tm('summary')}</h2>
              <div>
                {cart.items.map(l => (
                  <div key={l.key} className="flex gap-3 items-center py-3 border-t border-line">
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="font-semibold text-[14px] leading-5">{l.name}</span>
                      {l.note && <span className="text-[12px] leading-4 text-muted-fg"><bdi>“{l.note}”</bdi></span>}
                      <span className="font-medium text-[13px] leading-[18px]">{M(l.price * l.quantity)}</span>
                    </div>
                    <Stepper variant="webLine" qty={l.quantity} onDec={() => cart.updateQty(l.key, l.quantity - 1)} onInc={() => cart.updateQty(l.key, l.quantity + 1)} />
                  </div>
                ))}
              </div>
              {promo ? promoApplied(true) : (
                <>
                  <div className="flex gap-2">
                    <input aria-label={tm('promo')} value={promoIn} onChange={e => { setPromoIn(e.target.value.toUpperCase()); setPromoErr(''); }}
                      onKeyDown={e => e.key === 'Enter' && validatePromo(promoIn.trim())} placeholder={tm('promo')}
                      className="flex-1 min-w-0 h-[46px] px-4 border border-input rounded-full bg-card text-fg text-[15px] leading-none uppercase" />
                    <button onClick={() => validatePromo(promoIn.trim())} disabled={promoBusy || !promoIn.trim()}
                      className="h-[46px] px-[18px] border-0 rounded-full bg-muted text-fg font-semibold text-[14px] leading-none hover:bg-input disabled:opacity-50">{tm('apply')}</button>
                  </div>
                  {promoErr && <span role="alert" className="font-medium text-[13px] leading-[18px] text-destructive -mt-2">{promoErr}</span>}
                </>
              )}
              <div className="flex flex-col gap-2 text-[15px] leading-[22px] pt-3.5 border-t border-line">{summaryRows(true)}</div>
              {error && <span role="alert" className="font-medium text-[13px] leading-[18px] text-destructive">{error}</span>}
              <button onClick={place} disabled={placing}
                className="h-14 border-0 rounded-full bg-primary text-white font-semibold text-[17px] leading-none flex items-center justify-between px-[26px] hover:opacity-[.92] disabled:opacity-60">
                <span>{placing ? tm('placing') : tm('placeOrder')}</span><span>{M(total)}</span>
              </button>
            </aside>
          </div>
        )}
        {addressSheet}
      </div>
    );
  }

  // ── Phone ─────────────────────────────────────────────────────────
  const chip = (on: boolean) => `h-10 px-4 rounded-full border text-[14px] leading-none ${on ? 'border-primary bg-primary text-on-primary font-semibold' : 'border-line bg-bg text-fg font-normal hover:bg-accent'}`;
  const h2 = 'm-0 font-semibold text-[16px] leading-[22px]';
  return (
    <div className="animate-mg-in">
      <div className="sticky top-0 z-[5] bg-bg pt-2 px-5 pb-3 flex items-center gap-3 border-b border-line">
        <button aria-label="Back" onClick={nav.back}
          className="w-11 h-11 shrink-0 rounded-[14px] border border-line bg-bg text-fg flex items-center justify-center hover:bg-accent">
          <IArrowLeft size={20} />
        </button>
        <div className="flex flex-col min-w-0">
          <h1 className="m-0 font-display font-bold text-[20px] leading-7 tracking-[-0.02em]">{tm('cart')}</h1>
          {cart.items.length > 0 && <span className="text-[12px] leading-4 text-muted-fg">{cart.restaurantName}</span>}
        </div>
      </div>

      {cart.items.length === 0 ? (
        <div className="py-24 px-8 flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-fg mb-2"><IBag size={28} /></div>
          <span className="font-semibold text-[16px] leading-[22px]">{tm('emptyCart')}</span>
          <span className="text-[14px] leading-5 text-muted-fg max-w-[260px]">{tm('emptyCartSub')}</span>
          <button onClick={() => nav.tab('home')} className="mt-4 h-12 px-6 border-0 rounded-[14px] bg-primary text-on-primary font-semibold text-[16px] leading-none">{tm('browse')}</button>
        </div>
      ) : (
        <>
          <div className="pt-4 px-5 pb-6 flex flex-col gap-6">
            <div className="flex flex-col">
              {cart.items.map(l => (
                <div key={l.key} className="flex gap-3 items-center py-3.5 border-b border-line">
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="font-semibold text-[14px] leading-5">{l.name}</span>
                    {l.note && <span className="text-[12px] leading-4 text-muted-fg"><bdi>“{l.note}”</bdi></span>}
                    <span className="font-semibold text-[14px] leading-5 mt-0.5">{M(l.price * l.quantity)}</span>
                  </div>
                  <Stepper qty={l.quantity} trashAtOne onDec={() => cart.updateQty(l.key, l.quantity - 1)} onInc={() => cart.updateQty(l.key, l.quantity + 1)} />
                </div>
              ))}
            </div>

            <section className="flex flex-col gap-3">
              <h2 className={h2}>{tm('orderType')}</h2>
              <Segmented options={types} value={orderType} onChange={pickType} />
              {orderType === 'pickup' && (
                <>
                  <span className="font-semibold text-[12px] leading-4 text-muted-fg mt-1">{tm('pickupTime')}</span>
                  <div className="flex gap-2 flex-wrap">
                    {TIMES.map(k => <button key={k} aria-pressed={pickupTime === k} onClick={() => setPickupTime(k)} className={chip(pickupTime === k)}>{timeLabel(k)}</button>)}
                  </div>
                </>
              )}
              {dinein && (
                <>
                  <label htmlFor="mg-table" className="font-semibold text-[12px] leading-4 text-muted-fg mt-1">{tm('tableNo')}</label>
                  <input id="mg-table" value={table} onChange={e => { setTable(e.target.value.slice(0, 20)); setTableErr(false); }} placeholder={tm('tablePh')}
                    aria-invalid={tableErr} className={`h-12 px-3.5 border rounded-[14px] bg-bg text-fg text-[16px] leading-none ${tableErr ? 'border-destructive' : 'border-input'}`} />
                  {tableErr && <span role="alert" className="text-[12px] leading-4 text-destructive">{tm('tableErr')}</span>}
                </>
              )}
              {orderType === 'delivery' && (
                <>
                  <div className={`flex items-center gap-3 px-4 py-3.5 border rounded-[14px] ${addrErr ? 'border-destructive' : 'border-line'}`}>
                    <IMapPin size={20} className="shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="font-semibold text-[14px] leading-5">{tm('address')}</span>
                      <span className="text-[12px] leading-4 text-muted-fg">{addressText}</span>
                    </div>
                    <button onClick={() => setAddrSheet(true)} className="h-9 px-3 border-0 rounded-[14px] bg-transparent text-acc font-semibold text-[14px] leading-none">{tm('change')}</button>
                  </div>
                  {addrErr && <span role="alert" className="text-[12px] leading-4 text-destructive">{tm('addressErr')}</span>}
                </>
              )}
            </section>

            {dinein && (
              <section className="flex flex-col gap-3">
                <h2 className={h2}>{tm('addTip')}</h2>
                <div className="flex gap-2 flex-wrap">
                  {TIPS.map(p => <button key={p} aria-pressed={tip === p} onClick={() => setTip(p)} className={chip(tip === p)}>{tipLabel(p)}</button>)}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-3">
              <h2 className={h2}>{tm('payment')}</h2>
              <div role="radiogroup" className="border border-line rounded-[14px] overflow-hidden">
                {payOptions.map(p => (
                  <button key={p.k} role="radio" aria-checked={pay === p.k} onClick={() => setPay(p.k)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 border-0 border-b border-line -mb-px bg-transparent text-fg text-start hover:bg-accent">
                    <RadioDot on={pay === p.k} />
                    <span className="flex-1 flex flex-col">
                      <span className="font-semibold text-[14px] leading-5">{p.label}</span>
                      <span className="text-[12px] leading-4 text-muted-fg">{p.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <label htmlFor="mg-note" className="font-semibold text-[16px] leading-[22px]">{tm('note')} <span className="font-normal text-muted-fg text-[12px]">· {tm('optional')}</span></label>
              <textarea id="mg-note" rows={2} value={note} onChange={e => setNote(e.target.value.slice(0, 500))} placeholder={tm('notePh')}
                className="resize-none px-3.5 py-3 border border-input rounded-[14px] bg-bg text-fg text-[16px] leading-[22px]" />
            </section>

            <section className="flex flex-col gap-3">
              <label htmlFor="mg-promo" className="font-semibold text-[16px] leading-[22px]">{tm('promo')}</label>
              {promo ? promoApplied(false) : (
                <>
                  <div className="flex gap-2">
                    <input id="mg-promo" value={promoIn} onChange={e => { setPromoIn(e.target.value.toUpperCase()); setPromoErr(''); }}
                      onKeyDown={e => e.key === 'Enter' && validatePromo(promoIn.trim())} placeholder={tm('promoPh')}
                      className="flex-1 min-w-0 h-12 px-3.5 border border-input rounded-[14px] bg-bg text-fg text-[16px] leading-none uppercase" />
                    <button onClick={() => validatePromo(promoIn.trim())} disabled={promoBusy || !promoIn.trim()}
                      className="h-12 px-5 border border-line rounded-[14px] bg-secondary text-fg font-semibold text-[14px] leading-none hover:bg-accent disabled:opacity-50">{tm('apply')}</button>
                  </div>
                  {promoErr && <span role="alert" className="text-[12px] leading-4 text-destructive">{promoErr}</span>}
                </>
              )}
            </section>

            <section className="flex flex-col gap-2 pt-4 border-t border-line text-[14px] leading-5">{summaryRows(false)}</section>
          </div>

          <div className="sticky bottom-0 pt-3 px-5 bg-bg border-t border-line" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
            {error && <p role="alert" className="m-0 mb-2 text-[12px] leading-4 text-destructive">{error}</p>}
            <button onClick={place} disabled={placing}
              className="w-full h-[52px] border-0 rounded-[14px] bg-primary text-on-primary font-semibold text-[16px] leading-none flex items-center justify-between px-5 hover:opacity-90 disabled:opacity-60">
              <span>{placing ? tm('placing') : tm('placeOrder')}</span><span>{M(total)}</span>
            </button>
          </div>
        </>
      )}
      {addressSheet}
    </div>
  );
};
