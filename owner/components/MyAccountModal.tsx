import { useState, useEffect, FormEvent } from 'react';
import { X, Check, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ownerFetch as authFetch } from '../../src/lib/ownerAuth';
import { PhoneInput } from './PhoneInput';

interface Profile {
  _id: string;
  email: string;
  role: string;
  name?: string;
  phone?: string;
}

interface Props { onClose: () => void; }

export const MyAccountModal = ({ onClose }: Props) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', newPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const data: Profile = await res.json();
          setProfile(data);
          setForm(f => ({ ...f, name: data.name ?? '', phone: data.phone ?? '' }));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const body: Record<string, string> = { name: form.name, phone: form.phone };
      if (form.newPassword) body.password = form.newPassword;
      const res = await authFetch('/api/auth/me', { method: 'PATCH', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? t('account.saveFailed')); return; }
      setProfile(data);
      setForm(f => ({ ...f, newPassword: '' }));
      setSaved(true);
    } catch {
      setError(t('account.networkError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="bg-surface rounded-3xl border border-surface-container w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-container shrink-0">
          <h3 className="font-extrabold text-lg">{t('account.title')}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-on-surface-variant text-sm">{t('account.loading')}</div>
        ) : (
          <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('account.fullName')}</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('account.emailAddress')}</label>
              <input type="email" dir="ltr" value={profile?.email ?? ''} disabled
                className="w-full bg-surface-container-high border-none rounded-2xl px-5 py-4 text-sm text-on-surface-variant/60 cursor-not-allowed" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('account.phoneNumber')}</label>
              <PhoneInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="555 000 0000" />
            </div>

            <div className="pt-3 border-t border-surface-container">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3 h-3" /> {t('account.newPassword')}
              </label>
              <input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder={t('account.newPasswordPlaceholder')}
                className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            {error && <p className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3">{error}</p>}
            {saved && <p className="text-sm text-primary bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">{t('account.saved')}</p>}
          </form>
        )}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-container shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold hover:bg-surface-container transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={handleSave as any} disabled={saving || loading}
            className="px-5 py-2.5 rounded-xl btn-gradient text-white text-sm font-bold hover:opacity-95 transition-all disabled:opacity-60 flex items-center gap-2">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('common.saving')}</>
              : <><Check className="w-4 h-4" />{t('account.save')}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
