import { useState, useEffect } from 'react';
import { Package, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useFmt } from '../hooks/useCurrency';
import { io } from 'socket.io-client';

interface Props {
  onOpenTracking: (orderId: string) => void;
}

type Tab = 'current' | 'past';

const STATUS_COLORS: Record<string, string> = {
  Pending:   'bg-surface-container-high text-on-surface-variant',
  Preparing: 'bg-primary/20 text-primary',
  Ready:     'bg-primary/30 text-primary',
  Delivered: 'bg-primary/20 text-primary',
  Cancelled: 'bg-surface-container-high text-on-surface-variant',
};

const ACTIVE_STATUSES = ['Pending', 'Preparing', 'Ready'];

export const OrdersScreen = ({ onOpenTracking }: Props) => {
  const { t, i18n } = useTranslation();
  const fmt = useFmt();
  const isRTL = i18n.language === 'ar';

  const [tab, setTab] = useState<Tab>('current');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('order_history') || '[]');
      const history = raw.map((e: any) => typeof e === 'string' ? e : (e._id ?? e.id)).filter(Boolean);
      if (!history.length) { setLoading(false); return; }
      Promise.all(history.slice(0, 20).map((id: string) => fetch(`/api/orders/${id}`).then(r => r.ok ? r.json() : null)))
        .then(results => { setOrders(results.filter(Boolean)); setLoading(false); })
        .catch(() => setLoading(false));
    } catch { setLoading(false); }
  }, []);

  // Live status updates
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, { path: '/socket.io' });
    socket.on('order:status', ({ id, status }: { id: string; status: string }) => {
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
    });
    return () => { socket.disconnect(); };
  }, []);

  const currentOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));
  const displayOrders = tab === 'current' ? currentOrders : pastOrders;

  return (
    <div className="bg-surface min-h-screen">
      <div className="bg-surface px-5 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-extrabold font-headline mb-4">{t('ordersPage.title')}</h1>
        <div className="flex gap-1 bg-surface-container rounded-2xl p-1">
          {(['current', 'past'] as Tab[]).map(tt => (
            <button key={tt} onClick={() => setTab(tt)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === tt ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'
              }`}>
              {tt === 'current'
                ? `${t('ordersPage.active')} (${currentOrders.length})`
                : `${t('ordersPage.past')} (${pastOrders.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-surface-container rounded-2xl h-24 animate-pulse" />)}</div>
        ) : displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
            <Package className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">
              {tab === 'current' ? t('ordersPage.noActive') : t('ordersPage.noPast')}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {displayOrders.map((order, idx) => (
                <motion.button key={order._id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenTracking(order._id)}
                  className="w-full bg-surface-container rounded-2xl p-4 text-start border border-surface-container-high">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-extrabold text-sm">#{order._id?.slice(-6).toUpperCase()}</p>
                      <div className="flex items-center gap-1 text-on-surface-variant mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.span key={order.status} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-surface-container-high text-on-surface-variant'}`}>
                        {t(`status.${order.status}`, { defaultValue: order.status })}
                      </motion.span>
                      <ChevronRight className={`w-4 h-4 text-on-surface-variant/40 ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant truncate">
                    {order.items?.slice(0,3).map((i: any) => `${i.quantity}× ${i.name}`).join(' · ')}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-on-surface-variant">
                      {order.items?.length} {order.items?.length !== 1 ? t('pickup.items') : t('pickup.item')}
                    </span>
                    <span className="font-extrabold text-sm text-primary">{fmt(order.total ?? 0)}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
