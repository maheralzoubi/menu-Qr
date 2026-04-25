import React, { useState, useEffect } from 'react';
import {
  Bell, Shield, User, Globe, ChevronRight,
  Save, Smartphone, Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { authFetch } from '../../src/lib/auth';

interface UserProfile {
  _id: string;
  email: string;
  role: string;
  name?: string;
  phone?: string;
  title?: string;
  avatar?: string;
}

export const Settings = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', title: '', currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const data: UserProfile = await res.json();
          setProfile(data);
          setForm(f => ({ ...f, name: data.name ?? '', phone: data.phone ?? '', title: data.title ?? '' }));
        }
      } catch (e) {
        console.error('Failed to fetch profile:', e);
      }
    };
    fetchProfile();
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
        setSaveMsg('Profile saved!');
        setForm(f => ({ ...f, currentPassword: '', newPassword: '' }));
      } else {
        setSaveMsg('Failed to save. Please try again.');
      }
    } catch {
      setSaveMsg('Network error.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile Settings', icon: User, description: 'Manage your personal information.' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Configure alerts and updates.' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Password and account security.' },
    { id: 'preferences', label: 'Preferences', icon: Globe, description: 'Language and display settings.' },
  ];

  return (
    <div className="flex h-full gap-10">
      <div className="w-80 shrink-0 space-y-10">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">Settings</h2>
          <p className="text-on-surface-variant font-medium">Configure your workspace preferences.</p>
        </div>
        <nav className="space-y-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left ${
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
                <p className="font-bold text-sm">{section.label}</p>
                <p className="text-[10px] text-on-surface-variant line-clamp-1">{section.description}</p>
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ml-4">Full Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your full name"
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ml-4">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-6 text-sm font-medium text-on-surface-variant/50 cursor-not-allowed shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ml-4">Phone Number</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ml-4">Job Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g., Executive Manager"
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-outline-variant/10">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-6 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Change Password
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ml-4">New Password</label>
                      <input
                        type="password"
                        value={form.newPassword}
                        onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                        placeholder="Leave blank to keep current"
                        className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {saveMsg && (
                  <p className={`text-sm font-bold text-center ${saveMsg.includes('saved') ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {saveMsg}
                  </p>
                )}

                <div className="pt-4 flex justify-end gap-4">
                  <button
                    onClick={() => setForm(f => ({ ...f, name: profile.name ?? '', phone: profile.phone ?? '', title: profile.title ?? '', newPassword: '' }))}
                    className="px-8 py-4 rounded-2xl bg-surface-container-high font-bold text-sm hover:bg-surface-variant transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-8 py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeSection === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
            <div>
              <h3 className="text-2xl font-headline font-extrabold mb-2">Notification Preferences</h3>
              <p className="text-on-surface-variant font-medium">Choose how you want to be notified.</p>
            </div>
            <div className="space-y-4">
              {[
                { label: 'New Order Alerts', description: 'Get notified when a new order is placed.' },
                { label: 'Reservation Updates', description: 'Alerts for new bookings or cancellations.' },
                { label: 'Customer Reviews', description: 'Daily summaries of new guest feedback.' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-6 bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/5">
                  <div>
                    <p className="font-bold text-sm">{item.label}</p>
                    <p className="text-xs text-on-surface-variant">{item.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-14 h-8 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSection !== 'profile' && activeSection !== 'notifications' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-40">
            <Shield className="w-16 h-16 mb-4" />
            <p className="font-bold">Coming Soon</p>
            <p className="text-sm">This section will be available in a future update.</p>
          </div>
        )}
      </div>
    </div>
  );
};
