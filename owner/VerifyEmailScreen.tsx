import { useState, FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface Props {
  email: string;
  onVerified: () => void;
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
      onVerified();
    } catch {
      setError(t('verify.errors.generic'));
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
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/25 flex items-center justify-center">
              <MailCheck className="w-8 h-8 text-primary" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-2xl font-headline font-extrabold">{t('verify.heading')}</h1>
          <p className="text-sm text-on-surface-variant">{t('verify.subtext', { email })}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder={t('verify.codePlaceholder')}
            className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-center text-2xl tracking-[0.5em] font-bold outline-none focus:ring-2 focus:ring-primary/30"
          />

          {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
          {resendSent && !error && <p className="text-sm text-tertiary font-medium text-center">{t('verify.resendSent')}</p>}

          <button type="submit" disabled={isSubmitting || code.length !== 6}
            className="w-full py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 disabled:opacity-60 transition-all">
            {isSubmitting ? t('verify.verifying') : t('verify.verifyButton')}
          </button>

          <button type="button" onClick={handleResend} disabled={isResending}
            className="w-full text-sm font-bold text-primary underline disabled:opacity-60">
            {t('verify.resendButton')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
