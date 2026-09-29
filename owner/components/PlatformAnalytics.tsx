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
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-80 max-w-full bg-surface-container rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-[124px] bg-surface-container rounded-2xl" />)}</div>
        <div className="h-[330px] bg-surface-container rounded-2xl" />
      </div>
    );
  }

  const kpis = [
    { labelKey: 'analytics.kpis.totalRestaurants',  value: data?.totalRestaurants ?? 0,  icon: <Building2 className="w-5 h-5" /> },
    { labelKey: 'analytics.kpis.activeRestaurants', value: data?.activeRestaurants ?? 0, icon: <TrendingUp className="w-5 h-5" /> },
    { labelKey: 'analytics.kpis.totalCustomers',    value: data?.totalCustomers ?? 0,    icon: <Users className="w-5 h-5" /> },
    { labelKey: 'analytics.kpis.totalRevenue',      value: `$${(data?.totalRevenue ?? 0).toFixed(2)}`, icon: <DollarSign className="w-5 h-5" /> },
  ];

  const tableHeaders = [
    t('analytics.tableHeaders.restaurant'),
    t('analytics.tableHeaders.status'),
    t('analytics.tableHeaders.customers'),
    t('analytics.tableHeaders.orders'),
    t('analytics.tableHeaders.revenue'),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-page-title">{t('analytics.heading')}</h1>
          <p className="ds-page-sub">{t('analytics.subtext')}</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.labelKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="ds-card ds-card-pad flex flex-col gap-3 min-w-0">
            <div className="ds-icon-tile">{k.icon}</div>
            <div className="min-w-0">
              <p className="ds-metric-lbl">{t(k.labelKey)}</p>
              <h4 className="ds-metric-val tabular mt-1 truncate">{k.value}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      {/* New restaurants per month */}
      <div className="ds-card ds-card-pad">
        <h3 className="ds-section-title mb-4">{t('analytics.newRestaurantsChart')}</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.restaurantsPerMonth ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} dy={10} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} />
              <Tooltip
                formatter={(v: number) => [v, t('analytics.restaurantsLabel')]}
                cursor={{ fill: 'var(--color-surface-container-low)' }}
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-line)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', color: 'var(--color-on-surface)', fontSize: 12 }}
              />
              <Bar dataKey="value" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-restaurant table */}
      <div className="ds-card p-0 overflow-x-auto">
        <div className="px-5 py-4 border-b border-line">
          <h3 className="ds-section-title">{t('analytics.perRestaurant')}</h3>
        </div>
        <table className="ds-table min-w-[560px]">
          <thead>
            <tr>
              {tableHeaders.map((h, idx) => (
                <th key={h} className={idx >= 2 ? 'text-end' : undefined}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.restaurantStats ?? []).map((r, i) => (
              <motion.tr key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                <td className="font-semibold">{r.name}</td>
                <td>
                  <span className={`ds-chip ${r.status === 'active' ? 'ds-chip-pos' : 'ds-chip-neutral'}`}>
                    <span className="ds-dot" />
                    {t(`common.${r.status}`)}
                  </span>
                </td>
                <td className="tabular text-end">{r.totalCustomers}</td>
                <td className="tabular text-end">{r.totalOrders}</td>
                <td className="tabular text-end font-semibold">${r.totalRevenue.toFixed(2)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {(data?.restaurantStats ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-on-surface-variant text-sm">
            <Building2 className="w-8 h-8 opacity-40" />
            {t('analytics.noRestaurants')}
          </div>
        )}
      </div>
    </div>
  );
};
