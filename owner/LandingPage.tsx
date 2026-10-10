import React, { useState, useEffect, useRef } from 'react';
import {
  Check, Zap, Building2, Star, ArrowLeft,
  Shield, Lock, ChevronRight, Sparkles, QrCode,
  BarChart3, ShoppingBag, Globe, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { VerifyEmailScreen } from './VerifyEmailScreen';

// ── Types ──────────────────────────────────────────────────────────────────────
type PlanId = string;
type Billing = 'monthly' | 'annual';
type Step = 'home' | 'setup' | 'checkout' | 'verify' | 'success';

interface PlanDef {
  id: PlanId;
  price: { monthly: number; annual: number };
  popular?: boolean;
  icon: React.ReactNode;
  description?: string;
  descriptionAr?: string;
  features?: string[];
  featuresAr?: string[];
}

interface ApiPlan {
  _id: string;
  key: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  featuresAr: string[];
  popular: boolean;
  active: boolean;
}

interface SetupForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface PendingAccount {
  name: string;
  email: string;
  password: string;
  plan: PlanId;
  billing: Billing;
  subscriptionId: string;
}

// ── Plan icons mapped by key ───────────────────────────────────────────────────
const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter:    <Zap className="w-5 h-5" />,
  pro:        <Star className="w-5 h-5" />,
  enterprise: <Building2 className="w-5 h-5" />,
};

// Fallback plans shown while loading or if the API fails
const FALLBACK_PLANS: PlanDef[] = [
  { id: 'starter',    price: { monthly: 29,  annual: 23  }, icon: PLAN_ICONS.starter },
  { id: 'pro',        price: { monthly: 79,  annual: 63  }, icon: PLAN_ICONS.pro,    popular: true },
  { id: 'enterprise', price: { monthly: 199, annual: 159 }, icon: PLAN_ICONS.enterprise },
];

const FEATURE_KEYS = [
  { key: 'qrMenus',         icon: <QrCode className="w-6 h-6" /> },
  { key: 'orderManagement', icon: <ShoppingBag className="w-6 h-6" /> },
  { key: 'analytics',       icon: <BarChart3 className="w-6 h-6" /> },
  { key: 'multiLocation',   icon: <Globe className="w-6 h-6" /> },
];

// ── Brand lockup (icon + wordmark) and shared header ───────────────────────────
const BrandLockup = ({ small = false }: { small?: boolean }) => (
  <div className="flex items-center gap-2.5 text-on-surface shrink-0">
    <img src="/brand/menugo-icon.svg" alt=""
      className={small ? 'w-7 h-7 rounded-lg block' : 'w-[38px] h-[38px] rounded-[10px] block'} />
    <span className={`font-display font-extrabold leading-none ${small ? 'text-base tracking-[-0.02em]' : 'text-[22px] tracking-[-0.03em]'}`}>
      Menu Go
    </span>
  </div>
);

const PageHeader = ({ children }: { children: React.ReactNode }) => (
  <header className="sticky top-0 z-50 bg-surface border-b border-line">
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 h-[72px] flex items-center justify-between gap-4">
      <BrandLockup />
      {children}
    </div>
  </header>
);

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');

// ── Inner payment form (must live inside <Elements>) ──────────────────────────
function StripePayForm({
  pending,
  planPrice,
  onSuccess,
  onError,
}: {
  pending: PendingAccount;
  planPrice: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const { t }    = useTranslation();
  const [paying, setPaying] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);

    // Store pending data in sessionStorage in case of 3DS redirect
    sessionStorage.setItem('menuqr_pending', JSON.stringify(pending));

    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('stripe_return', '1');
    returnUrl.searchParams.set('sub', pending.subscriptionId);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl.toString() },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message ?? t('checkout.paymentFailed'));
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      sessionStorage.removeItem('menuqr_pending');
      onSuccess();
    } else {
      onError(t('checkout.paymentNotCompleted'));
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-6">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={paying || !stripe || !elements}
        className="w-full h-12 px-6 rounded-full bg-primary text-white font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2.5"
      >
        {paying
          ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('checkout.processing')}</>
          : <><Lock className="w-4 h-4" /> {t('checkout.pay', { amount: planPrice })}</>}
      </button>
      <p className="text-center text-xs text-on-surface-variant flex items-center justify-center gap-1.5">
        <Shield className="w-3.5 h-3.5" /> {t('checkout.sslNote')}
      </p>
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export const LandingPage = ({ onLoginClick }: { onLoginClick: () => void }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [step, setStep]       = useState<Step>('home');
  const [billing, setBilling] = useState<Billing>('monthly');
  const [selected, setSelected] = useState<PlanDef | null>(null);
  const [plans, setPlans]     = useState<PlanDef[]>(FALLBACK_PLANS);

  // Fetch live plan data from the API on mount
  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.ok ? r.json() : null)
      .then((data: ApiPlan[] | null) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setPlans(data.map(p => ({
          id:      p.key,
          price:   { monthly: p.monthlyPrice, annual: p.annualPrice },
          popular: p.popular,
          icon:    PLAN_ICONS[p.key] ?? <Star className="w-5 h-5" />,
          description:   p.description,
          descriptionAr: p.descriptionAr,
          features:      p.features,
          featuresAr:    p.featuresAr,
        })));
      })
      .catch(() => { /* keep fallback */ });
  }, []);

  const [setup, setSetup] = useState<SetupForm>({
    fullName: '', email: '', password: '', confirmPassword: '',
  });
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError]     = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [clientSecret, setClientSecret]   = useState('');
  const [pending, setPending]             = useState<PendingAccount | null>(null);
  const [payError, setPayError]           = useState('');
  const [finalizing, setFinalizing]       = useState(false);

  const plansRef = useRef<HTMLDivElement>(null);
  const planPrice = (p: PlanDef) => billing === 'annual' ? p.price.annual : p.price.monthly;
  const scrollToPlans = () => plansRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Persist checkout state so a page refresh or tab restore doesn't lose the payment form
  useEffect(() => {
    if (step === 'checkout' && clientSecret && pending) {
      sessionStorage.setItem('menuqr_checkout', JSON.stringify({ clientSecret, pending }));
    } else if (step === 'success') {
      sessionStorage.removeItem('menuqr_checkout');
      sessionStorage.removeItem('menuqr_pending');
    }
  }, [step, clientSecret, pending]);

  // Handle 3DS redirect return AND checkout restore after refresh / browser close
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // ── Case 1: Stripe redirected back after 3DS authentication ──────────────
    if (params.get('stripe_return')) {
      const raw = sessionStorage.getItem('menuqr_pending');
      if (!raw) return;

      const stored: PendingAccount = JSON.parse(raw);
      const subId = params.get('sub') ?? stored.subscriptionId;
      const planObj = FALLBACK_PLANS.find(p => p.id === stored.plan);
      if (!planObj) return;

      setSelected(planObj);
      setBilling(stored.billing);
      setFinalizing(true);

      const cs = params.get('payment_intent_client_secret');
      if (!cs) { setFinalizing(false); return; }

      stripePromise.then(async (stripe) => {
        if (!stripe) { setFinalizing(false); return; }
        const { paymentIntent } = await stripe.retrievePaymentIntent(cs);
        if (paymentIntent?.status !== 'succeeded') {
          setPayError(t('checkout.paymentNotCompleted'));
          setFinalizing(false);
          return;
        }
        window.history.replaceState({}, '', window.location.pathname);
        await finalizeAccount({ ...stored, subscriptionId: subId });
      });
      return;
    }

    // ── Case 2: Page was refreshed or tab was restored mid-checkout ──────────
    const raw = sessionStorage.getItem('menuqr_checkout');
    if (!raw) return;

    let saved: { clientSecret: string; pending: PendingAccount };
    try { saved = JSON.parse(raw); } catch {
      sessionStorage.removeItem('menuqr_checkout');
      return;
    }

    const { clientSecret: savedCs, pending: savedPending } = saved;
    const savedPlan = FALLBACK_PLANS.find(pl => pl.id === savedPending?.plan);
    if (!savedCs || !savedPending || !savedPlan) {
      sessionStorage.removeItem('menuqr_checkout');
      return;
    }

    setSelected(savedPlan);
    setBilling(savedPending.billing);
    setPending(savedPending);
    setClientSecret(savedCs);
    setFinalizing(true);

    // Check if payment already succeeded (account creation may have failed before)
    stripePromise.then(async (stripe) => {
      if (!stripe) { setFinalizing(false); setStep('checkout'); return; }
      const { paymentIntent } = await stripe.retrievePaymentIntent(savedCs);
      if (paymentIntent?.status === 'succeeded') {
        // Payment done — retry account creation without asking user to pay again
        await finalizeAccount(savedPending);
      } else {
        // Payment not yet done — restore the payment form so user can complete it
        setFinalizing(false);
        setStep('checkout');
      }
    });
  }, []);

  const openSetup = (plan: PlanDef) => {
    setSelected(plan);
    setSetup({ fullName: '', email: '', password: '', confirmPassword: '' });
    setSetupError('');
    setStep('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    if (!setup.fullName.trim())            { setSetupError(t('setup.errorName'));     return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setup.email)) { setSetupError(t('setup.errorEmail'));    return; }
    if (setup.password.length < 8)         { setSetupError(t('setup.errorPassword')); return; }
    if (setup.password !== setup.confirmPassword) { setSetupError(t('setup.errorMatch')); return; }

    setSetupLoading(true);
    try {
      const res = await fetch('/api/auth/signup-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan:     selected!.id,
          billing,
          name:     setup.fullName.trim(),
          email:    setup.email.trim(),
          password: setup.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSetupError(data.message ?? t('setup.errorGeneric')); return; }

      setPending({
        name:           setup.fullName.trim(),
        email:          setup.email.trim(),
        password:       setup.password,
        plan:           selected!.id,
        billing,
        subscriptionId: '',
      });
      setStep('verify');
    } catch {
      setSetupError(t('setup.errorNetwork'));
    } finally {
      setSetupLoading(false);
    }
  };

  // Called once the email code is confirmed — starts the Stripe payment intent, then moves to checkout
  const handleVerified = async () => {
    if (!pending || !selected) return;
    try {
      const res = await fetch('/api/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan:    pending.plan,
          billing: pending.billing,
          name:    pending.name,
          email:   pending.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? t('setup.errorGeneric'));

      setClientSecret(data.clientSecret);
      setPending(p => p ? { ...p, subscriptionId: data.subscriptionId } : p);
      setPayError('');
      setStep('checkout');
    } catch (err) {
      throw err instanceof Error ? err : new Error(t('setup.errorGeneric'));
    }
  };

  const finalizeAccount = async (data: PendingAccount) => {
    try {
      const res = await fetch('/api/auth/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:          data.email,
          subscriptionId: data.subscriptionId,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setPayError(body.message ?? t('checkout.accountCreateFailed')); return; }
      sessionStorage.removeItem('menuqr_pending');
      sessionStorage.removeItem('menuqr_checkout');
      setStep('success');
    } catch {
      setPayError(t('setup.errorNetwork'));
    } finally {
      setFinalizing(false);
    }
  };

  // ── HOME ───────────────────────────────────────────────────────────────────
  if (step === 'home') {
    return (
      <div className="min-h-screen bg-surface text-on-surface">
        <PageHeader>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button onClick={onLoginClick}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-line bg-card text-sm font-semibold text-on-surface hover:border-on-surface transition-colors">
              {t('landing.signIn')} <ArrowRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
            </button>
          </div>
        </PageHeader>

        <section className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-[32px] bg-primary text-white p-[clamp(28px,5vw,56px)] min-h-[clamp(360px,40vw,480px)] flex flex-col justify-end gap-4">
            <span aria-hidden="true" className="pointer-events-none absolute -end-[8%] -top-[30%] w-[clamp(240px,38vw,480px)] aspect-square rounded-full bg-white/[.12]" />
            <span aria-hidden="true" className="pointer-events-none absolute end-[14%] -bottom-[40%] w-[clamp(160px,22vw,300px)] aspect-square rounded-full bg-white/[.09]" />

            <div className="relative self-start inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-[13px] leading-[18px] font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> {t('landing.heroTag')}
            </div>
            <h1 className="relative font-display font-extrabold text-[clamp(40px,6vw,72px)] leading-none tracking-[-0.04em] max-w-[16ch] text-balance">
              {t('landing.heroHeading1')}<br />
              <span className="text-white/80">{t('landing.heroHeading2')}</span>
            </h1>
            <p className="relative text-[clamp(15px,1.6vw,18px)] leading-[1.45] text-white/90 max-w-[40ch]">
              {t('landing.heroSubtext')}
            </p>
            <div className="relative flex flex-wrap items-center gap-3 mt-3">
              <button onClick={scrollToPlans}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-card text-on-surface font-semibold hover:opacity-90 transition-opacity">
                {t('landing.startTrial')} <ChevronRight className="w-5 h-5 rtl:-scale-x-100" />
              </button>
              <button onClick={onLoginClick}
                className="inline-flex items-center h-12 px-6 rounded-full border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors">
                {t('landing.signIn')}
              </button>
            </div>
          </motion.div>
        </section>

        <section className="py-[clamp(56px,7vw,88px)]">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-8">
            <div className="text-center mb-10">
              <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,40px)] leading-[1.1] tracking-[-0.03em] mb-3">{t('landing.featuresHeading')}</h2>
              <p className="text-on-surface-variant text-[15px] leading-[22px] max-w-xl mx-auto">{t('landing.featuresSubtext')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {FEATURE_KEYS.map((f, i) => (
                <motion.div key={f.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="bg-card border border-line rounded-3xl p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="w-11 h-11 rounded-2xl bg-acc-soft text-acc flex items-center justify-center mb-5">
                    {f.icon}
                  </div>
                  <h3 className="font-display font-bold text-lg leading-6 tracking-[-0.02em] mb-1.5">{t(`landing.features.${f.key}.title`)}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{t(`landing.features.${f.key}.desc`)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section ref={plansRef} className="pb-[clamp(56px,7vw,96px)] scroll-mt-[72px]">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-8">
            <div className="text-center mb-10">
              <h2 className="font-display font-extrabold text-[clamp(32px,4.4vw,52px)] leading-[1.05] tracking-[-0.04em] mb-3">{t('landing.pricingHeading')}</h2>
              <p className="text-on-surface-variant text-[15px] leading-[22px] max-w-md mx-auto">{t('landing.pricingSubtext')}</p>
              <div className="inline-flex items-center mt-7 p-1 rounded-full bg-surface-container gap-0.5">
                {(['monthly', 'annual'] as Billing[]).map(b => (
                  <button key={b} onClick={() => setBilling(b)}
                    className={`inline-flex items-center h-10 px-5 rounded-full text-sm font-semibold transition-colors ${billing === b ? 'bg-card text-on-surface shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    {b === 'monthly' ? t('common.monthly') : t('common.annual')}
                    {b === 'annual' && (
                      <span className="ds-chip ds-chip-pos ms-2">
                        {t('landing.save20')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
              {plans.map((plan, i) => {
                const translatedFeatures = t(`plans.${plan.id}.features`, { returnObjects: true, defaultValue: [] }) as string[];
                const translatedDescription = t(`plans.${plan.id}.description`, { defaultValue: '' }) as string;
                const planFeatures = isAr
                  ? (plan.featuresAr?.length ? plan.featuresAr : (translatedFeatures.length ? translatedFeatures : plan.features))
                  : (plan.features?.length ? plan.features : translatedFeatures);
                const planDescription = isAr
                  ? (plan.descriptionAr || translatedDescription || plan.description)
                  : (plan.description || translatedDescription);
                return (
                  <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className={`relative flex flex-col bg-card rounded-3xl p-7 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${plan.popular
                      ? 'border-2 border-primary'
                      : 'border border-line'}`}>

                    {plan.popular && (
                      <div className="absolute -top-3 inset-x-0 flex justify-center pointer-events-none">
                        <span className="ds-chip ds-chip-brand text-xs px-3 py-1 border border-primary/30">
                          <Star className="w-3 h-3" /> {t('landing.mostPopular')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-acc-soft text-acc flex items-center justify-center shrink-0">
                        {plan.icon}
                      </div>
                      <h3 className="font-display font-bold text-xl leading-7 tracking-[-0.02em] text-on-surface">
                        {t(`plans.${plan.id}.name`, { defaultValue: plan.id.charAt(0).toUpperCase() + plan.id.slice(1) })}
                      </h3>
                    </div>

                    <div className="mb-1 flex items-end gap-1">
                      <span className="font-display font-extrabold text-5xl leading-none tracking-[-0.04em] tabular text-on-surface">
                        ${planPrice(plan)}
                      </span>
                      <span className="text-sm pb-1 text-on-surface-variant">{t('landing.perMonth')}</span>
                    </div>
                    {billing === 'annual' && (
                      <p className="text-xs mb-1 font-medium text-pos6">
                        {t('landing.billedYearly', { amount: planPrice(plan) * 12 })}
                      </p>
                    )}
                    <p className="text-sm mt-2 mb-6 leading-relaxed text-on-surface-variant">
                      {planDescription}
                    </p>

                    <ul className="space-y-2.5 flex-1 mb-7 pt-5 border-t border-line">
                      {(Array.isArray(planFeatures) ? planFeatures : []).map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2.5 text-sm text-on-surface">
                          <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 bg-acc-soft">
                            <Check className="w-3 h-3 text-acc" strokeWidth={2.5} />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button onClick={() => openSetup(plan)}
                      className={`w-full h-12 px-6 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${plan.popular
                        ? 'bg-primary text-white hover:opacity-90'
                        : 'border border-line bg-card text-on-surface hover:border-on-surface'}`}>
                      {t('landing.getStarted')} <ChevronRight className="w-4 h-4 rtl:-scale-x-100" />
                    </button>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-x-8 gap-y-3 mt-12 flex-wrap">
              {[
                { icon: <Shield className="w-4 h-4" />, label: t('landing.securePayments') },
                { icon: <Lock className="w-4 h-4" />,   label: t('landing.pciCompliant') },
                { icon: <Check className="w-4 h-4" />,  label: t('landing.cancelAnytime') },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[13px] text-on-surface-variant">{icon} {label}</div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-line">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-7 flex flex-wrap items-center justify-between gap-3 text-[13px] leading-[18px] text-on-surface-variant">
            <BrandLockup small />
            <p>
              {t('landing.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // ── SETUP (step 1 after plan selection) ────────────────────────────────────
  if (step === 'setup' && selected) {
    return (
      <div className="min-h-screen bg-surface text-on-surface">
        <PageHeader>
          <button onClick={onLoginClick} className="text-sm text-on-surface-variant hover:text-on-surface transition-colors text-end">
            {t('checkout.alreadyHaveAccount')} <span className="font-semibold text-acc">{t('checkout.signIn')}</span>
          </button>
        </PageHeader>

        <div className="max-w-[1040px] mx-auto px-4 sm:px-8 pt-[clamp(24px,5vw,48px)] pb-24">
          <button onClick={() => setStep('home')}
            className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('checkout.backToPlans')}
          </button>

          <AnimatePresence mode="wait">
            <motion.div key="setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
              className="flex flex-wrap rounded-[32px] overflow-hidden border border-line bg-card shadow-md">

              {/* Brand panel */}
              <div className="relative overflow-hidden flex-[1_1_360px] bg-primary text-white p-[clamp(28px,5vw,48px)] flex flex-col justify-end min-h-[240px]">
                <span aria-hidden="true" className="pointer-events-none absolute -end-20 -top-20 w-80 h-80 rounded-full bg-white/[.12]" />
                <span aria-hidden="true" className="pointer-events-none absolute end-[30%] -bottom-24 w-48 h-48 rounded-full bg-white/[.09]" />
                <img src="/brand/menugo-icon.svg" alt=""
                  className="relative w-[72px] h-[72px] rounded-[18px] mb-5 ring-2 ring-white/35" />
                <span className="relative font-display font-extrabold text-[clamp(34px,4.4vw,52px)] leading-none tracking-[-0.04em]">
                  Menu Go
                </span>
                <p className="relative text-base leading-6 text-white/90 mt-3 max-w-[32ch]">
                  {t('setup.subtext', { plan: t(`plans.${selected.id}.name`) })}
                </p>
              </div>

              {/* Form panel */}
              <div className="flex-[1_1_380px] p-[clamp(28px,5vw,48px)]">
                {/* Progress */}
                <div className="flex items-center gap-2 mb-7">
                  <div className="flex items-center gap-2 text-xs font-semibold text-acc">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[11px]">1</div>
                    {t('setup.stepSetup')}
                  </div>
                  <div className="flex-1 h-px bg-line" />
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <div className="w-6 h-6 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-bold text-[11px]">2</div>
                    {t('setup.stepPayment')}
                  </div>
                </div>

                <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,34px)] leading-[1.15] tracking-[-0.035em] mb-6">{t('setup.heading')}</h2>

                <form onSubmit={handleSetup} className="space-y-4">
                  {[
                    { key: 'fullName', label: t('setup.fullName'),     type: 'text',  placeholder: 'Jane Smith',      value: setup.fullName, field: 'fullName' },
                    { key: 'email',    label: t('setup.emailAddress'), type: 'email', placeholder: 'you@example.com', value: setup.email,    field: 'email' },
                  ].map(item => (
                    <div key={item.key}>
                      <label className="ds-label">{item.label}</label>
                      <input type={item.type} placeholder={item.placeholder} value={item.value}
                        onChange={e => setSetup(p => ({ ...p, [item.field]: e.target.value }))}
                        className="ds-input h-12 px-4 text-[15px]" />
                    </div>
                  ))}

                  <div>
                    <label className="ds-label">{t('setup.password')}</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} placeholder={t('setup.passwordPlaceholder')} value={setup.password}
                        onChange={e => setSetup(p => ({ ...p, password: e.target.value }))}
                        className="ds-input h-12 ps-4 pe-16 text-[15px]" />
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 h-8 px-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-accent transition-colors text-xs font-semibold">
                        {showPassword ? t('setup.hide') : t('setup.show')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="ds-label">{t('setup.confirmPassword')}</label>
                    <input type="password" placeholder={t('setup.confirmPasswordPlaceholder')} value={setup.confirmPassword}
                      onChange={e => setSetup(p => ({ ...p, confirmPassword: e.target.value }))}
                      className="ds-input h-12 px-4 text-[15px]" />
                  </div>

                  <AnimatePresence>
                    {setupError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-sm text-neg7 bg-neg1 rounded-xl px-4 py-3">
                        {setupError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button type="submit" disabled={setupLoading}
                    className="w-full h-12 px-6 rounded-full bg-primary text-white font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2.5 mt-2">
                    {setupLoading
                      ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('setup.processing')}</>
                      : <><ChevronRight className="w-4 h-4 rtl:-scale-x-100" /> {t('setup.continueToPayment')}</>}
                  </button>
                </form>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── VERIFY — email code, before payment ─────────────────────────────────────
  if (step === 'verify' && pending) {
    return <VerifyEmailScreen email={pending.email} onVerified={handleVerified} />;
  }

  // ── CHECKOUT — Stripe Elements (step 2) ────────────────────────────────────
  if (step === 'checkout' && selected && clientSecret && pending) {
    const totalDue = billing === 'annual' ? planPrice(selected) * 12 : planPrice(selected);

    return (
      <div className="min-h-screen bg-surface text-on-surface">
        <PageHeader>
          <button onClick={onLoginClick} className="text-sm text-on-surface-variant hover:text-on-surface transition-colors text-end">
            {t('checkout.alreadyHaveAccount')} <span className="font-semibold text-acc">{t('checkout.signIn')}</span>
          </button>
        </PageHeader>

        <div className="max-w-[1040px] mx-auto px-4 sm:px-8 pt-[clamp(24px,5vw,48px)] pb-24">
          <button onClick={() => { sessionStorage.removeItem('menuqr_checkout'); setStep('setup'); }}
            className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('setup.backToSetup')}
          </button>

          <AnimatePresence mode="wait">
            <motion.div key="checkout" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
              className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">

              {/* Order summary */}
              <div className="md:col-span-2">
                <div className="bg-card border border-line rounded-3xl p-6 md:sticky md:top-[96px]">
                  <p className="ds-overline mb-5">{t('checkout.orderSummary')}</p>
                  <div className="flex items-center gap-3 mb-5 pb-5 border-b border-line">
                    <div className="w-11 h-11 rounded-2xl bg-acc-soft text-acc flex items-center justify-center shrink-0">{selected.icon}</div>
                    <div>
                      <p className="font-display font-bold text-lg leading-6 tracking-[-0.02em]">Menu Go {t(`plans.${selected.id}.name`)}</p>
                      <p className="text-xs text-on-surface-variant">{t(`checkout.${billing}Billing`)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">{t('checkout.subtotal')}</span>
                      <span className="font-medium tabular">${planPrice(selected)}{t('landing.perMonth')}</span>
                    </div>
                    {billing === 'annual' && (
                      <div className="flex justify-between">
                        <span className="text-pos6">{t('checkout.annualDiscount')}</span>
                        <span className="text-pos6 font-medium tabular">−20%</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-3 border-t border-line mt-2">
                      <span className="font-semibold">{t('checkout.totalDueToday')}</span>
                      <span className="font-display font-bold text-xl tabular">${totalDue}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant pt-1">
                      {billing === 'annual' ? t('checkout.chargedAnnually') : t('checkout.chargedMonthly')} {t('checkout.renewsAuto')}
                    </p>
                  </div>
                  <ul className="mt-5 space-y-1.5 pt-4 border-t border-line">
                    {(selected.features ?? (t(`plans.${selected.id}.features`, { returnObjects: true }) as string[])).slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <Check className="w-3.5 h-3.5 text-acc shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Stripe payment form */}
              <div className="md:col-span-3 bg-card border border-line rounded-3xl p-[clamp(24px,4vw,40px)]">
                {/* Progress */}
                <div className="flex items-center gap-2 mb-7">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <div className="w-6 h-6 rounded-full bg-pos5 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" strokeWidth={3} /></div>
                    {t('setup.stepSetup')}
                  </div>
                  <div className="flex-1 h-px bg-primary" />
                  <div className="flex items-center gap-2 text-xs font-semibold text-acc">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[11px]">2</div>
                    {t('setup.stepPayment')}
                  </div>
                </div>

                <h2 className="font-display font-extrabold text-[clamp(26px,3vw,30px)] leading-[1.15] tracking-[-0.035em] mb-6">{t('checkout.paymentDetails')}</h2>

                {finalizing ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="font-medium">{t('checkout.verifyingPayment')}</span>
                  </div>
                ) : (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          borderRadius: '10px',
                          fontFamily: 'inherit',
                          colorPrimary: '#F04B0F',
                        },
                      },
                    }}
                  >
                    <AnimatePresence>
                      {payError && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="text-sm text-neg7 bg-neg1 rounded-xl px-4 py-3 mb-4">
                          {payError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    <StripePayForm
                      pending={pending}
                      planPrice={totalDue}
                      onSuccess={() => finalizeAccount(pending)}
                      onError={(msg) => setPayError(msg)}
                    />
                  </Elements>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── SUCCESS ────────────────────────────────────────────────────────────────
  if (step === 'success' && selected) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center px-4 sm:px-8 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-pos1 flex items-center justify-center mb-8">
          <Check className="w-12 h-12 text-pos6" strokeWidth={2.5} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="ds-chip ds-chip-pos text-[13px] leading-[18px] px-3 py-1 mb-5">
            <Sparkles className="w-3.5 h-3.5" /> {t('success.badge')}
          </div>
          <h2 className="font-display font-extrabold text-[clamp(32px,4.4vw,48px)] leading-[1.05] tracking-[-0.035em] mb-3">{t('success.heading')}</h2>
          <p className="text-on-surface-variant text-base max-w-sm mx-auto mb-2">
            {t('success.description', { plan: t(`plans.${selected.id}.name`) })}
          </p>
          <p className="text-sm text-on-surface-variant mb-10">{t('success.ready')}</p>

          <button onClick={onLoginClick}
            className="h-12 px-6 rounded-full bg-primary text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto">
            {t('success.goToSignIn')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
};
