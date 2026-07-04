import { useState, useEffect, FormEvent } from 'react';
import { Eye, EyeOff, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

interface Props {
  onLogin: () => void;
  onBack: () => void;
  /** Called with the raw JWT so each app can save it to the right key */
  onTokenSave: (token: string) => void;
  /** If provided, resending a verification code navigates to a code-entry screen instead of showing inline confirmation */
  onNeedsVerification?: (email: string) => void;
  title?: string;
  subtitle?: string;
  icon?: 'utensils' | 'shield';
}

const ERROR_CODE_KEYS: Record<string, string> = {
  INVALID_CREDENTIALS: 'login.errors.invalidCredentials',
  RESTAURANT_INACTIVE: 'login.errors.restaurantInactive',
  ACCOUNT_LOCKED: 'login.errors.accountLocked',
  VALIDATION_ERROR: 'login.errors.validation',
  EMAIL_NOT_VERIFIED: 'login.errors.emailNotVerified',
};

export const AdminLoginScreen = ({
  onLogin,
  onBack,
  onTokenSave,
  onNeedsVerification,
  title,
  subtitle,
}: Props) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorCode('');
    setResendSent(false);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const key = data.code && ERROR_CODE_KEYS[data.code];
        setError(key ? t(key) : t('login.errors.generic'));
        setErrorCode(data.code ?? '');
        return;
      }
      onTokenSave(data.token);
      onLogin();
    } catch {
      setError(t('login.errors.network'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (onNeedsVerification) {
        onNeedsVerification(email.trim());
      } else {
        setResendSent(true);
      }
    } finally {
      setIsResending(false);
    }
  };

  const toggleLanguage = () => {
    const next = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  };

  if (mode === 'forgot') {
    return <ForgotPasswordScreen onBack={() => setMode('login')} />;
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8 relative">
      <button
        type="button"
        onClick={toggleLanguage}
        title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
        className="absolute top-6 end-6 flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant text-sm font-semibold hover:bg-surface-container transition-all"
      >
        <Globe className="w-4 h-4 shrink-0" />
        <span>{isArabic ? 'EN' : 'عربي'}</span>
      </button>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img src="/logo-dark.svg" alt="Monar" className="h-20 w-auto" />
          </div>
          <h1 className="text-2xl font-headline font-extrabold">{title}</h1>
          <p className="text-sm text-on-surface-variant">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('login.emailLabel')}</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="admin@restaurant.com" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('login.passwordLabel')}</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-end">
              <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-primary underline">
                {t('forgotPassword.link')}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-center space-y-2">
              <p className="text-sm text-red-500 font-medium">{error}</p>
              {errorCode === 'EMAIL_NOT_VERIFIED' && (
                resendSent ? (
                  <p className="text-sm text-tertiary font-medium">{t('login.resendSent')}</p>
                ) : (
                  <button type="button" onClick={handleResend} disabled={isResending}
                    className="text-sm font-bold text-primary underline disabled:opacity-60">
                    {t('login.resendVerification')}
                  </button>
                )
              )}
            </div>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 disabled:opacity-60 transition-all">
            {isLoading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>


      </motion.div>
    </div>
  );
};
