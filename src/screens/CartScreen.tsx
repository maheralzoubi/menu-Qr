import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, MessageSquare, Clock, AlertCircle, Bike, Tag, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import { applyPrimaryColor } from '../lib/branding';
import { formatCurrency } from '../lib/currency';

interface Props {
  onBack: () => void;
  onOrderPlaced: (orderId: string) => void;
}

const PICKUP_TIMES = ['ASAP', '15 min', '30 min', '45 min', '1 hour'];
const TIP_OPTIONS = [0, 10, 15, 20];
const TAX_RATE = 0.10;

interface AppliedPromo {
  code: string;
  discountAmount: number;
  discountType: string;
  discountValue: number;
}

export const CartScreen = ({ onBack, onOrderPlaced }: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { items, restaurantName, restaurantId, updateQty, removeItem, updateNote, clearCart, total: subtotal } = useCart();

  // Read restaurant context (branding + currency)
  const restaurantCtx = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('restaurant_context') || 'null'); } catch { return null; }
  }, [restaurantId]);

  const currency = restaurantCtx?.currency ?? 'USD';

  useEffect(() => {
    if (restaurantCtx?.primaryColor && restaurantCtx?.restaurantId === restaurantId) {
      applyPrimaryColor(restaurantCtx.primaryColor);
    }
  }, [restaurantId, restaurantCtx]);

  // Detect dine-in mode (arrived via QR code with a table context)
  const { isDineIn, tableNumber } = useMemo(() => {
    try {
      const ctx = JSON.parse(localStorage.getItem('restaurant_context') || 'null');
      if (ctx?.tableName && ctx?.restaurantId === restaurantId) {
        return { isDineIn: true, tableNumber: ctx.tableName as string };
      }
    } catch { /* ignore */ }
    return { isDineIn: false, tableNumber: undefined };
  }, [restaurantId]);

  // Shared state
  const [orderNote, setOrderNote] = useState('');
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  // Promo — shared across both modes
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  // Pickup-only
  const [pickupTime, setPickupTime] = useState('ASAP');

  // Dine-in–only
  const [tipPercent, setTipPercent] = useState(0);

  // Totals
  const discountAmt = appliedPromo?.discountAmount ?? 0;
  const taxAmount   = isDineIn ? parseFloat((subtotal * TAX_RATE).toFixed(2)) : 0;
  const tipAmount   = isDineIn ? parseFloat((subtotal * (tipPercent / 100)).toFixed(2)) : 0;
  const finalTotal  = parseFloat(
    (subtotal + taxAmount + tipAmount - discountAmt).toFixed(2)
  );

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoError(''); setPromoLoading(true);
    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, restaurantId, subtotal }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedPromo({
          code: code.toUpperCase(),
          discountAmount: data.discountAmount,
          discountType: data.discountType,
          discountValue: data.discountValue,
        });
        setPromoInput('');
      } else {
        setPromoError(data.message || t('cart.promoInvalid'));
      }
    } catch {
      setPromoError(t('cart.promoError'));
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePlace = async () => {
    if (items.length === 0) return;
    setError(''); setPlacing(true);
    try {
      const payload: Record<string, unknown> = {
        items: items.map(i => ({ ...i })),
        total: finalTotal,
        restaurantId,
        customerName: 'Guest',
        order_source: 'CUSTOMER_APP',
        order_type: isDineIn ? 'DINE_IN' : 'PICKUP',
        payment_method: 'PAY_LATER',
        payment_status: 'UNPAID',
        order_note: orderNote || undefined,
        tableNumber,
      };
      if (appliedPromo) {
        payload.discount      = appliedPromo.discountAmount;
        payload.promoCode     = appliedPromo.code;
        payload.discount_type = 'CODE';
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); setError(d.message || t('cart.orderFailed')); return; }
      const order = await res.json();
      try {
        const history: string[] = JSON.parse(localStorage.getItem('order_history') || '[]');
        history.unshift(order._id);
        localStorage.setItem('order_history', JSON.stringify(history.slice(0, 20)));
      } catch { /* ignore */ }
      clearCart();
      onOrderPlaced(order._id);
    } catch { setError(t('common.networkError')); }
    finally { setPlacing(false); }
  };

  // Shared promo code block (used in both modes)
  const promoBlock = (
    <div className="bg-surface-container rounded-2xl p-4">
      <p className="text-sm font-extrabold mb-2">{t('cart.promoCode')}</p>
      {appliedPromo ? (
        <div className="flex items-center justify-between bg-primary/10 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-primary truncate">{appliedPromo.code}</span>
            <span className="text-xs text-on-surface-variant shrink-0">
              -{formatCurrency(appliedPromo.discountAmount, currency)}
            </span>
          </div>
          <button onClick={() => setAppliedPromo(null)} className="text-xs text-red-400 font-bold ps-3 shrink-0">✕</button>
        </div>
      ) : (
        <>
          <div className="flex items-center bg-surface-container-high rounded-xl overflow-hidden">
            <input
              value={promoInput}
              onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
              placeholder={t('cart.promoPlaceholder')}
              className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none uppercase min-w-0"
            />
            <button
              onClick={handleApplyPromo}
              disabled={promoLoading || !promoInput.trim()}
              className="px-4 py-2.5 btn-gradient text-white text-sm font-bold disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              <Tag className="w-3.5 h-3.5" />
              {t('cart.apply')}
            </button>
          </div>
          {promoError && (
            <p className="text-xs text-red-400 flex items-center gap-1 mt-2">
              <AlertCircle className="w-3 h-3 shrink-0" />{promoError}
            </p>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface px-5 pt-12 pb-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold font-headline">{t('pickup.cartTitle')}</h1>
            <p className="text-xs text-on-surface-variant">
              {restaurantName}{isDineIn && tableNumber ? ` · ${tableNumber}` : ''}
            </p>
          </div>
          <ShoppingBag className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant gap-4">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 opacity-30" />
            </div>
            <p className="text-sm font-medium">{t('pickup.emptyCart')}</p>
            <button onClick={onBack} className="btn-gradient text-white px-6 py-2.5 rounded-2xl text-sm font-bold">
              {t('pickup.browseMenu')}
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="bg-surface-container rounded-2xl overflow-hidden">
              <AnimatePresence>
                {items.map((item, idx) => (
                  <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                    className={`px-4 py-3.5 ${idx < items.length - 1 ? 'border-b border-surface-container-high' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-container-high shrink-0">
                        {item.image
                          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xl">🍴</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-sm font-extrabold text-primary mt-0.5">{formatCurrency(item.price * item.quantity, currency)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center active:scale-90">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center font-extrabold text-sm tabular-nums">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center active:scale-90">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setActiveNote(activeNote === item.id ? null : item.id)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 ${item.note || activeNote === item.id ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center active:scale-90">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {activeNote === item.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2 ms-[60px]">
                          <input value={item.note} onChange={e => updateNote(item.id, e.target.value)}
                            placeholder={t('pickup.itemNotePlaceholder')}
                            className="w-full bg-surface-container-high rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {isDineIn ? (
              <>
                {/* Tips */}
                <div className="bg-surface-container rounded-2xl p-4">
                  <p className="text-sm font-extrabold mb-3">{t('cart.addTip')}</p>
                  <div className="flex gap-2">
                    {TIP_OPTIONS.map(pct => (
                      <button key={pct} onClick={() => setTipPercent(pct)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          tipPercent === pct ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                        {pct === 0 ? t('cart.noTip') : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {promoBlock}

                {/* Order Note */}
                <div className="bg-surface-container rounded-2xl p-4">
                  <p className="text-sm font-extrabold mb-2">{t('cart.kitchenInstructions')}</p>
                  <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)}
                    placeholder={t('cart.specialRequests')} rows={2}
                    className="w-full bg-surface-container-high rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Bill Breakdown */}
                <div className="bg-surface-container rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>{t('cart.subtotal')}</span>
                    <span className="tabular-nums">{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>{t('cart.taxService')} (10%)</span>
                    <span className="tabular-nums">{formatCurrency(taxAmount, currency)}</span>
                  </div>
                  {tipAmount > 0 && (
                    <div className="flex justify-between text-sm text-on-surface-variant">
                      <span>{t('cart.gratuity')} ({tipPercent}%)</span>
                      <span className="tabular-nums">{formatCurrency(tipAmount, currency)}</span>
                    </div>
                  )}
                  {appliedPromo && (
                    <div className="flex justify-between text-sm text-primary">
                      <span>{t('cart.promo', { code: appliedPromo.code })}</span>
                      <span className="tabular-nums">-{formatCurrency(appliedPromo.discountAmount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-base pt-2.5 border-t border-surface-container-high">
                    <span>{t('cart.total')}</span>
                    <span className="text-primary tabular-nums">{formatCurrency(finalTotal, currency)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Pickup Time */}
                <div className="bg-surface-container rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-primary" />
                    <p className="text-sm font-extrabold">{t('pickup.pickupTime')}</p>
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {PICKUP_TIMES.map(time => (
                      <button key={time} onClick={() => setPickupTime(time)}
                        className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          pickupTime === time ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Note */}
                <div className="bg-surface-container rounded-2xl p-4">
                  <p className="text-sm font-extrabold mb-2">{t('pickup.orderNote')}</p>
                  <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)}
                    placeholder={t('pickup.orderNotePlaceholder')} rows={2}
                    className="w-full bg-surface-container-high rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {promoBlock}

                {/* Pay at Pickup */}
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                    <Bike className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-primary">{t('pickup.payAtPickup')}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{t('pickup.payAtPickupDesc')}</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-surface-container rounded-2xl p-4 space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs text-on-surface-variant">
                      <span>{item.quantity}× {item.name}</span>
                      <span className="tabular-nums">{formatCurrency(item.price * item.quantity, currency)}</span>
                    </div>
                  ))}
                  {appliedPromo && (
                    <div className="flex justify-between text-sm text-primary">
                      <span>{t('cart.promo', { code: appliedPromo.code })}</span>
                      <span className="tabular-nums">-{formatCurrency(appliedPromo.discountAmount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-base pt-2 border-t border-surface-container-high">
                    <span>{t('pickup.total')}</span>
                    <span className="text-primary tabular-nums">{formatCurrency(finalTotal, currency)}</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer CTA */}
      {items.length > 0 && (
        <div className="bg-surface px-5 pb-8 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] shrink-0">
          {error && (
            <p className="text-red-400 text-xs flex items-center gap-1 mb-3">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}
          <button onClick={handlePlace} disabled={placing}
            className="w-full btn-gradient text-white rounded-2xl py-4 font-extrabold text-base shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98 transition-transform">
            {placing ? '...' : `${t('pickup.placeOrder')} · ${formatCurrency(finalTotal, currency)}`}
          </button>
        </div>
      )}
    </div>
  );
};
