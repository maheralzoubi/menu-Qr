import React, { useState, useEffect, useCallback } from 'react';
import { Building2, TrendingUp, LogOut, Shield, Users, CreditCard, Megaphone, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { RestaurantList } from './components/RestaurantList';
import { RestaurantDetail } from './components/RestaurantDetail';
import { PlatformAnalytics } from './components/PlatformAnalytics';
import { CustomerTable } from './components/CustomerTable';
import { PlansManager } from './components/PlansManager';
import { BannersManager } from './components/BannersManager';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { MyAccountModal } from './components/MyAccountModal';
import { clearOwnerToken as clearToken, isSuperAdmin } from '../src/lib/ownerAuth';

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

  const navItems: { id: Tab; icon: React.ReactNode }[] = [
    { id: 'restaurants', icon: <Building2 className="w-5 h-5" /> },
    { id: 'analytics',   icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'customers',   icon: <Users className="w-5 h-5" /> },
    { id: 'plans',       icon: <CreditCard className="w-5 h-5" /> },
    { id: 'banners',     icon: <Megaphone className="w-5 h-5" /> },
  ];

  const superAdminOnly = new Set<Tab>(['customers', 'plans', 'banners']);
  const visibleNavItems = navItems.filter(
    item => !superAdminOnly.has(item.id) || superAdmin
  );
  const handleLogout = () => { clearToken(); onLogout(); };

  return (
    <div className="min-h-screen bg-surface flex text-on-surface">
      {/* Sidebar */}
      <aside className="h-screen w-64 fixed left-0 rtl:left-auto rtl:right-0 top-0 flex flex-col py-8 z-50" style={{ backgroundColor: '#303942' }}>
        <div className="px-6 mb-10">
          <img src="/logo-dark.svg" alt="Monar" className="h-9 w-auto" />
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {visibleNavItems.map(item => (
            <button key={item.id} onClick={() => changeTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all rounded-xl ${
                activeTab === item.id
                  ? 'text-white font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-primary bg-white/10'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="text-sm">{t(`nav.${item.id}`)}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 mt-auto pt-6 border-t border-white/10 space-y-2">
          <div className="px-0">
            <LanguageSwitcher className="w-full justify-center text-white border-white/20 hover:bg-white/10" />
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:bg-white/10 hover:text-white rounded-xl transition-all">
            <LogOut className="w-5 h-5" /><span className="text-sm">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 rtl:ml-0 rtl:mr-64 min-h-screen">
        <header className="w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-surface-container flex items-center justify-between px-8 py-4">
          <span className="text-xl font-bold font-headline">
            {selectedRestaurant ? selectedRestaurant.name : t('header.ownerDashboard')}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAccount(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-full hover:bg-surface-container-high transition-colors">
              <UserCircle className="w-4 h-4" />
              <span className="text-xs font-bold">{t('account.title')}</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">
                {superAdmin ? t('header.superAdmin') : t('header.appOwner')}
              </span>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-8 py-10">
          <AnimatePresence mode="wait">
            <motion.div key={selectedRestaurant?._id ?? activeTab}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

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
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showAccount && <MyAccountModal onClose={() => setShowAccount(false)} />}
      </AnimatePresence>
    </div>
  );
};
