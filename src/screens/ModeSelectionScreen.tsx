import { useState, useEffect } from 'react';
import { QrCode, ShoppingBag, ArrowRight, Utensils, ChevronRight, Moon, Sun, Monitor } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface Props {
  onInsideRestaurant: () => void;
  onBrowseRestaurants: () => void;
}

type ThemeMode = 'system' | 'dark' | 'light';

function getGreetingKey() {
  const h = new Date().getHours();
  if (h < 5)  return { key: 'common.greetings.night',     emoji: '🌙' };
  if (h < 12) return { key: 'common.greetings.morning',   emoji: '☀️' };
  if (h < 17) return { key: 'common.greetings.afternoon', emoji: '🌤️' };
  return       { key: 'common.greetings.evening',   emoji: '🌙' };
}

function applyTheme(mode: ThemeMode) {
  if (mode === 'dark')        document.documentElement.setAttribute('data-theme', 'dark');
  else if (mode === 'light')  document.documentElement.setAttribute('data-theme', 'light');
  else                        document.documentElement.removeAttribute('data-theme');
}

const THEME_ICONS: Record<ThemeMode, typeof Moon> = {
  system: Monitor,
  dark: Moon,
  light: Sun,
};

export const ModeSelectionScreen = ({ onInsideRestaurant, onBrowseRestaurants }: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('ui-theme') as ThemeMode | null;
    return saved ?? 'system';
  });

  useEffect(() => {
    applyTheme(themeMode);
    localStorage.setItem('ui-theme', themeMode);
  }, [themeMode]);

  const cycleTheme = () => {
    setThemeMode(prev =>
      prev === 'system' ? 'dark' : prev === 'dark' ? 'light' : 'system'
    );
  };

  const ThemeIcon = THEME_ICONS[themeMode];
  const { key: greetingKey, emoji } = getGreetingKey();

  return (
    <div className="min-h-screen bg-surface flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col px-5 pt-14 pb-10 max-w-md mx-auto w-full">

        {/* ── Top bar ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Utensils className="w-4 h-4 text-white" />
            </div>
            <span className="font-headline font-extrabold text-lg text-on-surface tracking-tight">
              {t('mode.appName')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={cycleTheme}
              className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
              aria-label={t('mode.toggleTheme')}
            >
              <ThemeIcon className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* ── Greeting ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="mt-10 mb-7"
        >
          <p className="text-on-surface-variant text-sm font-medium mb-1.5">
            {t(greetingKey)} {emoji}
          </p>
          <h1 className="font-headline font-extrabold text-[2.1rem] leading-[1.1] text-on-surface">
            {t('mode.heading').split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </h1>
        </motion.div>

        {/* ── Primary card — QR Scan ─────────────── */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 260, damping: 22 }}
          whileTap={{ scale: 0.975 }}
          onClick={onInsideRestaurant}
          className="flex-1 w-full rounded-[28px] p-6 text-start flex flex-col justify-between overflow-hidden relative min-h-[280px]"
          style={{ background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-container) 100%)' }}
        >
          <span className="pointer-events-none absolute -end-8 -top-8 w-40 h-40 rounded-full bg-white/[0.07]" />
          <span className="pointer-events-none absolute end-6 bottom-20 w-28 h-28 rounded-full bg-white/[0.05]" />
          <span className="pointer-events-none absolute -start-6 bottom-6 w-24 h-24 rounded-full bg-black/[0.08]" />

          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.22, type: 'spring', stiffness: 300 }}
            className="w-[60px] h-[60px] rounded-2xl bg-white/[0.18] backdrop-blur-sm flex items-center justify-center"
          >
            <QrCode className="w-7 h-7 text-white" />
          </motion.div>

          <div className="mt-auto">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.14em] mb-1">
              {t('mode.scanLabel')}
            </p>
            <h2 className="text-white font-headline font-extrabold text-[1.7rem] leading-[1.12]">
              {t('mode.scanTitle').split('\n').map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
            </h2>
            <p className="text-white/55 text-[13px] leading-relaxed mt-2 max-w-[72%]">
              {t('mode.scanDesc')}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 bg-white rounded-full px-5 py-2.5">
              <span className="text-primary font-bold text-[13px]">{t('mode.scanCta')}</span>
              <ArrowRight className={`w-3.5 h-3.5 text-primary ${isRTL ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </motion.button>

        {/* ── Secondary card — Browse ─────────────── */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.975 }}
          onClick={onBrowseRestaurants}
          className="w-full mt-3 bg-surface-container-low rounded-[22px] p-5 text-start flex items-center gap-4 border border-outline-variant/40"
        >
          <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5.5 h-5.5 text-primary" style={{ width: 22, height: 22 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-[0.12em]">
              {t('mode.browseLabel')}
            </p>
            <h3 className="font-headline font-bold text-on-surface text-[15px] mt-0.5 leading-snug">
              {t('mode.browseTitle')}
            </h3>
            <p className="text-on-surface-variant text-xs mt-0.5 truncate">
              {t('mode.browseDesc')}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
            <ChevronRight className={`w-4 h-4 text-on-surface-variant/50 ${isRTL ? 'rotate-180' : ''}`} />
          </div>
        </motion.button>

        {/* ── Footer ─────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-on-surface-variant/30 text-[11px] mt-6 tracking-wide"
        >
          {t('mode.poweredBy')}
        </motion.p>
      </div>
    </div>
  );
};
