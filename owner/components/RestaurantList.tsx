import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Plus, X, Eye, EyeOff, Loader, ToggleLeft, ToggleRight, Trash2, Search, Building2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ownerFetch as authFetch, isSuperAdmin } from '../../src/lib/ownerAuth';

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

const CUISINE_OPTIONS = [
  'Coffee', 'Burgers', 'Pizza', 'Pasta', 'Shawarma',
  'Salads', 'Desserts', 'Drinks', 'Breakfast', 'Chicken', 'Healthy',
];

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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('restaurants.heading')}</h2>
          <p className="text-on-surface-variant font-medium">{t('restaurants.subtext')}</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
            <input type="text" placeholder={t('restaurants.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-3 ps-12 pe-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <button
            onClick={() => { if (atLimit) return; setShowPanel(true); setFormError(''); setForm(emptyForm()); }}
            disabled={atLimit}
            title={atLimit ? t('restaurants.limitReached') : undefined}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              atLimit
                ? 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60'
                : 'btn-gradient text-white shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95'
            }`}>
            <Plus className="w-4 h-4" /> {t('restaurants.addRestaurant')}
          </button>
        </div>
      </div>

      {/* Plan limit banner — shown to non-superadmin owners when subscription is loaded */}
      <AnimatePresence>
        {!superAdmin && subscription && subscription.limit !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-2xl border px-5 py-4 flex items-center gap-4 ${
              atLimit
                ? 'bg-error/5 border-error/20'
                : 'bg-surface-container-low border-outline-variant/20'
            }`}>
            <AlertCircle className={`w-5 h-5 shrink-0 ${atLimit ? 'text-error' : 'text-on-surface-variant'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {subscription.planName ?? subscription.plan} {t('restaurants.plan')}
                {' · '}
                <span className={atLimit ? 'text-error font-bold' : ''}>
                  {t('restaurants.usageCount', { used: restaurants.length, total: subscription.limit })}
                </span>
              </p>
              {/* progress bar */}
              <div className="mt-1.5 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${atLimit ? 'bg-error' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, (restaurants.length / subscription.limit) * 100)}%` }}
                />
              </div>
            </div>
            {atLimit && (
              <span className="text-xs font-bold text-error bg-error/10 px-3 py-1.5 rounded-xl whitespace-nowrap flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> {t('restaurants.upgradePlan')}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { labelKey: 'restaurants.total', value: restaurants.length },
          { labelKey: 'restaurants.active', value: restaurants.filter(r => r.status === 'active').length },
          { labelKey: 'restaurants.inactive', value: restaurants.filter(r => r.status === 'inactive').length },
        ].map(s => (
          <div key={s.labelKey} className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">{t(s.labelKey)}</p>
            <h4 className="text-3xl font-headline font-extrabold">{s.value}</h4>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 bg-surface-container-low rounded-2xl" />)}</div>
      ) : (
        <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/10">
                {tableHeaders.map(h => (
                  <th key={h} className="text-start p-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((r, i) => (
                  <motion.tr key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-outline-variant/5 hover:bg-surface-container-lowest transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelect(r)}>
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden shrink-0">
                          {r.logo ? <img src={r.logo} className="w-full h-full object-cover" /> : r.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm hover:text-primary transition-colors">{r.name}</p>
                          <p className="text-xs text-on-surface-variant">{r.contactEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${r.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                        {t(`common.${r.status}`)}
                      </span>
                    </td>
                    <td className="p-5 text-sm font-bold">{r.totalCustomers}</td>
                    <td className="p-5 text-sm font-bold">{r.totalOrders}</td>
                    <td className="p-5 text-sm font-bold text-primary">${r.totalRevenue.toFixed(2)}</td>
                    <td className="p-5 text-sm text-on-surface-variant">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="p-5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => onSelect(r)} className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors" title={t('restaurants.viewDetails')}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(r._id, r.status)}
                          className={`p-2 rounded-xl transition-colors ${r.status === 'active' ? 'hover:bg-surface-container-high text-on-surface-variant' : 'hover:bg-primary/10 text-primary'}`}
                          title={r.status === 'active' ? t('restaurants.deactivate') : t('restaurants.activate')}>
                          {r.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(r._id)} className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors" title={t('common.delete')}>
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
            <div className="text-center py-16 text-on-surface-variant/40">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">{restaurants.length === 0 ? t('restaurants.noRestaurants') : t('restaurants.noResults')}</p>
              {restaurants.length === 0 && (
                <button onClick={() => setShowPanel(true)} className="mt-4 text-primary font-bold text-sm hover:underline">{t('restaurants.addFirst')}</button>
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
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setShowPanel(false)} />
            <motion.div
              initial={{ x: isRTL ? '-100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isRTL ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`fixed ${isRTL ? 'left-0' : 'right-0'} top-0 h-full w-full max-w-lg bg-surface shadow-2xl z-50 flex flex-col`}>
              <div className="flex items-center justify-between px-8 py-6 border-b border-surface-container">
                <h3 className="text-xl font-headline font-extrabold">{t('restaurants.panel.title')}</h3>
                <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">{t('restaurants.panel.restaurantInfo')}</p>
                  {[
                    { labelKey: 'restaurants.panel.restaurantName', key: 'name', type: 'text', required: true, placeholder: 'The Artisan Kitchen' },
                    { labelKey: 'restaurants.panel.contactEmail', key: 'contactEmail', type: 'email', required: false, placeholder: 'contact@restaurant.com' },
                    { labelKey: 'restaurants.panel.phone', key: 'contactPhone', type: 'tel', required: false, placeholder: '+1 555 000 0000' },
                    { labelKey: 'restaurants.panel.address', key: 'address', type: 'text', required: false, placeholder: '123 Main St, City' },
                    { labelKey: 'restaurants.panel.logoUrl', key: 'logo', type: 'url', required: false, placeholder: 'https://...' },
                  ].map(({ labelKey, key, type, required, placeholder }) => (
                    <div key={key} className="space-y-1.5 mb-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t(labelKey)}</label>
                      <input type={type} required={required} value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                        className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  ))}
                </div>

                {/* Cuisine types */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('restaurants.panel.cuisineTypes')}</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {CUISINE_OPTIONS.map(c => {
                      const active = form.cuisine.includes(c);
                      return (
                        <button key={c} type="button"
                          onClick={() => setForm(f => ({ ...f, cuisine: active ? f.cuisine.filter(x => x !== c) : [...f.cuisine, c] }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${active ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'}`}>
                          {t(`restaurants.panel.cuisineLabels.${c}`, { defaultValue: c })}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">{t('restaurants.panel.adminAccount')}</p>
                  <p className="text-xs text-on-surface-variant mb-4">{t('restaurants.panel.adminAccountNote')}</p>
                  {[
                    { labelKey: 'restaurants.panel.adminName', key: 'adminName', type: 'text', required: true, placeholder: 'John Smith' },
                    { labelKey: 'restaurants.panel.adminEmail', key: 'adminEmail', type: 'email', required: true, placeholder: 'admin@restaurant.com' },
                  ].map(({ labelKey, key, type, required, placeholder }) => (
                    <div key={key} className="space-y-1.5 mb-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t(labelKey)}</label>
                      <input type={type} required={required} value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                        className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('restaurants.panel.adminPassword')}</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} required value={form.adminPassword}
                        onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} placeholder={t('restaurants.panel.passwordPlaceholder')}
                        className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 pe-12 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute end-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {formError && <p className="text-sm text-on-surface-variant font-medium">{formError}</p>}
              </form>

              <div className="px-8 py-6 border-t border-surface-container flex gap-3">
                <button type="button" onClick={() => setShowPanel(false)}
                  className="flex-1 py-4 rounded-2xl bg-surface-container-high font-bold text-sm hover:bg-surface-variant transition-all">
                  {t('restaurants.panel.cancel')}
                </button>
                <button onClick={handleCreate as any} disabled={formLoading}
                  className="flex-1 py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
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
