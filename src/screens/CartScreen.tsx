/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { X, Minus, Plus, ReceiptText, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem } from '../types';
import { Skeleton } from '../components/Skeleton';

export const CartScreen = ({ cart, updateQuantity, removeFromCart, tipAmount, setTipAmount }: { 
  cart: CartItem[], 
  updateQuantity: (id: string, delta: number) => void,
  removeFromCart: (id: string) => void,
  tipAmount: number,
  setTipAmount: (amount: number) => void
}) => {
  const [customTip, setCustomTip] = useState<string>('');
  const [activeTipPreset, setActiveTipPreset] = useState<number | 'custom' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const handlePresetTip = (percent: number) => {
    const amount = subtotal * (percent / 100);
    setTipAmount(amount);
    setActiveTipPreset(percent);
    setCustomTip('');
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount >= 0) {
      setTipAmount(amount);
      setActiveTipPreset('custom');
    } else {
      setTipAmount(0);
      setActiveTipPreset(null);
    }
  };

  const total = subtotal + tipAmount;
  
  if (isLoading) {
    return (
      <div className="pt-24 pb-48 px-6 max-w-md mx-auto space-y-8">
        <section className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </section>
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="w-24 h-24 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-48 px-6 max-w-md mx-auto flex flex-col gap-8">
      <section className="space-y-1">
        <h2 className="font-headline font-extrabold text-3xl tracking-tight text-on-surface">Your Selection</h2>
        <p className="text-on-surface-variant font-medium">Review your items before confirming</p>
      </section>

      <section className="flex flex-col gap-6">
        <AnimatePresence mode="popLayout">
          {cart.map(item => (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={item.id} 
              className="flex gap-4 items-center group"
            >
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-surface-container shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between h-24 py-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-headline font-bold text-lg text-on-surface">{item.name}</h3>
                    <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{item.category}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-on-surface-variant/40 hover:text-error transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-end">
                  <span className="font-headline font-bold text-primary">${item.price.toFixed(2)}</span>
                  <div className="flex items-center bg-surface-container rounded-full px-1 py-1">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center text-on-surface hover:bg-surface-container-highest rounded-full transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center text-on-surface hover:bg-surface-container-highest rounded-full transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {cart.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            Your cart is empty
          </div>
        )}
      </section>

      <section className="mt-4 p-8 bg-surface-container-low rounded-[2rem] space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant font-medium">Subtotal</span>
          <span className="font-headline font-semibold">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant font-medium">Tax & Service</span>
          <span className="font-headline font-semibold text-tertiary-container">Included</span>
        </div>
        {tipAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant font-medium">Gratuity</span>
            <span className="font-headline font-semibold text-primary">+${tipAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="pt-4 border-t border-outline-variant/20 flex justify-between items-center">
          <span className="font-headline font-bold text-xl text-on-surface">Total</span>
          <span className="font-headline font-extrabold text-2xl text-primary">${total.toFixed(2)}</span>
        </div>
      </section>

      <section className="space-y-4">
        <label className="font-headline font-bold text-sm tracking-wide text-on-surface-variant uppercase px-2">Add a Tip</label>
        <div className="grid grid-cols-4 gap-2">
          {[15, 20, 25].map((percent) => (
            <button
              key={percent}
              onClick={() => handlePresetTip(percent)}
              className={`py-3 rounded-xl font-headline font-bold text-sm transition-all duration-300 ${
                activeTipPreset === percent 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {percent}%
            </button>
          ))}
          <div className="relative">
            <input
              type="number"
              placeholder="Custom"
              value={customTip}
              onChange={(e) => handleCustomTipChange(e.target.value)}
              className={`w-full py-3 px-2 rounded-xl font-headline font-bold text-sm text-center bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 placeholder:text-on-surface-variant/40 ${
                activeTipPreset === 'custom' ? 'ring-2 ring-primary bg-white' : ''
              }`}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <label className="font-headline font-bold text-sm tracking-wide text-on-surface-variant uppercase">Promo Code</label>
          <button className="text-primary text-xs font-bold uppercase tracking-widest">Apply</button>
        </div>
        <div className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-on-surface-variant text-sm flex items-center gap-2 border border-transparent focus-within:bg-white focus-within:shadow-sm transition-all duration-300">
          <ReceiptText className="w-4 h-4" />
          <input type="text" className="bg-transparent border-none focus:ring-0 w-full p-0" placeholder="Enter code..." />
        </div>
      </section>

      <section className="space-y-3">
        <label className="font-headline font-bold text-sm tracking-wide text-on-surface-variant uppercase px-2">Kitchen Instructions</label>
        <div className="w-full bg-surface-container-low rounded-xl px-4 py-3 min-h-[80px] text-on-surface-variant text-sm flex items-start gap-2 border border-transparent focus-within:bg-white focus-within:shadow-sm transition-all duration-300">
          <Edit3 className="w-4 h-4 mt-1" />
          <textarea className="bg-transparent border-none focus:ring-0 w-full p-0 resize-none h-full" placeholder="Any allergies or special requests?"></textarea>
        </div>
      </section>
    </div>
  );
};
