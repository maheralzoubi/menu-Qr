/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Utensils, Info } from 'lucide-react';

export const Header = ({ title, onInfo }: { title: string, onInfo?: () => void }) => (
  <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
    <div className="flex items-center justify-between px-6 h-16 w-full max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Utensils className="w-5 h-5 text-primary" />
        <h1 className="font-headline font-bold tracking-tight text-lg text-on-surface">{title}</h1>
      </div>
      <button onClick={onInfo} className="text-on-surface-variant/60 hover:text-on-surface transition-colors">
        <Info className="w-5 h-5" />
      </button>
    </div>
  </header>
);
