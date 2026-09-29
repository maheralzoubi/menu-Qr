import { useState, FormEvent } from 'react';
import { AuthLayout } from '../src/dashboard/AuthLayout';
import { useTranslation } from 'react-i18next';

interface Props {
  email: string;
  /** Called after the code is accepted. May perform further async work (e.g. starting checkout) — throw to show an error and stay on this screen. */
  onVerified: () => void | Promise<void>;
}

const ERROR_CODE_KEYS: Record<string, string> = {
  INVALID_CODE: 'verify.errors.invalidCode',
  EXPIRED_CODE: 'verify.errors.expiredCode',
  TOO_MANY_ATTEMPTS: 'verify.errors.tooManyAttempts',
};

export const VerifyEmailScreen = ({ email, onVerified }: Props) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        const key = data.code && ERROR_CODE_KEYS[data.code];
        setError(key ? t(key) : t('verify.errors.generic'));
        return;
      }
      await onVerified();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('verify.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setCode('');
      setResendSent(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout overline={t('login.signIn')} title={t('verify.heading')} subtitle={t('verify.subtext', { email })}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required autoFocus dir="ltr"
          value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder={t('verify.codePlaceholder')}
          className="ds-input h-14 text-center font-display text-2xl tracking-[0.5em] font-bold" />
        {error && <p role="alert" className="rounded-xl bg-neg1 text-neg7 px-3.5 py-3 text-[13px] leading-5 font-medium">{error}</p>}
        {resendSent && !error && <p className="rounded-xl bg-pos1 text-pos7 px-3.5 py-3 text-[13px] font-medium">{t('verify.resendSent')}</p>}
        <button type="submit" disabled={isSubmitting || code.length !== 6} className="ds-btn ds-btn-primary ds-btn-lg w-full">
          {isSubmitting ? t('verify.verifying') : t('verify.verifyButton')}
        </button>
        <button type="button" onClick={handleResend} disabled={isResending} className="ds-btn ds-btn-ghost w-full text-acc">{t('verify.resendButton')}</button>
      </form>
    </AuthLayout>
  );
};
