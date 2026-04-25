import React, { useState } from 'react';
import { LayoutDashboard, Users, TrendingUp, LogOut, Shield, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomerTable } from './components/CustomerTable';
import { AdminTable } from './components/AdminTable';
import { PlatformAnalytics } from './components/PlatformAnalytics';
import { clearToken } from '../src/lib/auth';

type Tab = 'overview' | 'customers' | 'admins' | 'analytics';

const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: string }[] = [
  { id: 'overview',   label: 'Overview',          icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'customers',  label: 'Customers',          icon: <Users className="w-5 h-5" />, badge: 'App users' },
  { id: 'admins',     label: 'Restaurant Admins',  icon: <ShieldCheck className="w-5 h-5" />, badge: 'Dashboard users' },
  { id: 'analytics',  label: 'Analytics',          icon: <TrendingUp className="w-5 h-5" /> },
];

export const SuperAdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const handleLogout = () => { clearToken(); onLogout(); };

  return (
    <div className="min-h-screen bg-surface flex text-on-surface">
      {/* Sidebar */}
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-surface-container bg-surface flex flex-col py-8 z-50">
        <div className="px-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-none">Super Admin</h1>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60">App Owner Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-start gap-3 px-4 py-3 transition-all rounded-xl text-left ${
                activeTab === item.id
                  ? 'text-on-surface font-semibold border-r-4 border-primary bg-surface-container'
                  : 'text-on-surface-variant opacity-70 hover:bg-surface-container hover:opacity-100'
              }`}>
              <span className="shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <span className="text-sm block">{item.label}</span>
                {item.badge && <span className="text-[9px] uppercase tracking-widest opacity-50">{item.badge}</span>}
              </div>
            </button>
          ))}
        </nav>

        <div className="px-4 mt-auto pt-6 border-t border-surface-container">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant opacity-70 hover:bg-surface-container rounded-xl transition-all">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 min-h-screen">
        <header className="w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-surface-container flex items-center justify-between px-8 py-4">
          <span className="text-xl font-bold font-headline">App Owner Dashboard</span>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Super Admin</span>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-8 py-10">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeTab === 'overview'  && <PlatformAnalytics />}
              {activeTab === 'customers' && <CustomerTable />}
              {activeTab === 'admins'    && <AdminTable />}
              {activeTab === 'analytics' && <PlatformAnalytics />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
