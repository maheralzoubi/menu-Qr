import { useState, FormEvent } from 'react';
import { AuthLayout } from '../dashboard/AuthLayout';
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
  EMAIL_FAILED: 'forgotPassword.errors.emailFailed',
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

  const subtitle = step === 'request' ? t('forgotPassword.emailSubtext')
    : step === 'reset' ? t('forgotPassword.codeSubtext', { email })
    : t('forgotPassword.doneBody');
  const errorBox = error && <p role="alert" className="rounded-xl bg-neg1 text-neg7 px-3.5 py-3 text-[13px] leading-5 font-medium">{error}</p>;

  return (
    <AuthLayout overline={t('login.signIn')} title={t('forgotPassword.heading')} subtitle={subtitle}>
      {step === 'request' && (
        <form onSubmit={requestCode} className="flex flex-col gap-3.5">
          <input type="email" required dir="ltr" value={email} onChange={e => setEmail(e.target.value)} className="ds-input" placeholder="admin@restaurant.com" />
          {errorBox}
          <button type="submit" disabled={isSubmitting} className="ds-btn ds-btn-primary ds-btn-lg w-full">{t('forgotPassword.sendCodeButton')}</button>
          <button type="button" onClick={onBack} className="ds-btn ds-btn-ghost w-full">{t('forgotPassword.backToSignIn')}</button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={submitReset} className="flex flex-col gap-3.5">
          <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required autoFocus dir="ltr"
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000"
            className="ds-input h-14 text-center font-display text-2xl tracking-[0.5em] font-bold" />
          <div>
            <label className="ds-label">{t('forgotPassword.newPasswordLabel')}</label>
            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="ds-input" placeholder="••••••••" />
          </div>
          <div>
            <label className="ds-label">{t('forgotPassword.confirmPasswordLabel')}</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="ds-input" placeholder="••••••••" />
          </div>
          {errorBox}
          {resendSent && !error && <p className="rounded-xl bg-pos1 text-pos7 px-3.5 py-3 text-[13px] font-medium">{t('forgotPassword.resendSent')}</p>}
          <button type="submit" disabled={isSubmitting || code.length !== 6} className="ds-btn ds-btn-primary ds-btn-lg w-full">{t('forgotPassword.resetButton')}</button>
          <button type="button" onClick={resendCode} disabled={isSubmitting} className="ds-btn ds-btn-ghost w-full text-acc">{t('forgotPassword.resendButton')}</button>
        </form>
      )}

      {step === 'done' && (
        <div className="flex flex-col gap-3.5">
          <p className="rounded-xl bg-pos1 text-pos7 px-3.5 py-3 text-[13px] font-medium">{t('forgotPassword.doneHeading')}</p>
          <button type="button" onClick={onBack} className="ds-btn ds-btn-primary ds-btn-lg w-full">{t('forgotPassword.backToSignIn')}</button>
        </div>
      )}
    </AuthLayout>
  );
};
