import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, Calendar, ChevronLeft, ChevronRight,
  Package, User, X, Download, Inbox,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../src/lib/auth';

interface CartItem { id: string; name: string; price: number; quantity: number; }
interface ArchivedOrder {
  _id: string; items: CartItem[]; total: number; discount: number; promoCode?: string;
  status: string; customerName?: string; address?: string; tableNumber?: string;
  createdAt: string; archivedAt: string;
}
interface ArchiveResult { orders: ArchivedOrder[]; total: number; page: number; pages: number; }

const STATUS_OPTIONS = ['', 'Pending', 'Preparing', 'Ready', 'Delivered'];
const PAGE_SIZE = 50;

const statusStyle = (s: string) => {
  switch (s) {
    case 'Delivered': return 'bg-emerald-100 text-emerald-700';
    case 'Preparing': return 'bg-primary/10 text-primary';
    case 'Ready':     return 'bg-blue-100 text-blue-700';
    default:          return 'bg-amber-100 text-amber-700';
  }
};

export const OrderArchive = ({ onBack }: { onBack: () => void }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [result, setResult]             = useState<ArchiveResult | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ArchivedOrder | null>(null);
  const [search, setSearch]             = useState('');
  const [status, setStatus]             = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [tableNumber, setTableNumber]   = useState('');
  const [page, setPage]                 = useState(1);

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

  const handleExportCSV = () => {
    if (!result?.orders.length) return;
    const rows = [
      ['Order ID', 'Date', 'Archived', 'Table', 'Customer', 'Items', 'Total', 'Discount', 'Status'],
      ...result.orders.map(o => [
        o._id, new Date(o.createdAt).toLocaleString(), new Date(o.archivedAt).toLocaleString(),
        o.tableNumber || '', o.customerName || 'Guest',
        o.items.map(i => `${i.quantity}x ${i.name}`).join('; '),
        o.total.toFixed(2), o.discount?.toFixed(2) ?? '0.00', o.status,
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
    <div className="flex h-full gap-10">
      <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pe-2">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <button onClick={onBack}
              className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-3 transition-colors">
              <ChevronLeft className="w-4 h-4 rtl:scale-x-[-1]" /> {t('orderArchive.backToOrders')}
            </button>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('orderArchive.heading')}</h2>
            <p className="text-on-surface-variant font-medium">
              {result ? t('orderArchive.archivedCount', { total: result.total.toLocaleString() }) : t('orderArchive.loading')}
            </p>
          </div>
          <button onClick={handleExportCSV} disabled={!orders.length}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant disabled:opacity-40 transition-colors">
            <Download className="w-4 h-4" /> {t('orderArchive.exportCsv')}
          </button>
        </div>

        {/* Summary strip */}
        {result && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { labelKey: 'orderArchive.totalOrders', value: result.total.toLocaleString() },
              { labelKey: 'orderArchive.shown',       value: orders.length.toLocaleString() },
              { labelKey: 'orderArchive.revenuePage', value: `$${totalRevenue.toFixed(2)}` },
            ].map(s => (
              <div key={s.labelKey} className="bg-surface-container-low rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">{t(s.labelKey)}</p>
                <p className="text-2xl font-headline font-extrabold">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
            <input type="text" placeholder={t('orderArchive.searchPlaceholder')} value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-2.5 ps-10 pe-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none w-56" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative flex items-center gap-1">
            <Filter className="w-4 h-4 text-on-surface-variant/40 absolute start-3" />
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-2.5 ps-9 pe-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none">
              <option value="">{t('orderArchive.allStatuses')}</option>
              {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <input type="text" placeholder={t('orderArchive.tablePlaceholder')} value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
            className="bg-surface-container-high border-none rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none w-28" />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-on-surface-variant/40 shrink-0" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" />
            <span className="text-on-surface-variant text-sm">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" />
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
            }} className="px-3 py-2.5 bg-surface-container-high rounded-xl text-xs font-bold hover:bg-surface-variant transition-colors">
              {t(labelKey)}
            </button>
          ))}
          {(search || status || dateFrom || dateTo || tableNumber) && (
            <button onClick={() => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); setTableNumber(''); }}
              className="px-3 py-2.5 text-xs font-bold text-error hover:bg-error/10 rounded-xl transition-colors">
              {t('orderArchive.clearAll')}
            </button>
          )}
        </div>

        {/* Orders list */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-surface-container-low rounded-2xl animate-pulse" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24 text-on-surface-variant/40 space-y-3">
            <Inbox className="w-12 h-12 mx-auto opacity-30" />
            <p className="font-bold text-lg">{t('orderArchive.noArchived')}</p>
            <p className="text-sm">{t('orderArchive.adjustFilters')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {orders.map((order, i) => (
                <motion.div key={order._id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  onClick={() => setSelectedOrder(order)}
                  className={`group flex items-center p-5 bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:bg-surface-container-lowest hover:shadow-lg transition-all cursor-pointer ${
                    selectedOrder?._id === order._id ? 'ring-2 ring-primary' : ''
                  }`}>
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 me-5">
                    <Package className="w-5 h-5 text-on-surface-variant/60" />
                  </div>
                  <div className="flex-1 grid grid-cols-6 gap-3 min-w-0">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('orderArchive.orderId')}</p>
                      <p className="font-mono font-bold text-sm">#{order._id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('orderArchive.date')}</p>
                      <p className="font-bold text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-on-surface-variant">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('orderArchive.tableLabel')}</p>
                      <p className="font-bold text-sm">{order.tableNumber || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('orderArchive.customerLabel')}</p>
                      <p className="font-bold text-sm truncate">{order.customerName || t('orders.guest')}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('orderArchive.itemsLabel')}</p>
                      <p className="font-bold text-sm">{order.items.length} {t('orders.items')}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('orderArchive.totalLabel')}</p>
                      <p className="font-bold text-sm text-primary">${order.total.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="ms-4 flex items-center gap-3 shrink-0">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyle(order.status)}`}>{order.status}</span>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant/30 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:scale-x-[-1]" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {result && result.pages > 1 && (
          <div className="flex items-center justify-center gap-3 py-4">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-xl bg-surface-container-high disabled:opacity-30 hover:bg-surface-variant transition-colors">
              <ChevronLeft className="w-4 h-4 rtl:scale-x-[-1]" />
            </button>
            <span className="text-sm font-bold">{t('orderArchive.pagination', { page: result.page, pages: result.pages })}</span>
            <button disabled={page >= result.pages} onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-xl bg-surface-container-high disabled:opacity-30 hover:bg-surface-variant transition-colors">
              <ChevronRight className="w-4 h-4 rtl:scale-x-[-1]" />
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="w-96 shrink-0">
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div key={selectedOrder._id}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
              className="bg-surface-container-low rounded-4xl p-8 flex flex-col shadow-2xl shadow-primary/5 sticky top-0">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-xl font-headline font-extrabold tracking-tight">{t('orderArchive.detailHeading')}</h3>
                  <p className="font-mono text-xs text-on-surface-variant mt-0.5">#{selectedOrder._id.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-6 overflow-y-auto no-scrollbar">
                <div className="flex items-center gap-3 bg-surface-container-lowest p-4 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{selectedOrder.customerName || t('orders.guest')}</p>
                    <p className="text-xs text-on-surface-variant">
                      {selectedOrder.tableNumber ? `${t('orders.table')} ${selectedOrder.tableNumber}` : selectedOrder.address || '—'}
                    </p>
                  </div>
                  <span className={`ms-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase ${statusStyle(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">{t('orderArchive.items')}</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-surface-container-lowest p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-xs">{item.quantity}x</span>
                          <span className="font-semibold text-sm">{item.name}</span>
                        </div>
                        <span className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-primary/5 p-5 rounded-2xl space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">{t('orderArchive.subtotal')}</span>
                    <span className="font-bold">${(selectedOrder.total + (selectedOrder.discount ?? 0)).toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">{t('orderArchive.discount')} {selectedOrder.promoCode ? `(${selectedOrder.promoCode})` : ''}</span>
                      <span className="font-bold text-green-600">-${selectedOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="h-px bg-primary/10" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{t('orderArchive.total')}</span>
                    <span className="text-xl font-headline font-extrabold text-primary">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>{t('orderArchive.orderedAt')}</span>
                    <span className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('orderArchive.archivedAt')}</span>
                    <span className="font-medium">{new Date(selectedOrder.archivedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-surface-container-low/50 border-2 border-dashed border-outline-variant/30 rounded-4xl flex flex-col items-center justify-center p-12 text-center text-on-surface-variant/40 h-64">
              <Package className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-bold text-sm">{t('orderArchive.selectOrder')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
