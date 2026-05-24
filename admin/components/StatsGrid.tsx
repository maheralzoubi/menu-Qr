import React from 'react';
import { ShoppingBag, DollarSign, Star, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

export const StatsGrid = ({ stats }: { stats: Stats | null }) => {
  const { t } = useTranslation();

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map(i => <div key={i} className="bg-surface-container-low h-32 rounded-4xl" />)}
      </div>
    );
  }

  const avgOrderValue = stats.totalOrders > 0
    ? (stats.totalRevenue / stats.totalOrders).toFixed(2)
    : '0.00';

  const metrics = [
    { labelKey: 'stats.totalRevenue', value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <DollarSign className="w-6 h-6" />, color: 'bg-primary/10 text-primary' },
    { labelKey: 'stats.totalOrders',  value: stats.totalOrders,                           icon: <ShoppingBag className="w-6 h-6" />, color: 'bg-tertiary/10 text-tertiary' },
    { labelKey: 'stats.avgOrderValue',value: `$${avgOrderValue}`,                          icon: <TrendingUp className="w-6 h-6" />, color: 'bg-amber-500/10 text-amber-600' },
    { labelKey: 'stats.satisfaction', value: `${stats.averageRating} / 5`,                 icon: <Star className="w-6 h-6" />,       color: 'bg-primary text-on-primary', isFeatured: true },
  ];

  const maxItemOrders = Math.max(...stats.topItems.map(i => i.orders), 1);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-extrabold tracking-tight">{t('stats.heading')}</h1>
          <p className="text-on-surface-variant mt-1">{t('stats.subtext')}</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.labelKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${metric.isFeatured ? 'bg-primary' : 'bg-surface-container-low'} p-6 rounded-4xl space-y-4 relative overflow-hidden`}
          >
            {metric.isFeatured && (
              <div className="absolute -end-4 -top-4 opacity-10">
                <Star className="w-32 h-32 fill-current" />
              </div>
            )}
            <div className={`relative z-10 p-3 rounded-2xl w-fit ${metric.isFeatured ? 'bg-white/20 text-white' : metric.color}`}>
              {metric.icon}
            </div>
            <div className="relative z-10">
              <p className={`text-sm font-medium ${metric.isFeatured ? 'text-white/80' : 'text-on-surface-variant'}`}>{t(metric.labelKey)}</p>
              <h3 className={`text-2xl font-bold mt-1 ${metric.isFeatured ? 'text-white' : 'text-on-surface'}`}>{metric.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue chart + Top items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface-container rounded-4xl p-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-bold">{t('stats.revenueChart')}</h3>
              <p className="text-sm text-on-surface-variant">{t('stats.dailyTotals')}</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {stats.dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyRevenue}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#56423d' }} dy={10} />
                  <Tooltip
                    formatter={(v: number) => [`$${v.toFixed(2)}`, t('analytics.revenue')]}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#9b3f25" strokeWidth={3} dot={false} animationDuration={1500} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-on-surface-variant/40 text-sm font-medium">
                {t('stats.noRevenueData')}
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface-container rounded-4xl p-8 flex flex-col">
          <h3 className="text-xl font-bold mb-6">{t('stats.topSellingItems')}</h3>
          {stats.topItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant/40 text-sm">{t('stats.noOrdersYet')}</div>
          ) : (
            <div className="space-y-6 flex-1">
              {stats.topItems.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold truncate pe-2">{item.name}</span>
                    <span className="text-on-surface-variant shrink-0">{t('stats.ordersCount', { count: item.orders })}</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-variant rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.orders / maxItemOrders) * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-container-low rounded-4xl p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">{t('stats.recentReviews')}</h3>
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-bold">{t('stats.overallRating', { rating: stats.averageRating })}</span>
            </div>
          </div>
          {stats.recentReviews.length === 0 ? (
            <p className="text-on-surface-variant/40 text-sm text-center py-8">{t('stats.noReviewsYet')}</p>
          ) : (
            <div className="space-y-4">
              {stats.recentReviews.map(review => (
                <div key={review._id} className="p-5 bg-surface-container-lowest rounded-2xl shadow-sm">
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-bold text-on-surface-variant">
                        {review.userName?.slice(0, 2).toUpperCase() || '?'}
                      </div>
                      <span className="font-bold text-sm">{review.userName}</span>
                    </div>
                    <div className="flex text-amber-500">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-current' : 'text-surface-variant'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant italic line-clamp-2">"{review.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-container-low rounded-4xl p-8 space-y-6">
          <h3 className="text-xl font-bold">{t('stats.quickStats')}</h3>
          <div className="space-y-4">
            {[
              { labelKey: 'stats.menuItems',         value: stats.totalMenuItems },
              { labelKey: 'stats.totalReservations', value: stats.totalReservations },
              { labelKey: 'stats.totalReviews',      value: stats.totalReviews },
            ].map(s => (
              <div key={s.labelKey} className="flex justify-between items-center p-4 bg-surface-container-lowest rounded-2xl">
                <span className="text-sm font-medium text-on-surface-variant">{t(s.labelKey)}</span>
                <span className="font-bold text-lg">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
