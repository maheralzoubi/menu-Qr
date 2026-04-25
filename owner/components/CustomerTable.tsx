import React, { useState, useEffect, useCallback } from 'react';
import { Search, Lock, Unlock, Trash2, Users, UserCheck, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ownerFetch as authFetch } from '../../src/lib/ownerAuth';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'locked';
  restaurantId?: { _id: string; name: string } | string;
  createdAt: string;
}

export const CustomerTable = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'locked'>('all');

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await authFetch('/api/owner/customers');
      if (res.ok) setCustomers(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleStatusToggle = async (id: string, current: 'active' | 'locked') => {
    const newStatus = current === 'active' ? 'locked' : 'active';
    try {
      const res = await authFetch(`/api/owner/customers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setCustomers(prev => prev.map(c => c._id === id ? { ...c, status: newStatus } : c));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try {
      const res = await authFetch(`/api/owner/customers/${id}`, { method: 'DELETE' });
      if (res.ok) setCustomers(prev => prev.filter(c => c._id !== id));
    } catch (e) { console.error(e); }
  };

  const getRestaurantName = (r: Customer['restaurantId']): string => {
    if (!r) return '—';
    if (typeof r === 'string') return r;
    return (r as any).name ?? '—';
  };

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const active = customers.filter(c => c.status === 'active').length;
  const locked = customers.filter(c => c.status === 'locked').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">Customers</h2>
          <p className="text-on-surface-variant font-medium">All registered customers across all restaurants.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
            <input type="text" placeholder="Search name or email..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-3 pl-12 pr-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'Total', value: customers.length, icon: <Users className="w-6 h-6" />, color: 'text-primary', filter: 'all' },
          { label: 'Active', value: active, icon: <UserCheck className="w-6 h-6" />, color: 'text-emerald-600', filter: 'active' },
          { label: 'Locked', value: locked, icon: <UserX className="w-6 h-6" />, color: 'text-rose-500', filter: 'locked' },
        ].map(s => (
          <button key={s.label} onClick={() => setFilterStatus(s.filter as any)}
            className={`p-6 rounded-3xl flex items-center justify-between shadow-sm border transition-all ${filterStatus === s.filter ? 'bg-surface-container-lowest border-primary ring-2 ring-primary' : 'bg-surface-container-low border-outline-variant/10 hover:bg-surface-container-lowest'}`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">{s.label}</p>
              <h4 className="text-3xl font-headline font-extrabold">{s.value}</h4>
            </div>
            <div className={`${s.color} opacity-60`}>{s.icon}</div>
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-surface-container-low rounded-2xl" />)}
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/10">
                {['Customer', 'Restaurant', 'Joined', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left p-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((c, i) => (
                  <motion.tr key={c._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-outline-variant/5 hover:bg-surface-container-lowest transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {c.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{c.name}</p>
                          <p className="text-xs text-on-surface-variant">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-sm font-medium text-on-surface-variant">
                      {getRestaurantName(c.restaurantId)}
                    </td>
                    <td className="p-5 text-sm text-on-surface-variant">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleStatusToggle(c._id, c.status)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${c.status === 'active' ? 'hover:bg-rose-50 text-rose-500' : 'hover:bg-emerald-50 text-emerald-600'}`}>
                          {c.status === 'active' ? <><Lock className="w-3 h-3" /> Lock</> : <><Unlock className="w-3 h-3" /> Unlock</>}
                        </button>
                        <button onClick={() => handleDelete(c._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-50 text-rose-500 transition-colors">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant/40">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">{customers.length === 0 ? 'No customers yet' : 'No results found'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
