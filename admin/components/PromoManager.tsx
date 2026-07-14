import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, ToggleLeft, ToggleRight, Calendar, Hash } from 'lucide-react';
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
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('promos.heading')}</h2>
          <p className="text-on-surface-variant font-medium">{t('promos.subtext')}</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-headline font-bold text-sm hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> {t('promos.newCode')}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-low rounded-2xl p-6 space-y-5">
            <h3 className="font-headline font-bold text-lg">{t('promos.createHeading')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{t('promos.code')}</label>
                <input type="text" placeholder={t('promos.codePlaceholder')} value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{t('promos.discountType')}</label>
                <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="percentage">{t('promos.percentage')}</option>
                  <option value="fixed">{t('promos.fixed')}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  {form.discountType === 'percentage' ? t('promos.discountPct') : t('promos.discountFixed')}
                </label>
                <input type="number" placeholder={form.discountType === 'percentage' ? '0–100' : '0.00'}
                  min={0} max={form.discountType === 'percentage' ? 100 : undefined}
                  value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })}
                  className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{t('promos.maxUses')}</label>
                <input type="number" placeholder={t('promos.unlimited')} min={0} value={form.maxUses}
                  onChange={e => setForm({ ...form, maxUses: e.target.value })}
                  className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{t('promos.expiryDate')}</label>
                <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                  className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            {error && <p className="text-error text-sm font-medium">{error}</p>}
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={saving}
                className="bg-primary text-white px-6 py-2.5 rounded-xl font-headline font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? t('promos.creating') : t('promos.createCode')}
              </button>
              <button onClick={() => { setShowForm(false); setForm(emptyForm()); setError(''); }}
                className="px-6 py-2.5 rounded-xl font-headline font-bold text-sm bg-surface-container-highest text-on-surface hover:bg-surface-container transition-colors">
                {t('promos.cancel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-surface-container-low rounded-2xl animate-pulse" />)}</div>
      ) : promos.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant space-y-3">
          <Tag className="w-10 h-10 mx-auto opacity-30" />
          <p className="font-medium">{t('promos.noCodes')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {promos.map(promo => {
              const expired = isExpired(promo);
              return (
                <motion.div key={promo._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  className={`flex items-center gap-4 bg-surface-container-low rounded-2xl px-6 py-4 ${expired ? 'opacity-50' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-extrabold text-lg tracking-wider">{promo.code}</span>
                      {expired && <span className="text-[10px] font-bold uppercase tracking-wider bg-error/10 text-error px-2 py-0.5 rounded-full">{t('promos.expired')}</span>}
                      {!promo.isActive && !expired && <span className="text-[10px] font-bold uppercase tracking-wider bg-on-surface/10 text-on-surface-variant px-2 py-0.5 rounded-full">{t('promos.inactive')}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-on-surface-variant font-medium">
                      <span className="text-primary font-bold">{t('promos.off', { discount: formatDiscount(promo) })}</span>
                      <span className="flex items-center gap-1">
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
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggle(promo)} title={promo.isActive ? t('promos.deactivate') : t('promos.activate')}
                      className="text-on-surface-variant hover:text-primary transition-colors">
                      {promo.isActive ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                    <button onClick={() => handleDelete(promo._id)} className="text-on-surface-variant/40 hover:text-error transition-colors">
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
