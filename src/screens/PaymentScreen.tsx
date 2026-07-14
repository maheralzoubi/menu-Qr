import { useState, useEffect } from 'react';
import { Wallet, ChevronRight, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFmt } from '../hooks/useCurrency';
import { Skeleton } from '../components/Skeleton';

export const PaymentScreen = ({ total, onComplete }: { total: number; onComplete: () => void }) => {
  const { t, i18n } = useTranslation();
  const fmt = useFmt();
  const isRTL = i18n.language === 'ar';
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-8">
        <section className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </section>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-[2rem]" />
          <Skeleton className="h-24 w-full rounded-[2rem]" />
        </div>
        <Skeleton className="h-32 w-full rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-8">
      <section className="space-y-1">
        <h2 className="font-headline font-extrabold text-3xl tracking-tight text-on-surface">{t('payment.title')}</h2>
        <p className="text-on-surface-variant font-medium">{t('payment.subtitle')}</p>
      </section>

      <div className="space-y-4">
        <button
          onClick={onComplete}
          className="w-full bg-black text-white p-6 rounded-[2rem] flex items-center justify-between group hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="text-start">
              <h3 className="font-headline font-bold text-lg">{t('payment.applePay')}</h3>
              <p className="text-xs text-white/60">{t('payment.applePayDesc')}</p>
            </div>
          </div>
          <ChevronRight className={`w-6 h-6 text-white/40 group-hover:text-white transition-colors ${isRTL ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={onComplete}
          className="w-full bg-surface-container-low text-on-surface p-6 rounded-[2rem] flex items-center justify-between group hover:scale-[1.02] active:scale-95 transition-all border border-outline-variant/10"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="text-start">
              <h3 className="font-headline font-bold text-lg">{t('payment.cash')}</h3>
              <p className="text-xs text-on-surface-variant">{t('payment.cashDesc')}</p>
            </div>
          </div>
          <ChevronRight className={`w-6 h-6 text-on-surface-variant/40 group-hover:text-primary transition-colors ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-[2rem] p-8 space-y-4 border border-outline-variant/10">
        <div className="flex justify-between items-center text-on-surface-variant font-medium">
          <span>{t('payment.orderTotal')}</span>
          <span className="font-headline font-bold text-on-surface">{fmt(total)}</span>
        </div>
        <div className="pt-4 border-t border-outline-variant/20 flex justify-between items-center">
          <span className="font-headline font-bold text-xl text-on-surface">{t('payment.amountDue')}</span>
          <span className="font-headline font-extrabold text-2xl text-primary">{fmt(total)}</span>
        </div>
      </div>

      <p className="text-center text-[10px] text-on-surface-variant/60 font-medium uppercase tracking-[0.2em] px-8">
        {t('payment.security')}
      </p>
    </div>
  );
};
