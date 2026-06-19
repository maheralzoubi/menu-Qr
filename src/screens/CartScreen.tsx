import { useState } from 'react';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, MessageSquare, Clock, AlertCircle, Bike } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';

interface Props {
  onBack: () => void;
  onOrderPlaced: (orderId: string) => void;
}

const PICKUP_TIMES = ['ASAP', '15 min', '30 min', '45 min', '1 hour'];

export const CartScreen = ({ onBack, onOrderPlaced }: Props) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { items, restaurantName, restaurantId, updateQty, removeItem, updateNote, clearCart, total } = useCart();

  const [orderNote, setOrderNote] = useState('');
  const [pickupTime, setPickupTime] = useState('ASAP');
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const handlePlace = async () => {
    if (items.length === 0) return;
    setError(''); setPlacing(true);

    try {
      const payload = {
        items: items.map(i => ({
          id: i.id, name: i.name, description: i.description, price: i.price,
          image: i.image, category: i.category, quantity: i.quantity,
          featured: i.featured, ingredients: i.ingredients, allergens: i.allergens,
          note: i.note,
        })),
        total,
        restaurantId,
        customerName: 'Guest',
        order_source: 'CUSTOMER_APP',
        order_type: 'PICKUP',
        payment_method: 'PAY_LATER',
        payment_status: 'UNPAID',
        order_note: orderNote || undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) { const d = await res.json(); setError(d.message || 'Failed to place order'); return; }

      const order = await res.json();

      // Save to order history
      try {
        const history: string[] = JSON.parse(localStorage.getItem('order_history') || '[]');
        history.unshift(order._id);
        localStorage.setItem('order_history', JSON.stringify(history.slice(0, 20)));
      } catch { /* ignore */ }

      clearCart();
      onOrderPlaced(order._id);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-surface px-5 pt-12 pb-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold font-headline">Your Cart</h1>
            <p className="text-xs text-on-surface-variant">{restaurantName}</p>
          </div>
          <ShoppingBag className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant gap-4">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 opacity-30" />
            </div>
            <p className="text-sm font-medium">Your cart is empty</p>
            <button onClick={onBack} className="btn-gradient text-white px-6 py-2.5 rounded-2xl text-sm font-bold">
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="bg-surface rounded-2xl overflow-hidden shadow-sm">
              <AnimatePresence>
                {items.map((item, idx) => (
                  <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                    className={`px-4 py-3.5 ${idx < items.length - 1 ? 'border-b border-surface-container' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-container shrink-0">
                        {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🍴</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-sm font-extrabold text-primary mt-0.5">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center active:scale-90">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center font-extrabold text-sm tabular-nums">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center active:scale-90">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setActiveNote(activeNote === item.id ? null : item.id)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-colors ${item.note || activeNote === item.id ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-lg bg-surface-container text-on-surface-variant flex items-center justify-center active:scale-90 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {activeNote === item.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2 ms-[60px]">
                          <input value={item.note} onChange={e => updateNote(item.id, e.target.value)}
                            placeholder="Special request for this item..."
                            className="w-full bg-surface-container rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pickup Time */}
            <div className="bg-surface rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <p className="text-sm font-extrabold">Pickup Time</p>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {PICKUP_TIMES.map(t => (
                  <button key={t} onClick={() => setPickupTime(t)}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      pickupTime === t ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Order Note */}
            <div className="bg-surface rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-extrabold mb-2">Order Note</p>
              <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)}
                placeholder="Any special instructions for the whole order..."
                rows={2}
                className="w-full bg-surface-container rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Pay at Pickup banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Bike className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-primary">Pay at Pickup</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Payment will be collected when you pick up your order</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-xs text-on-surface-variant">
                  <span>{item.quantity}× {item.name}</span>
                  <span className="tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-extrabold text-base pt-2 border-t border-surface-container">
                <span>Total</span>
                <span className="text-primary tabular-nums">${total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer CTA */}
      {items.length > 0 && (
        <div className="bg-surface px-5 pb-8 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] shrink-0">
          {error && (
            <p className="text-red-500 text-xs flex items-center gap-1 mb-3">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}
          <button onClick={handlePlace} disabled={placing}
            className="w-full btn-gradient text-white rounded-2xl py-4 font-extrabold text-base shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98 transition-transform">
            {placing ? 'Placing order...' : `Place Order · $${total.toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  );
};
