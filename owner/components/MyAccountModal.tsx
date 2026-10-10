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
    <div className="ds-backdrop">
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className="ds-modal max-w-lg flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between shrink-0">
          <h3 className="ds-section-title">{t('account.title')}</h3>
          <button onClick={onClose} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 py-10 text-center text-on-surface-variant text-sm">{t('account.loading')}</div>
        ) : (
          <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-4">
            <div>
              <label className="ds-label">{t('account.fullName')}</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="ds-input" />
            </div>
            <div>
              <label className="ds-label">{t('account.emailAddress')}</label>
              <input type="email" dir="ltr" value={profile?.email ?? ''} disabled
                className="ds-input bg-surface-container-low text-on-surface-variant cursor-not-allowed" />
            </div>
            <div>
              <label className="ds-label">{t('account.phoneNumber')}</label>
              <PhoneInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="555 000 0000" />
            </div>

            <div className="pt-4 border-t border-line">
              <label className="ds-label flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> {t('account.newPassword')}
              </label>
              <input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder={t('account.newPasswordPlaceholder')}
                className="ds-input" />
            </div>

            {error && <p className="text-[13px] bg-neg1 text-neg7 rounded-xl px-3.5 py-2.5">{error}</p>}
            {saved && <p className="text-[13px] bg-pos1 text-pos7 rounded-xl px-3.5 py-2.5">{t('account.saved')}</p>}
          </form>
        )}

        <div className="px-6 py-4 border-t border-line flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="ds-btn ds-btn-outline">
            {t('common.cancel')}
          </button>
          <button onClick={handleSave as any} disabled={saving || loading}
            className="ds-btn ds-btn-primary">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('common.saving')}</>
              : <><Check className="w-4 h-4" />{t('account.save')}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
