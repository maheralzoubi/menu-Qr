import React, { useState, useEffect } from 'react';
import { ArrowLeft, ToggleLeft, ToggleRight, Trash2, Pencil, X, Check, Building2, Users, ShoppingBag, DollarSign, Star, Calendar, Utensils } from 'lucide-react';
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
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-40 bg-surface-container-low rounded-xl" />
        <div className="h-64 bg-surface-container-low rounded-4xl" />
        <div className="grid grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="h-24 bg-surface-container-low rounded-3xl" />)}</div>
      </div>
    );
  }

  if (!restaurant) return <div className="text-center py-20 text-on-surface-variant">{t('restaurantDetail.notFound')}</div>;

  const stats = restaurant.stats;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-medium text-sm">
          <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" /> {t('restaurantDetail.allRestaurants')}
        </button>
        <div className="flex gap-3">
          <button onClick={openEdit} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-all">
            <Pencil className="w-4 h-4" /> {t('restaurantDetail.edit')}
          </button>
          <button onClick={handleToggleStatus}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              restaurant.status === 'active'
                ? 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}>
            {restaurant.status === 'active'
              ? <><ToggleRight className="w-4 h-4" /> {t('restaurantDetail.deactivate')}</>
              : <><ToggleLeft className="w-4 h-4" /> {t('restaurantDetail.activate')}</>}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-all">
            <Trash2 className="w-4 h-4" /> {t('restaurantDetail.delete')}
          </button>
        </div>
      </div>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface-container-low rounded-4xl p-8 flex items-start gap-6 border border-outline-variant/10">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold shrink-0 overflow-hidden">
          {restaurant.logo ? <img src={restaurant.logo} className="w-full h-full object-cover" /> : restaurant.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="text-3xl font-headline font-extrabold">{restaurant.name}</h2>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${restaurant.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
              {t(`common.${restaurant.status}`)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-on-surface-variant">
            {restaurant.contactEmail && <p>✉ <span dir="ltr">{restaurant.contactEmail}</span></p>}
            {restaurant.contactPhone && <p>📞 <span dir="ltr">{restaurant.contactPhone}</span></p>}
            {restaurant.address && <p className="col-span-2">📍 {restaurant.address}</p>}
            <p className="text-xs mt-1">
              {new Date(restaurant.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { labelKey: 'restaurantDetail.stats.totalOrders',   value: stats.totalOrders,        icon: <ShoppingBag className="w-5 h-5" /> },
            { labelKey: 'restaurantDetail.stats.totalRevenue',  value: formatCurrency(stats.totalRevenue, restaurant?.currency ?? 'USD'), icon: <DollarSign className="w-5 h-5" /> },
            { labelKey: 'restaurantDetail.stats.customers',     value: stats.totalCustomers,     icon: <Users className="w-5 h-5" /> },
            { labelKey: 'restaurantDetail.stats.menuItems',     value: stats.totalMenuItems,     icon: <Utensils className="w-5 h-5" /> },
            { labelKey: 'restaurantDetail.stats.reviews',       value: stats.totalReviews,       icon: <Star className="w-5 h-5" /> },
            { labelKey: 'restaurantDetail.stats.reservations',  value: stats.totalReservations,  icon: <Calendar className="w-5 h-5" /> },
          ].map(s => (
            <div key={s.labelKey} className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">{s.icon}</div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t(s.labelKey)}</p>
                <p className="text-2xl font-headline font-extrabold">{s.value}</p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="bg-surface rounded-3xl border border-surface-container w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-surface-container shrink-0">
                <h3 className="font-extrabold text-lg">{t('restaurantDetail.editTitle')}</h3>
                <button onClick={() => setShowEdit(false)} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('restaurants.panel.restaurantName')}</label>
                  <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('restaurants.panel.contactEmail')}</label>
                  <input type="email" value={editForm.contactEmail} onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('restaurants.panel.phone')}</label>
                  <PhoneInput value={editForm.contactPhone} onChange={v => setEditForm(f => ({ ...f, contactPhone: v }))} placeholder="555 000 0000" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('restaurants.panel.address')}</label>
                  <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('restaurants.panel.logoUrl')}</label>
                  <input value={editForm.logo} onChange={e => setEditForm(f => ({ ...f, logo: e.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('restaurants.panel.cuisineTypes')}</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {CUISINE_OPTIONS.map(c => {
                      const active = editForm.cuisine.includes(c);
                      return (
                        <button key={c} type="button"
                          onClick={() => setEditForm(f => ({ ...f, cuisine: active ? f.cuisine.filter(x => x !== c) : [...f.cuisine, c] }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${active ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'}`}>
                          {t(`restaurants.panel.cuisineLabels.${c}`, { defaultValue: c })}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editError && <p className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3">{editError}</p>}
              </form>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-container shrink-0">
                <button type="button" onClick={() => setShowEdit(false)} className="px-5 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold hover:bg-surface-container transition-colors">
                  {t('common.cancel')}
                </button>
                <button onClick={handleSaveEdit as any} disabled={editLoading}
                  className="px-5 py-2.5 rounded-xl btn-gradient text-white text-sm font-bold hover:opacity-95 transition-all disabled:opacity-60 flex items-center gap-2">
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
