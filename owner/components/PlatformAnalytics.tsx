import React, { useState, useEffect } from 'react';
import { Building2, Users, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ownerFetch as authFetch } from '../../src/lib/ownerAuth';

interface Analytics {
  totalRestaurants: number;
  activeRestaurants: number;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  restaurantsPerMonth: { name: string; value: number }[];
  restaurantStats: { _id: string; name: string; status: string; totalOrders: number; totalRevenue: number; totalCustomers: number }[];
}

export const PlatformAnalytics = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/owner/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 w-80 bg-surface-container-low rounded-2xl" />
        <div className="grid grid-cols-4 gap-6">{[1,2,3,4].map(i => <div key={i} className="h-32 bg-surface-container-low rounded-4xl" />)}</div>
        <div className="h-72 bg-surface-container-low rounded-4xl" />
      </div>
    );
  }

  const kpis = [
    { labelKey: 'analytics.kpis.totalRestaurants',  value: data?.totalRestaurants ?? 0,  icon: <Building2 className="w-6 h-6" /> },
    { labelKey: 'analytics.kpis.activeRestaurants', value: data?.activeRestaurants ?? 0, icon: <TrendingUp className="w-6 h-6" /> },
    { labelKey: 'analytics.kpis.totalCustomers',    value: data?.totalCustomers ?? 0,    icon: <Users className="w-6 h-6" /> },
    { labelKey: 'analytics.kpis.totalRevenue',      value: `$${(data?.totalRevenue ?? 0).toFixed(2)}`, icon: <DollarSign className="w-6 h-6" /> },
  ];

  const tableHeaders = [
    t('analytics.tableHeaders.restaurant'),
    t('analytics.tableHeaders.status'),
    t('analytics.tableHeaders.customers'),
    t('analytics.tableHeaders.orders'),
    t('analytics.tableHeaders.revenue'),
  ];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('analytics.heading')}</h2>
        <p className="text-on-surface-variant font-medium">{t('analytics.subtext')}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k, i) => (
          <motion.div key={k.labelKey} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-surface-container-low p-6 rounded-4xl border border-outline-variant/10 shadow-sm">
            <div className="text-primary mb-4">{k.icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t(k.labelKey)}</p>
            <h4 className="text-2xl font-headline font-extrabold mt-1">{k.value}</h4>
          </motion.div>
        ))}
      </div>

      {/* New restaurants per month */}
      <div className="bg-surface-container-low p-8 rounded-4xl border border-outline-variant/10 shadow-sm">
        <h3 className="text-xl font-headline font-extrabold mb-8">{t('analytics.newRestaurantsChart')}</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.restaurantsPerMonth ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <Tooltip
                formatter={(v: number) => [v, t('analytics.restaurantsLabel')]}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" fill="#9b3f25" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-restaurant table */}
      <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="text-lg font-headline font-extrabold">{t('analytics.perRestaurant')}</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant/10">
              {tableHeaders.map(h => (
                <th key={h} className="text-start p-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.restaurantStats ?? []).map((r, i) => (
              <motion.tr key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="border-b border-outline-variant/5 hover:bg-surface-container-lowest transition-colors">
                <td className="p-5 font-bold text-sm">{r.name}</td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                    {t(`common.${r.status}`)}
                  </span>
                </td>
                <td className="p-5 text-sm">{r.totalCustomers}</td>
                <td className="p-5 text-sm">{r.totalOrders}</td>
                <td className="p-5 text-sm font-bold text-primary">${r.totalRevenue.toFixed(2)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {(data?.restaurantStats ?? []).length === 0 && (
          <div className="text-center py-12 text-on-surface-variant/40 text-sm">{t('analytics.noRestaurants')}</div>
        )}
      </div>
    </div>
  );
};
