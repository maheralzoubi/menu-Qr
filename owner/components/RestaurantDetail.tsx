import React, { useState, useEffect } from 'react';
import { ArrowLeft, ToggleLeft, ToggleRight, Trash2, Pencil, X, Check, Building2, Users, ShoppingBag, DollarSign, Star, Calendar, Utensils, Mail, Phone, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ownerFetch as authFetch } from '../../src/lib/ownerAuth';
import { formatCurrency } from '../../src/lib/currency';
import { PhoneInput } from './PhoneInput';
import { CUISINE_OPTIONS } from '../lib/cuisineOptions';
import { AdminTable } from './AdminTable';

interface RestaurantFull {
  _id: string;
  name: string;
  logo?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  cuisine?: string[];
  status: 'active' | 'inactive';
  currency?: string;
  createdAt: string;
  admin?: { _id: string; name: string; email: string };
  stats?: {
    totalOrders: number; totalRevenue: number; totalCustomers: number;
    totalMenuItems: number; totalReviews: number; totalReservations: number;
  };
}

type EditForm = { name: string; logo: string; contactEmail: string; contactPhone: string; address: string; cuisine: string[] };

interface Props { restaurantId: string; onBack: () => void; onDeleted: () => void; }

export const RestaurantDetail = ({ restaurantId, onBack, onDeleted }: Props) => {
  const { t } = useTranslation();
  const [restaurant, setRestaurant] = useState<RestaurantFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', logo: '', contactEmail: '', contactPhone: '', address: '', cuisine: [] });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchDetail = async () => {
    try {
      const res = await authFetch(`/api/owner/restaurants/${restaurantId}`);
      if (res.ok) setRestaurant(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchDetail(); }, [restaurantId]);

  const openEdit = () => {
    if (!restaurant) return;
    setEditForm({
      name: restaurant.name,
      logo: restaurant.logo ?? '',
      contactEmail: restaurant.contactEmail ?? '',
      contactPhone: restaurant.contactPhone ?? '',
      address: restaurant.address ?? '',
      cuisine: restaurant.cuisine ?? [],
    });
    setEditError('');
    setShowEdit(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      const res = await authFetch(`/api/owner/restaurants/${restaurantId}`, {
        method: 'PATCH', body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.message ?? t('restaurantDetail.editFailed')); return; }
      setRestaurant(prev => prev ? { ...prev, ...data } : prev);
      setShowEdit(false);
    } catch {
      setEditError(t('restaurantDetail.editFailed'));
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!restaurant) return;
    const newStatus = restaurant.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await authFetch(`/api/owner/restaurants/${restaurantId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setRestaurant(prev => prev ? { ...prev, status: newStatus } : prev);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!confirm(t('restaurantDetail.deleteConfirm'))) return;
    try {
      const res = await authFetch(`/api/owner/restaurants/${restaurantId}`, { method: 'DELETE' });
      if (res.ok) onDeleted();
    } catch (e) { console.error(e); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-9 w-40 bg-surface-container rounded-xl" />
        <div className="h-36 bg-surface-container rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-[84px] bg-surface-container rounded-2xl" />)}</div>
      </div>
    );
  }

  if (!restaurant) return <div className="ds-empty"><Building2 className="w-8 h-8 opacity-40" /><p className="text-sm">{t('restaurantDetail.notFound')}</p></div>;

  const stats = restaurant.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button onClick={onBack} className="ds-btn ds-btn-ghost ds-btn-sm -ms-3 text-on-surface-variant">
          <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('restaurantDetail.allRestaurants')}
        </button>
        <div className="flex gap-2 flex-wrap">
          <button onClick={openEdit} className="ds-btn ds-btn-outline ds-btn-sm">
            <Pencil className="w-4 h-4" /> {t('restaurantDetail.edit')}
          </button>
          <button onClick={handleToggleStatus} className="ds-btn ds-btn-outline ds-btn-sm">
            {restaurant.status === 'active'
              ? <><ToggleRight className="w-4 h-4 text-pos6" /> {t('restaurantDetail.deactivate')}</>
              : <><ToggleLeft className="w-4 h-4 text-on-surface-variant" /> {t('restaurantDetail.activate')}</>}
          </button>
          <button onClick={handleDelete} className="ds-btn ds-btn-danger-soft ds-btn-sm">
            <Trash2 className="w-4 h-4" /> {t('restaurantDetail.delete')}
          </button>
        </div>
      </div>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="ds-card ds-card-pad flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
        <div className="w-16 h-16 rounded-2xl bg-acc-soft text-acc flex items-center justify-center font-display text-2xl font-bold shrink-0 overflow-hidden">
          {restaurant.logo ? <img src={restaurant.logo} className="w-full h-full object-cover" /> : restaurant.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="ds-page-title">{restaurant.name}</h1>
            <span className={`ds-chip ${restaurant.status === 'active' ? 'ds-chip-pos' : 'ds-chip-neutral'}`}>
              <span className="ds-dot" />
              {t(`common.${restaurant.status}`)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-[13px] text-on-surface-variant">
            {restaurant.contactEmail && <p className="flex items-center gap-2 min-w-0"><Mail className="w-4 h-4 shrink-0" /> <span dir="ltr" className="truncate">{restaurant.contactEmail}</span></p>}
            {restaurant.contactPhone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /> <span dir="ltr">{restaurant.contactPhone}</span></p>}
            {restaurant.address && <p className="sm:col-span-2 flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" /> {restaurant.address}</p>}
            <p className="text-xs mt-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              {new Date(restaurant.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { labelKey: 'restaurantDetail.stats.totalOrders',   value: stats.totalOrders,        icon: <ShoppingBag className="w-5 h-5" /> },
            { labelKey: 'restaurantDetail.stats.totalRevenue',  value: formatCurrency(stats.totalRevenue, restaurant?.currency ?? 'USD'), icon: <DollarSign className="w-5 h-5" /> },
            { labelKey: 'restaurantDetail.stats.customers',     value: stats.totalCustomers,     icon: <Users className="w-5 h-5" /> },
            { labelKey: 'restaurantDetail.stats.menuItems',     value: stats.totalMenuItems,     icon: <Utensils className="w-5 h-5" /> },
            { labelKey: 'restaurantDetail.stats.reviews',       value: stats.totalReviews,       icon: <Star className="w-5 h-5" /> },
            { labelKey: 'restaurantDetail.stats.reservations',  value: stats.totalReservations,  icon: <Calendar className="w-5 h-5" /> },
          ].map(s => (
            <div key={s.labelKey} className="ds-card ds-card-pad flex items-center gap-4 min-w-0">
              <div className="ds-icon-tile">{s.icon}</div>
              <div className="min-w-0">
                <p className="ds-metric-lbl">{t(s.labelKey)}</p>
                <p className="ds-metric-val tabular mt-0.5 truncate">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin & staff management */}
      <AdminTable restaurantId={restaurant._id} />

      {/* Edit restaurant modal */}
      <AnimatePresence>
        {showEdit && (
          <div className="ds-backdrop">
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="ds-modal max-w-lg flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-line flex items-center justify-between shrink-0">
                <h3 className="ds-section-title">{t('restaurantDetail.editTitle')}</h3>
                <button onClick={() => setShowEdit(false)} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="overflow-y-auto flex-1 p-6 space-y-4">
                <div>
                  <label className="ds-label">{t('restaurants.panel.restaurantName')}</label>
                  <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="ds-input" />
                </div>
                <div>
                  <label className="ds-label">{t('restaurants.panel.contactEmail')}</label>
                  <input type="email" value={editForm.contactEmail} onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))}
                    className="ds-input" />
                </div>
                <div>
                  <label className="ds-label">{t('restaurants.panel.phone')}</label>
                  <PhoneInput value={editForm.contactPhone} onChange={v => setEditForm(f => ({ ...f, contactPhone: v }))} placeholder="555 000 0000" />
                </div>
                <div>
                  <label className="ds-label">{t('restaurants.panel.address')}</label>
                  <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                    className="ds-input" />
                </div>
                <div>
                  <label className="ds-label">{t('restaurants.panel.logoUrl')}</label>
                  <input value={editForm.logo} onChange={e => setEditForm(f => ({ ...f, logo: e.target.value }))}
                    className="ds-input" />
                </div>
                <div>
                  <label className="ds-label">{t('restaurants.panel.cuisineTypes')}</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {CUISINE_OPTIONS.map(c => {
                      const active = editForm.cuisine.includes(c);
                      return (
                        <button key={c} type="button"
                          onClick={() => setEditForm(f => ({ ...f, cuisine: active ? f.cuisine.filter(x => x !== c) : [...f.cuisine, c] }))}
                          className={`h-8 px-3 rounded-xl text-xs font-semibold border transition-colors ${active ? 'bg-primary text-on-primary border-primary' : 'bg-card text-on-surface-variant border-line hover:bg-accent'}`}>
                          {t(`restaurants.panel.cuisineLabels.${c}`, { defaultValue: c })}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editError && <p className="text-[13px] bg-neg1 text-neg7 rounded-xl px-3.5 py-2.5">{editError}</p>}
              </form>

              <div className="px-6 py-4 border-t border-line flex justify-end gap-2 shrink-0">
                <button type="button" onClick={() => setShowEdit(false)} className="ds-btn ds-btn-outline">
                  {t('common.cancel')}
                </button>
                <button onClick={handleSaveEdit as any} disabled={editLoading}
                  className="ds-btn ds-btn-primary">
                  {editLoading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('common.saving')}</>
                    : <><Check className="w-4 h-4" />{t('restaurants.panel.saveChanges')}</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
