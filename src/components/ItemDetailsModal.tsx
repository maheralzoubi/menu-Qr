import { X, AlertTriangle, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MenuItem } from '../types';
import { useFmt } from '../hooks/useCurrency';

export const ItemDetailsModal = ({ item, onClose, onAddToCart }: {
  item: MenuItem; onClose: () => void; onAddToCart: () => void;
}) => {
  const { t } = useTranslation();
  const fmt = useFmt();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-surface rounded-t-[3rem] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-72 w-full flex-shrink-0">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          <button
            onClick={onClose}
            className="absolute top-6 end-6 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto no-scrollbar">
          <section className="space-y-2">
            <div className="flex justify-between items-start">
              <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">{item.name}</h2>
              <span className="font-headline text-2xl font-bold text-primary">{fmt(item.price)}</span>
            </div>
            <p className="text-on-surface-variant font-medium">{item.category}</p>
          </section>

          <section className="space-y-3">
            <h3 className="font-headline font-bold text-lg text-on-surface">{t('modal.description')}</h3>
            <p className="text-on-surface-variant leading-relaxed text-sm">{item.longDescription}</p>
          </section>

          <section className="space-y-3">
            <h3 className="font-headline font-bold text-lg text-on-surface">{t('modal.ingredients')}</h3>
            <div className="flex flex-wrap gap-2">
              {item.ingredients.map(ing => (
                <span key={ing} className="px-3 py-1.5 bg-surface-container-low rounded-full text-xs font-semibold text-on-surface-variant">
                  {ing}
                </span>
              ))}
            </div>
          </section>

          <section className="space-y-3 bg-error/5 p-6 rounded-2xl border border-error/10">
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-headline font-bold text-lg">{t('modal.allergens')}</h3>
            </div>
            <p className="text-error/80 text-sm font-medium">
              {t('modal.allergensDesc', { items: item.allergens.join(', ') })}
            </p>
          </section>
        </div>

        <div className="p-8 bg-surface border-t border-outline-variant/10">
          <button
            onClick={() => { onAddToCart(); onClose(); }}
            className="w-full bg-signature-gradient text-white py-5 rounded-2xl font-headline font-extrabold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Plus className="w-6 h-6" /> {t('modal.addToSelection')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
