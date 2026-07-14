import { useState } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import { useFmt } from '../hooks/useCurrency';
import type { MenuItem } from '../types';

interface Props {
  item: MenuItem;
  restaurantId: string;
  restaurantName: string;
  restaurantLogo?: string;
  onClose: () => void;
  onCartOpen: () => void;
}

export const ProductDetailModal = ({ item, restaurantId, restaurantName, restaurantLogo, onClose, onCartOpen }: Props) => {
  const { t } = useTranslation();
  const fmt = useFmt();
  const { addItem, items } = useCart();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const existingQty = items.find(i => i.id === item.id)?.quantity ?? 0;

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem(item, restaurantId, restaurantName, restaurantLogo);
    }
    if (note) {
      // Note is set after adding - handled in cart
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* Image */}
        <div className="relative">
          <div className="aspect-[4/3] bg-surface-container overflow-hidden">
            {item.image
              ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-7xl">🍴</div>
            }
          </div>
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:scale-90 transition-transform">
            <X className="w-4 h-4" />
          </button>
          {existingQty > 0 && (
            <div className="absolute top-4 start-4 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {existingQty} {t('product.inCart')}
            </div>
          )}
        </div>

        <div className="px-5 py-5 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {/* Name + price */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-xl font-extrabold font-headline flex-1">{item.name}</h2>
            <span className="text-xl font-extrabold text-primary shrink-0">{fmt(item.price * qty)}</span>
          </div>

          {/* Description */}
          {item.longDescription || item.description ? (
            <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
              {item.longDescription || item.description}
            </p>
          ) : null}

          {/* Allergens */}
          {item.allergens?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">{t('product.allergens')}</p>
              <div className="flex flex-wrap gap-1.5">
                {item.allergens.map(a => (
                  <span key={a} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {item.ingredients?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">{t('product.ingredients')}</p>
              <p className="text-xs text-on-surface-variant">{item.ingredients.join(', ')}</p>
            </div>
          )}

          {/* Note */}
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">{t('product.specialRequestLabel')}</p>
            <textarea
              value={note} onChange={e => setNote(e.target.value)}
              placeholder={t('product.specialRequest')}
              rows={2}
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-container flex items-center gap-4">
          {/* Qty */}
          <div className="flex items-center gap-3 bg-surface-container rounded-2xl px-3 py-2">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center active:scale-90 transition-transform">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-extrabold text-base tabular-nums">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center active:scale-90 transition-transform">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add button */}
          <button onClick={handleAdd}
            className="flex-1 btn-gradient text-white rounded-2xl py-3.5 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform">
            <ShoppingCart className="w-4 h-4" />
            {t('product.addToCart')} · {fmt(item.price * qty)}
          </button>
        </div>
      </motion.div>
    </>
  );
};
