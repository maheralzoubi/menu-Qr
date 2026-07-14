import { useState, useEffect } from 'react';
import { Check, Utensils, Bell, PartyPopper, MessageSquare, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useFmt } from '../hooks/useCurrency';
import { io } from 'socket.io-client';
import { Skeleton } from '../components/Skeleton';
import { NotificationToast } from '../components/NotificationToast';
import { CartItem } from '../types';

interface Order {
  _id: string;
  id?: string;
  items: CartItem[];
  total: number;
  status: string;
  createdAt: string;
}

const STATUS_DEFS = [
  { title: 'Pending',   descKey: 'status.pendingDesc',   icon: <Check className="w-5 h-5" /> },
  { title: 'Preparing', descKey: 'status.preparingDesc', icon: <Utensils className="w-5 h-5" /> },
  { title: 'Ready',     descKey: 'status.readyDesc',     icon: <Bell className="w-5 h-5" /> },
  { title: 'Delivered', descKey: 'status.deliveredDesc', icon: <PartyPopper className="w-5 h-5" /> },
];

export const StatusScreen = ({ orderId }: { orderId: string | null }) => {
  const { t, i18n } = useTranslation();
  const fmt = useFmt();
  const isRTL = i18n.language === 'ar';

  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<Order[]>([]);
  const [statusIndex, setStatusIndex] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([]);
  const [isLoading, setIsLoading] = useState(!!orderId);
  const [view, setView] = useState<'current' | 'history'>(orderId ? 'current' : 'history');

  const pushNotification = (message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('The Artisan Kitchen', { body: message, icon: '/favicon.ico' });
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('order_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!orderId) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) return;
        const data: Order = await res.json();
        setOrder(data);
        const idx = STATUS_DEFS.findIndex(s => s.title === data.status);
        setStatusIndex(idx >= 0 ? idx : 0);
        if (data.status === 'Delivered') localStorage.removeItem('pending_order');
        setHistory(prev => {
          const key = data._id ?? data.id;
          const filtered = prev.filter(o => (typeof o === 'string' ? o : (o._id ?? o.id)) !== key);
          const updated = [data, ...filtered].slice(0, 20);
          localStorage.setItem('order_history', JSON.stringify(updated));
          return updated;
        });
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, { path: '/socket.io' });
    socket.emit('order:join', orderId);
    socket.on('order:status', ({ id, status }: { id: string; status: string }) => {
      if (id !== orderId) return;
      const idx = STATUS_DEFS.findIndex(s => s.title === status);
      if (idx >= 0) {
        setStatusIndex(idx);
        pushNotification(t('status.statusUpdate', { status: t(`status.${status}`, { defaultValue: status }) }));
        if (status === 'Delivered') localStorage.removeItem('pending_order');
        setHistory(prev => {
          const updated = prev.map(o => (o._id ?? o.id) === id ? { ...o, status } : o);
          localStorage.setItem('order_history', JSON.stringify(updated));
          return updated;
        });
      }
    });
    return () => { socket.disconnect(); };
  }, [orderId]);

  if (isLoading && history.length === 0) {
    return (
      <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-8">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  const orderKey = (o: Order) => o._id ?? o.id ?? '';

  return (
    <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-8">
      <AnimatePresence>
        {notifications.map(n => (
          <NotificationToast
            key={n.id}
            message={n.message}
            type="info"
            onClose={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
          />
        ))}
      </AnimatePresence>

      <div className="flex bg-surface-container-low p-1 rounded-2xl">
        <button
          onClick={() => setView('current')}
          disabled={!orderId}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'current' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant/60'} ${!orderId ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          {t('status.activeOrder')}
        </button>
        <button
          onClick={() => setView('history')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'history' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant/60'}`}
        >
          {t('status.history')}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'current' && orderId ? (
          <motion.div
            key="current"
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
            className="space-y-8"
          >
            <section className="text-center space-y-2">
              <span className="inline-block px-4 py-1.5 rounded-full bg-surface-container-high text-primary font-label text-xs font-bold tracking-widest uppercase">
                {t('status.orderNum', { id: orderId.slice(-6).toUpperCase() })}
              </span>
              <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
                {t(`status.${STATUS_DEFS[statusIndex].title}`, { defaultValue: STATUS_DEFS[statusIndex].title })}
              </h2>
              <p className="text-on-surface-variant text-sm px-8">{t(STATUS_DEFS[statusIndex].descKey)}</p>
            </section>

            <div className="bg-surface-container-low rounded-3xl p-8 space-y-8 relative overflow-hidden">
              <div className="relative flex flex-col gap-10">
                <div className="absolute start-[19px] top-4 bottom-4 w-0.5 bg-surface-container-highest" />
                <div
                  className="absolute start-[19px] top-4 w-0.5 bg-primary transition-all duration-1000"
                  style={{ height: `${(statusIndex / (STATUS_DEFS.length - 1)) * 100}%` }}
                />

                {STATUS_DEFS.map((s, i) => (
                  <div key={s.title} className={`flex items-start gap-6 relative transition-opacity duration-500 ${i > statusIndex ? 'opacity-40' : 'opacity-100'}`}>
                    <div className={`z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all duration-500 ${
                      i < statusIndex ? 'bg-primary text-on-primary' :
                      i === statusIndex ? 'bg-primary text-on-primary animate-pulse shadow-lg shadow-primary/30' :
                      'bg-surface-container-highest text-on-surface-variant'
                    }`}>
                      {i < statusIndex ? <Check className="w-5 h-5" /> : s.icon}
                    </div>
                    <div className="pt-1">
                      <h3 className={`font-headline font-bold transition-colors duration-500 ${i === statusIndex ? 'text-primary' : 'text-on-surface'}`}>
                        {t(`status.${s.title}`, { defaultValue: s.title })}
                      </h3>
                      <p className="text-xs text-on-surface-variant">{t(s.descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <section className="space-y-4">
              <h3 className="font-headline font-bold text-lg px-2">{t('status.orderSummary')}</h3>
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-6">
                {order?.items.map(item => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={item.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h4 className="font-headline font-bold text-sm">{item.name}</h4>
                        <span className="text-sm font-semibold">{fmt(item.price)}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">{t('status.qty', { qty: item.quantity })}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-outline-variant/20 flex justify-between items-center">
                  <span className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">{t('status.totalPaid')}</span>
                  <span className="font-headline font-extrabold text-xl text-primary">{fmt(order?.total ?? 0)}</span>
                </div>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-2">
              <h2 className="font-headline text-2xl font-bold">{t('status.pastOrders')}</h2>
              <History className="w-5 h-5 text-on-surface-variant/40" />
            </div>

            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-20 bg-surface-container-low rounded-3xl space-y-4">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto text-on-surface-variant/20">
                    <History className="w-8 h-8" />
                  </div>
                  <p className="text-on-surface-variant font-medium">{t('status.noHistory')}</p>
                </div>
              ) : (
                history.map(prevOrder => (
                  <div key={orderKey(prevOrder)} className="bg-surface-container-low p-6 rounded-3xl shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-on-surface">
                          {t('status.orderNum', { id: orderKey(prevOrder).slice(-4).toUpperCase() })}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                          {new Date(prevOrder.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${prevOrder.status === 'Delivered' ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                        {t(`status.${prevOrder.status}`, { defaultValue: prevOrder.status })}
                      </span>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-outline-variant/10">
                      <div className="flex -space-x-3">
                        {prevOrder.items.slice(0, 3).map((item, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-surface-container-low overflow-hidden">
                            <img src={item.image} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {prevOrder.items.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-surface-container-low flex items-center justify-center text-[8px] font-bold">
                            +{prevOrder.items.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="text-end">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">{t('status.total')}</p>
                        <p className="font-headline font-bold text-lg text-primary">{fmt(prevOrder.total)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button className="w-full py-4 rounded-2xl bg-surface-container text-on-surface-variant font-bold text-sm flex items-center justify-center gap-2">
        <MessageSquare className="w-4 h-4" /> {t('status.needHelp')}
      </button>
    </div>
  );
};
