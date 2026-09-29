import { useState, useEffect, FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../dashboard/AuthLayout';
import { useTranslation } from 'react-i18next';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

interface Props {
  onLogin: () => void;
  onBack: () => void;
  /** Called with the raw JWT so each app can save it to the right key */
  onTokenSave: (token: string) => void;
  /** If provided, resending a verification code navigates to a code-entry screen instead of showing inline confirmation */
  onNeedsVerification?: (email: string) => void;
  /** Which app is authenticating — the server rejects accounts whose role doesn't belong here */
  appId?: 'admin' | 'owner';
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
  WRONG_APP: 'login.errors.wrongApp',
  NO_RESTAURANT: 'login.errors.noRestaurant',
};

export const AdminLoginScreen = ({
  onLogin,
  onBack,
  onTokenSave,
  onNeedsVerification,
  appId,
  title,
  subtitle,
}: Props) => {
  const { t } = useTranslation();
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
        body: JSON.stringify({ email: email.trim(), password, app: appId }),
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

  if (mode === 'forgot') {
    return <ForgotPasswordScreen onBack={() => setMode('login')} />;
  }

  return (
    <AuthLayout overline={t('login.signIn')} title={title ?? t('login.title')} subtitle={subtitle}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="login-email" className="ds-label">{t('login.emailLabel')}</label>
          <input id="login-email" type="email" required autoComplete="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)}
            className="ds-input" placeholder="admin@restaurant.com" />
        </div>
        <div>
          <label htmlFor="login-password" className="ds-label">{t('login.passwordLabel')}</label>
          <div className="relative">
            <input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password}
              onChange={e => setPassword(e.target.value)} className="ds-input pe-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility"
              className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex justify-end -mt-1">
          <button type="button" onClick={() => setMode('forgot')} className="text-[13px] text-on-surface-variant underline underline-offset-[3px] hover:text-on-surface">
            {t('forgotPassword.link')}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-xl bg-neg1 text-neg7 px-3.5 py-3 text-[13px] leading-5 space-y-1.5">
            <p className="font-medium">{error}</p>
            {errorCode === 'EMAIL_NOT_VERIFIED' && (
              resendSent ? (
                <p className="text-pos7 font-medium">{t('login.resendSent')}</p>
              ) : (
                <button type="button" onClick={handleResend} disabled={isResending} className="font-semibold underline disabled:opacity-60">
                  {t('login.resendVerification')}
                </button>
              )
            )}
          </div>
        )}

        <button type="submit" disabled={isLoading} className="ds-btn ds-btn-primary ds-btn-lg w-full mt-1">
          {isLoading ? t('login.signingIn') : t('login.signIn')}
        </button>
        {onBack && appId === 'owner' && (
          <button type="button" onClick={onBack} className="ds-btn ds-btn-ghost w-full">{t('login.back')}</button>
        )}
      </form>
    </AuthLayout>
  );
};
