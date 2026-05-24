import React, { useState, useEffect, useRef } from 'react';
import {
  Check, Zap, Building2, Star, CreditCard, ArrowLeft,
  Shield, Lock, ChevronRight, Sparkles, QrCode,
  BarChart3, ShoppingBag, Globe, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher';

// ── Types ──────────────────────────────────────────────────────────────────────
type PlanId = 'starter' | 'pro' | 'enterprise';
type Billing = 'monthly' | 'annual';
type LandingStep = 'home' | 'checkout' | 'setup' | 'success';
interface CardForm { number: string; name: string; expiry: string; cvv: string; }
interface SetupForm { fullName: string; email: string; password: string; confirmPassword: string; restaurantName: string; }

interface PlanDef {
  id: PlanId;
  price: { monthly: number; annual: number };
  popular?: boolean;
  icon: React.ReactNode;
}

// ── Plans (icons & prices only — labels from i18n) ────────────────────────────
const PLANS: PlanDef[] = [
  { id: 'starter', price: { monthly: 29, annual: 23 }, icon: <Zap className="w-5 h-5" /> },
  { id: 'pro',     price: { monthly: 79, annual: 63 }, icon: <Star className="w-5 h-5" />, popular: true },
  { id: 'enterprise', price: { monthly: 199, annual: 159 }, icon: <Building2 className="w-5 h-5" /> },
];

const FEATURE_KEYS = [
  { key: 'qrMenus',         icon: <QrCode className="w-6 h-6" /> },
  { key: 'orderManagement', icon: <ShoppingBag className="w-6 h-6" /> },
  { key: 'analytics',       icon: <BarChart3 className="w-6 h-6" /> },
  { key: 'multiLocation',   icon: <Globe className="w-6 h-6" /> },
];

// ── Card Helpers ───────────────────────────────────────────────────────────────
const fmtNumber = (v: string) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const fmtExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

const cardBrand = (num: string): 'visa' | 'mastercard' | null => {
  const s = num.replace(/\s/g, '');
  if (/^4/.test(s)) return 'visa';
  if (/^5[1-5]/.test(s)) return 'mastercard';
  return null;
};

// ── Apple Pay SVG ──────────────────────────────────────────────────────────────
const AppleLogo = () => (
  <svg viewBox="0 0 814 1000" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.3-148.8-105.9c-49.5-71.6-91.5-183.3-91.5-289.2 0-127.8 83.2-196.6 165.2-196.6 43.2 0 79.2 28.4 105.9 28.4 25.4 0 65.4-30 115.4-30zm-158.2-213c34.4-41.2 58.4-98.8 58.4-156.3 0-8.3-.6-16.5-2-24.5-54.9 2-120.1 36.8-159.7 82.4-32.3 36.8-60.9 93.5-60.9 151.9 0 9.2 1.5 18.4 2.5 21.4 3.4.6 9.1 1.4 14.8 1.4 49.3 0 110.3-33.2 147-76.3z" />
  </svg>
);

// ── Component ──────────────────────────────────────────────────────────────────
export const LandingPage = ({ onLoginClick }: { onLoginClick: () => void }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<LandingStep>('home');
  const [billing, setBilling] = useState<Billing>('monthly');
  const [selected, setSelected] = useState<PlanDef | null>(null);
  const [canApplePay, setCanApplePay] = useState(false);
  const [card, setCard] = useState<CardForm>({ number: '', name: '', expiry: '', cvv: '' });
  const [setup, setSetup] = useState<SetupForm>({ fullName: '', email: '', password: '', confirmPassword: '', restaurantName: '' });
  const [payLoading, setPayLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [setupError, setSetupError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const plansRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      if (!('PaymentRequest' in window)) return;
      try {
        const req = new PaymentRequest(
          [{ supportedMethods: 'https://apple.com/apple-pay', data: { version: 3, merchantIdentifier: 'merchant.com.menuqr', merchantCapabilities: ['supports3DS'], supportedNetworks: ['visa', 'masterCard'], countryCode: 'US' } }],
          { total: { label: 'MenuQR', amount: { currency: 'USD', value: '0.00' } } }
        );
        setCanApplePay(await req.canMakePayment().catch(() => false));
      } catch { /* unsupported */ }
    })();
  }, []);

  const planPrice = (p: PlanDef) => billing === 'annual' ? p.price.annual : p.price.monthly;
  const scrollToPlans = () => plansRef.current?.scrollIntoView({ behavior: 'smooth' });

  const openCheckout = (plan: PlanDef) => {
    setSelected(plan);
    setCard({ number: '', name: '', expiry: '', cvv: '' });
    setPayError('');
    setStep('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplePay = async () => {
    if (!selected || !('PaymentRequest' in window)) return;
    setPayError('');
    setPayLoading(true);
    try {
      const amount = planPrice(selected).toFixed(2);
      const req = new PaymentRequest(
        [{ supportedMethods: 'https://apple.com/apple-pay', data: { version: 3, merchantIdentifier: 'merchant.com.menuqr', merchantCapabilities: ['supports3DS'], supportedNetworks: ['visa', 'masterCard', 'amex'], countryCode: 'US' } }],
        { total: { label: `MenuQR ${t(`plans.${selected.id}.name`)}`, amount: { currency: 'USD', value: amount } } }
      );
      const payResponse = await req.show();
      await payResponse.complete('success');
      setStep('setup');
      setSetup({ fullName: '', email: '', password: '', confirmPassword: '', restaurantName: '' });
    } catch (e: any) {
      if (e?.name !== 'AbortError') setPayError('Apple Pay cancelled. Try card payment below.');
    } finally { setPayLoading(false); }
  };

  const handleCardPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setPayError('');
    const stripped = card.number.replace(/\s/g, '');
    if (stripped.length < 16) { setPayError('Enter a valid 16-digit card number.'); return; }
    if (!card.name.trim()) { setPayError('Cardholder name is required.'); return; }
    if (card.expiry.length < 5) { setPayError('Enter a valid expiry (MM/YY).'); return; }
    if (card.cvv.length < 3) { setPayError('Enter a valid CVV.'); return; }
    setPayLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setPayLoading(false);
    setStep('setup');
    setSetup({ fullName: '', email: '', password: '', confirmPassword: '', restaurantName: '' });
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSetupError('');
    if (!setup.fullName.trim()) { setSetupError('Full name is required.'); return; }
    if (!setup.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setup.email)) { setSetupError('Enter a valid email address.'); return; }
    if (setup.password.length < 8) { setSetupError('Password must be at least 8 characters.'); return; }
    if (setup.password !== setup.confirmPassword) { setSetupError('Passwords do not match.'); return; }
    if (!setup.restaurantName.trim()) { setSetupError('Restaurant name is required.'); return; }
    setSetupLoading(true);
    try {
      const res = await fetch('/api/auth/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: setup.fullName.trim(),
          email: setup.email.trim(),
          password: setup.password,
          restaurantName: setup.restaurantName.trim(),
          plan: selected.id,
          billing,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSetupError(data.message ?? 'Something went wrong.'); return; }
      setStep('success');
    } catch { setSetupError('Network error. Please try again.'); }
    finally { setSetupLoading(false); }
  };

  // ── HOME VIEW ──────────────────────────────────────────────────────────────────
  if (step === 'home') {
    return (
      <div className="min-h-screen bg-surface">

        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-surface-container">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-lg font-headline">MenuQR</span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <button onClick={onLoginClick}
                className="flex items-center gap-2 px-5 py-2 rounded-xl border border-outline-variant text-sm font-semibold hover:bg-surface-container transition-all">
                {t('landing.signIn')} <ArrowRight className="w-3.5 h-3.5 rtl:scale-x-[-1]" />
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="pt-32 pb-24 px-6 text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-3.5 h-3.5" /> {t('landing.heroTag')}
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold font-headline leading-[1.1] mb-6">
              {t('landing.heroHeading1')}<br />
              <span className="text-primary">{t('landing.heroHeading2')}</span>
            </h1>
            <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              {t('landing.heroSubtext')}
            </p>
            <div className="flex items-center justify-center gap-4">
              <button onClick={scrollToPlans}
                className="btn-gradient text-white px-8 py-4 rounded-2xl font-bold text-base shadow-xl shadow-primary/20 hover:opacity-95 transition-all flex items-center gap-2">
                {t('landing.startTrial')} <ChevronRight className="w-5 h-5 rtl:scale-x-[-1]" />
              </button>
              <button onClick={onLoginClick}
                className="px-8 py-4 rounded-2xl border border-outline-variant font-semibold text-base hover:bg-surface-container transition-all">
                {t('landing.signIn')}
              </button>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="py-20 px-6 bg-surface-container-low border-y border-outline-variant/20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold font-headline mb-3">{t('landing.featuresHeading')}</h2>
              <p className="text-on-surface-variant">{t('landing.featuresSubtext')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURE_KEYS.map((f, i) => (
                <motion.div key={f.key}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="bg-surface rounded-2xl p-6 border border-outline-variant/20 hover:shadow-lg transition-all">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-sm mb-2">{t(`landing.features.${f.key}.title`)}</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{t(`landing.features.${f.key}.desc`)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section ref={plansRef} className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-extrabold font-headline mb-3">{t('landing.pricingHeading')}</h2>
              <p className="text-on-surface-variant text-base max-w-md mx-auto">
                {t('landing.pricingSubtext')}
              </p>
              <div className="inline-flex items-center mt-7 bg-surface-container-low border border-outline-variant p-1 rounded-2xl gap-1">
                {(['monthly', 'annual'] as Billing[]).map(b => (
                  <button key={b} onClick={() => setBilling(b)}
                    className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${billing === b ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    {b === 'monthly' ? t('common.monthly') : t('common.annual')}
                    {b === 'annual' && (
                      <span className={`ms-2 text-[10px] font-extrabold ${billing === 'annual' ? 'text-white/80' : 'text-tertiary'}`}>
                        {t('landing.save20')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PLANS.map((plan, i) => {
                const planFeatures = t(`plans.${plan.id}.features`, { returnObjects: true }) as string[];
                return (
                  <motion.div key={plan.id}
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className={`relative flex flex-col rounded-3xl p-7 border transition-all ${plan.popular
                      ? 'bg-primary text-on-primary border-primary shadow-2xl shadow-primary/25 md:-translate-y-3'
                      : 'bg-surface-container-low border-outline-variant hover:border-outline hover:shadow-xl hover:shadow-black/5'}`}>

                    {plan.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white text-primary text-[11px] font-extrabold px-4 py-1 rounded-full shadow-md border border-primary/20 whitespace-nowrap">
                        {t('landing.mostPopular')}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.popular ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                        {plan.icon}
                      </div>
                      <h3 className={`font-extrabold text-lg font-headline ${plan.popular ? 'text-on-primary' : 'text-on-surface'}`}>
                        {t(`plans.${plan.id}.name`)}
                      </h3>
                    </div>

                    <div className="mb-1 flex items-end gap-1">
                      <span className={`text-5xl font-extrabold font-headline leading-none ${plan.popular ? 'text-on-primary' : 'text-on-surface'}`}>
                        ${planPrice(plan)}
                      </span>
                      <span className={`text-sm pb-1 ${plan.popular ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>{t('landing.perMonth')}</span>
                    </div>
                    {billing === 'annual' && (
                      <p className={`text-xs mb-1 font-medium ${plan.popular ? 'text-on-primary/70' : 'text-tertiary'}`}>
                        {t('landing.billedYearly', { amount: planPrice(plan) * 12 })}
                      </p>
                    )}
                    <p className={`text-sm mb-6 leading-relaxed ${plan.popular ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                      {t(`plans.${plan.id}.description`)}
                    </p>

                    <ul className="space-y-2.5 flex-1 mb-7">
                      {(Array.isArray(planFeatures) ? planFeatures : []).map((f, fi) => (
                        <li key={fi} className={`flex items-center gap-2.5 text-sm ${plan.popular ? 'text-on-primary/90' : 'text-on-surface'}`}>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${plan.popular ? 'bg-white/25' : 'bg-primary/10'}`}>
                            <Check className={`w-2.5 h-2.5 ${plan.popular ? 'text-white' : 'text-primary'}`} />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button onClick={() => openCheckout(plan)}
                      className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${plan.popular
                        ? 'bg-white text-primary hover:bg-white/90 shadow-md'
                        : 'btn-gradient text-white hover:opacity-90 shadow-md shadow-primary/15'}`}>
                      {t('landing.getStarted')} <ChevronRight className="w-4 h-4 rtl:scale-x-[-1]" />
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Trust row */}
            <div className="flex items-center justify-center gap-8 mt-12 flex-wrap">
              {[
                { icon: <Shield className="w-4 h-4" />, label: t('landing.securePayments') },
                { icon: <Lock className="w-4 h-4" />,   label: t('landing.pciCompliant') },
                { icon: <Check className="w-4 h-4" />,  label: t('landing.cancelAnytime') },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-on-surface-variant">{icon} {label}</div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-surface-container py-8 px-6 text-center">
          <p className="text-xs text-on-surface-variant">
            {t('landing.copyright', { year: new Date().getFullYear() })}
          </p>
        </footer>
      </div>
    );
  }

  // ── CHECKOUT VIEW ──────────────────────────────────────────────────────────────
  if (step === 'checkout' && selected) {
    return (
      <div className="min-h-screen bg-surface">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-surface-container">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-lg font-headline">MenuQR</span>
            </div>
            <button onClick={onLoginClick} className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              {t('checkout.alreadyHaveAccount')} <span className="font-bold text-primary">{t('checkout.signIn')}</span>
            </button>
          </div>
        </nav>

        <div className="pt-28 pb-16 px-6 max-w-4xl mx-auto">
          <button onClick={() => setStep('home')}
            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" /> {t('checkout.backToPlans')}
          </button>

          <AnimatePresence mode="wait">
            <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
              className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">

              {/* Order summary */}
              <div className="md:col-span-2">
                <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant sticky top-24">
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-5">{t('checkout.orderSummary')}</p>
                  <div className="flex items-center gap-3 mb-6 pb-5 border-b border-outline-variant">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{selected.icon}</div>
                    <div>
                      <p className="font-bold">MenuQR {t(`plans.${selected.id}.name`)}</p>
                      <p className="text-xs text-on-surface-variant">{t(`checkout.${billing}Billing`)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">{t('checkout.subtotal')}</span>
                      <span className="font-medium">${planPrice(selected)}{t('landing.perMonth')}</span>
                    </div>
                    {billing === 'annual' && (
                      <div className="flex justify-between">
                        <span className="text-tertiary">{t('checkout.annualDiscount')}</span>
                        <span className="text-tertiary font-medium">−20%</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-3 border-t border-outline-variant mt-2">
                      <span>{t('checkout.totalDueToday')}</span>
                      <span>${billing === 'annual' ? planPrice(selected) * 12 : planPrice(selected)}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant pt-1">
                      {billing === 'annual' ? t('checkout.chargedAnnually') : t('checkout.chargedMonthly')} {t('checkout.renewsAuto')}
                    </p>
                  </div>
                  <ul className="mt-5 space-y-1.5 pt-4 border-t border-outline-variant">
                    {(t(`plans.${selected.id}.features`, { returnObjects: true }) as string[]).slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <Check className="w-3 h-3 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Payment form */}
              <div className="md:col-span-3">
                <h2 className="text-2xl font-extrabold font-headline mb-7">{t('checkout.paymentDetails')}</h2>

                {canApplePay && (
                  <div className="mb-6">
                    <button type="button" onClick={handleApplePay} disabled={payLoading}
                      className="w-full h-14 bg-black text-white rounded-2xl flex items-center justify-center gap-2.5 font-semibold text-[15px] hover:bg-neutral-900 transition-all disabled:opacity-50 shadow-lg shadow-black/10">
                      <AppleLogo /> Pay
                    </button>
                    <div className="flex items-center gap-3 my-5">
                      <div className="flex-1 h-px bg-outline-variant" />
                      <span className="text-xs text-on-surface-variant font-medium">{t('checkout.orPayWithCard')}</span>
                      <div className="flex-1 h-px bg-outline-variant" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xs text-on-surface-variant">{t('checkout.accepted')}</span>
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">VISA</span>
                  <span className="text-xs font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded">MC</span>
                  <span className="text-xs text-on-surface-variant/60">{t('checkout.allMajorCards')}</span>
                </div>

                <form onSubmit={handleCardPay} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">{t('checkout.cardNumber')}</label>
                    <div className="relative">
                      <input type="text" inputMode="numeric" placeholder="0000 0000 0000 0000"
                        value={card.number} onChange={e => setCard(p => ({ ...p, number: fmtNumber(e.target.value) }))}
                        className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all pe-16" />
                      <div className="absolute end-4 top-1/2 -translate-y-1/2">
                        {cardBrand(card.number) === 'visa' && <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">VISA</span>}
                        {cardBrand(card.number) === 'mastercard' && <span className="text-xs font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">MC</span>}
                        {!cardBrand(card.number) && <CreditCard className="w-5 h-5 text-on-surface-variant/40" />}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">{t('checkout.cardholderName')}</label>
                    <input type="text" placeholder="Jane Smith" value={card.name}
                      onChange={e => setCard(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">{t('checkout.expiry')}</label>
                      <input type="text" inputMode="numeric" placeholder="MM / YY" value={card.expiry}
                        onChange={e => setCard(p => ({ ...p, expiry: fmtExpiry(e.target.value) }))}
                        className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">{t('checkout.cvv')}</label>
                      <input type="password" inputMode="numeric" placeholder="•••" maxLength={4} value={card.cvv}
                        onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                    </div>
                  </div>

                  <AnimatePresence>
                    {payError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3">
                        {payError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button type="submit" disabled={payLoading}
                    className="w-full btn-gradient text-white py-4 rounded-2xl font-bold text-[15px] shadow-lg shadow-primary/20 hover:opacity-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2.5">
                    {payLoading
                      ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('checkout.processing')}</>
                      : <><Lock className="w-4 h-4" /> {t('checkout.pay', { amount: billing === 'annual' ? planPrice(selected) * 12 : planPrice(selected) })}</>}
                  </button>

                  <p className="text-center text-xs text-on-surface-variant flex items-center justify-center gap-1.5 pt-1">
                    <Shield className="w-3 h-3" /> {t('checkout.sslNote')}
                  </p>
                </form>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── SETUP VIEW ─────────────────────────────────────────────────────────────────
  if (step === 'setup' && selected) {
    return (
      <div className="min-h-screen bg-surface">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-surface-container">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg font-headline">MenuQR</span>
          </div>
        </nav>

        <div className="pt-28 pb-16 px-6 max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>

              {/* Progress indicator */}
              <div className="flex items-center gap-2 mb-8">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <div className="w-6 h-6 rounded-full bg-tertiary text-white flex items-center justify-center font-bold text-[10px]">✓</div>
                  {t('setup.stepPayment')}
                </div>
                <div className="flex-1 h-px bg-primary" />
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px]">2</div>
                  {t('setup.stepSetup')}
                </div>
              </div>

              <h2 className="text-3xl font-extrabold font-headline mb-2">{t('setup.heading')}</h2>
              <p className="text-on-surface-variant text-sm mb-8">
                {t('setup.subtext', { plan: t(`plans.${selected.id}.name`) })}
              </p>

              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">{t('setup.fullName')}</label>
                  <input type="text" placeholder="Jane Smith" value={setup.fullName}
                    onChange={e => setSetup(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">{t('setup.emailAddress')}</label>
                  <input type="email" placeholder="you@example.com" value={setup.email}
                    onChange={e => setSetup(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">{t('setup.restaurantName')}</label>
                  <input type="text" placeholder="e.g. Bella Cucina" value={setup.restaurantName}
                    onChange={e => setSetup(p => ({ ...p, restaurantName: e.target.value }))}
                    className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">{t('setup.password')}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder={t('setup.passwordPlaceholder')} value={setup.password}
                      onChange={e => setSetup(p => ({ ...p, password: e.target.value }))}
                      className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all pe-12" />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      className="absolute end-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors text-xs font-medium">
                      {showPassword ? t('setup.hide') : t('setup.show')}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">{t('setup.confirmPassword')}</label>
                  <input type="password" placeholder={t('setup.confirmPasswordPlaceholder')} value={setup.confirmPassword}
                    onChange={e => setSetup(p => ({ ...p, confirmPassword: e.target.value }))}
                    className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                </div>

                <AnimatePresence>
                  {setupError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3">
                      {setupError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={setupLoading}
                  className="w-full btn-gradient text-white py-4 rounded-2xl font-bold text-[15px] shadow-lg shadow-primary/20 hover:opacity-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 mt-2">
                  {setupLoading
                    ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('setup.creating')}</>
                    : <><Sparkles className="w-4 h-4" /> {t('setup.createAccount')}</>}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── SUCCESS VIEW ───────────────────────────────────────────────────────────────
  if (step === 'success' && selected) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-tertiary/10 border-2 border-tertiary/25 flex items-center justify-center mb-8">
          <Check className="w-12 h-12 text-tertiary" strokeWidth={2.5} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tertiary/10 text-tertiary text-xs font-bold uppercase tracking-widest mb-5">
            <Sparkles className="w-3.5 h-3.5" /> {t('success.badge')}
          </div>
          <h2 className="text-4xl font-extrabold font-headline mb-3">{t('success.heading')}</h2>
          <p className="text-on-surface-variant max-w-sm mx-auto mb-2">
            {t('success.description', { plan: t(`plans.${selected.id}.name`) })}
          </p>
          <p className="text-sm text-on-surface-variant mb-10">{t('success.emailSent')}</p>

          <button onClick={onLoginClick}
            className="btn-gradient text-white px-10 py-4 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center gap-2 mx-auto">
            {t('success.goToSignIn')} <ArrowRight className="w-4 h-4 rtl:scale-x-[-1]" />
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
};
