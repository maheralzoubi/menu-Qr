import { useState, useEffect } from 'react';
import { Package, ChevronRight, Clock, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CustomerInfo } from '../lib/customerAuth';

interface Props {
  customer: CustomerInfo | null;
  onOpenTracking: (orderId: string) => void;
  onLoginRequest: () => void;
}

type Tab = 'current' | 'past';

const STATUS_COLORS: Record<string, string> = {
  Pending:   'bg-amber-100 text-amber-700',
  Preparing: 'bg-primary/10 text-primary',
  Ready:     'bg-blue-100 text-blue-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-600',
};

const ACTIVE_STATUSES = ['Pending', 'Preparing', 'Ready'];

export const OrdersScreen = ({ customer, onOpenTracking, onLoginRequest }: Props) => {
  const [tab, setTab] = useState<Tab>('current');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const history: string[] = JSON.parse(localStorage.getItem('order_history') || '[]');
      if (!history.length) { setLoading(false); return; }
      Promise.all(history.slice(0, 20).map(id => fetch(`/api/orders/${id}`).then(r => r.ok ? r.json() : null)))
        .then(results => { setOrders(results.filter(Boolean)); setLoading(false); })
        .catch(() => setLoading(false));
    } catch { setLoading(false); }
  }, []);

  const currentOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));
  const displayOrders = tab === 'current' ? currentOrders : pastOrders;

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-8 text-center gap-5">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <Package className="w-10 h-10 text-primary opacity-60" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold font-headline">Track Your Orders</h2>
          <p className="text-sm text-on-surface-variant mt-2">Sign in to see your order history and real-time status</p>
        </div>
        <button onClick={onLoginRequest} className="btn-gradient text-white px-8 py-3.5 rounded-2xl font-extrabold flex items-center gap-2 shadow-lg shadow-primary/20">
          <LogIn className="w-4 h-4" /> Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-surface px-5 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-extrabold font-headline mb-4">My Orders</h1>
        {/* Tabs */}
        <div className="flex gap-1 bg-surface-container rounded-2xl p-1">
          {(['current', 'past'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
                tab === t ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant'
              }`}>
              {t === 'current' ? `Active (${currentOrders.length})` : `Past (${pastOrders.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-surface rounded-2xl h-24 animate-pulse" />)}</div>
        ) : displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
            <Package className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">
              {tab === 'current' ? 'No active orders' : 'No past orders yet'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {displayOrders.map((order, idx) => (
                <motion.button
                  key={order._id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenTracking(order._id)}
                  className="w-full bg-surface rounded-2xl p-4 text-left shadow-sm border border-surface-container"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-extrabold text-sm">#{order._id?.slice(-6).toUpperCase()}</p>
                      <div className="flex items-center gap-1 text-on-surface-variant mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant/40" />
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant truncate">
                    {order.items?.slice(0,3).map((i: any) => `${i.quantity}× ${i.name}`).join(' · ')}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-on-surface-variant">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</span>
                    <span className="font-extrabold text-sm text-primary">${order.total?.toFixed(2)}</span>
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
