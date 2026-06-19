import { useState, useEffect } from 'react';
import { X, Phone, CheckCircle2, Circle, Clock, ChefHat, Package, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';

interface Props {
  orderId: string;
  onClose: () => void;
  onViewOrders: () => void;
}

const STATUS_STEPS = [
  { key: 'Pending',   label: 'Order Received',    icon: <Clock className="w-5 h-5" />,        sub: 'Your order has been received' },
  { key: 'Preparing', label: 'Preparing',          icon: <ChefHat className="w-5 h-5" />,      sub: 'The kitchen is preparing your order' },
  { key: 'Ready',     label: 'Ready for Pickup',   icon: <Package className="w-5 h-5" />,      sub: 'Your order is ready — come pick it up!' },
  { key: 'Delivered', label: 'Completed',          icon: <Check className="w-5 h-5" />,        sub: 'Enjoy your meal!' },
];

export const OrderTrackingScreen = ({ orderId, onClose, onViewOrders }: Props) => {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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

  const currentStep = STATUS_STEPS.findIndex(s => s.key === order?.status);
  const activeIdx = currentStep >= 0 ? currentStep : 0;
  const isCompleted = order?.status === 'Delivered' || order?.status === 'Completed';
  const isCancelled = order?.status === 'Cancelled';

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant">Order</p>
            <h1 className="text-xl font-extrabold font-headline">#{orderId.slice(-6).toUpperCase()}</h1>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="bg-surface-container rounded-2xl h-16 animate-pulse" />)}</div>
        ) : !order ? (
          <div className="text-center py-16 text-on-surface-variant"><p>Order not found</p></div>
        ) : (
          <>
            {/* Status Banner */}
            <motion.div
              key={order.status}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`rounded-2xl p-5 text-center ${
                isCompleted ? 'bg-emerald-50 border border-emerald-200' :
                isCancelled ? 'bg-red-50 border border-red-200' :
                'bg-primary/5 border border-primary/20'
              }`}
            >
              <div className={`text-4xl mb-2 ${isCompleted ? '' : 'animate-pulse'}`}>
                {isCompleted ? '✅' : isCancelled ? '❌' : '🍳'}
              </div>
              <p className={`text-lg font-extrabold ${
                isCompleted ? 'text-emerald-700' : isCancelled ? 'text-red-600' : 'text-primary'
              }`}>
                {isCancelled ? 'Order Cancelled' : STATUS_STEPS[activeIdx]?.label || order.status}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                {isCancelled ? 'Your order was cancelled' : STATUS_STEPS[activeIdx]?.sub}
              </p>
            </motion.div>

            {/* Progress Steps */}
            {!isCancelled && (
              <div className="bg-surface-container rounded-2xl p-5">
                <div className="space-y-0">
                  {STATUS_STEPS.map((step, idx) => {
                    const done = idx < activeIdx;
                    const active = idx === activeIdx;
                    return (
                      <div key={step.key} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            done ? 'bg-emerald-500 text-white' :
                            active ? 'bg-primary text-white shadow-md shadow-primary/30' :
                            'bg-surface text-on-surface-variant/40'
                          }`}>
                            {done ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                          </div>
                          {idx < STATUS_STEPS.length - 1 && (
                            <div className={`w-0.5 h-8 mt-1 ${done ? 'bg-emerald-300' : 'bg-surface-container'}`} />
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
              </div>
            )}

            {/* Order Items */}
            <div className="bg-surface rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-surface-container">
                <p className="font-extrabold text-sm">Order Summary</p>
              </div>
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className={`px-4 py-3 flex justify-between text-sm ${idx < order.items.length - 1 ? 'border-b border-surface-container' : ''}`}>
                  <span className="text-on-surface-variant">{item.quantity}× {item.name}</span>
                  <span className="font-bold tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="px-4 py-3 border-t border-surface-container flex justify-between font-extrabold">
                <span>Total</span>
                <span className="text-primary">${order.total?.toFixed(2)}</span>
              </div>
            </div>

            {/* Meta */}
            <div className="text-center text-xs text-on-surface-variant space-y-1">
              <p>Payment: <span className="font-bold text-on-surface">Pay at Pickup</span></p>
              {order.tableNumber && <p>Table: <span className="font-bold text-on-surface">{order.tableNumber}</span></p>}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 pt-4 border-t border-surface-container shrink-0 space-y-3">
        {isCompleted && (
          <button onClick={onViewOrders} className="w-full btn-gradient text-white rounded-2xl py-3.5 font-extrabold text-sm shadow-lg shadow-primary/20">
            View All Orders
          </button>
        )}
        <button onClick={onClose} className="w-full bg-surface-container rounded-2xl py-3.5 font-bold text-sm active:scale-98 transition-transform">
          Back to Home
        </button>
      </div>
    </div>
  );
};
