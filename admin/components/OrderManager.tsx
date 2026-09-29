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
  order_note?: string; order_type?: string; pickup_time?: string;
}

const SOURCE_LABEL_KEY: Record<string, string> = { CASHIER_POS: 'CASHIER_POS', QR_CODE: 'QR_CODE', CUSTOMER_APP: 'CUSTOMER_APP' };
const STATUS_LABEL_KEY: Record<string, string> = { Pending: 'pending', Preparing: 'preparing', Ready: 'ready', Delivered: 'delivered', Cancelled: 'cancelled' };
const SOURCE_COLOR: Record<string, string> = {
  CASHIER_POS: 'ds-chip-neutral',
  QR_CODE:     'ds-chip-brand',
  CUSTOMER_APP:'ds-chip-info',
};
// Source tile (order list): tinted square carrying the short source label
const SOURCE_TILE: Record<string, string> = {
  CASHIER_POS: 'bg-surface-container text-on-surface',
  QR_CODE:     'bg-acc-soft text-acc',
  CUSTOMER_APP:'bg-info1 text-info7',
};
const PAYMENT_COLOR: Record<string, string> = {
  PAID:                       'ds-chip-pos',
  UNPAID:                     'ds-chip-warn',
  PENDING_CASH:               'ds-chip-warn',
  PENDING_CARD_PAYMENT:       'ds-chip-warn',
  PENDING_CLIQ_VERIFICATION:  'ds-chip-warn',
  REFUNDED:                   'ds-chip-neutral',
};
const STATUS_CHIP: Record<string, string> = {
  Pending:   'ds-chip-warn',
  Preparing: 'ds-chip-info',
  Ready:     'ds-chip-pos',
  Delivered: 'ds-chip-neutral',
  Cancelled: 'ds-chip-neg',
};
// KDS ticket accent (inline-start border) per status
const STATUS_ACCENT: Record<string, string> = {
  Pending:   'border-s-warn5',
  Preparing: 'border-s-info5',
  Ready:     'border-s-pos5',
  Cancelled: 'border-s-neg5',
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
        <div className="h-full flex flex-col space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="ds-page-title">{t('orders.kdsHeading')}</h1>
              <p className="ds-page-sub">{t('orders.kdsSubtext')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="ds-chip ds-chip-info h-9 px-3 text-[13px]">
                <ChefHat className="w-4 h-4" />
                <span>{t('orders.preparingCount', { count: preparingOrders.length })}</span>
              </span>
              <button onClick={backToFeed} className="ds-btn ds-btn-outline ds-btn-sm">
                {t('orders.backToFeed')}
              </button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 content-start">
            {activeOrders.map((order, i) => (
              <motion.div key={order._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`ds-card flex flex-col overflow-hidden border-s-4 ${STATUS_ACCENT[order.status] ?? 'border-s-line'}`}>
                <div className="px-4 py-3 border-b border-line flex justify-between items-start gap-3">
                  <div>
                    <span className="ds-overline">{t('orders.orderLabel')}</span>
                    <h4 className="font-mono font-semibold text-base text-on-surface">#{order._id.slice(-4).toUpperCase()}</h4>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-on-surface-variant tabular">
                      <Timer className="w-3.5 h-3.5" />
                      <span>{Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m</span>
                    </div>
                    <span className={`ds-chip ${STATUS_CHIP[order.status] ?? 'ds-chip-neutral'}`}>{statusLabel(order.status)}</span>
                    {order.order_source && <span className={`ds-chip ${SOURCE_COLOR[order.order_source] ?? 'ds-chip-neutral'}`}>{sourceLabel(order.order_source)}</span>}
                  </div>
                </div>
                <div className="p-4 flex-1 space-y-3 overflow-y-auto no-scrollbar">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center font-semibold text-[13px] tabular shrink-0">{item.quantity}</span>
                      <p className="font-medium text-sm leading-snug text-on-surface pt-1">{item.name}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-line">
                  <button onClick={() => handleUpdateStatus(order._id, order.status === 'Pending' ? 'Preparing' : 'Delivered')}
                    className="ds-btn ds-btn-primary w-full">
                    {order.status === 'Pending' ? t('orders.startCooking') : t('orders.markReady')}
                  </button>
                </div>
              </motion.div>
            ))}
            {activeOrders.length === 0 && (
              <div className="col-span-full ds-empty">
                <ChefHat className="w-8 h-8 opacity-40" />
                <p className="text-sm font-semibold text-on-surface">{t('orders.kitchenClear')}</p>
                <p className="text-[13px]">{t('orders.noActiveOrders')}</p>
              </div>
            )}
          </div>
        </div>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar lg:pe-2 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ds-page-title">{t('orders.heading')}</h1>
            <p className="ds-page-sub">{t('orders.subtext')}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[160px] sm:flex-none sm:w-56">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input type="text" placeholder={t('orders.searchPlaceholder')}
                className="ds-input h-9 ps-9"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select value={tableFilter} onChange={e => setTableFilter(e.target.value)}
              className="ds-select h-9 w-auto">
              {tableNames.map(tb => <option key={tb} value={tb}>{tb === 'all' ? t('orders.allTables') : tb}</option>)}
            </select>
            <button onClick={() => enterView('kds')} className="ds-btn ds-btn-outline ds-btn-sm">
              <ChefHat className="w-4 h-4" /> {t('orders.kdsView')}
            </button>
            <button onClick={() => enterView('archive')} className="ds-btn ds-btn-outline ds-btn-sm">
              <Archive className="w-4 h-4" /> {t('orders.archive')}
            </button>
            <button onClick={() => setArchiveConfirm(true)} disabled={orders.length === 0}
              className="ds-btn ds-btn-primary ds-btn-sm">
              <Archive className="w-4 h-4" /> {t('orders.archiveDay')}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {archiveConfirm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex flex-wrap items-center gap-3 bg-warn1 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-warn7 shrink-0" />
              <p className="flex-1 min-w-[180px] text-sm text-on-surface">
                {t('orders.archiveConfirmPrefix')} <strong className="font-semibold">{orders.length}</strong> {t('orders.archiveConfirmSuffix')}
              </p>
              <button onClick={handleArchiveToday} disabled={archiving} className="ds-btn ds-btn-primary ds-btn-sm">
                {archiving ? t('orders.archiving') : t('orders.confirm')}
              </button>
              <button onClick={() => setArchiveConfirm(false)} className="ds-btn ds-btn-outline ds-btn-sm">
                {t('orders.cancel')}
              </button>
            </motion.div>
          )}
          {archiveMsg && !archiveConfirm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="ds-card flex items-center gap-3 px-4 py-3 text-sm font-medium text-on-surface">
              <CheckCircle2 className="w-4 h-4 text-pos6 shrink-0" />{archiveMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { labelKey: 'orders.pending',   count: pendingOrders.length,                          tile: 'bg-warn1 text-warn7', icon: <Clock className="w-5 h-5" /> },
            { labelKey: 'orders.preparing', count: preparingOrders.length,                        tile: 'bg-info1 text-info7', icon: <ChefHat className="w-5 h-5" /> },
            { labelKey: 'orders.ready',     count: orders.filter(o => o.status === 'Ready').length, tile: 'bg-pos1 text-pos7',   icon: <CheckCircle2 className="w-5 h-5" /> },
          ].map(stat => (
            <div key={stat.labelKey} className="ds-card p-3.5 sm:p-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="ds-metric-lbl truncate">{t(stat.labelKey)}</p>
                <p className="ds-metric-val tabular mt-1 text-xl sm:text-[28px]">{stat.count}</p>
              </div>
              <div className={`hidden sm:flex ds-icon-tile ${stat.tile}`}>
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order, i) => (
              <motion.div key={order._id} layout initial={{ opacity: 0, x: isRTL ? 8 : -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => selectOrder(order._id)}
                className={`group ds-card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 hover:bg-surface-container-low transition-colors cursor-pointer ${
                  selectedOrder?._id === order._id ? 'ring-2 ring-primary' : ''
                }`}>
                <div className="flex items-center gap-3">
                  {/* Source icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-semibold tracking-wide ${
                    (order.order_source && SOURCE_TILE[order.order_source]) || 'bg-acc-soft text-acc'
                  }`}>
                    {order.order_source ? sourceLabel(order.order_source) : <Package className="w-5 h-5" />}
                  </div>

                  {/* Compact mobile summary */}
                  <div className="sm:hidden min-w-0 flex-1">
                    <p className="font-mono font-semibold text-sm text-on-surface">#{order._id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-on-surface-variant truncate">{order.customerName || t('orders.guest')}</p>
                  </div>
                  <span className={`sm:hidden shrink-0 ds-chip ${STATUS_CHIP[order.status] ?? 'ds-chip-neutral'}`}>{statusLabel(order.status)}</span>
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 min-w-0">
                  {/* Order ID */}
                  <div className="hidden sm:block">
                    <p className="ds-overline mb-0.5">{t('orders.orderId')}</p>
                    <p className="font-mono font-semibold text-sm text-on-surface">#{order._id.slice(-6).toUpperCase()}</p>
                  </div>

                  {/* Table */}
                  <div>
                    <p className="ds-overline mb-0.5">{t('orders.table')}</p>
                    <p className="font-semibold text-sm text-on-surface">{order.tableNumber || '—'}</p>
                  </div>

                  {/* Customer */}
                  <div className="hidden sm:block min-w-0">
                    <p className="ds-overline mb-0.5">{t('orders.customer')}</p>
                    <p className="font-semibold text-sm text-on-surface truncate">{order.customerName || t('orders.guest')}</p>
                  </div>

                  {/* Items */}
                  <div className="min-w-0">
                    <p className="ds-overline mb-0.5">{t('orders.items')}</p>
                    <p className="text-sm truncate text-on-surface-variant">
                      {order.items.slice(0, 2).map(i => i.name).join(', ')}
                      {order.items.length > 2 && ` +${order.items.length - 2}`}
                    </p>
                  </div>

                  {/* Total */}
                  <div>
                    <p className="ds-overline mb-0.5">{t('orders.total')}</p>
                    <p className="font-semibold text-sm tabular text-on-surface">{formatCurrency(order.total, currency)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                  {order.payment_status && (
                    <span className={`ds-chip ${PAYMENT_COLOR[order.payment_status] ?? 'ds-chip-neutral'}`}>
                      {paymentStatusLabel(order.payment_status)}
                    </span>
                  )}
                  <span className={`hidden sm:inline-flex ds-chip ${STATUS_CHIP[order.status] ?? 'ds-chip-neutral'}`}>{statusLabel(order.status)}</span>
                  <ChevronRight className="hidden sm:block w-4 h-4 text-on-surface-variant transition-transform rtl:-scale-x-100" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Detail panel */}
      <div className="lg:w-96 shrink-0 lg:h-full">
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div key={selectedOrder._id}
              initial={{ opacity: 0, x: isRTL ? -8 : 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? -8 : 8 }}
              className="fixed inset-0 z-40 lg:static lg:inset-auto lg:z-auto h-full bg-card lg:border lg:border-line lg:rounded-2xl lg:shadow-sm flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-line flex justify-between items-start gap-3 shrink-0">
                <div className="min-w-0">
                  <h3 className="ds-section-title">{t('orders.detailHeading')}</h3>
                  <p className="text-on-surface-variant font-mono text-xs mt-0.5 truncate">#{selectedOrder._id.toUpperCase()}</p>
                </div>
                <button onClick={closeOrder} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 p-5 space-y-6 overflow-y-auto no-scrollbar">
                <section className="space-y-2">
                  <h4 className="ds-overline">{t('orders.guestInfo')}</h4>
                  <div className="ds-inset p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-acc-soft text-acc flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-on-surface">{selectedOrder.customerName || t('orders.guest')}</p>
                      <p className="text-xs text-on-surface-variant">{selectedOrder.address || '—'}</p>
                      {(selectedOrder.order_type || selectedOrder.pickup_time) && (
                        <p className="text-xs font-semibold text-acc mt-1">
                          {selectedOrder.order_type ? t(`orders.types.${selectedOrder.order_type}`, { defaultValue: selectedOrder.order_type }) : ''}
                          {selectedOrder.pickup_time ? ` · ${t('orders.pickupTime')}: ${selectedOrder.pickup_time}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
                <section className="space-y-2">
                  <h4 className="ds-overline">{t('orders.orderItems')}</h4>
                  <div className="ds-inset px-3.5">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="py-3 space-y-1 border-b border-line last:border-0">
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-lg bg-card border border-line flex items-center justify-center font-semibold text-xs tabular shrink-0">{item.quantity}x</span>
                            <span className="font-medium text-sm text-on-surface">{item.name}</span>
                          </div>
                          <span className="font-semibold text-sm tabular text-on-surface shrink-0">{formatCurrency(item.price * item.quantity, currency)}</span>
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
                    <h4 className="ds-overline">{t('orders.orderNote')}</h4>
                    <div className="ds-inset p-3.5 flex items-start gap-3">
                      <ChefHat className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" />
                      <p className="text-sm text-on-surface-variant italic">"{selectedOrder.order_note}"</p>
                    </div>
                  </section>
                )}

                <section className="ds-inset p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">{t('orders.subtotal')}</span>
                    <span className="font-semibold tabular text-on-surface">{formatCurrency(selectedOrder.total, currency)}</span>
                  </div>
                  <div className="h-px bg-line w-full" />
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-semibold text-on-surface">{t('orders.total')}</span>
                    <span className="text-2xl font-display font-bold tabular text-on-surface">{formatCurrency(selectedOrder.total, currency)}</span>
                  </div>
                </section>
              </div>
              <div className="px-5 py-4 border-t border-line grid grid-cols-2 gap-3 shrink-0">
                <button onClick={() => handleUpdateStatus(selectedOrder._id, 'Preparing')}
                  className="ds-btn ds-btn-secondary ds-btn-lg">
                  {t('orders.prepare')}
                </button>
                <button onClick={() => handleUpdateStatus(selectedOrder._id, 'Delivered')}
                  className="ds-btn ds-btn-primary ds-btn-lg">
                  {t('orders.complete')}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="hidden lg:flex h-full ds-empty">
              <Package className="w-8 h-8 opacity-40" />
              <p className="text-sm font-semibold text-on-surface">{t('orders.noOrderSelected')}</p>
              <p className="text-[13px]">{t('orders.noOrderMsg')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export const ToastStack = ({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) => {
  const { t } = useTranslation();

  const getLabel = (toast: Toast) => {
    const tableStr = toast.table ? t(`orders.toast${toast.type === 'new' ? 'NewTable' : toast.type === 'preparing' ? 'PreparingTable' : 'DeliveredTable'}`, { table: toast.table }) : '';
    const key = toast.type === 'new' ? 'orders.toastNew' : toast.type === 'preparing' ? 'orders.toastPreparing' : 'orders.toastDelivered';
    return t(key, { ref: toast.orderRef, table: tableStr });
  };

  const ICON: Record<Toast['type'], { icon: React.ReactNode; bg: string }> = {
    new:       { icon: <Bell className="w-4 h-4" />,          bg: 'bg-primary text-on-primary' },
    preparing: { icon: <ChefHat className="w-4 h-4" />,       bg: 'bg-info1 text-info7' },
    delivered: { icon: <CheckCircle2 className="w-4 h-4" />,  bg: 'bg-pos1 text-pos7' },
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 inset-x-4 sm:inset-x-auto sm:end-6 z-[9999] flex flex-col gap-2 items-stretch sm:items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const cfg = ICON[toast.type];
          return (
            <motion.div key={toast.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-line shadow-lg text-on-surface w-full sm:min-w-[280px] sm:max-w-sm">
              <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>{cfg.icon}</div>
              <p className="flex-1 text-sm font-medium leading-snug">{getLabel(toast)}</p>
              <button onClick={() => onDismiss(toast.id)} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm w-8 h-8 text-on-surface-variant hover:text-on-surface ms-1 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
