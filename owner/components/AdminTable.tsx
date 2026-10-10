import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Search, Trash2, Plus, X, Eye, EyeOff, Pencil, ShieldCheck, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ownerFetch as authFetch } from '../../src/lib/ownerAuth';

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  title?: string;
  createdAt: string;
}

interface Props { restaurantId: string; }

const emptyForm = () => ({ name: '', email: '', password: '', role: 'admin', title: '' });

export const AdminTable = ({ restaurantId }: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await authFetch(`/api/owner/admins?restaurantId=${restaurantId}`);
      if (res.ok) setAdmins(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [restaurantId]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setFormError(''); setShowPanel(true); };
  const openEdit = (a: Admin) => {
    setEditing(a);
    setForm({ name: a.name, email: a.email, password: '', role: a.role, title: a.title ?? '' });
    setFormError('');
    setShowPanel(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const res = editing
        ? await authFetch(`/api/owner/admins/${editing._id}`, { method: 'PATCH', body: JSON.stringify(form) })
        : await authFetch('/api/owner/admins', { method: 'POST', body: JSON.stringify({ ...form, restaurantId }) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message ?? t('admins.panel.createFailed')); return; }
      setAdmins(prev => editing ? prev.map(a => a._id === data._id ? data : a) : [data, ...prev]);
      setShowPanel(false);
      setForm(emptyForm());
    } catch {
      setFormError(t('admins.panel.networkError'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admins.deleteConfirm'))) return;
    try {
      const res = await authFetch(`/api/owner/admins/${id}`, { method: 'DELETE' });
      if (res.ok) setAdmins(prev => prev.filter(a => a._id !== id));
    } catch (e) { console.error(e); }
  };

  const filtered = admins.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tableHeaders = [
    t('admins.tableHeaders.admin'),
    t('admins.tableHeaders.role'),
    t('admins.tableHeaders.created'),
    t('admins.tableHeaders.actions'),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="ds-section-title">{t('admins.heading')}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">{t('admins.subtext')}</p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <div className="relative flex-1 min-w-[160px] sm:flex-none sm:w-56">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input type="text" placeholder={t('admins.search')} value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="ds-input h-9 ps-9" />
          </div>
          <button
            onClick={openCreate}
            className="ds-btn ds-btn-primary ds-btn-sm"
          >
            <Plus className="w-4 h-4" /> {t('admins.addAdmin')}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-info1 text-info7 rounded-xl px-3.5 py-3 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-px" />
        <p className="text-xs leading-5">{t('admins.bannerText')}</p>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="ds-card p-0 overflow-hidden">
          {[1, 2].map(i => <div key={i} className="h-14 border-b border-line last:border-0 px-4 flex items-center"><div className="h-4 w-1/2 bg-surface-container animate-pulse rounded-2xl" /></div>)}
        </div>
      ) : (
        <div className="ds-card p-0 overflow-x-auto">
          <table className="ds-table min-w-[480px]">
            <thead>
              <tr>
                {tableHeaders.slice(0, 3).map(h => (
                  <th key={h}>{h}</th>
                ))}
                <th className="text-end">{tableHeaders[3]}</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((a, i) => (
                  <motion.tr key={a._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-acc-soft text-acc text-xs font-bold flex items-center justify-center shrink-0">
                          {a.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{a.name}</p>
                          <p className="text-xs text-on-surface-variant">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`ds-chip ${a.role === 'admin' ? 'ds-chip-brand' : 'ds-chip-neutral'}`}>
                        {t(`common.${a.role}`)}
                      </span>
                    </td>
                    <td className="tabular text-on-surface-variant whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(a)}
                          className="ds-btn ds-btn-ghost ds-btn-sm text-on-surface-variant">
                          <Pencil className="w-3.5 h-3.5" /> {t('common.edit')}
                        </button>
                        <button onClick={() => handleDelete(a._id)}
                          className="ds-btn ds-btn-ghost ds-btn-sm text-on-surface-variant hover:text-error">
                          <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-6 text-on-surface-variant">
              <Users className="w-8 h-8 opacity-40" />
              <p className="text-sm">{admins.length === 0 ? t('admins.noAdmins') : t('admins.noResults')}</p>
              {admins.length === 0 && (
                <button onClick={openCreate} className="ds-btn ds-btn-outline ds-btn-sm mt-2">
                  {t('admins.createFirst')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Admin slide-in panel */}
      <AnimatePresence>
        {showPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/45 z-40" onClick={() => setShowPanel(false)} />
            <motion.div
              initial={{ x: isRTL ? '-100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isRTL ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`fixed end-0 border-s top-0 h-full w-full max-w-md bg-card border-line shadow-2xl z-50 flex flex-col`}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                <h3 className="ds-section-title">{editing ? t('admins.panel.editTitle') : t('admins.panel.title')}</h3>
                <button onClick={() => setShowPanel(false)} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
                {!editing && (
                  <p className="ds-inset p-3.5 text-xs text-on-surface-variant">
                    {t('admins.panel.note')}
                  </p>
                )}

                {[
                  { labelKey: 'admins.panel.fullName',     key: 'name',  type: 'text',  placeholder: 'John Smith',             required: true },
                  { labelKey: 'admins.panel.emailAddress', key: 'email', type: 'email', placeholder: 'admin@restaurant.com',   required: true },
                  { labelKey: 'admins.panel.jobTitle',     key: 'title', type: 'text',  placeholder: 'Restaurant Manager',     required: false },
                ].map(({ labelKey, key, type, placeholder, required }) => (
                  <div key={key}>
                    <label className="ds-label">{t(labelKey)}</label>
                    <input type={type} required={required} value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="ds-input" />
                  </div>
                ))}

                <div>
                  <label className="ds-label">{t('admins.panel.role')}</label>
                  <div className="ds-seg w-full">
                    {(['admin', 'staff'] as const).map(r => (
                      <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                        className={`ds-seg-item flex-1 ${form.role === r ? 'ds-seg-item-active' : ''}`}>
                        {t(`common.${r}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="ds-label">
                    {editing ? t('admins.panel.newPasswordOptional') : t('admins.panel.password')}
                  </label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required={!editing} value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={t('admins.panel.passwordPlaceholder')}
                      className="ds-input pe-10" />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {formError && <p className="text-[13px] bg-neg1 text-neg7 rounded-xl px-3.5 py-2.5">{formError}</p>}
              </form>

              <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
                <button type="button" onClick={() => setShowPanel(false)}
                  className="ds-btn ds-btn-outline">
                  {t('admins.panel.cancel')}
                </button>
                <button onClick={handleSave as any} disabled={formLoading}
                  className="ds-btn ds-btn-primary">
                  {formLoading ? t('admins.panel.creating') : (editing ? t('admins.panel.save') : t('admins.panel.create'))}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
