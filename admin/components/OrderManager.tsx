import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package, CheckCircle2, Clock, User, ChevronRight, Search,
  ChefHat, Timer, Archive, AlertTriangle, Bell, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { authFetch } from '../../src/lib/auth';
import { OrderArchive } from './OrderArchive';

interface CartItem { id: string; name: string; price: number; image: string; quantity: number; }
interface Order {
  _id: string; items: CartItem[]; total: number; status: string;
  customerName?: string; address?: string; tableNumber?: string; createdAt: string;
}

type OrderView = 'feed' | 'kds' | 'archive';
interface Toast { id: number; type: 'new' | 'preparing' | 'delivered'; orderRef: string; table?: string; }

export const OrderManager = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [view, setView] = useState<OrderView>('feed');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const [archiving, setArchiving] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [archiveMsg, setArchiveMsg] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');

  const tableNames = ['all', ...Array.from(new Set(orders.map(o => o.tableNumber).filter(Boolean) as string[]))].sort();

  const pushToast = useCallback((type: Toast['type'], orderRef: string, table?: string) => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, type, orderRef, table }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await authFetch('/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch (error) { console.error('Failed to fetch orders:', error); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const socket = io({ path: '/socket.io' });
    socket.emit('admin:join');
    socket.on('order:new', (order: Order) => { setOrders(prev => [order, ...prev]); pushToast('new', order._id.slice(-4).toUpperCase(), order.tableNumber); });
    socket.on('order:status', ({ id, status }: { id: string; status: string }) => {
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
      setSelectedOrder(prev => prev?._id === id ? { ...prev, status } : prev);
    });
    return () => { socket.disconnect(); };
  }, [fetchOrders]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await authFetch(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      const order = orders.find(o => o._id === id);
      if (status === 'Preparing') pushToast('preparing', id.slice(-4).toUpperCase(), order?.tableNumber);
      if (status === 'Delivered') pushToast('delivered', id.slice(-4).toUpperCase(), order?.tableNumber);
    } catch (error) { console.error('Failed to update status:', error); }
  };

  const handleArchiveToday = async () => {
    setArchiving(true); setArchiveMsg('');
    try {
      const res = await authFetch('/api/orders/archive-today', { method: 'POST' });
      if (res.ok) { const { archived } = await res.json(); setArchiveMsg(`${archived} order${archived !== 1 ? 's' : ''} archived.`); await fetchOrders(); }
    } catch { setArchiveMsg('Failed to archive. Try again.'); }
    finally { setArchiving(false); setArchiveConfirm(false); setTimeout(() => setArchiveMsg(''), 4000); }
  };

  const filteredOrders = orders.filter(order => {
    const matchSearch = order._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.tableNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchTable = tableFilter === 'all' || order.tableNumber === tableFilter;
    return matchSearch && matchTable;
  });

  const activeOrders   = orders.filter(o => o.status !== 'Delivered');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const pendingOrders  = orders.filter(o => o.status === 'Pending');
  const dismissToast   = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  if (view === 'archive') return <OrderArchive onBack={() => setView('feed')} />;

  if (view === 'kds') {
    return (
      <>
        <div className="h-full flex flex-col space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('orders.kdsHeading')}</h2>
              <p className="text-on-surface-variant font-medium">{t('orders.kdsSubtext')}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-xl text-sm font-bold">
                <ChefHat className="w-4 h-4 text-primary" />
                <span>{t('orders.preparingCount', { count: preparingOrders.length })}</span>
              </div>
              <button onClick={() => setView('feed')}
                className="px-6 py-3 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-all">
                {t('orders.backToFeed')}
              </button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-6 overflow-x-auto pb-6 no-scrollbar">
            {activeOrders.map((order, i) => (
              <motion.div key={order._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`flex flex-col bg-surface-container-low rounded-3xl border-s-8 overflow-hidden shadow-sm ${
                  order.status === 'Preparing' ? 'border-primary' : 'border-amber-400'
                }`}>
                <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('orders.orderLabel')}</span>
                    <h4 className="font-mono font-bold text-lg">#{order._id.slice(-4).toUpperCase()}</h4>
                  </div>
                  <div className="text-end">
                    <div className="flex items-center gap-1 text-xs font-bold text-on-surface-variant">
                      <Timer className="w-3 h-3" />
                      <span>{Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{order.status}</span>
                  </div>
                </div>
                <div className="p-5 flex-1 space-y-4 overflow-y-auto no-scrollbar">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center font-bold text-sm shrink-0">{item.quantity}</span>
                      <p className="font-bold text-sm leading-tight">{item.name}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-surface-container-high/50">
                  <button onClick={() => handleUpdateStatus(order._id, order.status === 'Pending' ? 'Preparing' : 'Delivered')}
                    className="w-full py-3 rounded-xl btn-gradient text-white font-bold text-sm shadow-lg shadow-primary/10 active:scale-95 transition-all">
                    {order.status === 'Pending' ? t('orders.startCooking') : t('orders.markReady')}
                  </button>
                </div>
              </motion.div>
            ))}
            {activeOrders.length === 0 && (
              <div className="col-span-4 flex flex-col items-center justify-center py-20 text-on-surface-variant/40">
                <ChefHat className="w-20 h-20 mb-4 opacity-20" />
                <p className="text-xl font-bold">{t('orders.kitchenClear')}</p>
                <p className="text-sm">{t('orders.noActiveOrders')}</p>
              </div>
            )}
          </div>
        </div>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="flex h-full gap-10">
      <div className="flex-1 space-y-10 overflow-y-auto no-scrollbar pe-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('orders.heading')}</h2>
            <p className="text-on-surface-variant font-medium">{t('orders.subtext')}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
              <input type="text" placeholder={t('orders.searchPlaceholder')}
                className="bg-surface-container-high border-none rounded-xl py-3 ps-12 pe-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select value={tableFilter} onChange={e => setTableFilter(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none">
              {tableNames.map(tb => <option key={tb} value={tb}>{tb === 'all' ? t('orders.allTables') : tb}</option>)}
            </select>
            <button onClick={() => setView('kds')}
              className="flex items-center gap-2 px-6 py-3 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-all">
              <ChefHat className="w-4 h-4" /> {t('orders.kdsView')}
            </button>
            <button onClick={() => setView('archive')}
              className="flex items-center gap-2 px-6 py-3 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-all">
              <Archive className="w-4 h-4" /> {t('orders.archive')}
            </button>
            <button onClick={() => setArchiveConfirm(true)} disabled={orders.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500/10 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-500/20 disabled:opacity-30 transition-all">
              <Archive className="w-4 h-4" /> {t('orders.archiveDay')}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {archiveConfirm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="flex-1 text-sm font-medium text-amber-800">
                {t('orders.archiveConfirmPrefix')} <strong>{orders.length}</strong> {t('orders.archiveConfirmSuffix')}
              </p>
              <button onClick={handleArchiveToday} disabled={archiving}
                className="px-5 py-2 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors">
                {archiving ? t('orders.archiving') : t('orders.confirm')}
              </button>
              <button onClick={() => setArchiveConfirm(false)}
                className="px-5 py-2 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-colors">
                {t('orders.cancel')}
              </button>
            </motion.div>
          )}
          {archiveMsg && !archiveConfirm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-3 text-emerald-700 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4" />{archiveMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-6">
          {[
            { labelKey: 'orders.pending',   count: pendingOrders.length,                          color: 'bg-amber-400' },
            { labelKey: 'orders.preparing', count: preparingOrders.length,                        color: 'bg-primary' },
            { labelKey: 'orders.ready',     count: orders.filter(o => o.status === 'Ready').length, color: 'bg-emerald-500' },
          ].map(stat => (
            <div key={stat.labelKey} className="bg-surface-container-low p-6 rounded-3xl flex items-center justify-between shadow-sm border border-outline-variant/10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">{t(stat.labelKey)}</p>
                <h4 className="text-3xl font-headline font-extrabold">{stat.count}</h4>
              </div>
              <div className={`w-12 h-12 rounded-2xl ${stat.color} opacity-10 flex items-center justify-center`}>
                <Package className="w-6 h-6" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order, i) => (
              <motion.div key={order._id} layout initial={{ opacity: 0, x: isRTL ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedOrder(order)}
                className={`group flex items-center p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10 hover:bg-surface-container-lowest hover:shadow-xl transition-all cursor-pointer ${
                  selectedOrder?._id === order._id ? 'ring-2 ring-primary bg-surface-container-lowest' : ''
                }`}>
                <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0 me-6 group-hover:scale-110 transition-transform">
                  <Package className={`w-6 h-6 ${order.status === 'Delivered' ? 'text-emerald-500' : order.status === 'Preparing' ? 'text-primary' : 'text-amber-500'}`} />
                </div>
                <div className="flex-1 grid grid-cols-5 gap-4">
                  {[
                    { labelKey: 'orders.orderId',  val: `#${order._id.slice(-6).toUpperCase()}`, mono: true },
                    { labelKey: 'orders.table',    val: order.tableNumber || '—' },
                    { labelKey: 'orders.customer', val: order.customerName || t('orders.guest'), truncate: true },
                    { labelKey: 'orders.items',    val: `${order.items.length} ${t('orders.items')}` },
                    { labelKey: 'orders.table',    val: `$${order.total.toFixed(2)}`, primary: true },
                  ].map((col, ci) => (
                    <div key={ci}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t(col.labelKey)}</p>
                      <p className={`font-bold text-sm ${col.mono ? 'font-mono' : ''} ${col.truncate ? 'truncate' : ''} ${col.primary ? 'text-primary' : ''}`}>{col.val}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6 ms-6">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'Preparing' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'
                  }`}>{order.status}</div>
                  <ChevronRight className="w-5 h-5 text-on-surface-variant/30 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:scale-x-[-1]" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Detail panel */}
      <div className="w-96 shrink-0 h-full">
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div key={selectedOrder._id}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
              className="h-full bg-surface-container-low rounded-4xl p-8 flex flex-col shadow-2xl shadow-primary/5">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-2xl font-headline font-extrabold tracking-tight">{t('orders.detailHeading')}</h3>
                  <p className="text-on-surface-variant font-mono text-sm mt-1">#{selectedOrder._id.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar">
                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('orders.guestInfo')}</h4>
                  <div className="bg-surface-container-lowest p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold">{selectedOrder.customerName || t('orders.guest')}</p>
                      <p className="text-xs text-on-surface-variant">{selectedOrder.address || '—'}</p>
                    </div>
                  </div>
                </section>
                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('orders.orderItems')}</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-surface-container-lowest p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-xs">{item.quantity}x</span>
                          <span className="font-semibold text-sm">{item.name}</span>
                        </div>
                        <span className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="bg-primary/5 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant font-medium">{t('orders.subtotal')}</span>
                    <span className="font-bold">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="h-[1px] bg-primary/10 w-full" />
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-bold">{t('orders.total')}</span>
                    <span className="text-2xl font-headline font-extrabold text-primary">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </section>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-4">
                <button onClick={() => handleUpdateStatus(selectedOrder._id, 'Preparing')}
                  className="py-4 rounded-2xl bg-surface-container-high font-bold text-sm hover:bg-surface-variant transition-all">
                  {t('orders.prepare')}
                </button>
                <button onClick={() => handleUpdateStatus(selectedOrder._id, 'Delivered')}
                  className="py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                  {t('orders.complete')}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full bg-surface-container-low/50 border-2 border-dashed border-outline-variant/30 rounded-4xl flex flex-col items-center justify-center p-12 text-center text-on-surface-variant/40">
              <Package className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold">{t('orders.noOrderSelected')}</p>
              <p className="text-sm">{t('orders.noOrderMsg')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const ToastStack = ({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) => {
  const { t } = useTranslation();

  const getLabel = (toast: Toast) => {
    const tableStr = toast.table ? t(`orders.toast${toast.type === 'new' ? 'NewTable' : toast.type === 'preparing' ? 'PreparingTable' : 'DeliveredTable'}`, { table: toast.table }) : '';
    const key = toast.type === 'new' ? 'orders.toastNew' : toast.type === 'preparing' ? 'orders.toastPreparing' : 'orders.toastDelivered';
    return t(key, { ref: toast.orderRef, table: tableStr });
  };

  const ICON: Record<Toast['type'], { icon: React.ReactNode; bg: string }> = {
    new:       { icon: <Bell className="w-5 h-5" />,          bg: 'bg-amber-500' },
    preparing: { icon: <ChefHat className="w-5 h-5" />,       bg: 'bg-primary' },
    delivered: { icon: <CheckCircle2 className="w-5 h-5" />,  bg: 'bg-emerald-500' },
  };

  return (
    <div className="fixed bottom-8 end-8 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const cfg = ICON[toast.type];
          return (
            <motion.div key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto flex items-center gap-3 pr-4 pl-4 py-3.5 rounded-2xl shadow-2xl text-white min-w-[280px] max-w-sm"
              style={{ background: 'rgba(30,30,40,0.97)', backdropFilter: 'blur(12px)' }}>
              <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>{cfg.icon}</div>
              <p className="flex-1 text-sm font-semibold leading-snug">{getLabel(toast)}</p>
              <button onClick={() => onDismiss(toast.id)} className="text-white/40 hover:text-white transition-colors ms-1 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
