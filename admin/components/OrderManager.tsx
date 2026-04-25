/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, CheckCircle2, Clock, User, ChevronRight, Search,
  ChefHat, Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';
import { authFetch } from '../../src/lib/auth';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface Order {
  _id: string;
  items: CartItem[];
  total: number;
  status: string;
  customerName?: string;
  address?: string;
  tableNumber?: string;
  createdAt: string;
}

type OrderView = 'feed' | 'kds';

export const OrderManager = () => {
  const [view, setView] = useState<OrderView>('feed');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');

  const tableNames = ['all', ...Array.from(new Set(orders.map(o => o.tableNumber).filter(Boolean) as string[]))].sort();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await authFetch('/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const socket = io({ path: '/socket.io' });
    socket.emit('admin:join');

    socket.on('order:new', (order: Order) => {
      setOrders(prev => [order, ...prev]);
    });

    socket.on('order:status', ({ id, status }: { id: string; status: string }) => {
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
      setSelectedOrder(prev => prev?._id === id ? { ...prev, status } : prev);
    });

    return () => { socket.disconnect(); };
  }, [fetchOrders]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await authFetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchSearch = order._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.tableNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchTable = tableFilter === 'all' || order.tableNumber === tableFilter;
    return matchSearch && matchTable;
  });

  const activeOrders = orders.filter(o => o.status !== 'Delivered');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const pendingOrders = orders.filter(o => o.status === 'Pending');

  if (view === 'kds') {
    return (
      <div className="h-full flex flex-col space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight">Kitchen Display System</h2>
            <p className="text-on-surface-variant font-medium">Real-time order orchestration for the culinary team.</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-xl text-sm font-bold">
              <ChefHat className="w-4 h-4 text-primary" />
              <span>{preparingOrders.length} Preparing</span>
            </div>
            <button
              onClick={() => setView('feed')}
              className="px-6 py-3 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-all"
            >
              Back to Feed
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-4 gap-6 overflow-x-auto pb-6 no-scrollbar">
          {activeOrders.map((order, i) => (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex flex-col bg-surface-container-low rounded-3xl border-l-8 overflow-hidden shadow-sm ${
                order.status === 'Preparing' ? 'border-primary' : 'border-amber-400'
              }`}
            >
              <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Order</span>
                  <h4 className="font-mono font-bold text-lg">#{order._id.slice(-4).toUpperCase()}</h4>
                </div>
                <div className="text-right">
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
                    <span className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center font-bold text-sm shrink-0">
                      {item.quantity}
                    </span>
                    <p className="font-bold text-sm leading-tight">{item.name}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-surface-container-high/50">
                <button
                  onClick={() => handleUpdateStatus(order._id, order.status === 'Pending' ? 'Preparing' : 'Delivered')}
                  className="w-full py-3 rounded-xl btn-gradient text-white font-bold text-sm shadow-lg shadow-primary/10 active:scale-95 transition-all"
                >
                  {order.status === 'Pending' ? 'Start Cooking' : 'Mark Ready'}
                </button>
              </div>
            </motion.div>
          ))}

          {activeOrders.length === 0 && (
            <div className="col-span-4 flex flex-col items-center justify-center py-20 text-on-surface-variant/40">
              <ChefHat className="w-20 h-20 mb-4 opacity-20" />
              <p className="text-xl font-bold">Kitchen is clear</p>
              <p className="text-sm">No active orders to display.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-10">
      <div className="flex-1 space-y-10 overflow-y-auto no-scrollbar pr-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight">Order Flow</h2>
            <p className="text-on-surface-variant font-medium">Monitor and manage guest orders in real-time.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
              <input
                type="text"
                placeholder="Search Order ID or table..."
                className="bg-surface-container-high border-none rounded-xl py-3 pl-12 pr-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={tableFilter}
              onChange={e => setTableFilter(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {tableNames.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All Tables' : t}</option>
              ))}
            </select>
            <button
              onClick={() => setView('kds')}
              className="flex items-center gap-2 px-6 py-3 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-all"
            >
              <ChefHat className="w-4 h-4" />
              KDS View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Pending', count: pendingOrders.length, color: 'bg-amber-400' },
            { label: 'Preparing', count: preparingOrders.length, color: 'bg-primary' },
            { label: 'Ready', count: orders.filter(o => o.status === 'Ready').length, color: 'bg-emerald-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container-low p-6 rounded-3xl flex items-center justify-between shadow-sm border border-outline-variant/10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">{stat.label}</p>
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
              <motion.div
                key={order._id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedOrder(order)}
                className={`group flex items-center p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10 hover:bg-surface-container-lowest hover:shadow-xl transition-all cursor-pointer ${
                  selectedOrder?._id === order._id ? 'ring-2 ring-primary bg-surface-container-lowest' : ''
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0 mr-6 group-hover:scale-110 transition-transform">
                  <Package className={`w-6 h-6 ${
                    order.status === 'Delivered' ? 'text-emerald-500' :
                    order.status === 'Preparing' ? 'text-primary' : 'text-amber-500'
                  }`} />
                </div>
                <div className="flex-1 grid grid-cols-5 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Order ID</p>
                    <p className="font-mono font-bold text-sm">#{order._id.slice(-6).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Table</p>
                    <p className="font-bold text-sm">{order.tableNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Customer</p>
                    <p className="font-bold text-sm truncate">{order.customerName || 'Guest'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Items</p>
                    <p className="font-bold text-sm">{order.items.length} Items</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Total</p>
                    <p className="font-bold text-sm text-primary">${order.total.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 ml-6">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'Preparing' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {order.status}
                  </div>
                  <ChevronRight className="w-5 h-5 text-on-surface-variant/30 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-96 shrink-0 h-full">
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div
              key={selectedOrder._id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full bg-surface-container-low rounded-4xl p-8 flex flex-col shadow-2xl shadow-primary/5"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-2xl font-headline font-extrabold tracking-tight">Order Details</h3>
                  <p className="text-on-surface-variant font-mono text-sm mt-1">#{selectedOrder._id.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar">
                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Guest Information</h4>
                  <div className="bg-surface-container-lowest p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold">{selectedOrder.customerName || 'Guest'}</p>
                      <p className="text-xs text-on-surface-variant">{selectedOrder.address || '—'}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Order Items</h4>
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
                    <span className="text-on-surface-variant font-medium">Subtotal</span>
                    <span className="font-bold">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="h-[1px] bg-primary/10 w-full"></div>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-headline font-extrabold text-primary">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </section>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleUpdateStatus(selectedOrder._id, 'Preparing')}
                  className="py-4 rounded-2xl bg-surface-container-high font-bold text-sm hover:bg-surface-variant transition-all"
                >
                  Prepare
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedOrder._id, 'Delivered')}
                  className="py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Complete
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full bg-surface-container-low/50 border-2 border-dashed border-outline-variant/30 rounded-4xl flex flex-col items-center justify-center p-12 text-center text-on-surface-variant/40">
              <Package className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold">No Order Selected</p>
              <p className="text-sm">Select an order from the feed to view full details and manage fulfillment.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
