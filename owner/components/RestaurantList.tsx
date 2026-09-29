import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Plus, X, Eye, EyeOff, Loader, ToggleLeft, ToggleRight, Trash2, Search, Building2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ownerFetch as authFetch, isSuperAdmin } from '../../src/lib/ownerAuth';
import { PhoneInput } from './PhoneInput';
import { CUISINE_OPTIONS } from '../lib/cuisineOptions';

interface Restaurant {
  _id: string;
  name: string;
  logo?: string;
  contactEmail?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
}

interface Subscription {
  isSuperAdmin?: boolean;
  plan: string | null;
  planName?: string;
  limit: number | null; // null = unlimited
}

interface Props { onSelect: (r: Restaurant) => void; }

const emptyForm = () => ({
  name: '', logo: '', contactEmail: '', contactPhone: '', address: '',
  cuisine: [] as string[],
  adminName: '', adminEmail: '', adminPassword: '',
});

export const RestaurantList = ({ onSelect }: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const superAdmin = isSuperAdmin();

  const fetchRestaurants = useCallback(async () => {
    try {
      const [restRes, subRes] = await Promise.all([
        authFetch('/api/owner/restaurants'),
        authFetch('/api/owner/subscription'),
      ]);
      if (restRes.ok) setRestaurants(await restRes.json());
      if (subRes.ok) setSubscription(await subRes.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  // true when the owner has used all their allowed restaurants
  const atLimit =
    !superAdmin &&
    subscription !== null &&
    subscription.limit !== null &&
    restaurants.length >= subscription.limit;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const res = await authFetch('/api/owner/restaurants', { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message ?? t('restaurants.panel.createFailed')); return; }
      setRestaurants(prev => [{ ...data.restaurant, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 }, ...prev]);
      setShowPanel(false);
      setForm(emptyForm());
    } catch { setFormError(t('restaurants.panel.networkError')); }
    finally { setFormLoading(false); }
  };

  const handleToggleStatus = async (id: string, current: 'active' | 'inactive') => {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    try {
      const res = await authFetch(`/api/owner/restaurants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      if (res.ok) setRestaurants(prev => prev.map(r => r._id === id ? { ...r, status: newStatus } : r));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('restaurants.deleteConfirm'))) return;
    try {
      const res = await authFetch(`/api/owner/restaurants/${id}`, { method: 'DELETE' });
      if (res.ok) setRestaurants(prev => prev.filter(r => r._id !== id));
    } catch (e) { console.error(e); }
  };

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.contactEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tableHeaders = [
    t('restaurants.tableHeaders.restaurant'),
    t('restaurants.tableHeaders.status'),
    t('restaurants.tableHeaders.customers'),
    t('restaurants.tableHeaders.orders'),
    t('restaurants.tableHeaders.revenue'),
    t('restaurants.tableHeaders.created'),
    t('restaurants.tableHeaders.actions'),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-page-title">{t('restaurants.heading')}</h1>
          <p className="ds-page-sub">{t('restaurants.subtext')}</p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <div className="relative flex-1 min-w-[160px] sm:flex-none sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input type="text" placeholder={t('restaurants.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="ds-input h-9 ps-9" />
          </div>
          <button
            onClick={() => { if (atLimit) return; setShowPanel(true); setFormError(''); setForm(emptyForm()); }}
            disabled={atLimit}
            title={atLimit ? t('restaurants.limitReached') : undefined}
            className="ds-btn ds-btn-primary ds-btn-sm">
            <Plus className="w-4 h-4" /> {t('restaurants.addRestaurant')}
          </button>
        </div>
      </div>

      {/* Plan limit banner — shown to non-superadmin owners when subscription is loaded */}
      <AnimatePresence>
        {!superAdmin && subscription && subscription.limit !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`ds-card px-4 py-3.5 flex items-center gap-3 ${atLimit ? 'bg-neg1 border-neg1' : ''}`}>
            <AlertCircle className={`w-5 h-5 shrink-0 ${atLimit ? 'text-neg7' : 'text-on-surface-variant'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-semibold ${atLimit ? 'text-neg7' : ''}`}>
                {subscription.planName ?? subscription.plan} {t('restaurants.plan')}
                {' · '}
                <span className="tabular">
                  {t('restaurants.usageCount', { used: restaurants.length, total: subscription.limit })}
                </span>
              </p>
              {/* progress bar */}
              <div className="mt-1.5 h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${atLimit ? 'bg-error' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, (restaurants.length / subscription.limit) * 100)}%` }}
                />
              </div>
            </div>
            {atLimit && (
              <span className="ds-chip bg-card text-neg7">
                <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" /> {t('restaurants.upgradePlan')}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { labelKey: 'restaurants.total', value: restaurants.length },
          { labelKey: 'restaurants.active', value: restaurants.filter(r => r.status === 'active').length },
          { labelKey: 'restaurants.inactive', value: restaurants.filter(r => r.status === 'inactive').length },
        ].map(s => (
          <div key={s.labelKey} className="ds-card p-4 sm:p-5 min-w-0">
            <p className="ds-metric-lbl truncate">{t(s.labelKey)}</p>
            <h4 className="ds-metric-val tabular mt-1">{s.value}</h4>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="ds-card p-0 overflow-hidden">{[1,2,3].map(i => <div key={i} className="h-16 border-b border-line last:border-0 px-4 flex items-center"><div className="h-4 w-1/2 bg-surface-container animate-pulse rounded-2xl" /></div>)}</div>
      ) : (
        <div className="ds-card p-0 overflow-x-auto">
          <table className="ds-table min-w-[720px]">
            <thead>
              <tr>
                {tableHeaders.map((h, idx) => (
                  <th key={h} className={idx >= 2 && idx <= 4 ? 'text-end' : undefined}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((r, i) => (
                  <motion.tr key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td>
                      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onSelect(r)}>
                        <div className="w-8 h-8 rounded-full bg-acc-soft text-acc text-xs font-bold flex items-center justify-center overflow-hidden shrink-0">
                          {r.logo ? <img src={r.logo} className="w-full h-full object-cover" /> : r.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold group-hover:text-primary transition-colors">{r.name}</p>
                          <p className="text-xs text-on-surface-variant">{r.contactEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`ds-chip ${r.status === 'active' ? 'ds-chip-pos' : 'ds-chip-neutral'}`}>
                        <span className="ds-dot" />
                        {t(`common.${r.status}`)}
                      </span>
                    </td>
                    <td className="tabular text-end">{r.totalCustomers}</td>
                    <td className="tabular text-end">{r.totalOrders}</td>
                    <td className="tabular text-end font-semibold">${r.totalRevenue.toFixed(2)}</td>
                    <td className="tabular text-on-surface-variant whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onSelect(r)} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm text-on-surface-variant" title={t('restaurants.viewDetails')}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(r._id, r.status)}
                          className={`ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm ${r.status === 'active' ? 'text-pos6' : 'text-on-surface-variant'}`}
                          title={r.status === 'active' ? t('restaurants.deactivate') : t('restaurants.activate')}>
                          {r.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(r._id)} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm text-on-surface-variant hover:text-error" title={t('common.delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center gap-2 py-14 px-6 text-on-surface-variant">
              <Building2 className="w-8 h-8 opacity-40" />
              <p className="text-sm">{restaurants.length === 0 ? t('restaurants.noRestaurants') : t('restaurants.noResults')}</p>
              {restaurants.length === 0 && (
                <button onClick={() => setShowPanel(true)} className="ds-btn ds-btn-outline ds-btn-sm mt-2">{t('restaurants.addFirst')}</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Restaurant slide-in panel */}
      <AnimatePresence>
        {showPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/45 z-40" onClick={() => setShowPanel(false)} />
            <motion.div
              initial={{ x: isRTL ? '-100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isRTL ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`fixed end-0 border-s top-0 h-full w-full max-w-lg bg-card border-line shadow-2xl z-50 flex flex-col`}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                <h3 className="ds-section-title">{t('restaurants.panel.title')}</h3>
                <button onClick={() => setShowPanel(false)} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <p className="ds-overline text-acc">{t('restaurants.panel.restaurantInfo')}</p>
                  {[
                    { labelKey: 'restaurants.panel.restaurantName', key: 'name', type: 'text', required: true, placeholder: 'The Artisan Kitchen' },
                    { labelKey: 'restaurants.panel.contactEmail', key: 'contactEmail', type: 'email', required: false, placeholder: 'contact@restaurant.com' },
                  ].map(({ labelKey, key, type, required, placeholder }) => (
                    <div key={key}>
                      <label className="ds-label">{t(labelKey)}</label>
                      <input type={type} required={required} value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                        className="ds-input" />
                    </div>
                  ))}
                  <div>
                    <label className="ds-label">{t('restaurants.panel.phone')}</label>
                    <PhoneInput value={form.contactPhone} onChange={v => setForm(f => ({ ...f, contactPhone: v }))} placeholder="555 000 0000" />
                  </div>
                  {[
                    { labelKey: 'restaurants.panel.address', key: 'address', type: 'text', required: false, placeholder: '123 Main St, City' },
                    { labelKey: 'restaurants.panel.logoUrl', key: 'logo', type: 'url', required: false, placeholder: 'https://...' },
                  ].map(({ labelKey, key, type, required, placeholder }) => (
                    <div key={key}>
                      <label className="ds-label">{t(labelKey)}</label>
                      <input type={type} required={required} value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                        className="ds-input" />
                    </div>
                  ))}
                </div>

                {/* Cuisine types */}
                <div>
                  <label className="ds-label">{t('restaurants.panel.cuisineTypes')}</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {CUISINE_OPTIONS.map(c => {
                      const active = form.cuisine.includes(c);
                      return (
                        <button key={c} type="button"
                          onClick={() => setForm(f => ({ ...f, cuisine: active ? f.cuisine.filter(x => x !== c) : [...f.cuisine, c] }))}
                          className={`h-8 px-3 rounded-xl text-xs font-semibold border transition-colors ${active ? 'bg-primary text-on-primary border-primary' : 'bg-card text-on-surface-variant border-line hover:bg-accent'}`}>
                          {t(`restaurants.panel.cuisineLabels.${c}`, { defaultValue: c })}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-line">
                  <div>
                    <p className="ds-overline text-acc">{t('restaurants.panel.adminAccount')}</p>
                    <p className="ds-help">{t('restaurants.panel.adminAccountNote')}</p>
                  </div>
                  {[
                    { labelKey: 'restaurants.panel.adminName', key: 'adminName', type: 'text', required: true, placeholder: 'John Smith' },
                    { labelKey: 'restaurants.panel.adminEmail', key: 'adminEmail', type: 'email', required: true, placeholder: 'admin@restaurant.com' },
                  ].map(({ labelKey, key, type, required, placeholder }) => (
                    <div key={key}>
                      <label className="ds-label">{t(labelKey)}</label>
                      <input type={type} required={required} value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                        className="ds-input" />
                    </div>
                  ))}
                  <div>
                    <label className="ds-label">{t('restaurants.panel.adminPassword')}</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} required value={form.adminPassword}
                        onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} placeholder={t('restaurants.panel.passwordPlaceholder')}
                        className="ds-input pe-10" />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {formError && <p className="text-[13px] bg-neg1 text-neg7 rounded-xl px-3.5 py-2.5">{formError}</p>}
              </form>

              <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
                <button type="button" onClick={() => setShowPanel(false)}
                  className="ds-btn ds-btn-outline">
                  {t('restaurants.panel.cancel')}
                </button>
                <button onClick={handleCreate as any} disabled={formLoading}
                  className="ds-btn ds-btn-primary">
                  {formLoading
                    ? <><Loader className="w-4 h-4 animate-spin" /> {t('restaurants.panel.creating')}</>
                    : t('restaurants.panel.create')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
