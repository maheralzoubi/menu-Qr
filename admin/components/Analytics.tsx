import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../src/lib/auth';
import { formatCurrency, getCurrencySymbol } from '../../src/lib/currency';

interface AnalyticsData {
  summary: { totalRevenue: number; totalOrders: number; avgOrderValue: number };
  revenueByDay: { name: string; value: number }[];
  categoryStats: { name: string; value: number; revenue: number; percentage: number; color: string }[];
  hourlyOrders: { time: string; val: number }[];
  topItems: { name: string; orders: number }[];
}

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

const AXIS_TICK = { fontSize: 11, fontWeight: 500, fill: 'var(--color-on-surface-variant)' };

const TOOLTIP_STYLE = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-line)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-lg)',
  color: 'var(--color-on-surface)',
};

export const Analytics = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(7);
  const [isLoading, setIsLoading] = useState(true);

  const [currency, setCurrency] = useState('USD');
  useEffect(() => {
    authFetch('/api/settings/restaurant').then(r => r.ok ? r.json() : null).then(st => { if (st?.currency) setCurrency(st.currency); }).catch(() => {});
  }, []);

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
      <div className="space-y-6 animate-pulse">
        <div className="h-14 w-72 bg-surface-container rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-[124px] bg-surface-container rounded-2xl" />)}
        </div>
        <div className="h-[420px] bg-surface-container rounded-2xl" />
      </div>
    );
  }

  const summary = data?.summary ?? { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

  const kpis = [
    { labelKey: 'analytics.totalRevenue', value: formatCurrency(summary.totalRevenue, currency), Icon: DollarSign },
    { labelKey: 'analytics.totalOrders',  value: summary.totalOrders.toLocaleString(), Icon: ShoppingBag },
    { labelKey: 'analytics.avgOrderValue',value: formatCurrency(summary.avgOrderValue, currency), Icon: TrendingUp },
    { labelKey: 'analytics.uniqueItems',  value: (data?.topItems.length ?? 0).toString(), Icon: ShoppingBag },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-page-title">{t('analytics.heading')}</h1>
          <p className="ds-page-sub">{t('analytics.subtext')}</p>
        </div>
        <div className="ds-seg">
          {[7, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`ds-seg-item ${days === d ? 'ds-seg-item-active' : ''}`}
            >
              {t('analytics.lastDays', { d })}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((stat, i) => (
          <motion.div
            key={stat.labelKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="ds-card ds-card-pad flex flex-col gap-3"
          >
            <div className="ds-icon-tile">
              <stat.Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="ds-metric-lbl">{t(stat.labelKey)}</p>
              <p className="ds-metric-val tabular mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue chart + Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="ds-card ds-card-pad min-w-0">
          <h3 className="ds-section-title mb-4">{t('analytics.revenueGrowth')}</h3>
          <div className="h-[320px] w-full">
            {(data?.revenueByDay.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-on-surface-variant text-sm">{t('analytics.noData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data!.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={v => `${getCurrencySymbol(currency)} ${v}`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v, currency), t('analytics.revenue')]} contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="var(--color-chart-1)" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="ds-card ds-card-pad min-w-0">
          <h3 className="ds-section-title mb-4">{t('analytics.salesByCategory')}</h3>
          {(data?.categoryStats.length ?? 0) === 0 ? (
            <div className="h-40 flex items-center justify-center text-on-surface-variant text-sm">{t('analytics.noCategoryData')}</div>
          ) : (
            <>
              <div className="h-[200px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data!.categoryStats} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" stroke="var(--color-card)" strokeWidth={2}>
                      {data!.categoryStats.map((_entry, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, _: any, props: any) => [`${v} ${t('analytics.items')}`, props.payload.name]} contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="divide-y divide-line">
                {data!.categoryStats.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span className="text-[13px] text-on-surface-variant truncate">{item.name}</span>
                    </div>
                    <span className="text-[13px] font-semibold tabular text-on-surface">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hourly orders + Insight card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="ds-card ds-card-pad min-w-0">
          <h3 className="ds-section-title mb-4">{t('analytics.popularTimes')}</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.hourlyOrders ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={10} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'var(--color-surface-container-low)' }} formatter={(v: number) => [v, t('analytics.orders')]} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="val" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ds-card ds-card-pad flex flex-col justify-between gap-6">
          <div>
            <h3 className="ds-section-title mb-1.5">{t('analytics.snapshot')}</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
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
          <div className="flex items-end justify-between gap-4 pt-4 border-t border-line">
            <div>
              <p className="ds-metric-lbl">{t('analytics.periodRevenue')}</p>
              <p className="ds-metric-val tabular mt-1">
                {formatCurrency(summary.totalRevenue, currency)}
              </p>
            </div>
            <div className="ds-icon-tile">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
