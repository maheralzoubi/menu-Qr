import { ReactNode } from 'react';
import { Home, Package, User, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import type { MainTab } from '../App';



interface Props {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onCartOpen: () => void;
}

interface NavItem { tab: MainTab; icon: ReactNode; label: string; }

export const BottomNav = ({ activeTab, onTabChange, onCartOpen }: Props) => {
  const { t } = useTranslation();
  const { itemCount } = useCart();

  const items: NavItem[] = [
    { tab: 'home',    icon: <Home className="w-5 h-5" />,    label: t('bottomNav.home')    },
    { tab: 'orders',  icon: <Package className="w-5 h-5" />, label: t('bottomNav.orders')  },
    { tab: 'profile', icon: <User className="w-5 h-5" />,    label: t('bottomNav.profile') },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-surface-container">
      <div className="flex items-center" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {items.map(item => {
          const active = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onTabChange(item.tab)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-90 ${
                active ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <div className="relative">
                {item.icon}
              </div>
              <span className={`text-[10px] font-bold transition-all ${active ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}

        {/* Cart button */}
        <button
          onClick={onCartOpen}
          className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-90 text-on-surface-variant"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold opacity-60">{t('bottomNav.cart')}</span>
        </button>
      </div>
    </div>
  );
};
