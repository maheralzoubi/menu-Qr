import React, { useState, useEffect, useCallback } from 'react';
import { Building2, TrendingUp, Shield, Users, CreditCard, Megaphone, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { RestaurantList } from './components/RestaurantList';
import { RestaurantDetail } from './components/RestaurantDetail';
import { PlatformAnalytics } from './components/PlatformAnalytics';
import { CustomerTable } from './components/CustomerTable';
import { PlansManager } from './components/PlansManager';
import { BannersManager } from './components/BannersManager';
import { DashboardShell, type NavGroup } from '../src/dashboard/DashboardShell';
import { MyAccountModal } from './components/MyAccountModal';
import { clearOwnerToken as clearToken, getOwnerEmail, isSuperAdmin } from '../src/lib/ownerAuth';

type Tab = 'restaurants' | 'analytics' | 'customers' | 'plans' | 'banners';
interface SelectedRestaurant { _id: string; name: string; }
type NavState = { tab: Tab; restaurant: SelectedRestaurant | null };

const TABS: Tab[] = ['restaurants', 'analytics', 'customers', 'plans', 'banners'];

function parseNav(search: string): NavState {
  const params = new URLSearchParams(search);
  const rawTab = params.get('tab');
  const tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'restaurants';
  const rid = params.get('rid');
  const rname = params.get('rname');
  const restaurant = rid && rname ? { _id: rid, name: rname } : null;
  return { tab, restaurant };
}

function buildNavSearch(state: NavState): string {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', state.tab);
  if (state.restaurant) {
    params.set('rid', state.restaurant._id);
    params.set('rname', state.restaurant.name);
  } else {
    params.delete('rid');
    params.delete('rname');
  }
  return `?${params.toString()}`;
}

export const SuperAdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<Tab>(() => parseNav(window.location.search).tab);
  const [selectedRestaurant, setSelectedRestaurant] = useState<SelectedRestaurant | null>(
    () => parseNav(window.location.search).restaurant
  );
  const superAdmin = isSuperAdmin();
  const { t } = useTranslation();
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    window.history.replaceState({ tab: activeTab, restaurant: selectedRestaurant } satisfies NavState, '', window.location.href);
  }, []);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = (e.state as NavState | null) ?? parseNav(window.location.search);
      setActiveTab(state.tab);
      setSelectedRestaurant(state.restaurant);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const pushNav = useCallback((next: NavState, replace: boolean) => {
    const url = buildNavSearch(next);
    if (replace) window.history.replaceState(next, '', url);
    else window.history.pushState(next, '', url);
  }, []);

  const changeTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setSelectedRestaurant(null);
    pushNav({ tab, restaurant: null }, true);
  }, [pushNav]);

  const selectRestaurant = useCallback((r: SelectedRestaurant) => {
    setSelectedRestaurant(r);
    pushNav({ tab: 'restaurants', restaurant: r }, false);
  }, [pushNav]);

  const backToList = useCallback(() => {
    window.history.back();
  }, []);

  const restaurantDeleted = useCallback(() => {
    setSelectedRestaurant(null);
    pushNav({ tab: 'restaurants', restaurant: null }, true);
  }, [pushNav]);

  const navIcon: Record<Tab, React.ReactNode> = {
    restaurants: <Building2 />, analytics: <TrendingUp />, customers: <Users />, plans: <CreditCard />, banners: <Megaphone />,
  };
  const superAdminOnly = new Set<Tab>(['customers', 'plans', 'banners']);
  const item = (id: Tab) => ({ id, label: t(`nav.${id}`), icon: navIcon[id] });
  const groups: NavGroup[] = [
    { label: t('sidebar.groups.platform'), items: (['restaurants', 'analytics'] as Tab[]).map(item) },
    ...(superAdmin ? [{ label: t('sidebar.groups.administration'), items: (['customers', 'plans', 'banners'] as Tab[]).filter(id => superAdminOnly.has(id)).map(item) }] : []),
  ];
  const handleLogout = () => { clearToken(); onLogout(); };
  const roleLabel = superAdmin ? t('header.superAdmin') : t('header.appOwner');

  const crumbs = [
    { label: t('sidebar.ownerPanel') },
    { label: t(`nav.${activeTab}`), onClick: selectedRestaurant ? backToList : undefined },
    ...(selectedRestaurant ? [{ label: selectedRestaurant.name }] : []),
  ];

  return (
    <>
      <DashboardShell
        context={t('sidebar.ownerPanel')}
        groups={groups}
        activeId={activeTab}
        onSelect={id => changeTab(id as Tab)}
        crumbs={crumbs}
        actions={
          <>
            <span className="ds-chip ds-chip-brand max-sm:hidden"><Shield className="w-3 h-3" />{roleLabel}</span>
            <button onClick={() => setShowAccount(true)} className="ds-btn ds-btn-outline ds-btn-sm">
              <UserCircle className="w-4 h-4" /><span className="max-sm:hidden">{t('account.title')}</span>
            </button>
          </>
        }
        user={{ name: getOwnerEmail() || t('account.title'), sub: roleLabel }}
        onLogout={handleLogout}
        labels={{ logout: t('nav.logout'), theme: t('shell.theme'), language: t('shell.language'), collapse: t('shell.collapse'), menu: t('shell.menu'), close: t('shell.close') }}
      >
        <motion.div key={selectedRestaurant?._id ?? activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
          {activeTab === 'restaurants' && !selectedRestaurant && (
            <RestaurantList onSelect={selectRestaurant} />
          )}
          {activeTab === 'restaurants' && selectedRestaurant && (
            <RestaurantDetail
              restaurantId={selectedRestaurant._id}
              onBack={backToList}
              onDeleted={restaurantDeleted}
            />
          )}
          {activeTab === 'analytics' && <PlatformAnalytics />}
          {activeTab === 'customers' && <CustomerTable isSuperAdmin={superAdmin} />}
          {activeTab === 'plans' && <PlansManager />}
          {activeTab === 'banners' && <BannersManager />}
        </motion.div>
      </DashboardShell>

      <AnimatePresence>
        {showAccount && <MyAccountModal onClose={() => setShowAccount(false)} />}
      </AnimatePresence>
    </>
  );
};
