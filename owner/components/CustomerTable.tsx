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
  starter:    { icon: <Zap className="w-3 h-3" />,       cls: 'ds-chip-info' },
  pro:        { icon: <Star className="w-3 h-3" />,      cls: 'ds-chip-brand' },
  enterprise: { icon: <Building2 className="w-3 h-3" />, cls: 'ds-chip-neutral' },
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
    <div className="ds-backdrop">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        className="ds-modal max-w-md">

        <div className="px-6 py-4 border-b border-line">
          <h3 className="ds-section-title">{t('customers.modal.title')}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {t('customers.modal.subtitle', { name: subscriber.name })}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Plan selector */}
          <div className="space-y-2">
            <p className="ds-label">{t('customers.modal.selectPlan')}</p>
            {PLANS.map(p => {
              const style = PLAN_STYLE[p];
              return (
                <button key={p} onClick={() => setPlan(p)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl border transition-colors ${plan === p ? 'border-primary bg-acc-soft/60 ring-1 ring-primary' : 'border-line bg-card hover:bg-accent'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${style.cls}`}>
                      {style.icon}
                    </div>
                    <span className="font-semibold text-sm">{t(`plans.${p}.name`)}</span>
                  </div>
                  <span className="text-sm font-semibold tabular text-on-surface-variant">${PLAN_PRICES[p]}/mo</span>
                </button>
              );
            })}
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-between gap-3">
            <p className="ds-label mb-0">{t('customers.modal.billing')}</p>
            <div className="ds-seg">
              {(['monthly', 'annual'] as Billing[]).map(b => (
                <button key={b} onClick={() => setBilling(b)}
                  className={`ds-seg-item ${billing === b ? 'ds-seg-item-active' : ''}`}>
                  {t(`common.${b}`)}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[13px] bg-neg1 text-neg7 rounded-xl px-3.5 py-2.5">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
          <button onClick={onClose}
            className="ds-btn ds-btn-outline">
            {t('customers.modal.cancel')}
          </button>
          <button onClick={handleSave} disabled={loading}
            className="ds-btn ds-btn-primary">
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
      if (res.ok) { setSubscribers(prev => prev.filter(s => s._id !== id)); return; }
      const data = await res.json().catch(() => ({}));
      alert(data.message ?? t('customers.deleteFailed'));
    } catch {
      alert(t('customers.deleteFailed'));
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-page-title">{t('customers.heading')}</h1>
          <p className="ds-page-sub">{t('customers.subtext')}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <input type="text" placeholder={t('customers.search')} value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="ds-input h-9 ps-9" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { labelKey: 'customers.stats.total',  value: subscribers.length, icon: <Users className="w-5 h-5" />,     color: 'text-primary',      filter: 'all' },
          { labelKey: 'customers.stats.active', value: active,             icon: <UserCheck className="w-5 h-5" />, color: 'text-primary',  filter: 'active' },
          { labelKey: 'customers.stats.locked', value: locked,             icon: <UserX className="w-5 h-5" />,     color: 'text-on-surface-variant',     filter: 'locked' },
        ].map(s => (
          <button key={s.labelKey} onClick={() => setFilterStatus(s.filter as any)}
            className={`ds-card p-4 sm:p-5 flex items-center justify-between gap-3 text-start min-w-0 transition-colors ${filterStatus === s.filter ? 'border-primary ring-1 ring-primary' : 'hover:bg-surface-container-low'}`}>
            <div className="min-w-0">
              <p className="ds-metric-lbl truncate">{t(s.labelKey)}</p>
              <h4 className="ds-metric-val tabular mt-1">{s.value}</h4>
            </div>
            <div className="hidden sm:flex ds-icon-tile">{s.icon}</div>
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="ds-card p-0 overflow-hidden">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 border-b border-line last:border-0 px-4 flex items-center"><div className="h-4 w-1/2 bg-surface-container animate-pulse rounded-2xl" /></div>)}
        </div>
      ) : (
        <div className="ds-card p-0 overflow-x-auto">
          <table className="ds-table min-w-[640px]">
            <thead>
              <tr>
                {tableHeaders.map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((s, i) => {
                  const style = s.plan ? PLAN_STYLE[s.plan] : null;
                  return (
                    <motion.tr key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>

                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-acc-soft text-acc text-xs font-bold flex items-center justify-center shrink-0">
                            {s.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold">{s.name}</p>
                            <p className="text-xs text-on-surface-variant">{s.email}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        {style && s.plan ? (
                          <span className={`ds-chip ${style.cls}`}>
                            {style.icon} {t(`plans.${s.plan}.name`)}
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant">—</span>
                        )}
                      </td>

                      <td className="tabular text-on-surface-variant whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>

                      <td>
                        <span className={`ds-chip ${s.status === 'active' ? 'ds-chip-pos' : 'ds-chip-neg'}`}>
                          <span className="ds-dot" />
                          {t(`common.${s.status}`)}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center gap-1">
                          {isSuperAdmin && (
                            <button onClick={() => setChangePlanTarget(s)}
                              className="ds-btn ds-btn-ghost ds-btn-sm text-acc">
                              <ChevronDown className="w-3.5 h-3.5" /> {t('customers.actions.plan')}
                            </button>
                          )}
                          <button onClick={() => handleStatusToggle(s._id, s.status)}
                            className="ds-btn ds-btn-ghost ds-btn-sm text-on-surface-variant">
                            {s.status === 'active'
                              ? <><Lock className="w-3.5 h-3.5" /> {t('customers.actions.lock')}</>
                              : <><Unlock className="w-3.5 h-3.5" /> {t('customers.actions.unlock')}</>}
                          </button>
                          <button onClick={() => handleDelete(s._id)}
                            className="ds-btn ds-btn-ghost ds-btn-sm text-on-surface-variant hover:text-error">
                            <Trash2 className="w-3.5 h-3.5" /> {t('customers.actions.delete')}
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
            <div className="flex flex-col items-center justify-center text-center gap-2 py-14 px-6 text-on-surface-variant">
              <Users className="w-8 h-8 opacity-40" />
              <p className="text-sm">{subscribers.length === 0 ? t('customers.noSubscribers') : t('customers.noResults')}</p>
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
