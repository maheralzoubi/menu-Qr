// Shared building blocks for the Menu Go customer screens.
import { useEffect, useState, type ReactNode } from 'react';
import { formatCurrency } from '../../lib/currency';
import { ICheck, IMinus, IPlus, ITrash, IUtensils, IX } from './Icons';

export const money = (n: number, currency = 'USD') => formatCurrency(n, currency);

/** Two-letter monogram used on restaurant covers ("Al Maher Restaurant" → "AM"). */
export function monogram(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2));
  return letters.toUpperCase();
}

const DEFAULT_COLORS = ['#fe5722', '#ff5e1a', '#9b3f25', ''];

function hashHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

/** Cover tint + monogram ink: the restaurant's brand colour, or a stable hue per restaurant. */
export function coverColors(id: string, color?: string) {
  if (color && !DEFAULT_COLORS.includes(color.toLowerCase()) && /^#[0-9a-f]{6}$/i.test(color)) {
    return { cover: `${color}2e`, ink: color };
  }
  const hue = hashHue(id);
  return { cover: `hsl(${hue} 70% 55% / .18)`, ink: `hsl(${hue} 65% 42%)` };
}

export function timeAgo(at: number, tm: (k: string, o?: Record<string, unknown>) => string) {
  const mins = Math.floor((Date.now() - at) / 60000);
  if (mins < 1) return tm('now');
  if (mins < 60) return tm('minAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return tm('hourAgo', { n: hours });
  return tm('dayAgo', { n: Math.floor(hours / 24) });
}

/** Uploaded images live on the API server; the native app must load them from there. */
export function assetUrl(src: string) {
  const base = import.meta.env.VITE_API_URL ?? '';
  return base && src.startsWith('/uploads/') ? base + src : src;
}

/** Image that falls back to `fallback` when missing or broken. */
export function Img({ src, alt = '', className, fallback }: { src?: string; alt?: string; className?: string; fallback: ReactNode }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) return <>{fallback}</>;
  return <img src={assetUrl(src)} alt={alt} className={className} onError={() => setBroken(true)} />;
}

export const DishPlaceholder = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <IUtensils size={size} sw={1.5} className={`opacity-60 ${className}`} />
);

// ── Segmented control ───────────────────────────────────────────────
type SegVariant = 'm' | 'pill' | 'pillGrid' | 'cards';
export function Segmented<K extends string>({ options, value, onChange, variant = 'm', label, className = '' }: {
  options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; variant?: SegVariant; label?: string; className?: string;
}) {
  const wrap = {
    m: 'grid grid-cols-3 gap-1 p-1 rounded-[14px] bg-muted',
    pill: 'flex gap-0.5 p-1 rounded-full bg-muted shrink-0',
    pillGrid: 'grid grid-cols-3 gap-0.5 p-1 rounded-full bg-muted max-w-[420px]',
    cards: 'grid grid-cols-3 gap-2.5',
  }[variant];
  const on = {
    m: 'h-10 rounded-[10px] bg-bg text-fg shadow-mg font-semibold text-[14px] leading-none',
    pill: 'h-9 px-4 rounded-full bg-card text-fg shadow-mg font-semibold text-[14px] leading-none',
    pillGrid: 'h-9 rounded-full bg-card text-fg shadow-mg font-semibold text-[14px] leading-none',
    cards: 'h-14 rounded-2xl border-2 border-primary bg-acc-soft text-fg font-semibold text-[15px] leading-none',
  }[variant];
  const off = {
    m: 'h-10 rounded-[10px] bg-transparent text-muted-fg font-semibold text-[14px] leading-none hover:text-fg',
    pill: 'h-9 px-4 rounded-full bg-transparent text-muted-fg font-medium text-[14px] leading-none hover:text-fg',
    pillGrid: 'h-9 rounded-full bg-transparent text-muted-fg font-medium text-[14px] leading-none hover:text-fg',
    cards: 'h-14 rounded-2xl border border-line bg-card text-fg font-medium text-[15px] leading-none hover:border-fg',
  }[variant];
  return (
    <div role="tablist" aria-label={label} className={`${wrap} ${className}`}>
      {options.map(o => (
        <button key={o.key} role="tab" aria-selected={o.key === value} onClick={() => o.key !== value && onChange(o.key)}
          className={`${variant === 'cards' ? '' : 'border-0'} ${o.key === value ? on : off}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Choice indicators ───────────────────────────────────────────────
export const RadioDot = ({ on, web }: { on: boolean; web?: boolean }) => on
  ? <span className={`w-5 h-5 shrink-0 box-border rounded-full border-[6px] border-primary ${web ? 'bg-white' : ''}`} />
  : <span className={`w-5 h-5 shrink-0 box-border rounded-full border-[1.5px] ${web ? 'border-input' : 'border-ring'}`} />;

export const Switch = ({ on, web }: { on: boolean; web?: boolean }) => (
  <span className={`relative shrink-0 rounded-full ${web ? 'w-[46px] h-[26px]' : 'w-11 h-6'} ${on ? 'bg-primary' : 'bg-input'}`}>
    <span className={`absolute rounded-full w-5 h-5 ${web ? 'top-[3px] bg-white' : 'top-0.5'} ${on
      ? `${web ? 'end-[3px]' : 'end-0.5 bg-on-primary'}`
      : `${web ? 'start-[3px]' : 'start-0.5 bg-bg shadow-mg-sm'}`}`} />
  </span>
);

// ── Quantity stepper ────────────────────────────────────────────────
type StepVariant = 'line' | 'sheet' | 'webLine' | 'webSheet';
export function Stepper({ qty, onDec, onInc, variant = 'line', trashAtOne }: {
  qty: number; onDec: () => void; onInc: () => void; variant?: StepVariant; trashAtOne?: boolean;
}) {
  const wrap = {
    line: 'flex items-center border border-line rounded-[14px] h-10',
    sheet: 'flex items-center border border-line rounded-[14px] h-[52px]',
    webLine: 'flex items-center rounded-full bg-muted h-9',
    webSheet: 'flex items-center rounded-full bg-muted h-[54px]',
  }[variant];
  const btn = {
    line: 'w-10 h-[38px]', sheet: 'w-11 h-[50px]', webLine: 'w-9 h-9', webSheet: 'w-12 h-[54px]',
  }[variant];
  const web = variant.startsWith('web');
  const icon = web ? (variant === 'webLine' ? 14 : 16) : 16;
  const sw = web ? 2.25 : 2;
  const num = variant === 'line' ? 'min-w-5 text-[14px]' : variant === 'webLine' ? 'min-w-4 text-[14px]' : 'min-w-5 text-[16px]';
  return (
    <div className={wrap}>
      <button aria-label="Decrease" onClick={onDec} className={`${btn} border-0 bg-transparent text-fg flex items-center justify-center`}>
        {trashAtOne && qty === 1 ? <ITrash size={16} /> : <IMinus size={icon} sw={sw} />}
      </button>
      <span aria-live="polite" className={`${num} text-center font-semibold leading-none tabular-nums`}>{qty}</span>
      <button aria-label="Increase" onClick={onInc} className={`${btn} border-0 bg-transparent text-fg flex items-center justify-center`}>
        <IPlus size={icon} sw={sw} />
      </button>
    </div>
  );
}

// ── Toast ───────────────────────────────────────────────────────────
export function Toast({ msg, web }: { msg: string | null; web: boolean }) {
  if (!msg) return null;
  const tick = (
    <span className="w-5 h-5 rounded-full bg-pos5 text-white flex items-center justify-center shrink-0">
      <ICheck size={12} sw={3.5} />
    </span>
  );
  if (web) {
    return (
      <div role="status" aria-live="polite" className="fixed top-[88px] inset-x-0 z-[60] flex justify-center pointer-events-none animate-mg-in-slow">
        <div className="flex items-center gap-2.5 px-[18px] py-3 rounded-full bg-popover text-popover-fg shadow-mg-lg font-semibold text-[14px] leading-5">
          {tick}<span>{msg}</span>
        </div>
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite"
      className="fixed inset-x-4 z-[60] flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-popover text-popover-fg border border-line shadow-mg-lg font-semibold text-[14px] leading-5 animate-mg-in"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
      {tick}<span>{msg}</span>
    </div>
  );
}

// ── Sheet: bottom sheet on phones, centred dialog on web ─────────────
export function Sheet({ open, onClose, label, web, children, footer, hero, handle = true }: {
  open: boolean; onClose: () => void; label: string; web: boolean; children: ReactNode; footer?: ReactNode; hero?: ReactNode; handle?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open) return null;

  if (web) {
    return (
      <div onClick={onClose} className="fixed inset-0 z-50 bg-[rgb(20_10_5/.5)] animate-mg-fade flex items-center justify-center p-6 box-border">
        <div role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}
          className="w-full max-w-[560px] max-h-[90vh] flex flex-col bg-card rounded-[28px] overflow-hidden shadow-mg-lg animate-mg-up">
          {hero ?? (
            <div className="flex justify-end px-4 pt-4">
              <button aria-label="Close" onClick={onClose} className="w-10 h-10 rounded-full border-0 bg-muted text-fg flex items-center justify-center"><IX size={18} /></button>
            </div>
          )}
          <div className="overflow-y-auto px-6 py-[22px] flex flex-col gap-[22px]">{children}</div>
          {footer}
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-40 bg-black/45 animate-mg-fade flex items-end">
      <div role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}
        className="w-full max-h-[88%] flex flex-col bg-bg rounded-t-[28px] animate-mg-up">
        {handle && <div className="flex justify-center pt-2"><span className="w-9 h-1 rounded-full bg-line" /></div>}
        <div className="mg-scroll overflow-y-auto px-5 pt-3 pb-4 flex flex-col gap-5">
          {hero}
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

// ── Skeleton block ──────────────────────────────────────────────────
export const Sk = ({ className = '' }: { className?: string }) => <div className={`bg-muted animate-mg-pulse ${className}`} />;
