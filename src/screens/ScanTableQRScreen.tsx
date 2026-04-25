import { ArrowLeft, ScanLine, Utensils } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  restaurant: { _id: string; name: string; logo?: string };
  onBack: () => void;
}

export const ScanTableQRScreen = ({ restaurant, onBack }: Props) => (
  <div className="min-h-screen bg-surface flex flex-col">

    {/* Back button */}
    <div className="px-6 pt-14">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to restaurants
      </button>
    </div>

    {/* Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-8 pb-20 space-y-10">

      {/* Restaurant identity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center space-y-4"
      >
        <div className="w-24 h-24 rounded-3xl overflow-hidden bg-surface-container-high flex items-center justify-center shadow-lg">
          {restaurant.logo ? (
            <img src={restaurant.logo} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <Utensils className="w-10 h-10 text-primary" />
            </div>
          )}
        </div>
        <h2 className="font-headline text-2xl font-extrabold text-center">{restaurant.name}</h2>
      </motion.div>

      {/* Scan frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', damping: 18 }}
        className="relative"
      >
        {/* Animated scan border */}
        <div className="w-56 h-56 relative">
          {/* Corner brackets */}
          {[
            'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
            'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
            'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
            'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
          ].map((cls, i) => (
            <div key={i} className={`absolute w-10 h-10 border-primary ${cls}`} />
          ))}

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ScanLine className="w-16 h-16 text-primary/60" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Instruction */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-center space-y-2"
      >
        <p className="font-headline font-bold text-lg text-on-surface">Scan the QR code at your table</p>
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto">
          Find the QR code on your table and scan it with your phone camera to open the menu.
        </p>
      </motion.div>

    </div>
  </div>
);
