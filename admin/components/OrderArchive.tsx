import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, Calendar, ChevronLeft, ChevronRight,
  Package, User, X, Download, Inbox, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../src/lib/auth';
import { formatCurrency } from '../../src/lib/currency';
import { pushNavParam, goBack } from '../lib/navHistory';

interface CartItem { id: string; name: string; price: number; quantity: number; }
interface ArchivedOrder {
  _id: string; items: CartItem[]; total: number; discount: number; promoCode?: string;
  status: string; customerName?: string; address?: string; tableNumber?: string;
  createdAt: string; archivedAt: string;
}
interface ArchiveResult { orders: ArchivedOrder[]; total: number; page: number; pages: number; }

const STATUS_OPTIONS = ['', 'Pending', 'Preparing', 'Ready', 'Delivered'];
const STATUS_LABEL_KEY: Record<string, string> = { Pending: 'pending', Preparing: 'preparing', Ready: 'ready', Delivered: 'delivered', Cancelled: 'cancelled' };
const PAGE_SIZE = 50;

const STATUS_CHIP: Record<string, string> = {
  Pending:   'ds-chip-warn',
  Preparing: 'ds-chip-info',
  Ready:     'ds-chip-pos',
  Delivered: 'ds-chip-neutral',
  Cancelled: 'ds-chip-neg',
};
const statusStyle = (s: string) => STATUS_CHIP[s] ?? 'ds-chip-neutral';

export const OrderArchive = ({ onBack }: { onBack: () => void }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const statusLabel = (s: string) => STATUS_LABEL_KEY[s] ? t(`orders.${STATUS_LABEL_KEY[s]}`) : s;

  const [currency, setCurrency]          = useState('USD');
  const [result, setResult]             = useState<ArchiveResult | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('archiveOrderId')
  );
  const selectedOrder = (result?.orders ?? []).find(o => o._id === selectedOrderId) ?? null;
  const [search, setSearch]             = useState('');
  const [status, setStatus]             = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [tableNumber, setTableNumber]   = useState('');
  const [page, setPage]                 = useState(1);

  useEffect(() => {
    const onPopState = () => setSelectedOrderId(new URLSearchParams(window.location.search).get('archiveOrderId'));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const selectOrder = useCallback((order: ArchivedOrder) => {
    setSelectedOrderId(order._id);
    pushNavParam('archiveOrderId', order._id);
  }, []);

  const closeOrder = useCallback(() => { goBack(); }, []);

  const fetchArchive = useCallback(async (p = page) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)      params.set('search', search);
      if (status)      params.set('status', status);
      if (dateFrom)    params.set('dateFrom', dateFrom);
      if (dateTo)      params.set('dateTo', dateTo);
      if (tableNumber) params.set('tableNumber', tableNumber);
      params.set('page', String(p));
      params.set('limit', String(PAGE_SIZE));
      const res = await authFetch(`/api/orders/archived?${params}`);
      if (res.ok) setResult(await res.json());
    } catch (e) { console.error('Failed to fetch archive:', e); }
    finally { setIsLoading(false); }
  }, [search, status, dateFrom, dateTo, tableNumber, page]);

  useEffect(() => { fetchArchive(1); setPage(1); }, [search, status, dateFrom, dateTo, tableNumber]); // eslint-disable-line
  useEffect(() => { fetchArchive(page); }, [page]); // eslint-disable-line
  useEffect(() => { authFetch('/api/settings/restaurant').then(r => r.ok ? r.json() : null).then(s => { if (s?.currency) setCurrency(s.currency); }); }, []);

  const handleExportCSV = () => {
    if (!result?.orders.length) return;
    const rows = [
      [
        t('orderArchive.orderId'), t('orderArchive.date'), t('orderArchive.archivedAt'),
        t('orderArchive.tableLabel'), t('orderArchive.customerLabel'), t('orderArchive.itemsLabel'),
        t('orderArchive.totalLabel'), t('orderArchive.discount'), t('orderArchive.statusLabel'),
      ],
      ...result.orders.map(o => [
        o._id, new Date(o.createdAt).toLocaleString(), new Date(o.archivedAt).toLocaleString(),
        o.tableNumber || '', o.customerName || t('orders.guest'),
        o.items.map(i => `${i.quantity}x ${i.name}`).join('; '),
        o.total.toFixed(2), o.discount?.toFixed(2) ?? '0.00', statusLabel(o.status),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-archive-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const orders = result?.orders ?? [];
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar lg:pe-2 min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <button onClick={onBack} className="ds-btn ds-btn-ghost ds-btn-sm -ms-3 mb-2 text-on-surface-variant hover:text-on-surface">
              <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('orderArchive.backToOrders')}
            </button>
            <h1 className="ds-page-title">{t('orderArchive.heading')}</h1>
            <p className="ds-page-sub">
              {result ? t('orderArchive.archivedCount', { total: result.total.toLocaleString() }) : t('orderArchive.loading')}
            </p>
          </div>
          <button onClick={handleExportCSV} disabled={!orders.length} className="ds-btn ds-btn-outline ds-btn-sm shrink-0">
            <Download className="w-4 h-4" /> {t('orderArchive.exportCsv')}
          </button>
        </div>

        {/* Summary strip */}
        {result && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { labelKey: 'orderArchive.totalOrders', value: result.total.toLocaleString() },
              { labelKey: 'orderArchive.shown',       value: orders.length.toLocaleString() },
              { labelKey: 'orderArchive.revenuePage', value: formatCurrency(totalRevenue, currency) },
            ].map(s => (
              <div key={s.labelKey} className="ds-card p-3.5 sm:p-5 min-w-0">
                <p className="ds-metric-lbl truncate">{t(s.labelKey)}</p>
                <p className="ds-metric-val tabular mt-1 text-lg sm:text-[28px] truncate">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="ds-card p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[160px] sm:flex-none sm:w-56">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input type="text" placeholder={t('orderArchive.searchPlaceholder')} value={search}
              onChange={e => setSearch(e.target.value)}
              className="ds-input h-9 ps-9 pe-8" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative flex items-center">
            <Filter className="w-4 h-4 text-on-surface-variant absolute start-3 pointer-events-none" />
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="ds-select h-9 w-auto ps-9">
              <option value="">{t('orderArchive.allStatuses')}</option>
              {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>
          <input type="text" placeholder={t('orderArchive.tablePlaceholder')} value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
            className="ds-input h-9 w-28" />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-on-surface-variant shrink-0" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="ds-input h-9 w-auto" />
            <ArrowRight className="w-4 h-4 text-on-surface-variant shrink-0 rtl:-scale-x-100" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="ds-input h-9 w-auto" />
          </div>
          {[
            { labelKey: 'orderArchive.today', days: 0 },
            { labelKey: 'orderArchive.week',  days: 7 },
            { labelKey: 'orderArchive.month', days: 30 },
          ].map(({ labelKey, days }) => (
            <button key={labelKey} onClick={() => {
              const from = new Date(); from.setDate(from.getDate() - days);
              setDateFrom(from.toISOString().slice(0, 10));
              setDateTo(new Date().toISOString().slice(0, 10));
            }} className="ds-btn ds-btn-secondary ds-btn-sm">
              {t(labelKey)}
            </button>
          ))}
          {(search || status || dateFrom || dateTo || tableNumber) && (
            <button onClick={() => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); setTableNumber(''); }}
              className="ds-btn ds-btn-ghost ds-btn-sm text-error">
              {t('orderArchive.clearAll')}
            </button>
          )}
        </div>

        {/* Orders list */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-surface-container rounded-2xl animate-pulse" />)}</div>
        ) : orders.length === 0 ? (
          <div className="ds-empty">
            <Inbox className="w-8 h-8 opacity-40" />
            <p className="text-sm font-semibold text-on-surface">{t('orderArchive.noArchived')}</p>
            <p className="text-[13px]">{t('orderArchive.adjustFilters')}</p>
          </div>
        ) : (
          <div className="ds-card p-0 overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>{t('orderArchive.orderId')}</th>
                  <th>{t('orderArchive.date')}</th>
                  <th>{t('orderArchive.tableLabel')}</th>
                  <th>{t('orderArchive.customerLabel')}</th>
                  <th>{t('orderArchive.itemsLabel')}</th>
                  <th className="text-end">{t('orderArchive.totalLabel')}</th>
                  <th>{t('orderArchive.statusLabel')}</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {orders.map((order, i) => (
                    <motion.tr key={order._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      onClick={() => selectOrder(order)}
                      className={`group cursor-pointer ${selectedOrder?._id === order._id ? 'bg-acc-soft' : ''}`}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-on-surface-variant" />
                          </div>
                          <span className="font-mono font-semibold whitespace-nowrap">#{order._id.slice(-6).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                        <p className="text-[11px] text-on-surface-variant tabular">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="font-medium whitespace-nowrap">{order.tableNumber || '—'}</td>
                      <td className="max-w-[180px] truncate">{order.customerName || t('orders.guest')}</td>
                      <td className="whitespace-nowrap text-on-surface-variant">{order.items.length} {t('orders.items')}</td>
                      <td className="tabular text-end font-semibold whitespace-nowrap">{formatCurrency(order.total, currency)}</td>
                      <td><span className={`ds-chip ${statusStyle(order.status)}`}>{statusLabel(order.status)}</span></td>
                      <td className="text-end">
                        <ChevronRight className="inline-block w-4 h-4 text-on-surface-variant rtl:-scale-x-100" />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {result && result.pages > 1 && (
          <div className="flex items-center justify-center gap-3 py-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="ds-btn ds-btn-outline ds-btn-icon ds-btn-sm">
              <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" />
            </button>
            <span className="text-[13px] font-medium text-on-surface-variant tabular">{t('orderArchive.pagination', { page: result.page, pages: result.pages })}</span>
            <button disabled={page >= result.pages} onClick={() => setPage(p => p + 1)}
              className="ds-btn ds-btn-outline ds-btn-icon ds-btn-sm">
              <ChevronRight className="w-4 h-4 rtl:-scale-x-100" />
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="lg:w-96 shrink-0">
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div key={selectedOrder._id}
              initial={{ opacity: 0, x: isRTL ? -8 : 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? -8 : 8 }}
              className="fixed inset-0 z-40 lg:static lg:inset-auto lg:z-auto h-full lg:h-auto bg-card lg:border lg:border-line lg:rounded-2xl lg:shadow-sm flex flex-col lg:sticky lg:top-0 overflow-y-auto">
              <div className="px-5 py-4 border-b border-line flex justify-between items-start gap-3 shrink-0">
                <div className="min-w-0">
                  <h3 className="ds-section-title">{t('orderArchive.detailHeading')}</h3>
                  <p className="font-mono text-xs text-on-surface-variant mt-0.5 truncate">#{selectedOrder._id.toUpperCase()}</p>
                </div>
                <button onClick={closeOrder} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-6 overflow-y-auto no-scrollbar">
                <div className="ds-inset p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-acc-soft text-acc flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-on-surface">{selectedOrder.customerName || t('orders.guest')}</p>
                    <p className="text-xs text-on-surface-variant">
                      {selectedOrder.tableNumber ? `${t('orders.table')} ${selectedOrder.tableNumber}` : selectedOrder.address || '—'}
                    </p>
                  </div>
                  <span className={`ms-auto ds-chip ${statusStyle(selectedOrder.status)}`}>
                    {statusLabel(selectedOrder.status)}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="ds-overline">{t('orderArchive.items')}</p>
                  <div className="ds-inset px-3.5">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-3 py-3 border-b border-line last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-card border border-line flex items-center justify-center font-semibold text-xs tabular shrink-0">{item.quantity}x</span>
                          <span className="font-medium text-sm text-on-surface">{item.name}</span>
                        </div>
                        <span className="font-semibold text-sm tabular text-on-surface shrink-0">{formatCurrency(item.price * item.quantity, currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="ds-inset p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">{t('orderArchive.subtotal')}</span>
                    <span className="font-semibold tabular">{formatCurrency(selectedOrder.total + (selectedOrder.discount ?? 0), currency)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">{t('orderArchive.discount')} {selectedOrder.promoCode ? `(${selectedOrder.promoCode})` : ''}</span>
                      <span className="font-semibold tabular text-pos6">-{formatCurrency(selectedOrder.discount, currency)}</span>
                    </div>
                  )}
                  <div className="h-px bg-line" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-on-surface">{t('orderArchive.total')}</span>
                    <span className="text-xl font-display font-bold tabular text-on-surface">{formatCurrency(selectedOrder.total, currency)}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-on-surface-variant">
                  <div className="flex justify-between gap-3">
                    <span>{t('orderArchive.orderedAt')}</span>
                    <span className="font-medium text-on-surface tabular">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>{t('orderArchive.archivedAt')}</span>
                    <span className="font-medium text-on-surface tabular">{new Date(selectedOrder.archivedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="hidden lg:flex ds-empty h-64">
              <Package className="w-8 h-8 opacity-40" />
              <p className="text-sm font-semibold text-on-surface">{t('orderArchive.selectOrder')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
