import { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, ChefHat, Package, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { useFmt } from '../hooks/useCurrency';

interface Props {
  orderId: string;
  onClose: () => void;
  onViewOrders: () => void;
}

export const OrderTrackingScreen = ({ orderId, onClose, onViewOrders }: Props) => {
  const { t } = useTranslation();
  const fmt = useFmt();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const STATUS_STEPS = [
    { key: 'Pending',   label: t('tracking.received'),  icon: <Clock className="w-5 h-5" />,    sub: t('tracking.receivedDesc') },
    { key: 'Preparing', label: t('tracking.preparing'), icon: <ChefHat className="w-5 h-5" />,  sub: t('tracking.preparingDesc') },
    { key: 'Ready',     label: t('tracking.ready'),     icon: <Package className="w-5 h-5" />,  sub: t('tracking.readyDesc') },
    { key: 'Delivered', label: t('tracking.completed'), icon: <Check className="w-5 h-5" />,    sub: t('tracking.completedDesc') },
  ];

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setOrder(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, { path: '/socket.io' });
    socket.emit('order:join', orderId);
    socket.on('order:status', ({ id, status }: { id: string; status: string }) => {
      if (id === orderId) setOrder((prev: any) => prev ? { ...prev, status } : prev);
    });
    return () => { socket.disconnect(); };
  }, [orderId]);

  const activeIdx = STATUS_STEPS.findIndex(s => s.key === order?.status);
  const currentIdx = activeIdx >= 0 ? activeIdx : 0;
  const isCompleted = order?.status === 'Delivered';
  const isCancelled = order?.status === 'Cancelled';

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 shrink-0 flex items-center justify-between">
        <div>
          <p className="text-xs text-on-surface-variant">{t('tracking.orderLabel')}</p>
          <h1 className="text-xl font-extrabold font-headline">#{orderId.slice(-6).toUpperCase()}</h1>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="bg-surface-container rounded-2xl h-16 animate-pulse" />)}</div>
        ) : !order ? (
          <div className="text-center py-16 text-on-surface-variant"><p className="text-sm">{t('tracking.notFound')}</p></div>
        ) : (
          <>
            {/* Status Banner */}
            <motion.div key={order.status} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-primary/10 border border-primary/20 rounded-2xl p-5 text-center">
              <div className={`text-4xl mb-2 ${!isCompleted && !isCancelled ? 'animate-pulse' : ''}`}>
                {isCompleted ? '✅' : isCancelled ? '❌' : '🍳'}
              </div>
              <p className="text-lg font-extrabold text-primary">
                {isCancelled ? t('tracking.cancelled') : STATUS_STEPS[currentIdx]?.label}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                {isCancelled ? t('tracking.cancelledDesc') : STATUS_STEPS[currentIdx]?.sub}
              </p>
            </motion.div>

            {/* Progress Steps */}
            {!isCancelled && (
              <div className="bg-surface-container rounded-2xl p-5">
                {STATUS_STEPS.map((step, idx) => {
                  const done = idx < currentIdx;
                  const active = idx === currentIdx;
                  return (
                    <div key={step.key} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          done ? 'bg-primary text-white' :
                          active ? 'bg-primary text-white shadow-md shadow-primary/30' :
                          'bg-surface-container-high text-on-surface-variant/40'
                        }`}>
                          {done ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                        </div>
                        {idx < STATUS_STEPS.length - 1 && (
                          <div className={`w-0.5 h-8 mt-1 ${done ? 'bg-primary/50' : 'bg-surface-container-high'}`} />
                        )}
                      </div>
                      <div className="flex-1 pt-1.5 pb-6">
                        <p className={`text-sm font-bold ${active ? 'text-primary' : done ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
                          {step.label}
                        </p>
                        {active && <p className="text-xs text-on-surface-variant mt-0.5">{step.sub}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Items */}
            <div className="bg-surface-container rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-container-high">
                <p className="font-extrabold text-sm">{t('tracking.summary')}</p>
              </div>
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className={`px-4 py-3 flex justify-between text-sm ${idx < order.items.length - 1 ? 'border-b border-surface-container-high' : ''}`}>
                  <span className="text-on-surface-variant">{item.quantity}× {item.name}</span>
                  <span className="font-bold tabular-nums">{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="px-4 py-3 border-t border-surface-container-high flex justify-between font-extrabold">
                <span>{t('pickup.total')}</span>
                <span className="text-primary">{fmt(order.total ?? 0)}</span>
              </div>
            </div>

            <p className="text-center text-xs text-on-surface-variant">
              {t('tracking.payAtPickup')}
            </p>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 pt-4 border-t border-surface-container shrink-0 space-y-3">
        {isCompleted && (
          <button onClick={onViewOrders} className="w-full btn-gradient text-white rounded-2xl py-3.5 font-extrabold text-sm shadow-lg shadow-primary/20">
            {t('tracking.viewOrders')}
          </button>
        )}
        <button onClick={onClose} className="w-full bg-surface-container rounded-2xl py-3.5 font-bold text-sm">
          {t('tracking.backHome')}
        </button>
      </div>
    </div>
  );
};
