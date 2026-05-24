import React, { useState, useEffect } from 'react';
import { ArrowLeft, ToggleLeft, ToggleRight, Trash2, Building2, Users, ShoppingBag, DollarSign, Star, Calendar, Utensils } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ownerFetch as authFetch } from '../../src/lib/ownerAuth';

interface RestaurantFull {
  _id: string;
  name: string;
  logo?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  admin?: { _id: string; name: string; email: string };
  stats?: {
    totalOrders: number; totalRevenue: number; totalCustomers: number;
    totalMenuItems: number; totalReviews: number; totalReservations: number;
  };
}

interface Props { restaurantId: string; onBack: () => void; onDeleted: () => void; }

export const RestaurantDetail = ({ restaurantId, onBack, onDeleted }: Props) => {
  const { t } = useTranslation();
  const [restaurant, setRestaurant] = useState<RestaurantFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      const res = await authFetch(`/api/owner/restaurants/${restaurantId}`);
      if (res.ok) setRestaurant(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchDetail(); }, [restaurantId]);

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
          <button onClick={handleToggleStatus}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              restaurant.status === 'active'
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}>
            {restaurant.status === 'active'
              ? <><ToggleRight className="w-4 h-4" /> {t('restaurantDetail.deactivate')}</>
              : <><ToggleLeft className="w-4 h-4" /> {t('restaurantDetail.activate')}</>}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all">
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
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${restaurant.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
              {t(`common.${restaurant.status}`)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-on-surface-variant">
            {restaurant.contactEmail && <p>✉ {restaurant.contactEmail}</p>}
            {restaurant.contactPhone && <p>📞 {restaurant.contactPhone}</p>}
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
            { labelKey: 'restaurantDetail.stats.totalRevenue',  value: `$${stats.totalRevenue.toFixed(2)}`, icon: <DollarSign className="w-5 h-5" /> },
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

      {/* Admin account */}
      {restaurant.admin && (
        <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-4">{t('restaurantDetail.adminAccount')}</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {restaurant.admin.name?.slice(0, 1).toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-bold">{restaurant.admin.name}</p>
              <p className="text-sm text-on-surface-variant">{restaurant.admin.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
