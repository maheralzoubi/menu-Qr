import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Utensils, ShoppingBag, Calendar,
  Star, LogOut, TrendingUp, Settings as SettingsIcon, QrCode, Tag, MonitorSmartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../src/lib/auth';
import { pushNavParam } from './lib/navHistory';
import { StatsGrid } from './components/StatsGrid';
import { MenuManager } from './components/MenuManager';
import { OrderManager } from './components/OrderManager';
import { ReservationManager } from './components/ReservationManager';
import { ReviewManager } from './components/ReviewManager';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { QRManager } from './components/QRManager';
import { PromoManager } from './components/PromoManager';
import { CashierPOS } from './components/CashierPOS';
import { LanguageSwitcher } from './components/LanguageSwitcher';

export type DashboardTab = 'overview' | 'orders' | 'menu' | 'reservations' | 'reviews' | 'analytics' | 'qr' | 'promos' | 'cashier' | 'settings';

const DASHBOARD_TABS: DashboardTab[] = ['overview', 'orders', 'menu', 'reservations', 'reviews', 'analytics', 'qr', 'promos', 'cashier', 'settings'];

function parseTab(search: string): DashboardTab {
  const tab = new URLSearchParams(search).get('tab');
  return DASHBOARD_TABS.includes(tab as DashboardTab) ? (tab as DashboardTab) : 'overview';
}

interface UserProfile { email: string; role: string; name?: string; title?: string; avatar?: string; restaurantId?: string; }

export const Dashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => parseTab(window.location.search));
  const [stats, setStats] = useState<any>(null);
  const [currency, setCurrency] = useState('USD');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Attach nav state to the current history entry without touching the URL on first load.
  useEffect(() => {
    window.history.replaceState({ tab: activeTab }, '', window.location.href);
  }, []);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state as { tab: DashboardTab } | null;
      setActiveTab(state?.tab ?? parseTab(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const changeTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    pushNavParam('tab', tab);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, meRes, settingsRes] = await Promise.all([
          authFetch('/api/stats'),
          authFetch('/api/auth/me'),
          authFetch('/api/settings/restaurant'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (settingsRes.ok) { const s = await settingsRes.json(); if (s.currency) setCurrency(s.currency); }
        if (meRes.ok) setUser(await meRes.json());
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      }
    };
    fetchData();
  }, []);

  const navItems = [
    { id: 'overview',     icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'orders',       icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'menu',         icon: <Utensils className="w-5 h-5" /> },
    { id: 'reservations', icon: <Calendar className="w-5 h-5" /> },
    { id: 'reviews',      icon: <Star className="w-5 h-5" /> },
    { id: 'analytics',    icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'qr',           icon: <QrCode className="w-5 h-5" /> },
    { id: 'promos',       icon: <Tag className="w-5 h-5" /> },
    { id: 'cashier',      icon: <MonitorSmartphone className="w-5 h-5" /> },
    { id: 'settings',     icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  const displayName = user?.name || user?.email || t('dashboard.defaultName');
  const displayTitle = user?.title || user?.role || t('dashboard.defaultTitle');
  const initials = displayName.slice(0, 2).toUpperCase();
  const restaurantId = user?.restaurantId ?? '';

  if (isMobile) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary">
          <LayoutDashboard className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-headline font-extrabold tracking-tight">{t('dashboard.desktopOnly')}</h2>
          <p className="text-on-surface-variant text-sm max-w-xs mx-auto">{t('dashboard.desktopOnlyMsg')}</p>
        </div>
        <button onClick={onLogout} className="btn-gradient text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20">
          {t('dashboard.backToApp')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex text-on-surface">
      {/* Sidebar */}
      <aside className="h-screen w-64 fixed left-0 rtl:left-auto rtl:right-0 top-0 flex flex-col py-8 z-50" style={{ backgroundColor: '#303942' }}>
        <div className="px-6 mb-10">
          <img src="/logo-dark.svg" alt="Monar" className="h-9 w-auto" />
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => changeTab(item.id as DashboardTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all rounded-xl ${
                activeTab === item.id
                  ? 'text-white font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-primary bg-white/10'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-sm">{t(`dashboard.tabs.${item.id}`)}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 mt-auto pt-6 border-t border-white/10 space-y-2">
          <LanguageSwitcher className="w-full justify-center text-white border-white/20 hover:bg-white/10" />
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:bg-white/10 hover:text-white rounded-xl transition-all">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">{t('dashboard.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 rtl:ml-0 rtl:mr-64 min-h-screen">
        <header className="w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-surface-container flex justify-between items-center px-8 py-4">
          <span className="text-xl font-bold font-headline">{t('dashboard.headerTitle')}</span>
          <div className="flex items-center gap-3">
            <div className="text-end hidden xl:block">
              <p className="text-sm font-bold leading-tight">{displayName}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{displayTitle}</p>
            </div>
            {user?.avatar ? (
              <img alt={t('dashboard.profileAlt')} className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/10" src={user.avatar} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm ring-2 ring-primary/10">
                {initials}
              </div>
            )}
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-8 py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview'     && <StatsGrid stats={stats} currency={currency} />}
              {activeTab === 'orders'       && <OrderManager />}
              {activeTab === 'menu'         && <MenuManager />}
              {activeTab === 'reservations' && <ReservationManager />}
              {activeTab === 'reviews'      && <ReviewManager />}
              {activeTab === 'analytics'    && <Analytics />}
              {activeTab === 'qr'           && <QRManager restaurantId={restaurantId} />}
              {activeTab === 'promos'       && <PromoManager />}
              {activeTab === 'cashier'      && <CashierPOS />}
              {activeTab === 'settings'     && <Settings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
