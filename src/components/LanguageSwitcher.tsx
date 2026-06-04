import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface Props { className?: string }

export const LanguageSwitcher = ({ className = '' }: Props) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const toggle = () => {
    const next = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  };

  return (
    <button
      onClick={toggle}
      title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant text-sm font-semibold hover:bg-surface-container transition-all ${className}`}
    >
      <Globe className="w-4 h-4 shrink-0" />
      <span>{isArabic ? 'EN' : 'عربي'}</span>
    </button>
  );
};
