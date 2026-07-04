import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
  onGuest: () => void;
}

const FOOD_EMOJIS = ['🍔', '🍕', '☕', '🍝', '🥗', '🍰', '🥤', '🍜'];

export const WelcomeScreen = ({ onLogin, onRegister, onGuest }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface flex flex-col overflow-hidden">
      {/* Language switcher */}
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 text-center">
        {/* Floating food emojis */}
        <div className="relative w-48 h-48 mb-8">
          <div className="absolute inset-0 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-7xl">🍽️</span>
          </div>
          {FOOD_EMOJIS.slice(0, 6).map((emoji, i) => {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const r = 92;
            const x = 50 + Math.cos(angle) * r;
            const y = 50 + Math.sin(angle) * r;
            return (
              <motion.span
                key={i}
                className="absolute text-2xl"
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
              >
                {emoji}
              </motion.span>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 mb-10"
        >
          <h1 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
            Monar
          </h1>
          <p className="text-lg font-semibold text-primary">{t('welcome.tagline')}</p>
          <p className="text-sm text-on-surface-variant max-w-xs mx-auto leading-relaxed">
            {t('welcome.description')}
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-xs space-y-3"
        >
          <button
            onClick={onRegister}
            className="w-full py-4 rounded-2xl btn-gradient text-white font-extrabold text-base shadow-xl shadow-primary/25 active:scale-95 transition-transform"
          >
            {t('welcome.getStarted')}
          </button>
          <button
            onClick={onLogin}
            className="w-full py-4 rounded-2xl bg-surface-container text-on-surface font-bold text-base active:scale-95 transition-transform"
          >
            {t('welcome.signIn')}
          </button>
          <button
            onClick={onGuest}
            className="w-full py-3 text-sm text-on-surface-variant font-medium active:opacity-60 transition-opacity"
          >
            {t('welcome.continueAsGuest')}
          </button>
        </motion.div>
      </div>
    </div>
  );
};
