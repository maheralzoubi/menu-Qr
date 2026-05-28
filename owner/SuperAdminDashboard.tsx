import React, { useState } from 'react';
import { Building2, TrendingUp, LogOut, Shield, Users, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { RestaurantList } from './components/RestaurantList';
import { RestaurantDetail } from './components/RestaurantDetail';
import { PlatformAnalytics } from './components/PlatformAnalytics';
import { CustomerTable } from './components/CustomerTable';
import { PlansManager } from './components/PlansManager';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { clearOwnerToken as clearToken, isSuperAdmin } from '../src/lib/ownerAuth';

type Tab = 'restaurants' | 'analytics' | 'customers' | 'plans';
interface SelectedRestaurant { _id: string; name: string; }

export const SuperAdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<Tab>('restaurants');
  const [selectedRestaurant, setSelectedRestaurant] = useState<SelectedRestaurant | null>(null);
  const superAdmin = isSuperAdmin();
  const { t } = useTranslation();

  const navItems: { id: Tab; icon: React.ReactNode }[] = [
    { id: 'restaurants', icon: <Building2 className="w-5 h-5" /> },
    { id: 'analytics',   icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'customers',   icon: <Users className="w-5 h-5" /> },
    { id: 'plans',       icon: <CreditCard className="w-5 h-5" /> },
  ];

  const visibleNavItems = navItems.filter(
    item => (item.id !== 'customers' && item.id !== 'plans') || superAdmin
  );
  const handleLogout = () => { clearToken(); onLogout(); };

  return (
    <div className="min-h-screen bg-surface flex text-on-surface">
      {/* Sidebar */}
      <aside className="h-screen w-64 fixed left-0 rtl:left-auto rtl:right-0 top-0 border-r rtl:border-r-0 rtl:border-l border-surface-container bg-surface flex flex-col py-8 z-50">
        <div className="px-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-none">{t('sidebar.ownerPanel')}</h1>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60">{t('sidebar.appManagement')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {visibleNavItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSelectedRestaurant(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all rounded-xl ${
                activeTab === item.id
                  ? 'text-on-surface font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-primary bg-surface-container'
                  : 'text-on-surface-variant opacity-70 hover:bg-surface-container hover:opacity-100'
              }`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="text-sm">{t(`nav.${item.id}`)}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 mt-auto pt-6 border-t border-surface-container space-y-2">
          <div className="px-0">
            <LanguageSwitcher className="w-full justify-center" />
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant opacity-70 hover:bg-surface-container rounded-xl transition-all">
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">
              {superAdmin ? t('header.superAdmin') : t('header.appOwner')}
            </span>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-8 py-10">
          <AnimatePresence mode="wait">
            <motion.div key={selectedRestaurant?._id ?? activeTab}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

              {activeTab === 'restaurants' && !selectedRestaurant && (
                <RestaurantList onSelect={r => setSelectedRestaurant(r)} />
              )}
              {activeTab === 'restaurants' && selectedRestaurant && (
                <RestaurantDetail
                  restaurantId={selectedRestaurant._id}
                  onBack={() => setSelectedRestaurant(null)}
                  onDeleted={() => setSelectedRestaurant(null)}
                />
              )}
              {activeTab === 'analytics' && <PlatformAnalytics />}
              {activeTab === 'customers' && <CustomerTable isSuperAdmin={superAdmin} />}
              {activeTab === 'plans' && <PlansManager />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
