import { useState } from 'react';
import { User, LogOut, Globe, ChevronRight, Package, LogIn, Bell, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import type { CustomerInfo } from '../lib/customerAuth';

interface Props {
  customer: CustomerInfo | null;
  onLogout: () => void;
  onLoginRequest: () => void;
}

export const ProfileScreen = ({ customer, onLogout, onLoginRequest }: Props) => {
  const { t, i18n } = useTranslation();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const initials = customer?.name
    ? customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-8 text-center gap-5">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-primary opacity-60" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold font-headline">Your Profile</h2>
          <p className="text-sm text-on-surface-variant mt-2">Sign in to manage your account and preferences</p>
        </div>
        <button onClick={onLoginRequest} className="btn-gradient text-white px-8 py-3.5 rounded-2xl font-extrabold flex items-center gap-2 shadow-lg shadow-primary/20">
          <LogIn className="w-4 h-4" /> Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-surface px-5 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-extrabold text-xl">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-headline">{customer.name || 'Customer'}</h1>
            <p className="text-sm text-on-surface-variant">{customer.email}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Settings */}
        <div className="bg-surface rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-surface-container">
            <p className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">Settings</p>
          </div>

          {/* Language */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                <Globe className="w-4.5 h-4.5 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">Language</span>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Notifications */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                <Bell className="w-4.5 h-4.5 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">Notifications</span>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/40" />
          </div>
        </div>

        {/* Help */}
        <div className="bg-surface rounded-2xl overflow-hidden shadow-sm">
          <button className="w-full px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                <HelpCircle className="w-4.5 h-4.5 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">Help & Support</span>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/40" />
          </button>
        </div>

        {/* Logout */}
        {!confirmLogout ? (
          <button onClick={() => setConfirmLogout(true)}
            className="w-full bg-surface rounded-2xl p-4 flex items-center gap-3 shadow-sm active:scale-98 transition-transform">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <LogOut className="w-4.5 h-4.5 text-red-500" />
            </div>
            <span className="text-sm font-semibold text-red-500">Sign Out</span>
          </button>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-surface rounded-2xl p-5 shadow-sm text-center space-y-4">
            <p className="text-sm font-bold">Sign out of your account?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmLogout(false)} className="flex-1 bg-surface-container rounded-xl py-3 text-sm font-bold">
                Cancel
              </button>
              <button onClick={onLogout} className="flex-1 bg-red-500 text-white rounded-xl py-3 text-sm font-bold">
                Sign Out
              </button>
            </div>
          </motion.div>
        )}

        <p className="text-center text-xs text-on-surface-variant pb-4">Monar v1.0 · Powered by Monar</p>
      </div>
    </div>
  );
};
