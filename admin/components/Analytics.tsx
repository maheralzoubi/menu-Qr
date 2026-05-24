import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Calendar } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../src/lib/auth';

interface AnalyticsData {
  summary: { totalRevenue: number; totalOrders: number; avgOrderValue: number };
  revenueByDay: { name: string; value: number }[];
  categoryStats: { name: string; value: number; revenue: number; percentage: number; color: string }[];
  hourlyOrders: { time: string; val: number }[];
  topItems: { name: string; orders: number }[];
}

export const Analytics = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(7);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const res = await authFetch(`/api/analytics?days=${days}`);
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error('Failed to fetch analytics:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [days]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 w-80 bg-surface-container-low rounded-2xl" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-surface-container-low rounded-4xl" />)}
        </div>
        <div className="h-96 bg-surface-container-low rounded-4xl" />
      </div>
    );
  }

  const summary = data?.summary ?? { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

  const kpis = [
    { labelKey: 'analytics.totalRevenue', value: `$${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, Icon: DollarSign },
    { labelKey: 'analytics.totalOrders',  value: summary.totalOrders.toLocaleString(), Icon: ShoppingBag },
    { labelKey: 'analytics.avgOrderValue',value: `$${summary.avgOrderValue.toFixed(2)}`, Icon: TrendingUp },
    { labelKey: 'analytics.uniqueItems',  value: (data?.topItems.length ?? 0).toString(), Icon: ShoppingBag },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('analytics.heading')}</h2>
          <p className="text-on-surface-variant font-medium">{t('analytics.subtext')}</p>
        </div>
        <div className="flex gap-3">
          {[7, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                days === d ? 'btn-gradient text-white shadow-xl shadow-primary/20' : 'bg-surface-container-high hover:bg-surface-variant'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {t('analytics.lastDays', { d })}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((stat, i) => (
          <motion.div
            key={stat.labelKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface-container-low p-6 rounded-4xl border border-outline-variant/10 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary mb-4">
              <stat.Icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t(stat.labelKey)}</p>
            <h4 className="text-2xl font-headline font-extrabold mt-1">{stat.value}</h4>
          </motion.div>
        ))}
      </div>

      {/* Revenue chart + Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface-container-low p-8 rounded-4xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-xl font-headline font-extrabold mb-8">{t('analytics.revenueGrowth')}</h3>
          <div className="h-[350px] w-full">
            {(data?.revenueByDay.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-on-surface-variant/40 text-sm">{t('analytics.noData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data!.revenueByDay}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9b3f25" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#9b3f25" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'rgba(0,0,0,0.4)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'rgba(0,0,0,0.4)' }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, t('analytics.revenue')]} contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="#9b3f25" strokeWidth={4} fillOpacity={1} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-surface-container-low p-8 rounded-4xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-xl font-headline font-extrabold mb-6">{t('analytics.salesByCategory')}</h3>
          {(data?.categoryStats.length ?? 0) === 0 ? (
            <div className="h-40 flex items-center justify-center text-on-surface-variant/40 text-sm">{t('analytics.noCategoryData')}</div>
          ) : (
            <>
              <div className="h-[220px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data!.categoryStats} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={6} dataKey="value">
                      {data!.categoryStats.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, _: any, props: any) => [`${v} ${t('analytics.items')}`, props.payload.name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {data!.categoryStats.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-on-surface-variant truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-xs font-extrabold">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hourly orders + Insight card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-container-low p-8 rounded-4xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-xl font-headline font-extrabold mb-8">{t('analytics.popularTimes')}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.hourlyOrders ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} formatter={(v: number) => [v, t('analytics.orders')]} />
                <Bar dataKey="val" fill="#9b3f25" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-primary p-8 rounded-4xl shadow-2xl shadow-primary/20 text-on-primary flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-headline font-extrabold mb-2">{t('analytics.snapshot')}</h3>
            <p className="text-on-primary/70 text-sm leading-relaxed">
              {summary.totalOrders === 0
                ? t('analytics.noOrdersMsg')
                : t('analytics.snapshotMsg', {
                    orders: summary.totalOrders,
                    revenue: summary.totalRevenue.toFixed(2),
                    days,
                    avgValue: summary.avgOrderValue.toFixed(2),
                  })}
            </p>
          </div>
          <div className="pt-8 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t('analytics.periodRevenue')}</p>
              <h4 className="text-4xl font-headline font-extrabold mt-1">
                ${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
