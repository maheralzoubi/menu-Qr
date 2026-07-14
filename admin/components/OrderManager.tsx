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
import { formatCurrency } from '../../src/lib/currency';
import { pushNavParam, goBack } from '../lib/navHistory';

interface CartItem { id: string; name: string; price: number; image: string; quantity: number; note?: string; }
interface Order {
  _id: string; items: CartItem[]; total: number; status: string;
  customerName?: string; address?: string; tableNumber?: string; createdAt: string;
  order_source?: string; payment_status?: string; payment_method?: string; cashier_name?: string;
  order_note?: string;
}

const SOURCE_LABEL_KEY: Record<string, string> = { CASHIER_POS: 'CASHIER_POS', QR_CODE: 'QR_CODE', CUSTOMER_APP: 'CUSTOMER_APP' };
const STATUS_LABEL_KEY: Record<string, string> = { Pending: 'pending', Preparing: 'preparing', Ready: 'ready', Delivered: 'delivered', Cancelled: 'cancelled' };
const SOURCE_COLOR: Record<string, string> = {
  CASHIER_POS: 'bg-[#303942] text-white',
  QR_CODE:     'bg-primary/10 text-primary',
  CUSTOMER_APP:'bg-[#303942]/10 text-[#303942]',
};
const PAYMENT_COLOR: Record<string, string> = {
  PAID:                       'bg-primary/10 text-primary',
  UNPAID:                     'bg-[#303942]/10 text-[#303942]',
  PENDING_CASH:               'bg-primary/10 text-primary',
  PENDING_CARD_PAYMENT:       'bg-primary/15 text-primary',
  PENDING_CLIQ_VERIFICATION:  'bg-primary/20 text-primary',
  REFUNDED:                   'bg-[#303942]/10 text-[#303942]',
};

type OrderView = 'feed' | 'kds' | 'archive';
interface Toast { id: number; type: 'new' | 'preparing' | 'delivered'; orderRef: string; table?: string; }

function parseOrderNav(search: string): { view: OrderView; orderId: string | null } {
  const params = new URLSearchParams(search);
  const rawView = params.get('orderView');
  const view: OrderView = rawView === 'kds' || rawView === 'archive' ? rawView : 'feed';
  return { view, orderId: params.get('orderId') };
}

export const OrderManager = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const sourceLabel = (source?: string) => (source && SOURCE_LABEL_KEY[source]) ? t(`orders.sourceLabel.${SOURCE_LABEL_KEY[source]}`) : source;
  const statusLabel = (status: string) => STATUS_LABEL_KEY[status] ? t(`orders.${STATUS_LABEL_KEY[status]}`) : status;
  const paymentStatusLabel = (ps?: string) => ps ? t(`orders.paymentStatus.${ps}`, { defaultValue: ps.replace(/_/g, ' ') }) : ps;

  const [view, setView] = useState<OrderView>(() => parseOrderNav(window.location.search).view);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const [archiving, setArchiving] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [archiveMsg, setArchiveMsg] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(() => parseOrderNav(window.location.search).orderId);
  const selectedOrder = orders.find(o => o._id === selectedOrderId) ?? null;
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');

  useEffect(() => {
    const onPopState = () => {
      const next = parseOrderNav(window.location.search);
      setView(next.view);
      setSelectedOrderId(next.orderId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Entering a sub-view/detail pushes a real history entry so the browser
  // back button steps out of it instead of leaving the app; closing it
  // (backToFeed/closeOrder) undoes that via a normal back navigation.
  const enterView = useCallback((v: OrderView) => {
    setView(v);
    pushNavParam('orderView', v);
  }, []);

  const backToFeed = useCallback(() => { goBack(); }, []);

  const selectOrder = useCallback((id: string) => {
    setSelectedOrderId(id);
    pushNavParam('orderId', id);
  }, []);

  const closeOrder = useCallback(() => { goBack(); }, []);

  const tableNames = ['all', ...Array.from(new Set(orders.map(o => o.tableNumber).filter(Boolean) as string[]))].sort();

  const pushToast = useCallback((type: Toast['type'], orderRef: string, table?: string) => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, type, orderRef, table }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        authFetch('/api/orders'),
        authFetch('/api/settings/restaurant'),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (settingsRes.ok) { const s = await settingsRes.json(); if (s.currency) setCurrency(s.currency); }
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
      if (res.ok) { const { archived } = await res.json(); setArchiveMsg(t('orders.archivedSuccess', { count: archived })); await fetchOrders(); }
    } catch { setArchiveMsg(t('orders.archiveFailed')); }
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

  if (view === 'archive') return <OrderArchive onBack={backToFeed} />;

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
              <button onClick={backToFeed}
                className="px-6 py-3 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-all">
                {t('orders.backToFeed')}
              </button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-6 overflow-x-auto pb-6 no-scrollbar">
            {activeOrders.map((order, i) => (
              <motion.div key={order._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`flex flex-col bg-surface-container-low rounded-3xl border-s-8 overflow-hidden shadow-sm ${
                  order.status === 'Preparing' ? 'border-primary' : 'border-[#303942]'
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
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{statusLabel(order.status)}</span>
                    {order.order_source && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${SOURCE_COLOR[order.order_source] ?? 'bg-gray-100 text-gray-600'}`}>{sourceLabel(order.order_source)}</span>}
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
            <button onClick={() => enterView('kds')}
              className="flex items-center gap-2 px-6 py-3 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-all">
              <ChefHat className="w-4 h-4" /> {t('orders.kdsView')}
            </button>
            <button onClick={() => enterView('archive')}
              className="flex items-center gap-2 px-6 py-3 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-all">
              <Archive className="w-4 h-4" /> {t('orders.archive')}
            </button>
            <button onClick={() => setArchiveConfirm(true)} disabled={orders.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 disabled:opacity-30 transition-all">
              <Archive className="w-4 h-4" /> {t('orders.archiveDay')}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {archiveConfirm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-2xl px-6 py-4">
              <AlertTriangle className="w-5 h-5 text-primary shrink-0" />
              <p className="flex-1 text-sm font-medium text-on-surface">
                {t('orders.archiveConfirmPrefix')} <strong>{orders.length}</strong> {t('orders.archiveConfirmSuffix')}
              </p>
              <button onClick={handleArchiveToday} disabled={archiving}
                className="px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-container disabled:opacity-50 transition-colors">
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
              className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-6 py-3 text-primary font-medium text-sm">
              <CheckCircle2 className="w-4 h-4" />{archiveMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-6">
          {[
            { labelKey: 'orders.pending',   count: pendingOrders.length,                          color: 'bg-primary' },
            { labelKey: 'orders.preparing', count: preparingOrders.length,                        color: 'bg-primary' },
            { labelKey: 'orders.ready',     count: orders.filter(o => o.status === 'Ready').length, color: 'bg-[#303942]' },
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
                onClick={() => selectOrder(order._id)}
                className={`group flex items-center p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10 hover:bg-surface-container-lowest hover:shadow-xl transition-all cursor-pointer ${
                  selectedOrder?._id === order._id ? 'ring-2 ring-primary bg-surface-container-lowest' : ''
                }`}>
                {/* Source icon */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 me-5 group-hover:scale-110 transition-transform text-white text-[10px] font-extrabold tracking-wide ${
                  order.order_source === 'CASHIER_POS' ? 'bg-[#303942]' : order.order_source === 'QR_CODE' ? 'bg-primary' : 'bg-primary/70'
                }`}>
                  {order.order_source ? sourceLabel(order.order_source) : <Package className="w-5 h-5" />}
                </div>

                <div className="flex-1 grid grid-cols-5 gap-4 min-w-0">
                  {/* Order ID */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-0.5">{t('orders.orderId')}</p>
                    <p className="font-mono font-bold text-sm">#{order._id.slice(-6).toUpperCase()}</p>
                  </div>

                  {/* Table */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-0.5">{t('orders.table')}</p>
                    <p className="font-bold text-sm">{order.tableNumber || '—'}</p>
                  </div>

                  {/* Customer */}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-0.5">{t('orders.customer')}</p>
                    <p className="font-bold text-sm truncate">{order.customerName || t('orders.guest')}</p>
                  </div>

                  {/* Items */}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-0.5">{t('orders.items')}</p>
                    <p className="font-semibold text-sm truncate text-on-surface-variant">
                      {order.items.slice(0, 2).map(i => i.name).join(', ')}
                      {order.items.length > 2 && ` +${order.items.length - 2}`}
                    </p>
                  </div>

                  {/* Total */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-0.5">{t('orders.total')}</p>
                    <p className="font-extrabold text-sm text-primary">{formatCurrency(order.total, currency)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ms-5 flex-wrap justify-end shrink-0">
                  {order.payment_status && (
                    <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${PAYMENT_COLOR[order.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {paymentStatusLabel(order.payment_status)}
                    </span>
                  )}
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    order.status === 'Delivered' ? 'bg-primary/10 text-primary' :
                    order.status === 'Preparing' ? 'bg-primary/10 text-primary' :
                    order.status === 'Ready'     ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'Cancelled' ? 'bg-red-100 text-red-600' :
                    'bg-[#303942]/10 text-[#303942]'
                  }`}>{statusLabel(order.status)}</span>
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
                <button onClick={closeOrder} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
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
                      <div key={idx} className="bg-surface-container-lowest p-4 rounded-2xl space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-xs shrink-0">{item.quantity}x</span>
                            <span className="font-semibold text-sm">{item.name}</span>
                          </div>
                          <span className="font-bold text-sm">{formatCurrency(item.price * item.quantity, currency)}</span>
                        </div>
                        {item.note && (
                          <p className="text-xs text-on-surface-variant ms-11 italic">"{item.note}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
                {selectedOrder.order_note && (
                  <section className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('orders.orderNote')}</h4>
                    <div className="bg-surface-container-lowest p-4 rounded-2xl flex items-start gap-3">
                      <ChefHat className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" />
                      <p className="text-sm text-on-surface-variant italic">"{selectedOrder.order_note}"</p>
                    </div>
                  </section>
                )}

                <section className="bg-primary/5 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant font-medium">{t('orders.subtotal')}</span>
                    <span className="font-bold">{formatCurrency(selectedOrder.total, currency)}</span>
                  </div>
                  <div className="h-[1px] bg-primary/10 w-full" />
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-bold">{t('orders.total')}</span>
                    <span className="text-2xl font-headline font-extrabold text-primary">{formatCurrency(selectedOrder.total, currency)}</span>
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
    new:       { icon: <Bell className="w-5 h-5" />,          bg: 'bg-primary' },
    preparing: { icon: <ChefHat className="w-5 h-5" />,       bg: 'bg-primary' },
    delivered: { icon: <CheckCircle2 className="w-5 h-5" />,  bg: 'bg-[#303942]' },
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
