import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Calendar, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../src/lib/auth';
import { formatCurrency } from '../../src/lib/currency';

interface PromoCode {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiryDate?: string;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = () => ({
  code: '',
  discountType: 'percentage' as 'percentage' | 'fixed',
  discountValue: '',
  expiryDate: '',
  maxUses: '',
});

export const PromoManager = () => {
  const { t } = useTranslation();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPromos = async () => {
    try {
      const res = await authFetch('/api/promos');
      if (res.ok) setPromos(await res.json());
    } catch (e) { console.error('Failed to fetch promos:', e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchPromos();
    authFetch('/api/settings/restaurant').then(r => r.ok ? r.json() : null).then(s => { if (s?.currency) setCurrency(s.currency); });
  }, []);

  const handleCreate = async () => {
    if (!form.code || !form.discountValue) { setError(t('promos.errors.required')); return; }
    const value = parseFloat(form.discountValue as string);
    if (isNaN(value) || value <= 0) { setError(t('promos.errors.positiveNumber')); return; }
    if (form.discountType === 'percentage' && value > 100) { setError(t('promos.errors.percentageMax')); return; }
    setSaving(true); setError('');
    try {
      const body: Record<string, any> = { code: form.code.toUpperCase(), discountType: form.discountType, discountValue: value };
      if (form.expiryDate) body.expiryDate = new Date(form.expiryDate).toISOString();
      if (form.maxUses) body.maxUses = parseInt(form.maxUses as string, 10);
      const res = await authFetch('/api/promos', { method: 'POST', body: JSON.stringify(body) });
      if (res.ok) { const created = await res.json(); setPromos(prev => [created, ...prev]); setForm(emptyForm()); setShowForm(false); }
      else { const data = await res.json(); setError(data.message || t('promos.errors.createFailed')); }
    } catch { setError(t('promos.errors.network')); }
    finally { setSaving(false); }
  };

  const handleToggle = async (promo: PromoCode) => {
    try {
      const res = await authFetch(`/api/promos/${promo._id}/toggle`, { method: 'PATCH', body: JSON.stringify({ isActive: !promo.isActive }) });
      if (res.ok) { const updated = await res.json(); setPromos(prev => prev.map(p => p._id === updated._id ? updated : p)); }
    } catch (e) { console.error('Failed to toggle promo:', e); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/promos/${id}`, { method: 'DELETE' });
      if (res.ok) setPromos(prev => prev.filter(p => p._id !== id));
    } catch (e) { console.error('Failed to delete promo:', e); }
  };

  const formatDiscount = (promo: PromoCode) =>
    promo.discountType === 'percentage' ? `${promo.discountValue}%` : formatCurrency(promo.discountValue, currency);

  const isExpired = (promo: PromoCode) =>
    promo.expiryDate ? new Date() > new Date(promo.expiryDate) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-page-title">{t('promos.heading')}</h1>
          <p className="ds-page-sub">{t('promos.subtext')}</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); }}
          className="ds-btn ds-btn-primary ds-btn-sm">
          <Plus className="w-4 h-4" /> {t('promos.newCode')}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="ds-card ds-card-pad space-y-4">
            <h3 className="ds-section-title">{t('promos.createHeading')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="ds-label">{t('promos.code')}</label>
                <input type="text" placeholder={t('promos.codePlaceholder')} value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="ds-input" />
              </div>
              <div>
                <label className="ds-label">{t('promos.discountType')}</label>
                <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value as 'percentage' | 'fixed' })}
                  className="ds-select">
                  <option value="percentage">{t('promos.percentage')}</option>
                  <option value="fixed">{t('promos.fixed')}</option>
                </select>
              </div>
              <div>
                <label className="ds-label">
                  {form.discountType === 'percentage' ? t('promos.discountPct') : t('promos.discountFixed')}
                </label>
                <input type="number" placeholder={form.discountType === 'percentage' ? '0–100' : '0.00'}
                  min={0} max={form.discountType === 'percentage' ? 100 : undefined}
                  value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })}
                  className="ds-input" />
              </div>
              <div>
                <label className="ds-label">{t('promos.maxUses')}</label>
                <input type="number" placeholder={t('promos.unlimited')} min={0} value={form.maxUses}
                  onChange={e => setForm({ ...form, maxUses: e.target.value })}
                  className="ds-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="ds-label">{t('promos.expiryDate')}</label>
                <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                  className="ds-input" />
              </div>
            </div>
            {error && <p className="text-error text-sm font-medium">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-line">
              <button onClick={() => { setShowForm(false); setForm(emptyForm()); setError(''); }}
                className="ds-btn ds-btn-secondary">
                {t('promos.cancel')}
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="ds-btn ds-btn-primary">
                {saving ? t('promos.creating') : t('promos.createCode')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-[72px] bg-surface-container rounded-2xl animate-pulse" />)}</div>
      ) : promos.length === 0 ? (
        <div className="ds-empty">
          <Tag className="w-8 h-8 opacity-40" />
          <p className="text-sm">{t('promos.noCodes')}</p>
        </div>
      ) : (
        <div className="ds-card p-0 overflow-hidden">
          <AnimatePresence>
            {promos.map(promo => {
              const expired = isExpired(promo);
              return (
                <motion.div key={promo._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 border-b border-line last:border-0 ${expired ? 'opacity-50' : ''}`}>
                  <div className="ds-icon-tile">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-base tracking-wide text-on-surface">{promo.code}</span>
                      {expired && <span className="ds-chip ds-chip-neg">{t('promos.expired')}</span>}
                      {!promo.isActive && !expired && <span className="ds-chip ds-chip-neutral">{t('promos.inactive')}</span>}
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 mt-0.5 text-xs text-on-surface-variant flex-wrap">
                      <span className="text-acc font-semibold">{t('promos.off', { discount: formatDiscount(promo) })}</span>
                      <span className="flex items-center gap-1 tabular">
                        <Hash className="w-3 h-3" />
                        {promo.maxUses ? t('promos.usesWithMax', { count: promo.usedCount, max: promo.maxUses }) : t('promos.uses', { count: promo.usedCount })}
                      </span>
                      {promo.expiryDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {t('promos.expires', { date: new Date(promo.expiryDate).toLocaleDateString() })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleToggle(promo)} title={promo.isActive ? t('promos.deactivate') : t('promos.activate')}
                      className="ds-btn ds-btn-ghost ds-btn-sm px-2">
                      <span className={`ds-switch ${promo.isActive ? 'ds-switch-on' : ''}`} />
                    </button>
                    <button onClick={() => handleDelete(promo._id)} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm text-on-surface-variant hover:text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
