import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, Tag, Check,
  Printer, AlertCircle, Percent, DollarSign,
  MessageSquare, RefreshCw, Receipt, UtensilsCrossed,
  Package
} from 'lucide-react';
import { authFetch } from '../../src/lib/auth';
import { formatCurrency } from '../../src/lib/currency';

interface Category { _id: string; name: string; }
interface MenuItem { _id: string; name: string; category: string; price: number; description: string; image: string; featured: boolean; ingredients: string[]; allergens: string[]; }
interface Table { _id: string; name: string; }
interface CurrentUser { _id: string; name?: string; email: string; restaurantId?: string; }
interface RestaurantBranding { name: string; logo?: string; address?: string; contactPhone?: string; contactEmail?: string; }

interface CartItem {
  id: string; name: string; description: string; price: number; image: string;
  category: string; quantity: number; featured: boolean; ingredients: string[]; allergens: string[]; note: string;
}

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'PICKUP' | 'DELIVERY';
type PaymentMethod = 'CASH' | 'CARD' | 'CLIQ' | 'UNPAID' | 'PAY_LATER';
type DiscountMode = 'CODE' | 'PERCENTAGE' | 'FIXED';

const PAYMENT_STATUS: Record<PaymentMethod, string> = {
  CASH: 'PENDING_CASH', CARD: 'PENDING_CARD_PAYMENT', CLIQ: 'PENDING_CLIQ_VERIFICATION',
  UNPAID: 'UNPAID', PAY_LATER: 'UNPAID',
};

const ORDER_TYPES: { value: OrderType; key: string }[] = [
  { value: 'DINE_IN',  key: 'dineIn'   },
  { value: 'TAKEAWAY', key: 'takeaway' },
  { value: 'PICKUP',   key: 'pickup'   },
  { value: 'DELIVERY', key: 'delivery' },
];

const PAYMENT_METHODS: { value: PaymentMethod; key: string; icon: React.ReactNode }[] = [
  { value: 'CASH',      key: 'cash',     icon: <Banknote className="w-4 h-4" />    },
  { value: 'CARD',      key: 'card',     icon: <CreditCard className="w-4 h-4" />  },
  { value: 'CLIQ',      key: 'cliq',     icon: <Smartphone className="w-4 h-4" />  },
  { value: 'UNPAID',    key: 'unpaid',   icon: <AlertCircle className="w-4 h-4" /> },
  { value: 'PAY_LATER', key: 'payLater', icon: <RefreshCw className="w-4 h-4" />   },
];

// Category icons by name
const CAT_ICONS: Record<string, string> = {
  Starters: '🥗', Mains: '🍽️', Burgers: '🍔', Pizza: '🍕',
  Pasta: '🍝', Salads: '🥙', Desserts: '🍰', Drinks: '🥤',
  All: '⚡',
};

const ProductCard: React.FC<{
  item: MenuItem;
  cartQty: number;
  currency: string;
  onAdd: (item: MenuItem) => void;
}> = ({ item, cartQty, currency, onAdd }) => (
  <button
    onClick={() => onAdd(item)}
    className="group relative bg-surface rounded-2xl overflow-hidden text-left hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-200 active:scale-95 border border-surface-container"
  >
    {/* Cart badge */}
    {cartQty > 0 && (
      <span className="absolute top-2 right-2 z-10 w-6 h-6 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
        {cartQty}
      </span>
    )}

    {/* Image */}
    <div className="aspect-square overflow-hidden bg-surface-container">
      {item.image
        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
        : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
            {CAT_ICONS[item.category] || '🍴'}
          </div>
      }
    </div>

    {/* Info */}
    <div className="px-3 py-2.5">
      <p className="text-sm font-semibold text-on-surface leading-tight line-clamp-1">{item.name}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-base font-extrabold text-primary">{formatCurrency(item.price, currency)}</span>
        <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
          <Plus className="w-4 h-4" />
        </span>
      </div>
    </div>
  </button>
);

interface CartItemRowProps {
  item: CartItem;
  currency: string;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onNote: (id: string, note: string) => void;
  noteOpen: boolean;
  onToggleNote: () => void;
}
const CartItemRow: React.FC<CartItemRowProps> = ({ item, currency, onUpdateQty, onRemove, onNote, noteOpen, onToggleNote }) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      {/* Image thumbnail */}
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-container shrink-0">
        {item.image
          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-lg">{CAT_ICONS[item.category] || '🍴'}</div>
        }
      </div>
      {/* Name + price */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-on-surface truncate">{item.name}</p>
        <p className="text-xs text-on-surface-variant">{formatCurrency(item.price * item.quantity, currency)}</p>
      </div>
      {/* Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onUpdateQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center hover:bg-primary/10 transition-colors text-on-surface-variant">
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-xs font-bold w-4 text-center tabular-nums">{item.quantity}</span>
        <button onClick={() => onUpdateQty(item.id, 1)} className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center hover:bg-primary/10 transition-colors text-on-surface-variant">
          <Plus className="w-3 h-3" />
        </button>
        <button onClick={onToggleNote} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${noteOpen || item.note ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant hover:bg-primary/10'}`}>
          <MessageSquare className="w-3 h-3" />
        </button>
        <button onClick={() => onRemove(item.id)} className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors text-on-surface-variant">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
    {noteOpen && (
      <input
        autoFocus
        value={item.note}
        onChange={e => onNote(item.id, e.target.value)}
        placeholder={t('pos.itemNotePlaceholder')}
        className="w-full px-2.5 py-1.5 text-xs bg-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 ml-12"
      />
    )}
  </div>
  );
};

// Print-only invoice — hidden on screen, shown only via @media print (see admin/admin.css)
const InvoicePrint: React.FC<{ order: any; currency: string; branding: RestaurantBranding | null }> = ({ order, currency, branding }) => {
  const { t } = useTranslation();
  const subtotal = (order.items ?? []).reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const orderRef = order._id?.slice(-6).toUpperCase();

  return (
    <div id="invoice-print" className="hidden print:block text-black bg-white p-10">
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-4">
        <div className="flex items-center gap-3">
          <img src={branding?.logo || '/logo.svg'} alt="" className="w-16 h-16 object-contain shrink-0" />
          <div>
            <h1 className="text-xl font-extrabold">{branding?.name || t('pos.invoice.restaurantFallback')}</h1>
            {branding?.address && <p className="text-xs">{branding.address}</p>}
            {branding?.contactPhone && <p className="text-xs" dir="ltr">{branding.contactPhone}</p>}
            {branding?.contactEmail && <p className="text-xs" dir="ltr">{branding.contactEmail}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold tracking-wide">{t('pos.invoice.title')}</p>
          <p className="text-xs">#{orderRef}</p>
          <p className="text-xs">{createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1.5 font-bold">{t('pos.invoice.item')}</th>
            <th className="py-1.5 font-bold text-center w-16">{t('pos.invoice.qty')}</th>
            <th className="py-1.5 font-bold text-right w-24">{t('pos.invoice.price')}</th>
            <th className="py-1.5 font-bold text-right w-24">{t('pos.invoice.total')}</th>
          </tr>
        </thead>
        <tbody>
          {(order.items ?? []).map((item: any, i: number) => (
            <tr key={i} className="border-b border-outline-variant/40">
              <td className="py-1.5">
                {item.name}
                {item.note && <span className="italic text-xs"> ({item.note})</span>}
              </td>
              <td className="py-1.5 text-center">{item.quantity}</td>
              <td className="py-1.5 text-right">{formatCurrency(item.price, currency)}</td>
              <td className="py-1.5 text-right">{formatCurrency(item.price * item.quantity, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span>{t('pos.invoice.subtotal')}</span><span>{formatCurrency(subtotal, currency)}</span></div>
          {order.discount > 0 && (
            <div className="flex justify-between"><span>{t('pos.invoice.discount')}</span><span>-{formatCurrency(order.discount, currency)}</span></div>
          )}
          <div className="flex justify-between font-extrabold text-base border-t-2 border-black pt-1.5 mt-1">
            <span>{t('pos.invoice.total')}</span><span>{formatCurrency(order.total, currency)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-black text-xs grid grid-cols-2 gap-1">
        {order.payment_method && <p><span className="font-bold">{t('pos.invoice.payment')}</span> {order.payment_method}</p>}
        {order.order_type && <p><span className="font-bold">{t('pos.invoice.orderType')}</span> {order.order_type}</p>}
        {order.tableNumber && <p><span className="font-bold">{t('pos.invoice.table')}</span> {order.tableNumber}</p>}
        {order.cashier_name && <p><span className="font-bold">{t('pos.invoice.cashier')}</span> {order.cashier_name}</p>}
      </div>

      <p className="text-center text-sm mt-8">{t('pos.invoice.thankYou')}</p>
    </div>
  );
};

const ReceiptModal: React.FC<{ order: any; currency: string; onClose: () => void; onPrint: () => void }> = ({ order, currency, onClose, onPrint }) => {
  const { t } = useTranslation();
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="bg-surface rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/70 px-6 py-6 text-white text-center">
        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-7 h-7 text-white" />
        </div>
        <h2 className="font-headline font-extrabold text-xl">{t('pos.receipt.orderCreated')}</h2>
        <p className="text-white/70 text-sm mt-1">#{order._id?.slice(-6).toUpperCase()}</p>
      </div>

      {/* Items */}
      <div className="px-6 py-4 max-h-52 overflow-y-auto space-y-2">
        {order.items?.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-on-surface-variant">
              {item.quantity}× {item.name}
              {item.note ? <span className="text-xs italic text-on-surface-variant/60 ml-1">({item.note})</span> : ''}
            </span>
            <span className="font-semibold tabular-nums">{formatCurrency(item.price * item.quantity, currency)}</span>
          </div>
        ))}
      </div>

      {/* Totals + meta */}
      <div className="px-6 pb-2 border-t border-surface-container space-y-2 pt-3">
        {order.discount > 0 && (
          <div className="flex justify-between text-sm text-primary">
            <span>{t('pos.discount')}</span><span>-{formatCurrency(order.discount, currency)}</span>
          </div>
        )}
        <div className="flex justify-between font-extrabold text-lg">
          <span>{t('pos.total')}</span><span>{formatCurrency(order.total, currency)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[order.payment_method, order.order_type, order.tableNumber && t('pos.receipt.tableTag', { number: order.tableNumber }), order.cashier_name && t('pos.receipt.byTag', { name: order.cashier_name })].filter(Boolean).map((tag, i) => (
            <span key={i} className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">{tag}</span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 pt-3 flex gap-3">
        <button onClick={onPrint} className="flex-1 flex items-center justify-center gap-2 border-2 border-surface-container rounded-2xl py-3 text-sm font-bold hover:bg-surface-container transition-colors">
          <Printer className="w-4 h-4" /> {t('pos.receipt.print')}
        </button>
        <button onClick={onClose} className="flex-1 btn-gradient text-white rounded-2xl py-3 text-sm font-extrabold shadow-lg shadow-primary/20">
          {t('pos.receipt.newOrder')}
        </button>
      </div>
    </div>
  </div>
  );
};

export const CashierPOS = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [branding, setBranding] = useState<RestaurantBranding | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [tableId, setTableId] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discountMode, setDiscountMode] = useState<DiscountMode | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [promoResult, setPromoResult] = useState<{ discountType: string; discountValue: number; discountAmount: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      authFetch('/api/categories'),
      authFetch('/api/menu'),
      authFetch('/api/tables'),
      authFetch('/api/auth/me'),
      authFetch('/api/settings/restaurant'),
    ]).then(async ([catRes, menuRes, tableRes, meRes, settingsRes]) => {
      if (catRes.ok) setCategories(await catRes.json());
      if (menuRes.ok) setMenuItems(await menuRes.json());
      if (tableRes.ok) setTables(await tableRes.json());
      if (meRes.ok) setCurrentUser(await meRes.json());
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        if (s.currency) setCurrency(s.currency);
        setBranding({ name: s.name, logo: s.logo, address: s.address, contactPhone: s.contactPhone, contactEmail: s.contactEmail });
      }
      setLoading(false);
    });
  }, []);

  const filteredItems = useMemo(() => menuItems.filter(item => {
    const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [menuItems, selectedCategory, search]);

  const catCounts = useMemo(() => {
    const map: Record<string, number> = { All: menuItems.length };
    for (const item of menuItems) map[item.category] = (map[item.category] || 0) + 1;
    return map;
  }, [menuItems]);

  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cart) map[c.id] = c.quantity;
    return map;
  }, [cart]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item._id);
      if (existing) return prev.map(c => c.id === item._id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item._id, name: item.name, description: item.description, price: item.price, image: item.image, category: item.category, quantity: 1, featured: item.featured, ingredients: item.ingredients, allergens: item.allergens, note: '' }];
    });
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
  }, []);

  const removeFromCart = useCallback((id: string) => setCart(prev => prev.filter(c => c.id !== id)), []);
  const setItemNote = useCallback((id: string, note: string) => setCart(prev => prev.map(c => c.id === id ? { ...c, note } : c)), []);

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);

  const discountAmount = useMemo(() => {
    if (discountMode === 'CODE' && promoResult) return promoResult.discountAmount;
    if (discountMode === 'PERCENTAGE') return subtotal * ((parseFloat(discountInput) || 0) / 100);
    if (discountMode === 'FIXED') return Math.min(parseFloat(discountInput) || 0, subtotal);
    return 0;
  }, [discountMode, discountInput, promoResult, subtotal]);

  const total = Math.max(0, subtotal - discountAmount);

  const validatePromo = async () => {
    if (!discountInput.trim()) return;
    setPromoError(''); setPromoLoading(true);
    try {
      const res = await authFetch('/api/promos/validate', {
        method: 'POST',
        body: JSON.stringify({ code: discountInput.trim(), restaurantId: currentUser?.restaurantId, subtotal }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setPromoResult(data);
      } else {
        setPromoError(data.message || t('pos.errors.invalidPromo'));
      }
    } catch { setPromoError(t('pos.errors.promoNetworkError')); }
    finally { setPromoLoading(false); }
  };

  const createOrder = async () => {
    if (cart.length === 0) { setError(t('pos.errors.emptyCart')); return; }
    if (orderType === 'DINE_IN' && !tableNumber) { setError(t('pos.errors.selectTable')); return; }
    setError(''); setCreating(true);
    try {
      const payload: Record<string, any> = {
        items: cart.map(c => ({ ...c })),
        total, discount: discountAmount,
        restaurantId: currentUser?.restaurantId,
        tableNumber: orderType === 'DINE_IN' ? tableNumber : undefined,
        order_source: 'CASHIER_POS', order_type: orderType,
        payment_method: paymentMethod, payment_status: PAYMENT_STATUS[paymentMethod],
        cashier_id: currentUser?._id, cashier_name: currentUser?.name || currentUser?.email,
        order_note: orderNote || undefined,
      };
      if (discountMode === 'CODE' && promoResult) { payload.promoCode = discountInput.trim(); payload.discount_type = 'CODE'; }
      else if (discountMode && discountAmount > 0) { payload.discount_type = discountMode; payload.discount_applied_by = currentUser?.name || currentUser?.email; }
      const res = await authFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
      if (res.ok) { setReceipt(await res.json()); setCart([]); }
      else { const err = await res.json(); setError(err.message || t('pos.errors.createFailed')); }
    } catch { setError(t('pos.errors.createNetworkError')); }
    finally { setCreating(false); }
  };

  const resetOrder = () => { setReceipt(null); setOrderNote(''); setDiscountMode(null); setDiscountInput(''); setPromoResult(null); setPromoError(''); setTableId(''); setTableNumber(''); setError(''); };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-on-surface-variant gap-3">
      <RefreshCw className="w-5 h-5 animate-spin" /><span className="text-sm">{t('pos.loading')}</span>
    </div>
  );

  const allCategories = ['All', ...categories.map(c => c.name)];

  return (
    <div className="flex flex-col gap-0 -mx-8 -mt-10" style={{ height: 'calc(100vh - 5rem)' }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-surface-container bg-surface z-10 shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('pos.searchPlaceholder')}
            className="w-full pl-9 pr-8 py-2 bg-surface-container rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"><X className="w-3.5 h-3.5" /></button>}
        </div>

        <div className="h-5 w-px bg-surface-container" />

        {/* Order Type */}
        <div className="flex items-center gap-1.5">
          {ORDER_TYPES.map(ot => (
            <button key={ot.value} onClick={() => { setOrderType(ot.value); setTableId(''); setTableNumber(''); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${orderType === ot.value ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
              {t(`pos.orderTypes.${ot.key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── CATEGORY SIDEBAR ── */}
        <div className="w-48 shrink-0 border-r border-surface-container overflow-y-auto bg-surface py-3">
          {allCategories.map(cat => {
            const active = selectedCategory === cat;
            return (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all ${active ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}>
                <span className="text-lg leading-none">{CAT_ICONS[cat] || '🍴'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${active ? 'text-primary' : ''}`}>{cat}</p>
                  <p className="text-[10px] text-on-surface-variant">{t('pos.categoryItemCount', { count: catCounts[cat] ?? 0 })}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── PRODUCT GRID ── */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant gap-3">
              <Package className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">{t('pos.noProducts')}</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              {filteredItems.map(item => (
                <ProductCard key={item._id} item={item} cartQty={cartQtyMap[item._id] || 0} currency={currency} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>

        {/* ── CART PANEL ── */}
        <div className="w-80 shrink-0 border-l border-surface-container flex flex-col bg-surface">

          {/* Cart Header */}
          <div className="px-4 py-3 border-b border-surface-container flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm">{t('pos.cart')}</span>
              {cart.length > 0 && (
                <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-[11px] text-on-surface-variant hover:text-red-500 transition-colors font-medium">
                {t('pos.clear')}
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-on-surface-variant gap-2">
                <UtensilsCrossed className="w-8 h-8 opacity-20" />
                <p className="text-xs text-center">{t('pos.emptyCartHint')}</p>
              </div>
            ) : (
              cart.map(item => (
                <CartItemRow key={item.id} item={item} currency={currency}
                  onUpdateQty={updateQty} onRemove={removeFromCart}
                  onNote={setItemNote} noteOpen={activeNote === item.id}
                  onToggleNote={() => setActiveNote(activeNote === item.id ? null : item.id)}
                />
              ))
            )}
          </div>

          {/* Order Settings */}
          <div className="border-t border-surface-container px-3 py-3 space-y-2.5 shrink-0">
            {/* Table */}
            {orderType === 'DINE_IN' && (
              <select value={tableId}
                onChange={e => { const tbl = tables.find(tb => tb._id === e.target.value); setTableId(e.target.value); setTableNumber(tbl?.name || ''); }}
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">{t('pos.selectTableOption')}</option>
                {tables.map(tb => <option key={tb._id} value={tb._id}>{tb.name}</option>)}
              </select>
            )}

            {/* Order Note */}
            <input
              value={orderNote} onChange={e => setOrderNote(e.target.value)}
              placeholder={t('pos.orderNotePlaceholder')}
              className="w-full px-3 py-2 bg-surface-container rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* Discount */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1">
                {(['CODE', 'PERCENTAGE', 'FIXED'] as DiscountMode[]).map((mode, i) => (
                  <button key={mode} onClick={() => { setDiscountMode(discountMode === mode ? null : mode); setDiscountInput(''); setPromoResult(null); setPromoError(''); }}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${discountMode === mode ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
                    {i === 0 ? <Tag className="w-3 h-3" /> : i === 1 ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                    {i === 0 ? t('pos.discountModes.code') : i === 1 ? t('pos.discountModes.percentage') : t('pos.discountModes.fixed')}
                  </button>
                ))}
              </div>
              {discountMode && (
                <div className="flex gap-1.5">
                  <input value={discountInput} onChange={e => { setDiscountInput(e.target.value); setPromoResult(null); setPromoError(''); }}
                    placeholder={discountMode === 'CODE' ? t('pos.promoCodePlaceholder') : discountMode === 'PERCENTAGE' ? t('pos.percentagePlaceholder') : t('pos.fixedPlaceholder')}
                    className="flex-1 px-2.5 py-1.5 bg-surface-container rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {discountMode === 'CODE' && (
                    <button onClick={validatePromo} disabled={promoLoading || !discountInput.trim()}
                      className="px-3 bg-primary text-white rounded-xl text-xs font-bold disabled:opacity-50">
                      {promoLoading ? '…' : t('pos.apply')}
                    </button>
                  )}
                </div>
              )}
              {promoResult && <p className="text-[10px] text-primary flex items-center gap-1"><Check className="w-3 h-3" /> {t('pos.applied', { amount: formatCurrency(discountAmount, currency) })}</p>}
              {promoError && <p className="text-[10px] text-red-500">{promoError}</p>}
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-5 gap-1">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${paymentMethod === pm.value ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
                  {pm.icon}
                  <span style={{ fontSize: '9px' }} className="font-bold">{t(`pos.paymentMethods.${pm.key}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Totals + CTA */}
          <div className="px-4 pb-4 pt-2 border-t border-surface-container space-y-2.5 shrink-0">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>{t('pos.subtotal')}</span><span className="tabular-nums">{formatCurrency(subtotal, currency)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-primary font-medium">
                  <span>{t('pos.discount')}</span><span className="tabular-nums">-{formatCurrency(discountAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-base pt-0.5">
                <span>{t('pos.total')}</span><span className="tabular-nums">{formatCurrency(total, currency)}</span>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-[11px] flex items-start gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}
              </p>
            )}

            <button onClick={createOrder} disabled={creating || cart.length === 0}
              className="w-full btn-gradient text-white py-3.5 rounded-2xl font-extrabold text-sm disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-opacity">
              {creating
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> {t('pos.creating')}</>
                : <><Receipt className="w-4 h-4" /> {t('pos.createOrder', { total: formatCurrency(total, currency) })}</>
              }
            </button>
          </div>
        </div>
      </div>

      {receipt && (
        <>
          <ReceiptModal order={receipt} currency={currency} onClose={resetOrder} onPrint={() => window.print()} />
          <InvoicePrint order={receipt} currency={currency} branding={branding} />
        </>
      )}
    </div>
  );
};
