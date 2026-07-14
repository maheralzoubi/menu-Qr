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
    <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-headline font-extrabold">{t('admins.heading')}</h3>
          <p className="text-on-surface-variant text-sm mt-0.5">{t('admins.subtext')}</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
            <input type="text" placeholder={t('admins.search')} value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-2.5 ps-12 pe-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 btn-gradient text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> {t('admins.addAdmin')}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-on-surface-variant">{t('admins.bannerText')}</p>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map(i => <div key={i} className="h-14 bg-surface-container rounded-2xl" />)}
        </div>
      ) : (
        <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/10">
                {tableHeaders.slice(0, 3).map(h => (
                  <th key={h} className="text-start p-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{h}</th>
                ))}
                <th className="text-end p-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{tableHeaders[3]}</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((a, i) => (
                  <motion.tr key={a._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-outline-variant/5 hover:bg-surface-container-lowest transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {a.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{a.name}</p>
                          <p className="text-xs text-on-surface-variant">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${a.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-[#303942]/20 text-on-surface-variant'}`}>
                        {t(`common.${a.role}`)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-on-surface-variant">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(a)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-surface-container-high text-on-surface-variant transition-colors">
                          <Pencil className="w-3 h-3" /> {t('common.edit')}
                        </button>
                        <button onClick={() => handleDelete(a._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-surface-container-high text-on-surface-variant transition-colors">
                          <Trash2 className="w-3 h-3" /> {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant/40">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-bold text-sm">{admins.length === 0 ? t('admins.noAdmins') : t('admins.noResults')}</p>
              {admins.length === 0 && (
                <button onClick={openCreate} className="mt-3 text-primary font-bold text-sm hover:underline">
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
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setShowPanel(false)} />
            <motion.div
              initial={{ x: isRTL ? '-100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isRTL ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`fixed ${isRTL ? 'left-0' : 'right-0'} top-0 h-full w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col`}>
              <div className="flex items-center justify-between px-8 py-6 border-b border-surface-container">
                <h3 className="text-xl font-headline font-extrabold">{editing ? t('admins.panel.editTitle') : t('admins.panel.title')}</h3>
                <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                {!editing && (
                  <p className="text-xs text-on-surface-variant bg-surface-container-low p-4 rounded-2xl">
                    {t('admins.panel.note')}
                  </p>
                )}

                {[
                  { labelKey: 'admins.panel.fullName',     key: 'name',  type: 'text',  placeholder: 'John Smith',             required: true },
                  { labelKey: 'admins.panel.emailAddress', key: 'email', type: 'email', placeholder: 'admin@restaurant.com',   required: true },
                  { labelKey: 'admins.panel.jobTitle',     key: 'title', type: 'text',  placeholder: 'Restaurant Manager',     required: false },
                ].map(({ labelKey, key, type, placeholder, required }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t(labelKey)}</label>
                    <input type={type} required={required} value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                ))}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('admins.panel.role')}</label>
                  <div className="flex gap-3">
                    {(['admin', 'staff'] as const).map(r => (
                      <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                        className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${form.role === r ? 'btn-gradient text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}>
                        {t(`common.${r}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {editing ? t('admins.panel.newPasswordOptional') : t('admins.panel.password')}
                  </label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required={!editing} value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={t('admins.panel.passwordPlaceholder')}
                      className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 pe-12 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute end-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {formError && <p className="text-sm text-on-surface-variant font-medium">{formError}</p>}
              </form>

              <div className="px-8 py-6 border-t border-surface-container flex gap-3">
                <button type="button" onClick={() => setShowPanel(false)}
                  className="flex-1 py-4 rounded-2xl bg-surface-container-high font-bold text-sm hover:bg-surface-variant transition-all">
                  {t('admins.panel.cancel')}
                </button>
                <button onClick={handleSave as any} disabled={formLoading}
                  className="flex-1 py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 disabled:opacity-60 transition-all">
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
