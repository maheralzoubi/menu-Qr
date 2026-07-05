import React, { useState, useEffect, useCallback } from 'react';
import { Search, Lock, Unlock, Trash2, Users, UserCheck, UserX, Zap, Star, Building2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ownerFetch as authFetch } from '../../src/lib/ownerAuth';

// ── Types ──────────────────────────────────────────────────────────────────────
type PlanId = 'starter' | 'pro' | 'enterprise';
type Billing = 'monthly' | 'annual';

interface Subscriber {
  _id: string;
  name: string;
  email: string;
  plan?: PlanId;
  planBilling?: Billing;
  planActivatedAt?: string;
  status: 'active' | 'locked';
  createdAt: string;
}

interface Props { isSuperAdmin: boolean; }

// ── Plan icon & style meta (labels from i18n) ──────────────────────────────────
const PLAN_STYLE: Record<PlanId, { icon: React.ReactNode; cls: string }> = {
  starter:    { icon: <Zap className="w-3 h-3" />,       cls: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
  pro:        { icon: <Star className="w-3 h-3" />,      cls: 'bg-primary/10 text-primary border-primary/20' },
  enterprise: { icon: <Building2 className="w-3 h-3" />, cls: 'bg-on-surface/10 text-on-surface border-outline-variant' },
};

const PLAN_PRICES: Record<PlanId, number> = { starter: 29, pro: 79, enterprise: 199 };
const PLANS: PlanId[] = ['starter', 'pro', 'enterprise'];

// ── Change Plan Modal ──────────────────────────────────────────────────────────
const ChangePlanModal = ({
  subscriber, onClose, onUpdated,
}: { subscriber: Subscriber; onClose: () => void; onUpdated: (s: Subscriber) => void }) => {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<PlanId>(subscriber.plan ?? 'starter');
  const [billing, setBilling] = useState<Billing>(subscriber.planBilling ?? 'monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await authFetch(`/api/owner/customers/${subscriber._id}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed to update plan.'); return; }
      onUpdated(data);
      onClose();
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-surface rounded-3xl p-7 w-full max-w-md shadow-2xl border border-outline-variant">

        <h3 className="text-xl font-extrabold font-headline mb-1">{t('customers.modal.title')}</h3>
        <p className="text-sm text-on-surface-variant mb-6">
          {t('customers.modal.subtitle', { name: subscriber.name })}
        </p>

        {/* Plan selector */}
        <div className="space-y-2 mb-5">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">{t('customers.modal.selectPlan')}</p>
          {PLANS.map(p => {
            const style = PLAN_STYLE[p];
            return (
              <button key={p} onClick={() => setPlan(p)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all ${plan === p ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-outline-variant hover:border-outline hover:bg-surface-container-low'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${style.cls}`}>
                    {style.icon}
                  </div>
                  <span className="font-semibold text-sm">{t(`plans.${p}.name`)}</span>
                </div>
                <span className="text-sm font-bold text-on-surface-variant">${PLAN_PRICES[p]}/mo</span>
              </button>
            );
          })}
        </div>

        {/* Billing toggle */}
        <div className="flex items-center gap-2 mb-6">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t('customers.modal.billing')}</p>
          <div className="flex bg-surface-container-low border border-outline-variant p-0.5 rounded-xl gap-0.5">
            {(['monthly', 'annual'] as Billing[]).map(b => (
              <button key={b} onClick={() => setBilling(b)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${billing === b ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                {t(`common.${b}`)}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-outline-variant text-sm font-semibold hover:bg-surface-container transition-all">
            {t('customers.modal.cancel')}
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 btn-gradient text-white py-3 rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('customers.modal.saving')}</>
              : t('customers.modal.save')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const CustomerTable = ({ isSuperAdmin }: Props) => {
  const { t } = useTranslation();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'locked'>('all');
  const [changePlanTarget, setChangePlanTarget] = useState<Subscriber | null>(null);

  const fetchSubscribers = useCallback(async () => {
    try {
      const res = await authFetch('/api/owner/customers');
      if (res.ok) setSubscribers(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  const handleStatusToggle = async (id: string, current: 'active' | 'locked') => {
    const newStatus = current === 'active' ? 'locked' : 'active';
    try {
      const res = await authFetch(`/api/owner/customers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      if (res.ok) setSubscribers(prev => prev.map(s => s._id === id ? { ...s, status: newStatus } : s));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('customers.deleteConfirm'))) return;
    try {
      const res = await authFetch(`/api/owner/customers/${id}`, { method: 'DELETE' });
      if (res.ok) setSubscribers(prev => prev.filter(s => s._id !== id));
    } catch (e) { console.error(e); }
  };

  const handlePlanUpdated = (updated: Subscriber) => {
    setSubscribers(prev => prev.map(s => s._id === updated._id ? { ...s, ...updated } : s));
  };

  const filtered = subscribers.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const active = subscribers.filter(s => s.status === 'active').length;
  const locked = subscribers.filter(s => s.status === 'locked').length;

  const tableHeaders = [
    t('customers.tableHeaders.subscriber'),
    t('customers.tableHeaders.plan'),
    t('customers.tableHeaders.joined'),
    t('customers.tableHeaders.status'),
    t('customers.tableHeaders.actions'),
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('customers.heading')}</h2>
          <p className="text-on-surface-variant font-medium">{t('customers.subtext')}</p>
        </div>
        <div className="relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
          <input type="text" placeholder={t('customers.search')} value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-surface-container-high border-none rounded-xl py-3 ps-12 pe-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none w-72" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { labelKey: 'customers.stats.total',  value: subscribers.length, icon: <Users className="w-6 h-6" />,     color: 'text-primary',      filter: 'all' },
          { labelKey: 'customers.stats.active', value: active,             icon: <UserCheck className="w-6 h-6" />, color: 'text-primary',  filter: 'active' },
          { labelKey: 'customers.stats.locked', value: locked,             icon: <UserX className="w-6 h-6" />,     color: 'text-on-surface-variant',     filter: 'locked' },
        ].map(s => (
          <button key={s.labelKey} onClick={() => setFilterStatus(s.filter as any)}
            className={`p-6 rounded-3xl flex items-center justify-between shadow-sm border transition-all ${filterStatus === s.filter ? 'bg-surface-container-lowest border-primary ring-2 ring-primary' : 'bg-surface-container-low border-outline-variant/10 hover:bg-surface-container-lowest'}`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">{t(s.labelKey)}</p>
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
                {tableHeaders.map(h => (
                  <th key={h} className="text-start p-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((s, i) => {
                  const style = s.plan ? PLAN_STYLE[s.plan] : null;
                  return (
                    <motion.tr key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-outline-variant/5 hover:bg-surface-container-lowest transition-colors">

                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {s.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{s.name}</p>
                            <p className="text-xs text-on-surface-variant">{s.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-5">
                        {style && s.plan ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${style.cls}`}>
                            {style.icon} {t(`plans.${s.plan}.name`)}
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant/40">—</span>
                        )}
                      </td>

                      <td className="p-5 text-sm text-on-surface-variant">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>

                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${s.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          {t(`common.${s.status}`)}
                        </span>
                      </td>

                      <td className="p-5">
                        <div className="flex items-center gap-1">
                          {isSuperAdmin && (
                            <button onClick={() => setChangePlanTarget(s)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors">
                              <ChevronDown className="w-3 h-3" /> {t('customers.actions.plan')}
                            </button>
                          )}
                          <button onClick={() => handleStatusToggle(s._id, s.status)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${s.status === 'active' ? 'hover:bg-surface-container-high text-on-surface-variant' : 'hover:bg-primary/10 text-primary'}`}>
                            {s.status === 'active'
                              ? <><Lock className="w-3 h-3" /> {t('customers.actions.lock')}</>
                              : <><Unlock className="w-3 h-3" /> {t('customers.actions.unlock')}</>}
                          </button>
                          <button onClick={() => handleDelete(s._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-surface-container-high text-on-surface-variant transition-colors">
                            <Trash2 className="w-3 h-3" /> {t('customers.actions.delete')}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant/40">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">{subscribers.length === 0 ? t('customers.noSubscribers') : t('customers.noResults')}</p>
            </div>
          )}
        </div>
      )}

      {/* Change Plan Modal */}
      <AnimatePresence>
        {changePlanTarget && (
          <ChangePlanModal
            subscriber={changePlanTarget}
            onClose={() => setChangePlanTarget(null)}
            onUpdated={handlePlanUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
