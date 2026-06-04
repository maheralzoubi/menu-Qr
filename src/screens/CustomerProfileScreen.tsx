import { useState, useEffect } from 'react';
import { User, LogOut, ShoppingBag, Calendar, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { getCustomerInfo, clearCustomerToken, customerFetch, CustomerInfo } from '../lib/customerAuth';

interface Props { onLogout: () => void; }

export const CustomerProfileScreen = ({ onLogout }: Props) => {
  const { t } = useTranslation();
  const [customer, setCustomer] = useState<CustomerInfo | null>(getCustomerInfo());
  const [orders, setOrders] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    customerFetch('/api/customer/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setCustomer(d); });
    const history = localStorage.getItem('order_history');
    if (history) setOrders(JSON.parse(history));
  }, []);

  const handleLogout = () => {
    clearCustomerToken();
    onLogout();
  };

  const stats = [
    { icon: <ShoppingBag className="w-5 h-5" />, labelKey: 'profile.orders',       value: orders.length },
    { icon: <Calendar className="w-5 h-5" />,    labelKey: 'profile.reservations', value: reservations.length },
    { icon: <Star className="w-5 h-5" />,         labelKey: 'profile.reviews',      value: 0 },
  ];

  return (
    <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-container-low rounded-3xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
          {customer?.name?.slice(0, 1).toUpperCase() ?? <User className="w-8 h-8" />}
        </div>
        <div className="flex-1">
          <h2 className="font-headline font-extrabold text-xl">{customer?.name}</h2>
          <p className="text-sm text-on-surface-variant">{customer?.email}</p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant">
          <LogOut className="w-5 h-5" />
        </button>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.labelKey} className="bg-surface-container-low rounded-2xl p-4 text-center space-y-2">
            <div className="text-primary mx-auto w-fit">{s.icon}</div>
            <p className="text-2xl font-headline font-extrabold">{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t(s.labelKey)}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <h3 className="font-headline font-bold text-lg">{t('profile.recentOrders')}</h3>
        {orders.length === 0 ? (
          <div className="text-center py-10 bg-surface-container-low rounded-3xl text-on-surface-variant/40 text-sm font-medium">
            {t('profile.noOrders')}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order: any) => {
              const key = order._id ?? order.id;
              return (
                <div key={key} className="bg-surface-container-low rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">{t('profile.orderNum', { id: String(key).slice(-4).toUpperCase() })}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-headline font-bold text-primary">${order.total?.toFixed(2)}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t(`status.${order.status}`, { defaultValue: order.status })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
