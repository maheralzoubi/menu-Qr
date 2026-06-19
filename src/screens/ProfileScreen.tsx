import { Globe, Bell, HelpCircle, ChevronRight, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const ProfileScreen = () => {
  const { i18n } = useTranslation();

  return (
    <div className="bg-surface min-h-screen">
      {/* Header */}
      <div className="bg-surface px-5 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
            <img src="/monar-logo.png" alt="Monar" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <img src="/logo.svg" alt="Monar" className="h-7 w-auto mb-0.5" />
            <p className="text-sm text-on-surface-variant">Pre-order · Skip the Wait</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Settings */}
        <div className="bg-surface rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-surface-container">
            <p className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">Preferences</p>
          </div>

          {/* Language */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                <Globe className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">Language</span>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Notifications */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                <Bell className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">Notifications</span>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/40" />
          </div>
        </div>

        {/* App info */}
        <div className="bg-surface rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-surface-container">
            <p className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">About</p>
          </div>
          <div className="px-4 py-4 flex items-center justify-between border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">App Version</span>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">1.0.0</span>
          </div>
          <button className="w-full px-4 py-4 flex items-center justify-between active:bg-surface-container transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">Help & Support</span>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/40" />
          </button>
        </div>

        <p className="text-center text-xs text-on-surface-variant pb-4">Powered by Monar</p>
      </div>
    </div>
  );
};
