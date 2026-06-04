/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Info } from 'lucide-react';

interface HeaderProps {
  title: string;
  logo?: string;
  restaurantName?: string;
  onInfo?: () => void;
}

export const Header = ({ title, logo, restaurantName, onInfo }: HeaderProps) => (
  <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
    <div className="flex items-center justify-between px-5 h-16 w-full max-w-md mx-auto">
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo / avatar */}
        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
          {logo ? (
            <img src={logo} alt={restaurantName ?? title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary font-bold text-sm">
              {(restaurantName ?? title).slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="font-headline font-bold tracking-tight text-sm text-on-surface leading-tight truncate">
            {title}
          </h1>
          {restaurantName && title !== restaurantName && (
            <p className="text-[10px] text-on-surface-variant/60 font-medium truncate">{restaurantName}</p>
          )}
        </div>
      </div>

      <button onClick={onInfo} className="text-on-surface-variant/60 hover:text-on-surface transition-colors shrink-0 ms-2">
        <Info className="w-5 h-5" />
      </button>
    </div>
  </header>
);
