import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Star, Building2, Plus, Trash2, Check, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ownerFetch } from '../../src/lib/ownerAuth';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PlanData {
  _id: string;
  key: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  restaurantLimit: number;
  features: string[];
  popular: boolean;
  active: boolean;
}

type Billing = 'monthly' | 'annual';

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter:    <Zap className="w-5 h-5" />,
  pro:        <Star className="w-5 h-5" />,
  enterprise: <Building2 className="w-5 h-5" />,
};

// ── Edit Modal ─────────────────────────────────────────────────────────────────
const EditPlanModal = ({
  plan,
  onClose,
  onSaved,
}: {
  plan: PlanData;
  onClose: () => void;
  onSaved: (updated: PlanData) => void;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<Omit<PlanData, '_id'>>({ ...plan });
  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof Omit<PlanData, '_id'>, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const addFeature = () => {
    const f = newFeature.trim();
    if (!f) return;
    set('features', [...form.features, f]);
    setNewFeature('');
  };

  const removeFeature = (idx: number) =>
    set('features', form.features.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setError('');
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await ownerFetch(`/api/owner/plans/${plan.key}`, {
        method: 'PATCH',
        signal: controller.signal,
        body: JSON.stringify({
          name:            form.name,
          description:     form.description,
          monthlyPrice:    form.monthlyPrice,
          annualPrice:     form.annualPrice,
          restaurantLimit: form.restaurantLimit,
          features:        form.features,
          popular:         form.popular,
          active:          form.active,
        }),
      });
      clearTimeout(timer);
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? t('plans.manager.saveFailed')); return; }
      onSaved(data);
      onClose();
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setError(isAbort ? t('plans.manager.timeout') : t('plans.manager.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="bg-surface rounded-3xl border border-surface-container w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {PLAN_ICONS[plan.key] ?? <Star className="w-5 h-5" />}
            </div>
            <h3 className="font-extrabold text-lg">{t('plans.manager.editPlan', { name: plan.name })}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
              {t('plans.manager.planName')}
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
              {t('plans.manager.description')}
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all resize-none"
            />
          </div>

          {/* Prices */}
          <p className="text-[11px] text-on-surface-variant bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2">
            {t('plans.manager.priceNote')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                {t('plans.manager.monthlyPrice')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">$</span>
                <input
                  type="number" min="0" step="1"
                  value={form.monthlyPrice}
                  onChange={e => set('monthlyPrice', Number(e.target.value))}
                  className="w-full bg-surface-container border border-outline-variant rounded-2xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                {t('plans.manager.annualPrice')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">$</span>
                <input
                  type="number" min="0" step="1"
                  value={form.annualPrice}
                  onChange={e => set('annualPrice', Number(e.target.value))}
                  className="w-full bg-surface-container border border-outline-variant rounded-2xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Restaurant limit */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
              {t('plans.manager.restaurantLimit')}
            </label>
            <input
              type="number" min="-1" step="1"
              value={form.restaurantLimit}
              onChange={e => set('restaurantLimit', Number(e.target.value))}
              className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
            />
            <p className="text-[11px] text-on-surface-variant mt-1">{t('plans.manager.limitHint')}</p>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => set('popular', !form.popular)}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.popular ? 'bg-primary' : 'bg-surface-container-high'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.popular ? 'left-5' : 'left-1'}`} />
              </div>
              <span className="text-sm font-medium">{t('plans.manager.mostPopular')}</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => set('active', !form.active)}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.active ? 'bg-tertiary' : 'bg-surface-container-high'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'left-5' : 'left-1'}`} />
              </div>
              <span className="text-sm font-medium">{t('plans.manager.active')}</span>
            </label>
          </div>

          {/* Features */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              {t('plans.manager.features')}
            </label>
            <ul className="space-y-2 mb-3">
              {form.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm flex-1">{f}</span>
                  <button onClick={() => removeFeature(i)} className="text-on-surface-variant/50 hover:text-error transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder={t('plans.manager.addFeaturePlaceholder')}
                className="flex-1 bg-surface-container border border-outline-variant rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
              />
              <button
                onClick={addFeature}
                className="px-4 py-2.5 bg-primary/10 text-primary rounded-2xl hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3">
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-container shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold hover:bg-surface-container transition-colors">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl btn-gradient text-white text-sm font-bold hover:opacity-95 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('common.saving')}</>
              : <><Check className="w-4 h-4" />{t('plans.manager.save')}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Plan Card ──────────────────────────────────────────────────────────────────
const PlanCard = ({
  plan,
  onEdit,
}: {
  plan: PlanData;
  onEdit: () => void;
}) => {
  const { t } = useTranslation();
  const [billing, setBilling] = useState<Billing>('monthly');

  const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const limitLabel = plan.restaurantLimit === -1 ? t('plans.manager.unlimited') : String(plan.restaurantLimit);

  return (
    <div className={`relative flex flex-col rounded-3xl border p-6 transition-all ${
      plan.popular
        ? 'bg-primary text-on-primary border-primary shadow-2xl shadow-primary/25'
        : 'bg-surface-container-low border-outline-variant hover:border-outline'
    } ${!plan.active ? 'opacity-50' : ''}`}>

      {plan.popular && (
        <div className="absolute -top-3 start-1/2 -translate-x-1/2 bg-white text-primary text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md border border-primary/20 whitespace-nowrap">
          {t('landing.mostPopular')}
        </div>
      )}

      {!plan.active && (
        <div className="absolute -top-3 end-4 bg-error/10 text-error text-[10px] font-bold px-3 py-1 rounded-full border border-error/20">
          {t('common.inactive')}
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${plan.popular ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
            {PLAN_ICONS[plan.key] ?? <Star className="w-5 h-5" />}
          </div>
          <div>
            <h3 className={`font-extrabold ${plan.popular ? 'text-on-primary' : 'text-on-surface'}`}>{plan.name}</h3>
            <p className={`text-[11px] font-mono ${plan.popular ? 'text-on-primary/60' : 'text-on-surface-variant'}`}>{plan.key}</p>
          </div>
        </div>
        <button
          onClick={onEdit}
          className={`p-2 rounded-xl transition-colors ${plan.popular ? 'hover:bg-white/20 text-on-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {/* Billing toggle */}
      <div className="inline-flex items-center self-start mb-4 bg-black/10 rounded-xl p-0.5 gap-0.5">
        {(['monthly', 'annual'] as Billing[]).map(b => (
          <button key={b} onClick={() => setBilling(b)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${billing === b ? (plan.popular ? 'bg-white/25 text-on-primary' : 'bg-primary text-white') : (plan.popular ? 'text-on-primary/70' : 'text-on-surface-variant')}`}>
            {b === 'monthly' ? t('common.monthly') : t('common.annual')}
          </button>
        ))}
      </div>

      <div className={`text-4xl font-extrabold leading-none mb-1 ${plan.popular ? 'text-on-primary' : 'text-on-surface'}`}>
        ${price}
        <span className={`text-sm font-normal ms-1 ${plan.popular ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>/mo</span>
      </div>

      <p className={`text-xs mb-4 mt-1 ${plan.popular ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>{plan.description}</p>

      <div className={`text-xs font-semibold mb-4 px-3 py-2 rounded-xl ${plan.popular ? 'bg-white/15' : 'bg-primary/8 text-primary'}`}>
        {t('plans.manager.restaurantsAllowed', { count: limitLabel })}
      </div>

      <ul className="space-y-2 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className={`flex items-center gap-2 text-xs ${plan.popular ? 'text-on-primary/90' : 'text-on-surface'}`}>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${plan.popular ? 'bg-white/25' : 'bg-primary/10'}`}>
              <Check className={`w-2.5 h-2.5 ${plan.popular ? 'text-white' : 'text-primary'}`} />
            </div>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const PlansManager = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PlanData | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await ownerFetch('/api/owner/plans', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? t('plans.manager.loadFailed'));
        return;
      }
      setPlans(await res.json());
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setError(isAbort ? t('plans.manager.timeout') : t('plans.manager.networkError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleSaved = (updated: PlanData) =>
    setPlans(prev => prev.map(p => (p.key === updated.key ? updated : p)));

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold font-headline">{t('plans.manager.heading')}</h2>
        <p className="text-on-surface-variant text-sm mt-1">{t('plans.manager.subtext')}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-on-surface-variant">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span>{t('plans.manager.loading')}</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-20">
          <p className="text-error mb-4">{error}</p>
          <button onClick={loadPlans} className="px-5 py-2.5 rounded-xl btn-gradient text-white text-sm font-bold">
            {t('plans.manager.retry')}
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <motion.div key={plan.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <PlanCard plan={plan} onEdit={() => setEditing(plan)} />
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <EditPlanModal
            plan={editing}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
