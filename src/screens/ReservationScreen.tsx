/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Users, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ReservationScreen = ({ onComplete, restaurantId }: { onComplete: () => void; restaurantId: string }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    date: '',
    time: '',
    guests: 2
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, restaurantId })
      });
      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => onComplete(), 3000);
      }
    } catch (error) {
      console.error('Failed to book reservation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="pt-24 pb-32 px-6 max-w-md mx-auto text-center space-y-8">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-primary/30"
        >
          <CheckCircle2 className="w-12 h-12" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Table Reserved!</h2>
          <p className="text-on-surface-variant font-medium">We've sent a confirmation to your email.</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Guest</span>
            <span className="font-bold">{formData.name}</span>
          </div>
          <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Date & Time</span>
            <span className="font-bold">{formData.date} at {formData.time}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Party Size</span>
            <span className="font-bold">{formData.guests} Guests</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-8">
      <section className="space-y-1">
        <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Book a Table</h2>
        <p className="text-on-surface-variant font-medium">Experience the artisan touch in person.</p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-4">Full Name</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="John Doe"
              className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-6 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/20 transition-all font-body text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-4">Email Address</label>
            <input 
              required
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="john@example.com"
              className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-6 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/20 transition-all font-body text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-4">Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                <input 
                  required
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary/20 transition-all font-body text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-4">Time</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                <input 
                  required
                  type="time"
                  value={formData.time}
                  onChange={e => setFormData({...formData, time: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary/20 transition-all font-body text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-4">Number of Guests</label>
            <div className="flex bg-surface-container-low rounded-2xl p-2 items-center justify-between">
              {[1, 2, 3, 4, 5, 6].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setFormData({...formData, guests: num})}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${formData.guests === num ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant/60 hover:bg-surface-container-highest'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          disabled={isSubmitting}
          className="w-full bg-signature-gradient text-white py-5 rounded-2xl font-headline font-extrabold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSubmitting ? 'Booking...' : 'Confirm Reservation'} <ArrowRight className="w-6 h-6" />
        </button>
      </form>

      <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm">Large Party?</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">For groups larger than 6, please call us directly to ensure we can accommodate your party.</p>
        </div>
      </div>
    </div>
  );
};
