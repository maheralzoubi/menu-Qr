import { Globe, Bell, HelpCircle, ChevronRight, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const ProfileScreen = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-surface min-h-screen">
      {/* Logo */}
      <div className="flex justify-center pt-16 pb-8">
        <img src="/logo-dark.svg" alt="Monar" className="h-10 w-auto" />
      </div>

      <div className="px-5 space-y-4">
        {/* Preferences */}
        <div className="bg-surface-container rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-container-high">
            <p className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">{t('settings.preferences')}</p>
          </div>
          <div className="px-4 py-4 flex items-center justify-between border-b border-surface-container-high">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center">
                <Globe className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">{t('settings.language')}</span>
            </div>
            <LanguageSwitcher />
          </div>
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center">
                <Bell className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">{t('settings.notifications')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/40 rtl:rotate-180" />
          </div>
        </div>

        {/* About */}
        <div className="bg-surface-container rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-container-high">
            <p className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">{t('settings.about')}</p>
          </div>
          <div className="px-4 py-4 flex items-center justify-between border-b border-surface-container-high">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">{t('settings.appVersion')}</span>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">1.0.0</span>
          </div>
          <button className="w-full px-4 py-4 flex items-center justify-between active:bg-surface-container-high transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-sm font-semibold">{t('settings.helpSupport')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/40 rtl:rotate-180" />
          </button>
        </div>

        <p className="text-center text-xs text-on-surface-variant pb-6">{t('settings.poweredBy')}</p>
      </div>
    </div>
  );
};
