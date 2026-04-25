/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ArrowRight, Star, Utensils } from 'lucide-react';
import { motion } from 'motion/react';
import { MenuItem } from '../types';
import { Skeleton } from '../components/Skeleton';

export const HomeScreen = ({ onStart, onReserve }: { onStart: () => void, onReserve: () => void }) => {
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await fetch('/api/menu');
        const data = await response.json();
        setFeaturedItems(data.filter((item: MenuItem) => item.featured).slice(0, 2));
      } catch (error) {
        console.error('Failed to fetch featured items:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <section className="relative w-full h-[80vh] overflow-hidden">
        <div className="absolute inset-0 bg-editorial-hero" />
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 w-full pb-12">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/80 font-headline uppercase tracking-[0.3em] text-xs mb-4 block"
          >
            Est. 2014
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white text-5xl font-headline font-bold leading-tight tracking-tight mb-8"
          >
            Crafting Memories <br/>Through Fire & Flour
          </motion.h2>
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={onStart}
            className="bg-white text-on-surface px-8 py-4 rounded-full font-headline font-bold flex items-center gap-2 hover:scale-105 transition-transform"
          >
            View Menu <ArrowRight className="w-5 h-5" />
          </motion.button>
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={onReserve}
            className="mt-4 bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-full font-headline font-bold flex items-center gap-2 hover:bg-white/20 transition-all"
          >
            Book a Table
          </motion.button>
        </div>
      </section>

      <section className="p-8 space-y-6">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h3 className="font-headline font-bold text-2xl text-on-surface">Featured Dishes</h3>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-widest">Chef's Seasonal Selection</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {isLoading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)
          ) : (
            featuredItems.map((item, i) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative h-48 rounded-3xl overflow-hidden group shadow-lg"
              >
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                  <div className="flex items-center gap-1 text-primary mb-1">
                    <Star className="w-3 h-3 fill-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Featured</span>
                  </div>
                  <h4 className="text-white font-headline font-bold text-xl">{item.name}</h4>
                  <p className="text-white/60 text-xs line-clamp-1">{item.description}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      <section className="bg-surface-container-low p-12 text-center space-y-6">
        <div className="space-y-2">
          <h3 className="font-headline font-bold text-2xl">The Artisan Way</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto">
            We believe in the power of simple ingredients, treated with respect and transformed by fire.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-primary font-headline font-bold text-xl">100%</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Organic</p>
          </div>
          <div className="space-y-1">
            <p className="text-primary font-headline font-bold text-xl">Local</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Sourced</p>
          </div>
          <div className="space-y-1">
            <p className="text-primary font-headline font-bold text-xl">Daily</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Fresh</p>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="px-6 py-12 border-t border-outline-variant/10 text-center space-y-6">
        <div className="flex justify-center gap-4">
          <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface-variant">
            <Star className="w-4 h-4" />
          </div>
          <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface-variant">
            <Utensils className="w-4 h-4" />
          </div>
        </div>
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">© 2026 Artisan Kitchen</p>
      </footer>
    </div>
  );
};
