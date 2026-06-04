import { useState, useEffect } from 'react';
import { X, Minus, Plus, ReceiptText, Edit3, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { CartItem } from '../types';
import { Skeleton } from '../components/Skeleton';

export const CartScreen = ({
  cart,
  updateQuantity,
  removeFromCart,
  tipAmount,
  setTipAmount,
  restaurantId,
  discount,
  promoCode,
  onPromoApplied,
}: {
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  tipAmount: number;
  setTipAmount: (amount: number) => void;
  restaurantId: string;
  discount: number;
  promoCode: string;
  onPromoApplied: (code: string, discountAmount: number) => void;
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [customTip, setCustomTip] = useState<string>('');
  const [activeTipPreset, setActiveTipPreset] = useState<number | 'custom' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [promoMessage, setPromoMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (promoCode) setPromoInput(promoCode);
  }, [promoCode]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePresetTip = (percent: number) => {
    setTipAmount(subtotal * (percent / 100));
    setActiveTipPreset(percent);
    setCustomTip('');
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount >= 0) {
      setTipAmount(amount);
      setActiveTipPreset('custom');
    } else {
      setTipAmount(0);
      setActiveTipPreset(null);
    }
  };

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoStatus('loading');
    setPromoMessage('');
    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, restaurantId, subtotal }),
      });
      const data = await res.json();
      if (data.valid) {
        setPromoStatus('success');
        setPromoMessage(t('cart.promoApplied', {
          value: data.discountType === 'percentage' ? data.discountValue + '%' : '$' + data.discountValue.toFixed(2)
        }));
        onPromoApplied(code.toUpperCase(), data.discountAmount);
      } else {
        setPromoStatus('error');
        setPromoMessage(data.message || t('cart.promoInvalid'));
        onPromoApplied('', 0);
      }
    } catch {
      setPromoStatus('error');
      setPromoMessage(t('cart.promoError'));
      onPromoApplied('', 0);
    }
  };

  const handleRemovePromo = () => {
    setPromoInput('');
    setPromoStatus('idle');
    setPromoMessage('');
    onPromoApplied('', 0);
  };

  const total = subtotal - discount + tipAmount;

  if (isLoading) {
    return (
      <div className="pt-24 pb-48 px-6 max-w-md mx-auto space-y-8">
        <section className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </section>
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="w-24 h-24 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-48 px-6 max-w-md mx-auto flex flex-col gap-8">
      <section className="space-y-1">
        <h2 className="font-headline font-extrabold text-3xl tracking-tight text-on-surface">{t('cart.title')}</h2>
        <p className="text-on-surface-variant font-medium">{t('cart.subtitle')}</p>
      </section>

      <section className="flex flex-col gap-6">
        <AnimatePresence mode="popLayout">
          {cart.map(item => (
            <motion.div
              layout
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={item.id}
              className="flex gap-4 items-center group"
            >
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-surface-container shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between h-24 py-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-headline font-bold text-lg text-on-surface">{item.name}</h3>
                    <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{item.category}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-on-surface-variant/40 hover:text-error transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-end">
                  <span className="font-headline font-bold text-primary">${item.price.toFixed(2)}</span>
                  <div className="flex items-center bg-surface-container rounded-full px-1 py-1">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center text-on-surface hover:bg-surface-container-highest rounded-full transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center text-on-surface hover:bg-surface-container-highest rounded-full transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {cart.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">{t('cart.empty')}</div>
        )}
      </section>

      <section className="mt-4 p-8 bg-surface-container-low rounded-[2rem] space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant font-medium">{t('cart.subtotal')}</span>
          <span className="font-headline font-semibold">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant font-medium">{t('cart.taxService')}</span>
          <span className="font-headline font-semibold text-tertiary-container">{t('cart.included')}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant font-medium">{t('cart.promo', { code: promoCode })}</span>
            <span className="font-headline font-semibold text-green-600">-${discount.toFixed(2)}</span>
          </div>
        )}
        {tipAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant font-medium">{t('cart.gratuity')}</span>
            <span className="font-headline font-semibold text-primary">+${tipAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="pt-4 border-t border-outline-variant/20 flex justify-between items-center">
          <span className="font-headline font-bold text-xl text-on-surface">{t('cart.total')}</span>
          <span className="font-headline font-extrabold text-2xl text-primary">${total.toFixed(2)}</span>
        </div>
      </section>

      <section className="space-y-4">
        <label className="font-headline font-bold text-sm tracking-wide text-on-surface-variant uppercase px-2">{t('cart.addTip')}</label>
        <div className="grid grid-cols-4 gap-2">
          {[15, 20, 25].map((percent) => (
            <button
              key={percent}
              onClick={() => handlePresetTip(percent)}
              className={`py-3 rounded-xl font-headline font-bold text-sm transition-all duration-300 ${
                activeTipPreset === percent
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {percent}%
            </button>
          ))}
          <input
            type="number"
            placeholder={t('cart.customTip')}
            value={customTip}
            onChange={(e) => handleCustomTipChange(e.target.value)}
            className={`w-full py-3 px-2 rounded-xl font-headline font-bold text-sm text-center bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 placeholder:text-on-surface-variant/40 ${
              activeTipPreset === 'custom' ? 'ring-2 ring-primary bg-white' : ''
            }`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <label className="font-headline font-bold text-sm tracking-wide text-on-surface-variant uppercase px-2">{t('cart.promoCode')}</label>

        {promoStatus === 'success' ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="font-bold text-sm">{promoCode}</span>
              <span className="text-xs font-medium opacity-80">{promoMessage}</span>
            </div>
            <button onClick={handleRemovePromo} className="text-green-500 hover:text-green-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1 bg-surface-container-low rounded-xl px-4 py-3 text-on-surface-variant text-sm flex items-center gap-2 border border-transparent focus-within:bg-white focus-within:shadow-sm transition-all duration-300">
              <ReceiptText className="w-4 h-4 shrink-0" />
              <input
                type="text"
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus('idle'); setPromoMessage(''); }}
                onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                className="bg-transparent border-none focus:ring-0 w-full p-0 uppercase placeholder:normal-case placeholder:text-on-surface-variant/60"
                placeholder={t('cart.promoPlaceholder')}
              />
            </div>
            <button
              onClick={handleApplyPromo}
              disabled={promoStatus === 'loading' || !promoInput.trim()}
              className="px-4 py-3 bg-primary text-white rounded-xl font-headline font-bold text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
            >
              {promoStatus === 'loading' ? '…' : t('cart.apply')}
            </button>
          </div>
        )}

        {promoStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-error text-xs font-medium px-1"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {promoMessage}
          </motion.div>
        )}
      </section>

      <section className="space-y-3">
        <label className="font-headline font-bold text-sm tracking-wide text-on-surface-variant uppercase px-2">{t('cart.kitchenInstructions')}</label>
        <div className="w-full bg-surface-container-low rounded-xl px-4 py-3 min-h-[80px] text-on-surface-variant text-sm flex items-start gap-2 border border-transparent focus-within:bg-white focus-within:shadow-sm transition-all duration-300">
          <Edit3 className="w-4 h-4 mt-1" />
          <textarea className="bg-transparent border-none focus:ring-0 w-full p-0 resize-none h-full" placeholder={t('cart.specialRequests')} />
        </div>
      </section>
    </div>
  );
};
