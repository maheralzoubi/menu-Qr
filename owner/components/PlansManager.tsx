import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Star, Building2, Plus, Trash2, Check, Pencil, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ownerFetch } from '../../src/lib/ownerAuth';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PlanData {
  _id: string;
  key: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  monthlyPrice: number;
  annualPrice: number;
  restaurantLimit: number;
  features: string[];
  featuresAr: string[];
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
  const [newFeatureAr, setNewFeatureAr] = useState('');
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

  const addFeatureAr = () => {
    const f = newFeatureAr.trim();
    if (!f) return;
    set('featuresAr', [...form.featuresAr, f]);
    setNewFeatureAr('');
  };

  const removeFeatureAr = (idx: number) =>
    set('featuresAr', form.featuresAr.filter((_, i) => i !== idx));

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
          nameAr:          form.nameAr,
          description:     form.description,
          descriptionAr:   form.descriptionAr,
          monthlyPrice:    form.monthlyPrice,
          annualPrice:     form.annualPrice,
          restaurantLimit: form.restaurantLimit,
          features:        form.features,
          featuresAr:      form.featuresAr,
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
    <div className="ds-backdrop">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className="ds-modal max-w-lg flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="ds-icon-tile w-9 h-9">
              {PLAN_ICONS[plan.key] ?? <Star className="w-5 h-5" />}
            </div>
            <h3 className="ds-section-title">{t('plans.manager.editPlan', { name: plan.name })}</h3>
          </div>
          <button onClick={onClose} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="ds-label">
              {t('plans.manager.planName')}
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="ds-input"
            />
          </div>

          {/* Name (Arabic) */}
          <div>
            <label className="ds-label">
              {t('plans.manager.planNameAr')}
            </label>
            <input
              dir="rtl"
              value={form.nameAr}
              onChange={e => set('nameAr', e.target.value)}
              className="ds-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="ds-label">
              {t('plans.manager.description')}
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className="ds-textarea"
            />
          </div>

          {/* Description (Arabic) */}
          <div>
            <label className="ds-label">
              {t('plans.manager.descriptionAr')}
            </label>
            <textarea
              dir="rtl"
              value={form.descriptionAr}
              onChange={e => set('descriptionAr', e.target.value)}
              rows={2}
              className="ds-textarea"
            />
          </div>

          {/* Prices */}
          <p className="ds-inset px-3 py-2 text-[11px] leading-4 text-on-surface-variant">
            {t('plans.manager.priceNote')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {t('plans.manager.monthlyPrice')}
              </label>
              <div className="relative">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">$</span>
                <input
                  type="number" min="0" step="1"
                  value={form.monthlyPrice}
                  onChange={e => set('monthlyPrice', Number(e.target.value))}
                  className="ds-input ps-7 tabular"
                />
              </div>
            </div>
            <div>
              <label className="ds-label">
                {t('plans.manager.annualPrice')}
              </label>
              <div className="relative">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">$</span>
                <input
                  type="number" min="0" step="1"
                  value={form.annualPrice}
                  onChange={e => set('annualPrice', Number(e.target.value))}
                  className="ds-input ps-7 tabular"
                />
              </div>
            </div>
          </div>

          {/* Restaurant limit */}
          <div>
            <label className="ds-label">
              {t('plans.manager.restaurantLimit')}
            </label>
            <input
              type="number" min="-1" step="1"
              value={form.restaurantLimit}
              onChange={e => set('restaurantLimit', Number(e.target.value))}
              className="ds-input"
            />
            <p className="ds-help">{t('plans.manager.limitHint')}</p>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => set('popular', !form.popular)}
                className={`ds-switch ${form.popular ? 'ds-switch-on' : ''}`}
              />
              <span className="text-sm font-medium">{t('plans.manager.mostPopular')}</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => set('active', !form.active)}
                className={`ds-switch ${form.active ? 'ds-switch-on' : ''}`}
              />
              <span className="text-sm font-medium">{t('plans.manager.active')}</span>
            </label>
          </div>

          {/* Features */}
          <div>
            <label className="ds-label mb-2">
              {t('plans.manager.features')}
            </label>
            <ul className="ds-inset overflow-hidden mb-2 empty:hidden">
              {form.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2 border-b border-line last:border-0">
                  <Check className="w-3.5 h-3.5 text-pos6 shrink-0" />
                  <span className="text-sm flex-1">{f}</span>
                  <button onClick={() => removeFeature(i)} className="text-on-surface-variant hover:text-error transition-colors">
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
                className="ds-input flex-1 w-auto min-w-0"
              />
              <button
                onClick={addFeature}
                className="ds-btn ds-btn-secondary ds-btn-icon"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Features (Arabic) */}
          <div>
            <label className="ds-label mb-2">
              {t('plans.manager.featuresAr')}
            </label>
            <ul className="ds-inset overflow-hidden mb-2 empty:hidden">
              {form.featuresAr.map((f, i) => (
                <li key={i} dir="rtl" className="flex items-center gap-2 px-3 py-2 border-b border-line last:border-0">
                  <Check className="w-3.5 h-3.5 text-pos6 shrink-0" />
                  <span className="text-sm flex-1">{f}</span>
                  <button onClick={() => removeFeatureAr(i)} className="text-on-surface-variant hover:text-error transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                dir="rtl"
                value={newFeatureAr}
                onChange={e => setNewFeatureAr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeatureAr())}
                placeholder={t('plans.manager.addFeaturePlaceholderAr')}
                className="ds-input flex-1 w-auto min-w-0"
              />
              <button
                onClick={addFeatureAr}
                className="ds-btn ds-btn-secondary ds-btn-icon"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-[13px] bg-neg1 text-neg7 rounded-xl px-3.5 py-2.5">
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="ds-btn ds-btn-outline">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="ds-btn ds-btn-primary"
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
  const { t, i18n } = useTranslation();
  const [billing, setBilling] = useState<Billing>('monthly');
  const isAr = i18n.language.startsWith('ar');

  const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const limitLabel = plan.restaurantLimit === -1 ? t('plans.manager.unlimited') : String(plan.restaurantLimit);
  const displayName = isAr && plan.nameAr ? plan.nameAr : plan.name;
  const displayDescription = isAr && plan.descriptionAr ? plan.descriptionAr : plan.description;
  const displayFeatures = isAr && plan.featuresAr?.length ? plan.featuresAr : plan.features;

  return (
    <div className={`ds-card ds-card-pad relative flex flex-col h-full transition-colors ${
      plan.popular
        ? 'border-primary ring-1 ring-primary'
        : 'hover:border-outline'
    } ${!plan.active ? 'opacity-50' : ''}`}>

      {plan.popular && (
        <div className="absolute -top-2.5 inset-x-0 flex justify-center pointer-events-none">
          <span className="ds-chip bg-primary text-on-primary">{t('landing.mostPopular')}</span>
        </div>
      )}

      {!plan.active && (
        <div className="absolute -top-2.5 end-4">
          <span className="ds-chip ds-chip-neutral border border-line">{t('common.inactive')}</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="ds-icon-tile">
            {PLAN_ICONS[plan.key] ?? <Star className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="ds-section-title truncate">{displayName}</h3>
            <p className="text-[11px] font-mono text-on-surface-variant">{plan.key}</p>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm text-on-surface-variant"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {/* Billing toggle */}
      <div className="ds-seg self-start mb-4">
        {(['monthly', 'annual'] as Billing[]).map(b => (
          <button key={b} onClick={() => setBilling(b)}
            className={`ds-seg-item h-7 text-xs ${billing === b ? 'ds-seg-item-active' : ''}`}>
            {b === 'monthly' ? t('common.monthly') : t('common.annual')}
          </button>
        ))}
      </div>

      <div className="font-display font-bold tabular text-4xl leading-none tracking-[-0.02em] text-on-surface mb-1">
        ${price}
        <span className="font-sans text-sm font-normal tracking-normal ms-1 text-on-surface-variant">{t('landing.perMonth')}</span>
      </div>

      <p className="text-xs mb-4 mt-1.5 text-on-surface-variant">{displayDescription}</p>

      <div className="text-xs font-semibold mb-4 px-3 py-2 rounded-xl bg-acc-soft text-acc">
        {t('plans.manager.restaurantsAllowed', { count: limitLabel })}
      </div>

      <ul className="space-y-2 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-on-surface">
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-pos1">
              <Check className="w-2.5 h-2.5 text-pos7" />
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-page-title">{t('plans.manager.heading')}</h1>
          <p className="ds-page-sub">{t('plans.manager.subtext')}</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-sm text-on-surface-variant">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span>{t('plans.manager.loading')}</span>
        </div>
      )}

      {error && !loading && (
        <div className="ds-empty">
          <AlertCircle className="w-8 h-8 opacity-40" />
          <p className="text-sm text-error">{error}</p>
          <button onClick={loadPlans} className="ds-btn ds-btn-primary ds-btn-sm mt-2">
            {t('plans.manager.retry')}
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {plans.map(plan => (
            <motion.div key={plan.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
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
