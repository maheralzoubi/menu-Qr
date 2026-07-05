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
    sessionStorage.setItem('monar_pending', JSON.stringify(pending));

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
      sessionStorage.removeItem('monar_pending');
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
        className="w-full btn-gradient text-white py-4 rounded-2xl font-bold text-[15px] shadow-lg shadow-primary/20 hover:opacity-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2.5"
      >
        {paying
          ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('checkout.processing')}</>
          : <><Lock className="w-4 h-4" /> {t('checkout.pay', { amount: planPrice })}</>}
      </button>
      <p className="text-center text-xs text-on-surface-variant flex items-center justify-center gap-1.5">
        <Shield className="w-3 h-3" /> {t('checkout.sslNote')}
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
      sessionStorage.setItem('monar_checkout', JSON.stringify({ clientSecret, pending }));
    } else if (step === 'success') {
      sessionStorage.removeItem('monar_checkout');
      sessionStorage.removeItem('monar_pending');
    }
  }, [step, clientSecret, pending]);

  // Handle 3DS redirect return AND checkout restore after refresh / browser close
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // ── Case 1: Stripe redirected back after 3DS authentication ──────────────
    if (params.get('stripe_return')) {
      const raw = sessionStorage.getItem('monar_pending');
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
    const raw = sessionStorage.getItem('monar_checkout');
    if (!raw) return;

    let saved: { clientSecret: string; pending: PendingAccount };
    try { saved = JSON.parse(raw); } catch {
      sessionStorage.removeItem('monar_checkout');
      return;
    }

    const { clientSecret: savedCs, pending: savedPending } = saved;
    const savedPlan = FALLBACK_PLANS.find(pl => pl.id === savedPending?.plan);
    if (!savedCs || !savedPending || !savedPlan) {
      sessionStorage.removeItem('monar_checkout');
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
      const res = await fetch('/api/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan:           selected!.id,
          billing,
          name:           setup.fullName.trim(),
          email:          setup.email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSetupError(data.message ?? t('setup.errorGeneric')); return; }

      setClientSecret(data.clientSecret);
      setPending({
        name:           setup.fullName.trim(),
        email:          setup.email.trim(),
        password:       setup.password,
        plan:           selected!.id,
        billing,
        subscriptionId: data.subscriptionId,
      });
      setPayError('');
      setStep('checkout');
    } catch {
      setSetupError(t('setup.errorNetwork'));
    } finally {
      setSetupLoading(false);
    }
  };

  const finalizeAccount = async (data: PendingAccount) => {
    try {
      const res = await fetch('/api/auth/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:           data.name,
          email:          data.email,
          password:       data.password,
          plan:           data.plan,
          billing:        data.billing,
          subscriptionId: data.subscriptionId,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setPayError(body.message ?? t('checkout.accountCreateFailed')); return; }
      sessionStorage.removeItem('monar_pending');
      sessionStorage.removeItem('monar_checkout');
      setStep('verify');
    } catch {
      setPayError(t('setup.errorNetwork'));
    } finally {
      setFinalizing(false);
    }
  };

  // ── HOME ───────────────────────────────────────────────────────────────────
  if (step === 'home') {
    return (
      <div className="min-h-screen bg-surface">
        <nav className="fixed top-0 start-0 end-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-surface-container">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center">
              <img src="/logo-dark.svg" alt="Monar" className="h-8 w-auto" />
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

        <section className="py-20 px-6 bg-surface-container-low border-y border-outline-variant/20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold font-headline mb-3">{t('landing.featuresHeading')}</h2>
              <p className="text-on-surface-variant">{t('landing.featuresSubtext')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURE_KEYS.map((f, i) => (
                <motion.div key={f.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
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
              <p className="text-on-surface-variant text-base max-w-md mx-auto">{t('landing.pricingSubtext')}</p>
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
                  <motion.div key={plan.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className={`relative flex flex-col rounded-3xl p-7 border transition-all ${plan.popular
                      ? 'bg-primary text-on-primary border-primary shadow-2xl shadow-primary/25 md:-translate-y-3'
                      : 'bg-surface-container-low border-outline-variant hover:border-outline hover:shadow-xl hover:shadow-black/5'}`}>

                    {plan.popular && (
                      <div className="absolute -top-3.5 start-1/2 -translate-x-1/2 bg-white text-primary text-[11px] font-extrabold px-4 py-1 rounded-full shadow-md border border-primary/20 whitespace-nowrap">
                        {t('landing.mostPopular')}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.popular ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                        {plan.icon}
                      </div>
                      <h3 className={`font-extrabold text-lg font-headline ${plan.popular ? 'text-on-primary' : 'text-on-surface'}`}>
                        {t(`plans.${plan.id}.name`, { defaultValue: plan.id.charAt(0).toUpperCase() + plan.id.slice(1) })}
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
                      {planDescription}
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

                    <button onClick={() => openSetup(plan)}
                      className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${plan.popular
                        ? 'bg-white text-primary hover:bg-white/90 shadow-md'
                        : 'btn-gradient text-white hover:opacity-90 shadow-md shadow-primary/15'}`}>
                      {t('landing.getStarted')} <ChevronRight className="w-4 h-4 rtl:scale-x-[-1]" />
                    </button>
                  </motion.div>
                );
              })}
            </div>

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

        <footer className="border-t border-surface-container py-8 px-6 text-center">
          <p className="text-xs text-on-surface-variant">
            {t('landing.copyright', { year: new Date().getFullYear() })}
          </p>
        </footer>
      </div>
    );
  }

  // ── SETUP (step 1 after plan selection) ────────────────────────────────────
  if (step === 'setup' && selected) {
    return (
      <div className="min-h-screen bg-surface">
        <nav className="fixed top-0 start-0 end-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-surface-container">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center">
              <img src="/logo-dark.svg" alt="Monar" className="h-8 w-auto" />
            </div>
            <button onClick={onLoginClick} className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              {t('checkout.alreadyHaveAccount')} <span className="font-bold text-primary">{t('checkout.signIn')}</span>
            </button>
          </div>
        </nav>

        <div className="pt-28 pb-16 px-6 max-w-lg mx-auto">
          <button onClick={() => setStep('home')}
            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" /> {t('checkout.backToPlans')}
          </button>

          <AnimatePresence mode="wait">
            <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              {/* Progress */}
              <div className="flex items-center gap-2 mb-8">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px]">1</div>
                  {t('setup.stepSetup')}
                </div>
                <div className="flex-1 h-px bg-outline-variant" />
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <div className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-bold text-[10px]">2</div>
                  {t('setup.stepPayment')}
                </div>
              </div>

              <h2 className="text-3xl font-extrabold font-headline mb-2">{t('setup.heading')}</h2>
              <p className="text-on-surface-variant text-sm mb-8">
                {t('setup.subtext', { plan: t(`plans.${selected.id}.name`) })}
              </p>

              <form onSubmit={handleSetup} className="space-y-4">
                {[
                  { key: 'fullName', label: t('setup.fullName'),     type: 'text',  placeholder: 'Jane Smith',      value: setup.fullName, field: 'fullName' },
                  { key: 'email',    label: t('setup.emailAddress'), type: 'email', placeholder: 'you@example.com', value: setup.email,    field: 'email' },
                ].map(item => (
                  <div key={item.key}>
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">{item.label}</label>
                    <input type={item.type} placeholder={item.placeholder} value={item.value}
                      onChange={e => setSetup(p => ({ ...p, [item.field]: e.target.value }))}
                      className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                  </div>
                ))}

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
                    ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('setup.processing')}</>
                    : <><ChevronRight className="w-4 h-4 rtl:scale-x-[-1]" /> {t('setup.continueToPayment')}</>}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── CHECKOUT — Stripe Elements (step 2) ────────────────────────────────────
  if (step === 'checkout' && selected && clientSecret && pending) {
    const totalDue = billing === 'annual' ? planPrice(selected) * 12 : planPrice(selected);

    return (
      <div className="min-h-screen bg-surface">
        <nav className="fixed top-0 start-0 end-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-surface-container">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center">
              <img src="/logo-dark.svg" alt="Monar" className="h-8 w-auto" />
            </div>
            <button onClick={onLoginClick} className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              {t('checkout.alreadyHaveAccount')} <span className="font-bold text-primary">{t('checkout.signIn')}</span>
            </button>
          </div>
        </nav>

        <div className="pt-28 pb-16 px-6 max-w-4xl mx-auto">
          <button onClick={() => { sessionStorage.removeItem('monar_checkout'); setStep('setup'); }}
            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" /> {t('setup.backToSetup')}
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
                      <p className="font-bold">Monar {t(`plans.${selected.id}.name`)}</p>
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
                      <span>${totalDue}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant pt-1">
                      {billing === 'annual' ? t('checkout.chargedAnnually') : t('checkout.chargedMonthly')} {t('checkout.renewsAuto')}
                    </p>
                  </div>
                  <ul className="mt-5 space-y-1.5 pt-4 border-t border-outline-variant">
                    {(selected.features ?? (t(`plans.${selected.id}.features`, { returnObjects: true }) as string[])).slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <Check className="w-3 h-3 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Stripe payment form */}
              <div className="md:col-span-3">
                {/* Progress */}
                <div className="flex items-center gap-2 mb-7">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <div className="w-6 h-6 rounded-full bg-tertiary text-white flex items-center justify-center font-bold text-[10px]">✓</div>
                    {t('setup.stepSetup')}
                  </div>
                  <div className="flex-1 h-px bg-primary" />
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px]">2</div>
                    {t('setup.stepPayment')}
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold font-headline mb-7">{t('checkout.paymentDetails')}</h2>

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
                          borderRadius: '16px',
                          fontFamily: 'inherit',
                          colorPrimary: '#9b3f25',
                        },
                      },
                    }}
                  >
                    <AnimatePresence>
                      {payError && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3 mb-4">
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

  // ── VERIFY ─────────────────────────────────────────────────────────────────
  if (step === 'verify' && pending) {
    return <VerifyEmailScreen email={pending.email} onVerified={() => setStep('success')} />;
  }

  // ── SUCCESS ────────────────────────────────────────────────────────────────
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
