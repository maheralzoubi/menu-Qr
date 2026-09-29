import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Utensils, ShoppingBag, Calendar,
  Star, TrendingUp, Settings as SettingsIcon, QrCode, Tag, MonitorSmartphone, ExternalLink,
} from 'lucide-react';
import { motion } from 'motion/react';
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
import { DashboardShell, type NavGroup } from '../src/dashboard/DashboardShell';

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
  const [restaurantName, setRestaurantName] = useState('');
  const { t } = useTranslation();

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
        if (settingsRes.ok) { const s = await settingsRes.json(); if (s.currency) setCurrency(s.currency); if (s.name) setRestaurantName(s.name); }
        if (meRes.ok) setUser(await meRes.json());
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      }
    };
    fetchData();
  }, []);

  const navIcon = (id: DashboardTab) => ({
    overview: <LayoutDashboard />, orders: <ShoppingBag />, menu: <Utensils />, reservations: <Calendar />,
    reviews: <Star />, analytics: <TrendingUp />, qr: <QrCode />, promos: <Tag />, cashier: <MonitorSmartphone />,
    settings: <SettingsIcon />,
  }[id]);
  const item = (id: DashboardTab) => ({ id, label: t(`dashboard.tabs.${id}`), icon: navIcon(id) });
  const groups: NavGroup[] = [
    { label: t('dashboard.groups.operations'), items: (['overview', 'orders', 'cashier', 'reservations'] as DashboardTab[]).map(item) },
    { label: t('dashboard.groups.menuGrowth'), items: (['menu', 'promos', 'qr'] as DashboardTab[]).map(item) },
    { label: t('dashboard.groups.insights'), items: (['analytics', 'reviews'] as DashboardTab[]).map(item) },
    { label: t('dashboard.groups.restaurant'), items: [item('settings')] },
  ];

  const displayName = user?.name || user?.email || t('dashboard.defaultName');
  const displayTitle = user?.title || user?.role || t('dashboard.defaultTitle');
  const restaurantId = user?.restaurantId ?? '';

  return (
    <DashboardShell
      context={restaurantName || t('dashboard.adminPanel')}
      groups={groups}
      activeId={activeTab}
      onSelect={id => changeTab(id as DashboardTab)}
      crumbs={[
        { label: t('dashboard.headerTitle'), onClick: activeTab === 'overview' ? undefined : () => changeTab('overview') },
        ...(activeTab === 'overview' ? [] : [{ label: t(`dashboard.tabs.${activeTab}`) }]),
      ]}
      actions={
        <>
          <span className="ds-chip ds-chip-brand max-sm:hidden"><span className="ds-dot" />{displayTitle}</span>
          {restaurantId && (
            <a href={`/?restaurant=${restaurantId}`} target="_blank" rel="noreferrer" className="ds-btn ds-btn-outline ds-btn-sm">
              <ExternalLink className="w-4 h-4" /><span className="max-sm:hidden">{t('dashboard.viewMenu')}</span>
            </a>
          )}
        </>
      }
      user={{ name: displayName, sub: user?.email && user.email !== displayName ? user.email : displayTitle, avatar: user?.avatar }}
      onLogout={onLogout}
      labels={{ logout: t('dashboard.logout'), theme: t('dashboard.shell.theme'), language: t('dashboard.shell.language'), collapse: t('dashboard.shell.collapse'), menu: t('dashboard.shell.menu'), close: t('dashboard.shell.close') }}
    >
      <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
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
    </DashboardShell>
  );
};
