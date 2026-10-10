import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, Tag, Check,
  Printer, AlertCircle, Percent, DollarSign,
  MessageSquare, RefreshCw, Receipt, UtensilsCrossed,
  Package, ChevronUp,
  Salad, Soup, Hamburger, Pizza, CakeSlice, CupSoda, LayoutGrid, Utensils,
  type LucideIcon,
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
const CAT_ICONS: Record<string, LucideIcon> = {
  Starters: Salad, Mains: UtensilsCrossed, Burgers: Hamburger, Pizza: Pizza,
  Pasta: Soup, Salads: Salad, Desserts: CakeSlice, Drinks: CupSoda,
  All: LayoutGrid,
};
const CatIcon: React.FC<{ cat: string; className?: string }> = ({ cat, className }) => {
  const Icon = CAT_ICONS[cat] || Utensils;
  return <Icon className={className} />;
};

const ProductCard: React.FC<{
  item: MenuItem;
  cartQty: number;
  currency: string;
  onAdd: (item: MenuItem) => void;
}> = ({ item, cartQty, currency, onAdd }) => (
  <button
    onClick={() => onAdd(item)}
    className="group relative bg-card rounded-2xl overflow-hidden text-start border border-line shadow-sm hover:border-input transition-colors"
  >
    {/* Cart badge */}
    {cartQty > 0 && (
      <span className="absolute top-2 end-2 z-10 min-w-6 h-6 px-1 bg-primary text-on-primary text-xs font-semibold tabular rounded-full flex items-center justify-center">
        {cartQty}
      </span>
    )}

    {/* Image */}
    <div className="aspect-square overflow-hidden bg-surface-container">
      {item.image
        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-on-surface-variant opacity-40">
            <CatIcon cat={item.category} className="w-8 h-8" />
          </div>
      }
    </div>

    {/* Info */}
    <div className="px-3 py-2.5">
      <p className="text-sm font-semibold text-on-surface leading-tight line-clamp-1">{item.name}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[15px] font-display font-bold tabular text-on-surface">{formatCurrency(item.price, currency)}</span>
        <span className="w-7 h-7 rounded-lg bg-acc-soft text-acc flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
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
          : <div className="w-full h-full flex items-center justify-center text-on-surface-variant"><CatIcon cat={item.category} className="w-4 h-4" /></div>
        }
      </div>
      {/* Name + price */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-on-surface truncate">{item.name}</p>
        <p className="text-xs text-on-surface-variant tabular">{formatCurrency(item.price * item.quantity, currency)}</p>
      </div>
      {/* Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onUpdateQty(item.id, -1)} className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center hover:bg-surface-container-high hover:text-on-surface transition-colors text-on-surface-variant">
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-xs font-semibold w-5 text-center tabular">{item.quantity}</span>
        <button onClick={() => onUpdateQty(item.id, 1)} className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center hover:bg-surface-container-high hover:text-on-surface transition-colors text-on-surface-variant">
          <Plus className="w-3 h-3" />
        </button>
        <button onClick={onToggleNote} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${noteOpen || item.note ? 'bg-acc-soft text-acc' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
          <MessageSquare className="w-3 h-3" />
        </button>
        <button onClick={() => onRemove(item.id)} className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center hover:bg-neg1 hover:text-neg7 transition-colors text-on-surface-variant">
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
        className="ds-input h-8 px-2.5 text-xs ms-12 w-[calc(100%-3rem)]"
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
        <div className="text-end">
          <p className="text-lg font-extrabold tracking-wide">{t('pos.invoice.title')}</p>
          <p className="text-xs">#{orderRef}</p>
          <p className="text-xs">{createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-black text-start">
            <th className="py-1.5 font-bold text-start">{t('pos.invoice.item')}</th>
            <th className="py-1.5 font-bold text-center w-16">{t('pos.invoice.qty')}</th>
            <th className="py-1.5 font-bold text-end w-24">{t('pos.invoice.price')}</th>
            <th className="py-1.5 font-bold text-end w-24">{t('pos.invoice.total')}</th>
          </tr>
        </thead>
        <tbody>
          {(order.items ?? []).map((item: any, i: number) => (
            <tr key={i} className="border-b border-black/20">
              <td className="py-1.5">
                {item.name}
                {item.note && <span className="italic text-xs"> ({item.note})</span>}
              </td>
              <td className="py-1.5 text-center">{item.quantity}</td>
              <td className="py-1.5 text-end">{formatCurrency(item.price, currency)}</td>
              <td className="py-1.5 text-end">{formatCurrency(item.price * item.quantity, currency)}</td>
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
  <div className="ds-backdrop">
    <div className="ds-modal max-w-sm">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-line text-center">
        <div className="w-12 h-12 bg-pos1 text-pos7 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6" />
        </div>
        <h2 className="ds-section-title">{t('pos.receipt.orderCreated')}</h2>
        <p className="text-on-surface-variant font-mono text-xs mt-1">#{order._id?.slice(-6).toUpperCase()}</p>
      </div>

      {/* Items */}
      <div className="px-6 py-4 max-h-52 overflow-y-auto space-y-2">
        {order.items?.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-on-surface-variant">
              {item.quantity}× {item.name}
              {item.note ? <span className="text-xs italic text-on-surface-variant/70 ms-1">({item.note})</span> : ''}
            </span>
            <span className="font-semibold tabular text-on-surface">{formatCurrency(item.price * item.quantity, currency)}</span>
          </div>
        ))}
      </div>

      {/* Totals + meta */}
      <div className="px-6 pb-4 border-t border-line space-y-2 pt-3">
        {order.discount > 0 && (
          <div className="flex justify-between text-sm text-pos6">
            <span>{t('pos.discount')}</span><span className="tabular">-{formatCurrency(order.discount, currency)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-semibold text-on-surface">{t('pos.total')}</span><span className="text-xl font-display font-bold tabular text-on-surface">{formatCurrency(order.total, currency)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[order.payment_method, order.order_type, order.tableNumber && t('pos.receipt.tableTag', { number: order.tableNumber }), order.cashier_name && t('pos.receipt.byTag', { name: order.cashier_name })].filter(Boolean).map((tag, i) => (
            <span key={i} className="ds-chip ds-chip-neutral">{tag}</span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-line flex gap-2">
        <button onClick={onPrint} className="ds-btn ds-btn-outline flex-1">
          <Printer className="w-4 h-4" /> {t('pos.receipt.print')}
        </button>
        <button onClick={onClose} className="ds-btn ds-btn-primary flex-1">
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
  const [cartOpen, setCartOpen] = useState(false);

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
      if (res.ok) { setReceipt(await res.json()); setCart([]); setCartOpen(false); }
      else { const err = await res.json(); setError(err.message || t('pos.errors.createFailed')); }
    } catch { setError(t('pos.errors.createNetworkError')); }
    finally { setCreating(false); }
  };

  const resetOrder = () => { setReceipt(null); setOrderNote(''); setDiscountMode(null); setDiscountInput(''); setPromoResult(null); setPromoError(''); setTableId(''); setTableNumber(''); setError(''); setCartOpen(false); };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-on-surface-variant gap-3">
      <RefreshCw className="w-5 h-5 animate-spin" /><span className="text-sm">{t('pos.loading')}</span>
    </div>
  );

  const allCategories = ['All', ...categories.map(c => c.name)];
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const cartPanel = (
    <>
      {/* Cart Header */}
      <div className="px-4 py-3 border-b border-line flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-acc" />
          <span className="font-semibold text-sm text-on-surface">{t('pos.cart')}</span>
          {cart.length > 0 && (
            <span className="bg-primary text-on-primary text-[10px] font-semibold tabular min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button onClick={() => setCart([])} className="text-xs text-on-surface-variant hover:text-error transition-colors font-medium">
            {t('pos.clear')}
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
        {cart.length === 0 ? (
          <div className="ds-empty py-8 mt-1">
            <UtensilsCrossed className="w-8 h-8 opacity-40" />
            <p className="text-xs">{t('pos.emptyCartHint')}</p>
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
      <div className="border-t border-line px-3 py-3 space-y-2.5 shrink-0">
        {/* Table */}
        {orderType === 'DINE_IN' && (
          <select value={tableId}
            onChange={e => { const tbl = tables.find(tb => tb._id === e.target.value); setTableId(e.target.value); setTableNumber(tbl?.name || ''); }}
            className="ds-select h-9 text-[13px]">
            <option value="">{t('pos.selectTableOption')}</option>
            {tables.map(tb => <option key={tb._id} value={tb._id}>{tb.name}</option>)}
          </select>
        )}

        {/* Order Note */}
        <input
          value={orderNote} onChange={e => setOrderNote(e.target.value)}
          placeholder={t('pos.orderNotePlaceholder')}
          className="ds-input h-9 text-[13px]"
        />

        {/* Discount */}
        <div className="space-y-1.5">
          <div className="ds-seg grid grid-cols-3 w-full">
            {(['CODE', 'PERCENTAGE', 'FIXED'] as DiscountMode[]).map((mode, i) => (
              <button key={mode} onClick={() => { setDiscountMode(discountMode === mode ? null : mode); setDiscountInput(''); setPromoResult(null); setPromoError(''); }}
                className={`ds-seg-item h-7 px-1 text-[11px] flex items-center justify-center gap-1 ${discountMode === mode ? 'ds-seg-item-active' : ''}`}>
                {i === 0 ? <Tag className="w-3 h-3" /> : i === 1 ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                {i === 0 ? t('pos.discountModes.code') : i === 1 ? t('pos.discountModes.percentage') : t('pos.discountModes.fixed')}
              </button>
            ))}
          </div>
          {discountMode && (
            <div className="flex gap-1.5">
              <input value={discountInput} onChange={e => { setDiscountInput(e.target.value); setPromoResult(null); setPromoError(''); }}
                placeholder={discountMode === 'CODE' ? t('pos.promoCodePlaceholder') : discountMode === 'PERCENTAGE' ? t('pos.percentagePlaceholder') : t('pos.fixedPlaceholder')}
                className="ds-input flex-1 h-8 px-2.5 text-xs"
              />
              {discountMode === 'CODE' && (
                <button onClick={validatePromo} disabled={promoLoading || !discountInput.trim()}
                  className="ds-btn ds-btn-primary ds-btn-sm h-8 text-xs">
                  {promoLoading ? '…' : t('pos.apply')}
                </button>
              )}
            </div>
          )}
          {promoResult && <p className="text-[11px] text-pos6 flex items-center gap-1"><Check className="w-3 h-3" /> {t('pos.applied', { amount: formatCurrency(discountAmount, currency) })}</p>}
          {promoError && <p className="text-[11px] text-error">{promoError}</p>}
        </div>

        {/* Payment Methods */}
        <div className="grid grid-cols-5 gap-1">
          {PAYMENT_METHODS.map(pm => (
            <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
              className={`flex flex-col items-center gap-1 py-2 px-0.5 rounded-xl border transition-colors ${paymentMethod === pm.value ? 'border-primary bg-acc-soft text-acc' : 'border-line bg-card text-on-surface-variant hover:bg-accent hover:text-on-surface'}`}>
              {pm.icon}
              <span className="text-[10px] leading-3 font-semibold text-center">{t(`pos.paymentMethods.${pm.key}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Totals + CTA */}
      <div className="px-4 pb-4 pt-3 border-t border-line space-y-3 shrink-0">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>{t('pos.subtotal')}</span><span className="tabular">{formatCurrency(subtotal, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-pos6 font-medium">
              <span>{t('pos.discount')}</span><span className="tabular">-{formatCurrency(discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-0.5">
            <span className="text-sm font-semibold text-on-surface">{t('pos.total')}</span><span className="text-xl font-display font-bold tabular text-on-surface">{formatCurrency(total, currency)}</span>
          </div>
        </div>

        {error && (
          <p className="text-error text-xs flex items-start gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}
          </p>
        )}

        <button onClick={createOrder} disabled={creating || cart.length === 0}
          className="ds-btn ds-btn-primary ds-btn-lg w-full">
          {creating
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> {t('pos.creating')}</>
            : <><Receipt className="w-4 h-4" /> {t('pos.createOrder', { total: formatCurrency(total, currency) })}</>
          }
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-0 -mx-4 -my-6 sm:-mx-6 lg:-mx-8" style={{ height: 'calc(100dvh - 4rem)' }}>

      {/* ── TOP BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-3 border-b border-line bg-card z-10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('pos.searchPlaceholder')}
              className="ds-input h-9 ps-9 pe-8"
            />
            {search && <button onClick={() => setSearch('')} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"><X className="w-3.5 h-3.5" /></button>}
          </div>

          <div className="hidden sm:block h-5 w-px bg-line" />
        </div>

        {/* Order Type */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="ds-seg">
            {ORDER_TYPES.map(ot => (
              <button key={ot.value} onClick={() => { setOrderType(ot.value); setTableId(''); setTableNumber(''); }}
                className={`ds-seg-item shrink-0 ${orderType === ot.value ? 'ds-seg-item-active' : ''}`}>
                {t(`pos.orderTypes.${ot.key}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">

        {/* ── CATEGORY RAIL ── */}
        <div className="shrink-0 border-b lg:border-b-0 lg:border-e border-line bg-card lg:w-48 lg:overflow-y-auto lg:py-3">
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible no-scrollbar">
            {allCategories.map(cat => {
              const active = selectedCategory === cat;
              return (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-2.5 px-3.5 sm:px-4 py-2.5 text-start transition-colors ${active ? 'bg-acc-soft text-acc border-b-2 lg:border-b-0 lg:border-e-2 border-primary' : 'text-on-surface-variant hover:bg-accent hover:text-on-surface'}`}>
                  <CatIcon cat={cat} className="w-4 h-4 shrink-0" />
                  <div className="lg:flex-1 min-w-0">
                    <p className={`text-[13px] font-semibold truncate ${active ? 'text-acc' : ''}`}>{cat}</p>
                    <p className="hidden lg:block text-[11px] text-on-surface-variant">{t('pos.categoryItemCount', { count: catCounts[cat] ?? 0 })}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── PRODUCT GRID ── */}
        <div className={`flex-1 overflow-y-auto p-4 ${cart.length > 0 ? 'pb-24 lg:pb-4' : ''}`}>
          {filteredItems.length === 0 ? (
            <div className="ds-empty">
              <Package className="w-8 h-8 opacity-40" />
              <p className="text-sm">{t('pos.noProducts')}</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {filteredItems.map(item => (
                <ProductCard key={item._id} item={item} cartQty={cartQtyMap[item._id] || 0} currency={currency} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>

        {/* ── CART PANEL (tablet-landscape/desktop) ── */}
        <div className="hidden lg:flex lg:w-80 shrink-0 border-s border-line flex-col bg-card">
          {cartPanel}
        </div>
      </div>

      {/* ── MOBILE/TABLET FLOATING CART BAR ── */}
      {cart.length > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-4 inset-x-4 z-30 flex items-center gap-3 bg-primary text-on-primary hover:bg-primary/90 rounded-2xl px-5 h-14 shadow-lg transition-colors">
          <span className="relative shrink-0">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -end-2 bg-on-primary text-primary text-[10px] font-semibold tabular min-w-5 h-5 px-1 rounded-full flex items-center justify-center">{cartCount}</span>
          </span>
          <span className="flex-1 text-start font-semibold text-sm">{t('pos.cart')}</span>
          <span className="font-display font-bold tabular">{formatCurrency(total, currency)}</span>
          <ChevronUp className="w-4 h-4 shrink-0" />
        </button>
      )}

      {/* ── MOBILE/TABLET CART DRAWER ── */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)} className="lg:hidden fixed inset-0 bg-black/45 z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-card border-t border-line rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh]">
              <div className="flex items-center justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-surface-container-highest" />
              </div>
              <button onClick={() => setCartOpen(false)} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm absolute top-2 end-2 text-on-surface-variant">
                <X className="w-4 h-4" />
              </button>
              {cartPanel}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {receipt && (
        <>
          <ReceiptModal order={receipt} currency={currency} onClose={resetOrder} onPrint={() => window.print()} />
          <InvoicePrint order={receipt} currency={currency} branding={branding} />
        </>
      )}
    </div>
  );
};
