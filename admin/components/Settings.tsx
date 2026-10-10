import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Shield, User, Globe, Clock, Building2,
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
  { name: 'Terracotta', hex: '#fe5722' },
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

  const [restaurantInfo, setRestaurantInfo] = useState({ name: '', address: '', contactEmail: '', contactPhone: '', currency: 'USD' });
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');

  const [hours, setHours] = useState({ openTime: '', closeTime: '', prepTime: '', timezone: 'UTC' });
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursMsg, setHoursMsg] = useState('');
  const [selectedColor, setSelectedColor] = useState('#fe5722');
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
          setSelectedColor(data.primaryColor ?? '#fe5722');
          setLogoPreview(data.logo ?? null);
          setHours({ openTime: data.openTime ?? '', closeTime: data.closeTime ?? '', prepTime: data.prepTime ?? '', timezone: data.timezone ?? 'UTC' });
          setRestaurantInfo({ name: data.name ?? '', address: data.address ?? '', contactEmail: data.contactEmail ?? '', contactPhone: data.contactPhone ?? '', currency: data.currency ?? 'USD' });
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

  const handleSaveInfo = async () => {
    setInfoSaving(true); setInfoMsg('');
    try {
      const res = await authFetch('/api/settings/restaurant', {
        method: 'PATCH',
        body: JSON.stringify(restaurantInfo),
      });
      setInfoMsg(res.ok ? t('settings.restaurantInfo.saved') : t('settings.restaurantInfo.saveFailed'));
    } catch { setInfoMsg(t('settings.restaurantInfo.networkError')); }
    finally { setInfoSaving(false); setTimeout(() => setInfoMsg(''), 3000); }
  };

  const handleSaveHours = async () => {
    setHoursSaving(true); setHoursMsg('');
    try {
      const res = await authFetch('/api/settings/restaurant', {
        method: 'PATCH',
        body: JSON.stringify({ openTime: hours.openTime, closeTime: hours.closeTime, prepTime: hours.prepTime, timezone: hours.timezone }),
      });
      setHoursMsg(res.ok ? t('settings.hours.saved') : t('settings.hours.saveFailed'));
    } catch { setHoursMsg(t('settings.hours.networkError')); }
    finally { setHoursSaving(false); setTimeout(() => setHoursMsg(''), 3000); }
  };

  const sections = [
    { id: 'profile',       icon: User      },
    { id: 'restaurant',    icon: Building2 },
    { id: 'branding',      icon: Palette   },
    { id: 'hours',         icon: Clock     },
    { id: 'notifications', icon: Bell      },
    { id: 'security',      icon: Shield    },
    { id: 'preferences',   icon: Globe     },
  ];

  const notificationItems = [
    { key: 'newOrders',    labelKey: 'settings.notifications.newOrders',    descKey: 'settings.notifications.newOrdersDesc' },
    { key: 'reservations', labelKey: 'settings.notifications.reservations', descKey: 'settings.notifications.reservationsDesc' },
    { key: 'reviews',      labelKey: 'settings.notifications.reviews',      descKey: 'settings.notifications.reviewsDesc' },
  ];

  const msgTone = (msg: string, okKey: string) => msg === t(okKey) ? 'text-pos6' : 'text-error';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-page-title">{t('settings.heading')}</h1>
          <p className="ds-page-sub">{t('settings.subtext')}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
        <nav className="w-full lg:w-64 shrink-0 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar lg:overflow-visible lg:p-2 lg:bg-card lg:border lg:border-line lg:rounded-2xl lg:shadow-sm">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`shrink-0 lg:w-full lg:shrink flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-start ${
                activeSection === section.id
                  ? 'bg-acc-soft text-acc'
                  : 'text-on-surface-variant hover:bg-accent hover:text-on-surface'
              }`}
            >
              <section.icon className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-[13px] whitespace-nowrap lg:whitespace-normal">{t(`settings.sections.${section.id}.label`)}</p>
                <p className="hidden lg:block text-[11px] text-on-surface-variant line-clamp-1">{t(`settings.sections.${section.id}.desc`)}</p>
              </div>
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 w-full">

        {activeSection === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {!profile ? (
              <div className="space-y-4">
                <div className="h-24 bg-surface-container animate-pulse rounded-2xl" />
                <div className="h-56 bg-surface-container animate-pulse rounded-2xl" />
              </div>
            ) : (
              <>
                <section className="ds-card p-0 overflow-hidden">
                  <div className="flex items-center gap-4 px-5 py-4 border-b border-line">
                    <div className="w-14 h-14 rounded-full bg-acc-soft text-acc font-display text-xl font-bold flex items-center justify-center shrink-0">
                      {form.name?.slice(0, 1).toUpperCase() || profile.email.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="ds-section-title truncate">{form.name || profile.email}</h2>
                      <p className="text-xs text-on-surface-variant mt-0.5 truncate">{form.title || profile.role} • {profile.email}</p>
                      <span className={`ds-chip mt-1.5 capitalize ${
                        profile.role === 'admin' ? 'ds-chip-brand' : 'ds-chip-neutral'
                      }`}>{profile.role}</span>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="ds-label">{t('settings.profile.fullName')}</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder={t('settings.profile.fullNamePlaceholder')}
                        className="ds-input"
                      />
                    </div>
                    <div>
                      <label className="ds-label">{t('settings.profile.emailAddress')}</label>
                      <input
                        type="email"
                        dir="ltr"
                        value={profile.email}
                        disabled
                        className="ds-input bg-surface-container-low text-on-surface-variant cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="ds-label">{t('settings.profile.phoneNumber')}</label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+1 (555) 000-0000"
                        className="ds-input"
                      />
                    </div>
                    <div>
                      <label className="ds-label">{t('settings.profile.jobTitle')}</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder={t('settings.profile.jobTitlePlaceholder')}
                        className="ds-input"
                      />
                    </div>
                  </div>
                </section>

                <section className="ds-card ds-card-pad space-y-4">
                  <h2 className="ds-section-title flex items-center gap-2">
                    <Lock className="w-4 h-4 text-on-surface-variant" /> {t('settings.profile.changePassword')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="ds-label">{t('settings.profile.newPassword')}</label>
                      <input
                        type="password"
                        value={form.newPassword}
                        onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                        placeholder={t('settings.profile.newPasswordPlaceholder')}
                        className="ds-input"
                      />
                    </div>
                  </div>
                </section>

                <div className="ds-card px-5 py-3.5 flex flex-wrap items-center justify-end gap-2">
                  {saveMsg && (
                    <p className={`text-[13px] font-medium me-auto ${msgTone(saveMsg, 'settings.profile.saved')}`}>
                      {saveMsg}
                    </p>
                  )}
                  <button
                    onClick={() => setForm(f => ({ ...f, name: profile.name ?? '', phone: profile.phone ?? '', title: profile.title ?? '', newPassword: '' }))}
                    className="ds-btn ds-btn-outline"
                  >
                    {t('settings.profile.discard')}
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="ds-btn ds-btn-primary"
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
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <section className="ds-card p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="ds-section-title">{t('settings.notifications.heading')}</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">{t('settings.notifications.subtext')}</p>
              </div>
              <div>
                {notificationItems.map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-4 px-5 py-4 border-b border-line last:border-0">
                    <div>
                      <p className="font-semibold text-sm">{t(item.labelKey)}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{t(item.descKey)}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="relative w-9 h-5 rounded-full bg-input transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:after:start-[18px]" />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {activeSection === 'restaurant' && (
          <motion.div key="restaurant" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <section className="ds-card p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="ds-section-title">{t('settings.restaurantInfo.heading')}</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">{t('settings.restaurantInfo.subtext')}</p>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { labelKey: 'name',         key: 'name',         type: 'text'  },
                  { labelKey: 'address',      key: 'address',      type: 'text'  },
                  { labelKey: 'contactEmail', key: 'contactEmail', type: 'email' },
                  { labelKey: 'contactPhone', key: 'contactPhone', type: 'tel'   },
                ].map(({ labelKey, key, type }) => (
                  <div key={key}>
                    <label className="ds-label">{t(`settings.restaurantInfo.fields.${labelKey}`)}</label>
                    <input
                      type={type}
                      dir={type === 'tel' || type === 'email' ? 'ltr' : undefined}
                      value={(restaurantInfo as any)[key]}
                      onChange={e => setRestaurantInfo(r => ({ ...r, [key]: e.target.value }))}
                      placeholder={t(`settings.restaurantInfo.placeholders.${labelKey}`)}
                      className="ds-input"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Currency */}
            <section className="ds-card ds-card-pad space-y-4">
              <h2 className="ds-section-title">{t('settings.restaurantInfo.currency')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { code: 'USD', symbol: '$'   },
                  { code: 'JOD', symbol: 'JD'  },
                  { code: 'SAR', symbol: 'SR'  },
                  { code: 'AED', symbol: 'AED' },
                  { code: 'EUR', symbol: '€'   },
                  { code: 'GBP', symbol: '£'   },
                ].map(cur => (
                  <button key={cur.code} type="button"
                    onClick={() => setRestaurantInfo(r => ({ ...r, currency: cur.code }))}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-colors text-start ${
                      restaurantInfo.currency === cur.code
                        ? 'border-primary bg-acc-soft'
                        : 'border-line bg-card hover:bg-accent'
                    }`}>
                    <span className={`font-display font-bold text-base w-9 text-center shrink-0 ${restaurantInfo.currency === cur.code ? 'text-acc' : 'text-on-surface-variant'}`}>{cur.symbol}</span>
                    <div className="min-w-0">
                      <p className={`text-[13px] font-semibold truncate ${restaurantInfo.currency === cur.code ? 'text-acc' : 'text-on-surface'}`}>{t(`settings.restaurantInfo.currencies.${cur.code}`)}</p>
                      <p className="text-[11px] text-on-surface-variant">{cur.code}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <div className="ds-card px-5 py-3.5 flex flex-wrap items-center justify-end gap-2">
              {infoMsg && <p className={`text-[13px] font-medium me-auto ${msgTone(infoMsg, 'settings.restaurantInfo.saved')}`}>{infoMsg}</p>}
              <button onClick={handleSaveInfo} disabled={infoSaving}
                className="ds-btn ds-btn-primary">
                <Save className="w-4 h-4" />
                {infoSaving ? t('settings.restaurantInfo.saving') : t('settings.restaurantInfo.saveChanges')}
              </button>
            </div>
          </motion.div>
        )}

        {activeSection === 'branding' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Logo */}
            <section className="ds-card p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="ds-section-title">{t('settings.branding.heading')}</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">{t('settings.branding.subtext')}</p>
              </div>
              <div className="p-5 space-y-3">
                <p className="ds-label mb-0">{t('settings.branding.logoLabel')}</p>
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-surface-container-low flex items-center justify-center overflow-hidden shrink-0 border border-dashed border-input">
                    {logoPreview
                      ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                      : <ImageIcon className="w-7 h-7 text-on-surface-variant opacity-40" />
                    }
                  </div>
                  <div className="space-y-2.5 text-center sm:text-start">
                    <p className="text-[13px] text-on-surface-variant">{t('settings.branding.logoHint')}</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="ds-btn ds-btn-sm ds-btn-outline"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingLogo ? t('settings.branding.uploading') : t('settings.branding.uploadLogo')}
                      </button>
                      {logoPreview && (
                        <button onClick={() => setLogoPreview(null)} className="ds-btn ds-btn-sm ds-btn-ghost text-error">{t('settings.branding.removeLogo')}</button>
                      )}
                    </div>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
                  />
                </div>
              </div>
            </section>

            {/* Color palette */}
            <section className="ds-card ds-card-pad space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="ds-section-title">{t('settings.branding.accentColor')}</h2>
                <div className="flex items-center gap-2 text-[13px]">
                  <div className="w-4 h-4 rounded-full border border-line shrink-0" style={{ background: selectedColor }} />
                  <span className="font-mono font-semibold text-on-surface-variant">{selectedColor}</span>
                </div>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-2">
                {PALETTE.map(({ name, hex }) => (
                  <button
                    key={hex}
                    title={t(`settings.palette.${name}`, { defaultValue: name })}
                    onClick={() => setSelectedColor(hex)}
                    className={`relative rounded-xl transition-shadow ${selectedColor === hex ? 'ring-2 ring-on-surface ring-offset-2 ring-offset-card' : 'hover:ring-2 hover:ring-line hover:ring-offset-1 hover:ring-offset-card'}`}
                  >
                    <div
                      className="w-full aspect-square rounded-xl border border-black/5"
                      style={{ background: hex }}
                    />
                    {selectedColor === hex && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white drop-shadow-md" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom color input */}
              <div className="flex items-center gap-2">
                <label className="relative cursor-pointer shrink-0" title={t('settings.branding.colorPickerTitle')}>
                  <input
                    type="color"
                    value={selectedColor.match(/^#[0-9a-fA-F]{6}$/) ? selectedColor : '#fe5722'}
                    onChange={e => setSelectedColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-xl border border-input"
                    style={{ background: selectedColor }} />
                </label>
                <input
                  type="text"
                  value={selectedColor}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setSelectedColor(v);
                  }}
                  maxLength={7}
                  placeholder="#fe5722"
                  dir="ltr"
                  className="ds-input flex-1 font-mono"
                />
                <button
                  onClick={() => setSelectedColor('#fe5722')}
                  className="ds-btn ds-btn-outline shrink-0"
                  title={t('settings.branding.resetTitle')}
                >
                  {t('settings.branding.reset')}
                </button>
              </div>

              {/* Live preview */}
              <div className="ds-inset p-3.5 space-y-2.5">
                <p className="ds-overline">{t('settings.branding.preview')}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    className="h-9 px-4 rounded-xl text-white text-[13px] font-semibold"
                    style={{ background: selectedColor }}
                  >
                    {t('settings.branding.placeOrder')}
                  </button>
                  <span className="font-display font-bold tabular text-lg" style={{ color: selectedColor }}>$24.99</span>
                  <div className="ds-chip text-white" style={{ background: selectedColor }}>
                    {t('settings.branding.active')}
                  </div>
                </div>
              </div>
            </section>

            <div className="ds-card px-5 py-3.5 flex flex-wrap items-center justify-end gap-2">
              {brandingMsg && (
                <p className={`text-[13px] font-medium me-auto ${msgTone(brandingMsg, 'settings.branding.saved')}`}>
                  {brandingMsg}
                </p>
              )}
              <button
                onClick={() => { setSelectedColor(branding?.primaryColor ?? '#fe5722'); setLogoPreview(branding?.logo ?? null); }}
                className="ds-btn ds-btn-outline"
              >
                {t('settings.branding.discard')}
              </button>
              <button
                onClick={handleSaveBranding}
                disabled={brandingSaving}
                className="ds-btn ds-btn-primary"
              >
                <Save className="w-4 h-4" />
                {brandingSaving ? t('settings.branding.saving') : t('settings.branding.save')}
              </button>
            </div>
          </motion.div>
        )}

        {activeSection === 'hours' && (
          <motion.div key="hours" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <section className="ds-card p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="ds-section-title">{t('settings.hours.heading')}</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">{t('settings.hours.subtext')}</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="ds-label">{t('settings.hours.opensAt')}</label>
                    <input type="time" value={hours.openTime} onChange={e => setHours(h => ({ ...h, openTime: e.target.value }))}
                      className="ds-input tabular" />
                  </div>
                  <div>
                    <label className="ds-label">{t('settings.hours.closesAt')}</label>
                    <input type="time" value={hours.closeTime} onChange={e => setHours(h => ({ ...h, closeTime: e.target.value }))}
                      className="ds-input tabular" />
                  </div>
                </div>

                <div>
                  <label className="ds-label">{t('settings.hours.timezone')}</label>
                  <input
                    list="tz-list"
                    value={hours.timezone}
                    onChange={e => setHours(h => ({ ...h, timezone: e.target.value }))}
                    placeholder={t('settings.hours.timezonePlaceholder')}
                    className="ds-input"
                  />
                  <datalist id="tz-list">
                    {(typeof Intl !== 'undefined' && (Intl as any).supportedValuesOf
                      ? (Intl as any).supportedValuesOf('timeZone')
                      : ['UTC','Asia/Amman','Asia/Dubai','Asia/Riyadh','Asia/Kuwait','Asia/Beirut','Europe/London','Europe/Paris','America/New_York','America/Chicago','America/Los_Angeles','Asia/Tokyo','Asia/Shanghai']
                    ).map((tz: string) => <option key={tz} value={tz} />)}
                  </datalist>
                  <p className="ds-help">{t('settings.hours.timezoneHint')}<strong className="font-semibold text-on-surface">{hours.timezone}</strong></p>
                </div>

                <div>
                  <label className="ds-label">{t('settings.hours.prepTime')}</label>
                  <input type="text" value={hours.prepTime} onChange={e => setHours(h => ({ ...h, prepTime: e.target.value }))}
                    placeholder={t('settings.hours.prepTimePlaceholder')}
                    className="ds-input" />
                  <p className="ds-help">{t('settings.hours.prepTimeHint')}</p>
                </div>

                {hours.openTime && hours.closeTime && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-acc-soft text-acc rounded-xl">
                    <Clock className="w-4 h-4 shrink-0" />
                    <p className="text-[13px] font-semibold">{t('settings.hours.openStatus', { open: hours.openTime, close: hours.closeTime })}</p>
                  </div>
                )}
              </div>
            </section>

            <div className="ds-card px-5 py-3.5 flex flex-wrap items-center justify-end gap-2">
              {hoursMsg && <p className={`text-[13px] font-medium me-auto ${msgTone(hoursMsg, 'settings.hours.saved')}`}>{hoursMsg}</p>}
              <button onClick={handleSaveHours} disabled={hoursSaving}
                className="ds-btn ds-btn-primary">
                <Save className="w-4 h-4" />
                {hoursSaving ? t('settings.hours.saving') : t('settings.hours.saveHours')}
              </button>
            </div>
          </motion.div>
        )}

        {activeSection !== 'profile' && activeSection !== 'restaurant' && activeSection !== 'notifications' && activeSection !== 'branding' && activeSection !== 'hours' && (
          <div className="ds-card ds-card-pad">
            <div className="ds-empty">
              <Shield className="w-8 h-8 opacity-40" />
              <p className="text-sm font-semibold text-on-surface">{t('settings.comingSoon')}</p>
              <p className="text-[13px]">{t('settings.comingSoonMsg')}</p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
