import { useState, FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface Props {
  onBack: () => void;
}

type Step = 'request' | 'reset' | 'done';

const ERROR_CODE_KEYS: Record<string, string> = {
  INVALID_CODE: 'forgotPassword.errors.invalidCode',
  EXPIRED_CODE: 'forgotPassword.errors.expiredCode',
  TOO_MANY_ATTEMPTS: 'forgotPassword.errors.tooManyAttempts',
  WEAK_PASSWORD: 'forgotPassword.errors.weakPassword',
  EMAIL_NOT_FOUND: 'forgotPassword.errors.emailNotFound',
};

export const ForgotPasswordScreen = ({ onBack }: Props) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const key = data.code && ERROR_CODE_KEYS[data.code];
        setError(key ? t(key) : t('forgotPassword.errors.generic'));
        return;
      }
      setStep('reset');
    } catch {
      setError(t('forgotPassword.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setCode('');
      setResendSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(t('forgotPassword.errors.passwordMismatch'));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        const key = data.code && ERROR_CODE_KEYS[data.code];
        setError(key ? t(key) : t('forgotPassword.errors.generic'));
        return;
      }
      setStep('done');
    } catch {
      setError(t('forgotPassword.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/25 flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-primary" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-2xl font-headline font-extrabold">{t('forgotPassword.heading')}</h1>
          {step === 'request' && <p className="text-sm text-on-surface-variant">{t('forgotPassword.emailSubtext')}</p>}
          {step === 'reset' && <p className="text-sm text-on-surface-variant">{t('forgotPassword.codeSubtext', { email })}</p>}
          {step === 'done' && <p className="text-sm text-on-surface-variant">{t('forgotPassword.doneBody')}</p>}
        </div>

        {step === 'request' && (
          <form onSubmit={requestCode} className="space-y-4">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="admin@restaurant.com" />
            {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
            <button type="submit" disabled={isSubmitting}
              className="w-full py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 disabled:opacity-60 transition-all">
              {t('forgotPassword.sendCodeButton')}
            </button>
            <button type="button" onClick={onBack} className="w-full text-sm font-bold text-on-surface-variant">
              {t('forgotPassword.backToSignIn')}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={submitReset} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-center text-2xl tracking-[0.5em] font-bold outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('forgotPassword.newPasswordLabel')}</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('forgotPassword.confirmPasswordLabel')}</label>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••" />
            </div>

            {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
            {resendSent && !error && <p className="text-sm text-tertiary font-medium text-center">{t('forgotPassword.resendSent')}</p>}

            <button type="submit" disabled={isSubmitting || code.length !== 6}
              className="w-full py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 disabled:opacity-60 transition-all">
              {t('forgotPassword.resetButton')}
            </button>
            <button type="button" onClick={resendCode} disabled={isSubmitting}
              className="w-full text-sm font-bold text-primary underline disabled:opacity-60">
              {t('forgotPassword.resendButton')}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <p className="text-sm text-tertiary font-medium text-center">{t('forgotPassword.doneHeading')}</p>
            <button type="button" onClick={onBack}
              className="w-full py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 transition-all">
              {t('forgotPassword.backToSignIn')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
