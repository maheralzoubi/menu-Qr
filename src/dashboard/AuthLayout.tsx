// Split-screen auth layout for the dashboards (Fleet Manager login pattern):
// brand panel on the start side, form column on the end side. Brand panel hides < lg.
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface Props {
  overline: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}

export function AuthLayout({ overline, title, subtitle, children }: Props) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const toggleLanguage = () => {
    const next = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(next);
    try { localStorage.setItem('lang', next); } catch { /* ignore */ }
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-card text-on-surface">
      <div className="relative overflow-hidden hidden lg:flex flex-col justify-between p-12 xl:px-14 text-white brand-gradient">
        <div className="flex items-center gap-3 relative">
          <img src="/brand/menugo-icon.svg" alt="" className="w-10 h-10 rounded-[10px] shadow-[0_0_0_2px_rgb(255_255_255/.35)]" />
          <div>
            <p className="font-display font-extrabold text-[17px] leading-5 tracking-[-0.02em]">Menu Go</p>
            <p className="text-[11px] leading-4 opacity-80">{t('login.brandContext')}</p>
          </div>
        </div>
        <div className="relative max-w-[440px]">
          <p className="font-display font-extrabold text-[40px] leading-[1.05] tracking-[-0.035em] text-balance">{t('login.brandHeadline')}</p>
          <p className="mt-4 text-[15px] leading-6 opacity-90">{t('login.brandBody')}</p>
        </div>
        <p className="relative text-[11px] opacity-70">© {new Date().getFullYear()} Menu Go</p>
        <img src="/brand/menugo-mark-mono-white.svg" alt="" aria-hidden="true"
          className="absolute -end-24 -bottom-24 w-[440px] h-[440px] opacity-[.08] pointer-events-none" />
      </div>

      <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12">
        <button type="button" onClick={toggleLanguage} title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
          className="absolute top-5 end-5 ds-btn ds-btn-outline ds-btn-sm">
          <Globe className="w-4 h-4" /><span>{isArabic ? 'EN' : 'عربي'}</span>
        </button>
        <div className="w-full max-w-[380px] mx-auto">
          <img src="/brand/menugo-icon.svg" alt="Menu Go" className="lg:hidden w-12 h-12 rounded-xl mb-8" />
          <p className="ds-overline mb-2">{overline}</p>
          <h1 className="font-display font-bold text-[28px] leading-9 tracking-[-0.02em] mb-2">{title}</h1>
          {subtitle && <div className="text-[13px] leading-5 text-on-surface-variant mb-8">{subtitle}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
