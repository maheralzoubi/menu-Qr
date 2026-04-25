import React, { useState, useEffect } from 'react';
import { Users, ShoppingBag, DollarSign, TrendingUp, UserPlus, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion } from 'motion/react';
import { authFetch } from '../../src/lib/auth';

interface Analytics {
  totalCustomers: number;
  activeCustomers: number;
  lockedCustomers: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  totalOrders: number;
  totalRevenue: number;
  customersPerDay: { name: string; value: number }[];
}

export const PlatformAnalytics = () => {
  const [data, setData] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/superadmin/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 w-80 bg-surface-container-low rounded-2xl" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-surface-container-low rounded-4xl" />)}
        </div>
        <div className="h-72 bg-surface-container-low rounded-4xl" />
      </div>
    );
  }

  const kpis = [
    { label: 'Total Customers', value: data?.totalCustomers ?? 0, icon: <Users className="w-6 h-6" />, color: 'text-primary' },
    { label: 'New This Month', value: data?.newThisMonth ?? 0, icon: <UserPlus className="w-6 h-6" />, color: 'text-emerald-600' },
    { label: 'Total Orders', value: data?.totalOrders ?? 0, icon: <ShoppingBag className="w-6 h-6" />, color: 'text-amber-600' },
    { label: 'Total Revenue', value: `$${(data?.totalRevenue ?? 0).toFixed(2)}`, icon: <DollarSign className="w-6 h-6" />, color: 'text-primary' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-4xl font-headline font-extrabold tracking-tight">Platform Analytics</h2>
        <p className="text-on-surface-variant font-medium">Real-time app-wide performance metrics.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-surface-container-low p-6 rounded-4xl border border-outline-variant/10 shadow-sm">
            <div className={`${k.color} mb-4`}>{k.icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{k.label}</p>
            <h4 className="text-2xl font-headline font-extrabold mt-1">{k.value}</h4>
          </motion.div>
        ))}
      </div>

      {/* Customer registrations chart */}
      <div className="bg-surface-container-low p-8 rounded-4xl border border-outline-variant/10 shadow-sm">
        <h3 className="text-xl font-headline font-extrabold mb-8">New Customer Registrations — Last 7 Days</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.customersPerDay ?? []}>
              <defs>
                <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9b3f25" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9b3f25" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'rgba(0,0,0,0.4)' }} dy={10} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'rgba(0,0,0,0.4)' }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="value" stroke="#9b3f25" strokeWidth={3} fillOpacity={1} fill="url(#custGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'New Today', value: data?.newToday ?? 0, icon: <Calendar className="w-5 h-5" />, sub: 'registrations' },
          { label: 'New This Week', value: data?.newThisWeek ?? 0, icon: <TrendingUp className="w-5 h-5" />, sub: 'registrations' },
          { label: 'Locked Accounts', value: data?.lockedCustomers ?? 0, icon: <Users className="w-5 h-5" />, sub: 'accounts' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">{s.icon}</div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{s.label}</p>
              <p className="text-2xl font-headline font-extrabold">{s.value} <span className="text-sm font-normal text-on-surface-variant">{s.sub}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
