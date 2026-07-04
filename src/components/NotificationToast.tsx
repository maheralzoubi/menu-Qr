/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Smartphone, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export const NotificationToast = ({ message, type, onClose }: { message: string, type: string, onClose: () => void, key?: string }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-sm z-[100] bg-on-surface text-surface p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
        <Smartphone className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h4 className="font-headline font-bold text-sm text-white">{t('notification.orderUpdate')}</h4>
        <p className="text-xs text-white/60 font-medium">{message}</p>
      </div>
      <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
