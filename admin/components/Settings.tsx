import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Shield, User, Globe,
  Save, Lock, Palette, Upload, CheckCircle2, Image as ImageIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { authFetch, getToken } from '../../src/lib/auth';

interface UserProfile {
  _id: string;
  email: string;
  role: string;
  name?: string;
  phone?: string;
  title?: string;
  avatar?: string;
}

const PALETTE = [
  { name: 'Crimson',    hex: '#dc2626' },
  { name: 'Rose',       hex: '#e11d48' },
  { name: 'Pink',       hex: '#db2777' },
  { name: 'Fuchsia',    hex: '#c026d3' },
  { name: 'Purple',     hex: '#9333ea' },
  { name: 'Violet',     hex: '#7c3aed' },
  { name: 'Indigo',     hex: '#4f46e5' },
  { name: 'Blue',       hex: '#2563eb' },
  { name: 'Sky',        hex: '#0284c7' },
  { name: 'Cyan',       hex: '#0891b2' },
  { name: 'Teal',       hex: '#0d9488' },
  { name: 'Emerald',    hex: '#059669' },
  { name: 'Green',      hex: '#16a34a' },
  { name: 'Lime',       hex: '#65a30d' },
  { name: 'Yellow',     hex: '#ca8a04' },
  { name: 'Amber',      hex: '#d97706' },
  { name: 'Orange',     hex: '#ea580c' },
  { name: 'Terracotta', hex: '#9b3f25' },
  { name: 'Sienna',     hex: '#92400e' },
  { name: 'Bronze',     hex: '#78350f' },
  { name: 'Stone',      hex: '#57534e' },
  { name: 'Slate',      hex: '#475569' },
  { name: 'Charcoal',   hex: '#374151' },
  { name: 'Noir',       hex: '#111827' },
];

export const Settings = () => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', title: '', currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [branding, setBranding] = useState<{ logo?: string; primaryColor: string } | null>(null);
  const [selectedColor, setSelectedColor] = useState('#9b3f25');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [meRes, brandRes] = await Promise.all([
          authFetch('/api/auth/me'),
          authFetch('/api/settings/restaurant'),
        ]);
        if (meRes.ok) {
          const data: UserProfile = await meRes.json();
          setProfile(data);
          setForm(f => ({ ...f, name: data.name ?? '', phone: data.phone ?? '', title: data.title ?? '' }));
        }
        if (brandRes.ok) {
          const data = await brandRes.json();
          setBranding(data);
          setSelectedColor(data.primaryColor ?? '#9b3f25');
          setLogoPreview(data.logo ?? null);
        }
      } catch (e) {
        console.error('Failed to fetch settings:', e);
      }
    };
    fetchAll();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const body: Record<string, string> = { name: form.name, phone: form.phone, title: form.title };
      if (form.newPassword) body.password = form.newPassword;
      const res = await authFetch('/api/auth/me', { method: 'PATCH', body: JSON.stringify(body) });
      if (res.ok) {
        const updated: UserProfile = await res.json();
        setProfile(updated);
        setSaveMsg(t('settings.profile.saved'));
        setForm(f => ({ ...f, currentPassword: '', newPassword: '' }));
      } else {
        setSaveMsg(t('settings.profile.saveFailed'));
      }
    } catch {
      setSaveMsg(t('settings.profile.networkError'));
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (res.ok) {
        const { url } = await res.json();
        setLogoPreview(url);
      }
    } catch (e) {
      console.error('Logo upload failed:', e);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveBranding = async () => {
    setBrandingSaving(true);
    setBrandingMsg('');
    try {
      const body: Record<string, string> = { primaryColor: selectedColor };
      if (logoPreview) body.logo = logoPreview;
      const res = await authFetch('/api/settings/restaurant', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setBranding(updated);
        setBrandingMsg(t('settings.branding.saved'));
      } else {
        setBrandingMsg(t('settings.branding.saveFailed'));
      }
    } catch {
      setBrandingMsg(t('settings.branding.networkError'));
    } finally {
      setBrandingSaving(false);
      setTimeout(() => setBrandingMsg(''), 3000);
    }
  };

  const sections = [
    { id: 'profile',       icon: User    },
    { id: 'branding',      icon: Palette },
    { id: 'notifications', icon: Bell    },
    { id: 'security',      icon: Shield  },
    { id: 'preferences',   icon: Globe   },
  ];

  const notificationItems = [
    { key: 'newOrders',    labelKey: 'settings.notifications.newOrders',    descKey: 'settings.notifications.newOrdersDesc' },
    { key: 'reservations', labelKey: 'settings.notifications.reservations', descKey: 'settings.notifications.reservationsDesc' },
    { key: 'reviews',      labelKey: 'settings.notifications.reviews',      descKey: 'settings.notifications.reviewsDesc' },
  ];

  return (
    <div className="flex h-full gap-10">
      <div className="w-80 shrink-0 space-y-10">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('settings.heading')}</h2>
          <p className="text-on-surface-variant font-medium">{t('settings.subtext')}</p>
        </div>
        <nav className="space-y-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-start ${
                activeSection === section.id
                  ? 'bg-surface-container-high shadow-sm ring-1 ring-outline-variant/10'
                  : 'hover:bg-surface-container-low opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activeSection === section.id ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
              }`}>
                <section.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">{t(`settings.sections.${section.id}.label`)}</p>
                <p className="text-[10px] text-on-surface-variant line-clamp-1">{t(`settings.sections.${section.id}.desc`)}</p>
              </div>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 bg-surface-container-low rounded-4xl p-10 border border-outline-variant/10 shadow-sm overflow-y-auto no-scrollbar">

        {activeSection === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
            {!profile ? (
              <div className="animate-pulse space-y-6">
                <div className="h-32 w-32 rounded-4xl bg-surface-container-high" />
                <div className="grid grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-2xl bg-surface-container-high" />)}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
                    {form.name?.slice(0, 1).toUpperCase() || profile.email.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-headline font-extrabold">{form.name || profile.email}</h3>
                    <p className="text-on-surface-variant font-medium">{form.title || profile.role} • {profile.email}</p>
                    <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      profile.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant'
                    }`}>{profile.role}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ms-4">{t('settings.profile.fullName')}</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={t('settings.profile.fullNamePlaceholder')}
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ms-4">{t('settings.profile.emailAddress')}</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-6 text-sm font-medium text-on-surface-variant/50 cursor-not-allowed shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ms-4">{t('settings.profile.phoneNumber')}</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ms-4">{t('settings.profile.jobTitle')}</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder={t('settings.profile.jobTitlePlaceholder')}
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-outline-variant/10">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-6 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> {t('settings.profile.changePassword')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ms-4">{t('settings.profile.newPassword')}</label>
                      <input
                        type="password"
                        value={form.newPassword}
                        onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                        placeholder={t('settings.profile.newPasswordPlaceholder')}
                        className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {saveMsg && (
                  <p className={`text-sm font-bold text-center ${saveMsg === t('settings.profile.saved') ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {saveMsg}
                  </p>
                )}

                <div className="pt-4 flex justify-end gap-4">
                  <button
                    onClick={() => setForm(f => ({ ...f, name: profile.name ?? '', phone: profile.phone ?? '', title: profile.title ?? '', newPassword: '' }))}
                    className="px-8 py-4 rounded-2xl bg-surface-container-high font-bold text-sm hover:bg-surface-variant transition-all"
                  >
                    {t('settings.profile.discard')}
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-8 py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? t('settings.profile.saving') : t('settings.profile.save')}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeSection === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
            <div>
              <h3 className="text-2xl font-headline font-extrabold mb-2">{t('settings.notifications.heading')}</h3>
              <p className="text-on-surface-variant font-medium">{t('settings.notifications.subtext')}</p>
            </div>
            <div className="space-y-4">
              {notificationItems.map(item => (
                <div key={item.key} className="flex items-center justify-between p-6 bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/5">
                  <div>
                    <p className="font-bold text-sm">{t(item.labelKey)}</p>
                    <p className="text-xs text-on-surface-variant">{t(item.descKey)}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-14 h-8 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:start-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSection === 'branding' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <div>
              <h3 className="text-2xl font-headline font-extrabold mb-1">{t('settings.branding.heading')}</h3>
              <p className="text-on-surface-variant font-medium">{t('settings.branding.subtext')}</p>
            </div>

            {/* Logo */}
            <section className="space-y-5">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('settings.branding.logoLabel')}</h4>
              <div className="flex items-center gap-6">
                <div className="w-28 h-28 rounded-3xl bg-surface-container-highest flex items-center justify-center overflow-hidden shrink-0 border-2 border-dashed border-outline-variant/40">
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-8 h-8 text-on-surface-variant/30" />
                  }
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-on-surface-variant">{t('settings.branding.logoHint')}</p>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest rounded-xl font-bold text-sm hover:bg-surface-variant disabled:opacity-50 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingLogo ? t('settings.branding.uploading') : t('settings.branding.uploadLogo')}
                  </button>
                  {logoPreview && (
                    <button onClick={() => setLogoPreview(null)} className="text-xs font-bold text-error hover:underline">{t('settings.branding.removeLogo')}</button>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
                />
              </div>
            </section>

            {/* Color palette */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('settings.branding.accentColor')}</h4>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full border border-outline-variant/30 shrink-0" style={{ background: selectedColor }} />
                  <span className="font-mono font-bold text-on-surface-variant">{selectedColor}</span>
                </div>
              </div>

              <div className="grid grid-cols-8 gap-3">
                {PALETTE.map(({ name, hex }) => (
                  <button
                    key={hex}
                    title={t(`settings.palette.${name}`, { defaultValue: name })}
                    onClick={() => setSelectedColor(hex)}
                    className="relative group"
                  >
                    <div
                      className="w-full aspect-square rounded-2xl transition-transform group-hover:scale-110 group-active:scale-95 shadow-sm"
                      style={{ background: hex }}
                    />
                    {selectedColor === hex && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white drop-shadow-md" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Live preview */}
              <div className="mt-4 p-5 rounded-3xl border border-outline-variant/20 bg-surface-container-lowest space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('settings.branding.preview')}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    className="px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg"
                    style={{ background: selectedColor }}
                  >
                    {t('settings.branding.placeOrder')}
                  </button>
                  <span className="font-bold text-lg" style={{ color: selectedColor }}>$24.99</span>
                  <div className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: selectedColor }}>
                    {t('settings.branding.active')}
                  </div>
                </div>
              </div>
            </section>

            {brandingMsg && (
              <p className={`text-sm font-bold ${brandingMsg === t('settings.branding.saved') ? 'text-emerald-600' : 'text-rose-500'}`}>
                {brandingMsg}
              </p>
            )}

            <div className="flex justify-end gap-4">
              <button
                onClick={() => { setSelectedColor(branding?.primaryColor ?? '#9b3f25'); setLogoPreview(branding?.logo ?? null); }}
                className="px-8 py-4 rounded-2xl bg-surface-container-high font-bold text-sm hover:bg-surface-variant transition-all"
              >
                {t('settings.branding.discard')}
              </button>
              <button
                onClick={handleSaveBranding}
                disabled={brandingSaving}
                className="px-8 py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {brandingSaving ? t('settings.branding.saving') : t('settings.branding.save')}
              </button>
            </div>
          </motion.div>
        )}

        {activeSection !== 'profile' && activeSection !== 'notifications' && activeSection !== 'branding' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-40">
            <Shield className="w-16 h-16 mb-4" />
            <p className="font-bold">{t('settings.comingSoon')}</p>
            <p className="text-sm">{t('settings.comingSoonMsg')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
