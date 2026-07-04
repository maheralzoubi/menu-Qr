import { useState, FormEvent } from 'react';
import { User, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { setCustomerToken, setCustomerInfo } from '../lib/customerAuth';

interface Props {
  onSuccess: () => void;
  onBack: () => void;
  onRegisterClick: () => void;
  restaurantId: string;
}

export const CustomerLoginScreen = ({ onSuccess, onBack, onRegisterClick, restaurantId }: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, restaurantId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? t('customerLogin.loginFailed')); return; }
      setCustomerToken(data.token);
      setCustomerInfo(data.customer);
      onSuccess();
    } catch {
      setError(t('common.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-8">
        <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant text-sm font-medium hover:text-primary transition-colors">
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {t('customerLogin.back')}
        </button>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
            <User className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-headline font-extrabold">{t('customerLogin.title')}</h1>
          <p className="text-sm text-on-surface-variant">{t('customerLogin.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('customerLogin.email')}</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('customerLogin.emailPlaceholder')}
              className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('customerLogin.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('customerLogin.passwordPlaceholder')}
                className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 pe-12 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute end-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

          <button
            type="submit" disabled={isLoading}
            className="w-full py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 disabled:opacity-60 transition-all"
          >
            {isLoading ? t('customerLogin.signingIn') : t('customerLogin.signIn')}
          </button>
        </form>

        <p className="text-center text-sm text-on-surface-variant">
          {t('customerLogin.noAccount')}{' '}
          <button onClick={onRegisterClick} className="text-primary font-bold hover:underline">
            {t('customerLogin.createOne')}
          </button>
        </p>
      </motion.div>
    </div>
  );
};
