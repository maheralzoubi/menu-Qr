import React from 'react';
import { ShoppingBag, DollarSign, Star, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../src/lib/currency';

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  averageRating: number;
  totalReviews: number;
  totalMenuItems: number;
  totalReservations: number;
  dailyRevenue: { name: string; value: number }[];
  topItems: { name: string; orders: number }[];
  recentReviews: { _id: string; userName: string; rating: number; comment: string; date: string }[];
}

export const StatsGrid = ({ stats, currency = 'USD' }: { stats: Stats | null; currency?: string }) => {
  const { t } = useTranslation();

  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => <div key={i} className="bg-surface-container h-[124px] rounded-2xl" />)}
      </div>
    );
  }

  const avgOrderValue = stats.totalOrders > 0
    ? stats.totalRevenue / stats.totalOrders
    : 0;

  const metrics = [
    { labelKey: 'stats.totalRevenue', value: formatCurrency(stats.totalRevenue, currency), icon: <DollarSign className="w-5 h-5" /> },
    { labelKey: 'stats.totalOrders',  value: stats.totalOrders,                            icon: <ShoppingBag className="w-5 h-5" /> },
    { labelKey: 'stats.avgOrderValue',value: formatCurrency(avgOrderValue, currency),      icon: <TrendingUp className="w-5 h-5" /> },
    { labelKey: 'stats.satisfaction', value: `${stats.averageRating} / 5`,                 icon: <Star className="w-5 h-5" /> },
  ];

  const maxItemOrders = Math.max(...stats.topItems.map(i => i.orders), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-page-title">{t('stats.heading')}</h1>
          <p className="ds-page-sub">{t('stats.subtext')}</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.labelKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="ds-card ds-card-pad flex flex-col gap-3"
          >
            <div className="ds-icon-tile">{metric.icon}</div>
            <div>
              <p className="ds-metric-lbl">{t(metric.labelKey)}</p>
              <p className="ds-metric-val tabular mt-1">{metric.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue chart + Top items */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="ds-card ds-card-pad min-w-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="ds-section-title">{t('stats.revenueChart')}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{t('stats.dailyTotals')}</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {stats.dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyRevenue}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500, fill: 'var(--color-on-surface-variant)' }} dy={10} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v, currency), t('analytics.revenue')]}
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-line)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', color: 'var(--color-on-surface)' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={false} animationDuration={1500} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-on-surface-variant text-sm">
                {t('stats.noRevenueData')}
              </div>
            )}
          </div>
        </div>

        <div className="ds-card ds-card-pad flex flex-col min-w-0">
          <h3 className="ds-section-title mb-4">{t('stats.topSellingItems')}</h3>
          {stats.topItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm py-8">{t('stats.noOrdersYet')}</div>
          ) : (
            <div className="space-y-4 flex-1">
              {stats.topItems.map((item) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex justify-between gap-2 text-[13px]">
                    <span className="font-semibold text-on-surface truncate">{item.name}</span>
                    <span className="text-on-surface-variant tabular shrink-0">{t('stats.ordersCount', { count: item.orders })}</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.orders / maxItemOrders) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ds-card ds-card-pad">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="ds-section-title">{t('stats.recentReviews')}</h3>
            <div className="flex items-center gap-1 text-on-surface-variant">
              <Star className="w-4 h-4 text-warn5 fill-current" />
              <span className="text-[13px] font-semibold">{t('stats.overallRating', { rating: stats.averageRating })}</span>
            </div>
          </div>
          {stats.recentReviews.length === 0 ? (
            <p className="text-on-surface-variant text-sm text-center py-8">{t('stats.noReviewsYet')}</p>
          ) : (
            <div className="divide-y divide-line">
              {stats.recentReviews.map(review => (
                <div key={review._id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-acc-soft text-acc text-xs font-bold flex items-center justify-center shrink-0">
                        {review.userName?.slice(0, 2).toUpperCase() || '?'}
                      </div>
                      <span className="font-semibold text-sm text-on-surface truncate">{review.userName}</span>
                    </div>
                    <div className="flex shrink-0">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-warn5 fill-current' : 'text-surface-container-highest'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[13px] text-on-surface-variant line-clamp-2">"{review.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ds-card ds-card-pad">
          <h3 className="ds-section-title mb-4">{t('stats.quickStats')}</h3>
          <div className="divide-y divide-line">
            {[
              { labelKey: 'stats.menuItems',         value: stats.totalMenuItems },
              { labelKey: 'stats.totalReservations', value: stats.totalReservations },
              { labelKey: 'stats.totalReviews',      value: stats.totalReviews },
            ].map(s => (
              <div key={s.labelKey} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-on-surface-variant">{t(s.labelKey)}</span>
                <span className="font-display font-bold text-lg tabular text-on-surface">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
