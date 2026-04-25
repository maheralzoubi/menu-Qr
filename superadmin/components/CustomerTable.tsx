import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Search, Lock, Unlock, Trash2, Users, UserCheck, UserX, Plus, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authFetch } from '../../src/lib/auth';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'locked';
  createdAt: string;
  orderCount: number;
}

const emptyForm = () => ({ name: '', email: '', password: '', phone: '' });

export const CustomerTable = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'locked'>('all');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await authFetch('/api/superadmin/customers');
      if (res.ok) setCustomers(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const res = await authFetch('/api/superadmin/customers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message ?? 'Failed to create customer'); return; }
      setCustomers(prev => [{ ...data, orderCount: 0 }, ...prev]);
      setShowAddPanel(false);
      setForm(emptyForm());
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusToggle = async (id: string, current: 'active' | 'locked') => {
    const newStatus = current === 'active' ? 'locked' : 'active';
    try {
      const res = await authFetch(`/api/superadmin/customers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setCustomers(prev => prev.map(c => c._id === id ? { ...c, status: newStatus } : c));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    try {
      const res = await authFetch(`/api/superadmin/customers/${id}`, { method: 'DELETE' });
      if (res.ok) setCustomers(prev => prev.filter(c => c._id !== id));
    } catch (e) { console.error(e); }
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">Customers</h2>
          <p className="text-on-surface-variant font-medium">Manage all registered customer accounts.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
            <input type="text" placeholder="Search name or email..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-3 pl-12 pr-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
          </div>
          <button
            onClick={() => { setShowAddPanel(true); setFormError(''); setForm(emptyForm()); }}
            className="flex items-center gap-2 btn-gradient text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
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
                <th className="text-left p-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Customer</th>
                <th className="text-left p-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Joined</th>
                <th className="text-left p-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Orders</th>
                <th className="text-left p-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Status</th>
                <th className="text-right p-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Actions</th>
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
                          {c.phone && <p className="text-xs text-on-surface-variant/60">{c.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-sm text-on-surface-variant">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="p-5 text-sm font-bold">{c.orderCount}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStatusToggle(c._id, c.status)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${c.status === 'active' ? 'hover:bg-rose-50 text-rose-500' : 'hover:bg-emerald-50 text-emerald-600'}`}
                          title={c.status === 'active' ? 'Lock account' : 'Unlock account'}
                        >
                          {c.status === 'active'
                            ? <><Lock className="w-3 h-3" /> Lock</>
                            : <><Unlock className="w-3 h-3" /> Unlock</>
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(c._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-50 text-rose-500 transition-colors"
                        >
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
              {customers.length === 0 && (
                <button onClick={() => setShowAddPanel(true)} className="mt-4 text-primary font-bold text-sm hover:underline">
                  Add your first customer
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Customer slide-in panel */}
      <AnimatePresence>
        {showAddPanel && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowAddPanel(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-surface-container">
                <h3 className="text-xl font-headline font-extrabold">Add Customer</h3>
                <button onClick={() => setShowAddPanel(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe', required: true },
                  { label: 'Email Address', key: 'email', type: 'email', placeholder: 'john@example.com', required: true },
                  { label: 'Phone (optional)', key: 'phone', type: 'tel', placeholder: '+1 555 000 0000', required: false },
                ].map(({ label, key, type, placeholder, required }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</label>
                    <input
                      type={type}
                      required={required}
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ))}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min 6 characters"
                      className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {formError && <p className="text-sm text-rose-500 font-medium">{formError}</p>}
              </form>

              <div className="px-8 py-6 border-t border-surface-container flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddPanel(false)}
                  className="flex-1 py-4 rounded-2xl bg-surface-container-high font-bold text-sm hover:bg-surface-variant transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate as any}
                  disabled={formLoading}
                  className="flex-1 py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 disabled:opacity-60 transition-all"
                >
                  {formLoading ? 'Creating...' : 'Create Customer'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
