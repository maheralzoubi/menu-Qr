import { ReactNode } from 'react';
import { BookOpen, Star, ReceiptText, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../types';

export const NavButton = ({ active, icon, label, onClick, badge }: {
  active: boolean; icon: ReactNode; label: string; onClick: () => void; badge?: number;
}) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 ${active ? 'bg-surface-container text-primary' : 'text-on-surface-variant/60'}`}
  >
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    {badge !== undefined && (
      <span className="absolute top-1 end-3 w-4 h-4 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center">
        {badge}
      </span>
    )}
  </button>
);

export const BottomNav = ({
  activeScreen,
  setScreen,
  cartCount,
}: {
  activeScreen: Screen;
  setScreen: (s: Screen) => void;
  cartCount: number;
  isLoggedIn?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <nav className="w-full">
      <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-[2.5rem] p-2 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.1)] border border-outline-variant/20 flex justify-around items-center h-20">
        <NavButton active={activeScreen === 'menu'}    icon={<BookOpen className="w-5 h-5" />}    label={t('nav.menu')}    onClick={() => setScreen('menu')} />
        <NavButton active={activeScreen === 'reviews'} icon={<Star className="w-5 h-5" />}         label={t('nav.reviews')} onClick={() => setScreen('reviews')} />
        <NavButton active={activeScreen === 'status'}  icon={<ReceiptText className="w-5 h-5" />}  label={t('nav.orders')}  onClick={() => setScreen('status')} />
        <NavButton
          active={activeScreen === 'cart'}
          icon={<ShoppingBag className="w-5 h-5" />}
          label={t('nav.cart')}
          onClick={() => setScreen('cart')}
          badge={cartCount > 0 ? cartCount : undefined}
        />
      </div>
    </nav>
  );
};
