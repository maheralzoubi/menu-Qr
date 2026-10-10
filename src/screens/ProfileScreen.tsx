import { useState } from 'react';
import { useApp, useMg, type PayMethod } from '../contexts/AppContext';
import { useNav } from '../navigation';
import { useViewport } from '../hooks/useViewport';
import { AddressSheet } from '../components/mg/AddressSheet';
import { IChevronRight, IUser } from '../components/mg/Icons';
import { RadioDot, Sheet, Switch } from '../components/mg/ui';

const APP_VERSION = '1.0.0';

type SheetKind = 'addresses' | 'payments' | 'help' | null;

export const ProfileScreen = () => {
  const tm = useMg();
  const nav = useNav();
  const { mid } = useViewport();
  const app = useApp();
  const { user, theme, setTheme, lang, setLang, notifOn, setNotifOn } = app;
  const [sheet, setSheet] = useState<SheetKind>(null);

  const signIn = () => nav.go({ name: 'signin', after: 'profile' });
  const signOut = () => { app.signOut(); if (!mid) nav.go({ name: 'signin', after: 'home' }, { replace: true }); };

  const seg = <K extends string>(opts: { k: K; label: string }[], value: K, onPick: (k: K) => void) => (
    <div role="radiogroup" className={mid ? 'flex gap-0.5 p-1 rounded-full bg-muted' : 'flex gap-0.5 p-[3px] rounded-[14px] bg-muted'}>
      {opts.map(o => (
        <button key={o.k} role="radio" aria-checked={o.k === value} onClick={() => onPick(o.k)}
          className={mid
            ? `h-9 px-4 border-0 rounded-full text-[14px] leading-none ${o.k === value ? 'bg-card shadow-mg text-fg font-semibold' : 'bg-transparent text-muted-fg font-medium'}`
            : `h-[34px] px-3.5 border-0 rounded-[10px] font-semibold text-[13px] leading-none ${o.k === value ? 'bg-bg shadow-mg text-fg' : 'bg-transparent text-muted-fg'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
  const themeSeg = seg([{ k: 'light', label: tm('light') }, { k: 'dark', label: tm('dark') }], theme, setTheme);
  const langSeg = seg([{ k: 'en', label: 'English' }, { k: 'ar', label: 'العربية' }], lang, setLang);

  const accountRows: { k: Exclude<SheetKind, null>; label: string }[] = [
    { k: 'addresses', label: tm('addresses') },
    { k: 'payments', label: tm('payments') },
    { k: 'help', label: tm('help') },
  ];

  const sheets = (
    <>
      {sheet === 'addresses' && <AddressSheet web={mid} onClose={() => setSheet(null)} />}
      {sheet === 'payments' && <PaymentsSheet web={mid} onClose={() => setSheet(null)} />}
      {sheet === 'help' && (
        <Sheet open onClose={() => setSheet(null)} label={tm('help')} web={mid}>
          <h2 className={`m-0 font-display ${mid ? 'font-extrabold text-[28px] leading-8 tracking-[-0.03em]' : 'font-bold text-[24px] leading-8 tracking-[-0.02em]'}`}>{tm('help')}</h2>
          <p className="m-0 text-[15px] leading-[22px] text-muted-fg">{tm('helpBody')}</p>
          <div className="flex justify-between text-[14px] leading-5 pt-3 border-t border-line">
            <span className="text-muted-fg">{tm('version')}</span><span dir="ltr">{APP_VERSION}</span>
          </div>
          <div style={mid ? undefined : { height: 'env(safe-area-inset-bottom, 0px)' }} />
        </Sheet>
      )}
    </>
  );

  // ── Web ───────────────────────────────────────────────────────────
  if (mid) {
    const h2 = 'm-0 px-[22px] pt-[18px] pb-1.5 font-semibold text-[12px] leading-4 text-muted-fg uppercase tracking-[.08em]';
    const row = 'flex items-center justify-between gap-3 px-[22px] py-3.5 border-b border-line flex-wrap';
    return (
      <div data-screen-label="Profile" className="max-w-[760px] mx-auto px-[clamp(16px,4vw,32px)] pt-[clamp(20px,3vw,32px)] pb-24 flex flex-col gap-6 animate-mg-in-slow">
        <h1 className="m-0 font-display font-extrabold text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.035em]">{tm('profile')}</h1>
        <div className="flex flex-wrap items-center gap-4 p-[22px] border border-line rounded-3xl bg-card">
          <span className="w-[60px] h-[60px] rounded-full bg-acc-soft text-acc flex items-center justify-center shrink-0"><IUser size={26} /></span>
          {user ? (
            <>
              <span className="flex-[1_1_200px] flex flex-col gap-0.5">
                <span className="font-display font-bold text-[20px] leading-[26px]">{user.name || tm('account')}</span>
                <span dir="ltr" className="text-[15px] leading-[22px] text-muted-fg text-start">{user.email}</span>
              </span>
              <button onClick={signOut} className="h-[46px] px-5 border border-line rounded-full bg-card text-destructive font-semibold text-[15px] leading-none">{tm('signOut')}</button>
            </>
          ) : (
            <>
              <span className="flex-[1_1_200px] flex flex-col gap-0.5">
                <span className="font-display font-bold text-[20px] leading-[26px]">{tm('guest')}</span>
                <span className="text-[14px] leading-5 text-muted-fg">{tm('guestSub')}</span>
              </span>
              <button onClick={signIn} className="h-[46px] px-[22px] border-0 rounded-full bg-primary text-white font-semibold text-[15px] leading-none">{tm('signInCta')}</button>
            </>
          )}
        </div>
        <section className="border border-line rounded-3xl bg-card overflow-hidden">
          <h2 className={h2}>{tm('settings')}</h2>
          <div className={row}><span className="font-medium text-[15px] leading-[22px]">{tm('appearance')}</span>{themeSeg}</div>
          <div className={row}><span className="font-medium text-[15px] leading-[22px]">{tm('language')}</span>{langSeg}</div>
          <button role="switch" aria-checked={notifOn} onClick={() => setNotifOn(!notifOn)}
            className="w-full flex items-center justify-between gap-3 px-[22px] py-[18px] border-0 bg-transparent text-fg text-start">
            <span className="font-medium text-[15px] leading-[22px]">{tm('notifPref')}</span>
            <Switch on={notifOn} web />
          </button>
        </section>
        <section className="border border-line rounded-3xl bg-card overflow-hidden">
          <h2 className={h2}>{tm('account')}</h2>
          {accountRows.map((r, i) => (
            <button key={r.k} onClick={() => setSheet(r.k)}
              className={`w-full flex justify-between items-center px-[22px] py-4 border-0 bg-transparent text-fg font-medium text-[15px] leading-[22px] hover:bg-accent ${i < accountRows.length - 1 ? 'border-b border-line' : ''}`}>
              <span>{r.label}</span><IChevronRight size={16} className="text-muted-fg" />
            </button>
          ))}
        </section>
        {sheets}
      </div>
    );
  }

  // ── Phone ─────────────────────────────────────────────────────────
  const h2 = 'm-0 mb-1 font-semibold text-[12px] leading-4 text-muted-fg uppercase tracking-[.06em]';
  return (
    <div className="pt-2 px-5 pb-[120px] flex flex-col gap-6 animate-mg-in">
      <h1 className="m-0 font-display font-bold text-[28px] leading-9 tracking-[-0.02em]">{tm('profile')}</h1>
      <div className="flex items-center gap-3.5 p-4 border border-line rounded-[14px] bg-card shadow-mg-sm">
        <div className="w-14 h-14 rounded-full bg-muted text-muted-fg flex items-center justify-center shrink-0"><IUser size={26} /></div>
        {user ? (
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="font-semibold text-[16px] leading-[22px]">{user.name || tm('account')}</span>
            <span dir="ltr" className="text-[14px] leading-5 text-muted-fg text-start truncate">{user.email}</span>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="font-semibold text-[16px] leading-[22px]">{tm('guest')}</span>
              <span className="text-[12px] leading-4 text-muted-fg">{tm('guestSub')}</span>
            </div>
            <button onClick={signIn} className="h-10 px-3.5 border-0 rounded-[14px] bg-primary text-on-primary font-semibold text-[14px] leading-none shrink-0">{tm('signInCta')}</button>
          </>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>{tm('settings')}</h2>
        <div className="border border-line rounded-[14px] bg-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
            <span className="text-[14px] leading-5">{tm('appearance')}</span>{themeSeg}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
            <span className="text-[14px] leading-5">{tm('language')}</span>{langSeg}
          </div>
          <button role="switch" aria-checked={notifOn} onClick={() => setNotifOn(!notifOn)}
            className="w-full flex items-center justify-between gap-3 p-4 border-0 bg-transparent text-fg text-start">
            <span className="text-[14px] leading-5">{tm('notifPref')}</span>
            <Switch on={notifOn} />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>{tm('account')}</h2>
        <div className="border border-line rounded-[14px] bg-card overflow-hidden">
          {accountRows.map((r, i) => (
            <button key={r.k} onClick={() => setSheet(r.k)}
              className={`w-full flex items-center justify-between p-4 border-0 bg-transparent text-fg text-[14px] leading-5 hover:bg-accent ${i < accountRows.length - 1 ? 'border-b border-line' : ''}`}>
              <span>{r.label}</span><IChevronRight size={16} className="text-muted-fg" />
            </button>
          ))}
        </div>
      </section>

      {user && (
        <button onClick={signOut} className="h-12 border border-line rounded-[14px] bg-bg text-destructive font-semibold text-[16px] leading-none hover:bg-accent">{tm('signOut')}</button>
      )}
      <p className="m-0 text-center text-[12px] leading-4 text-muted-fg">{tm('appName')} · {tm('version')} <span dir="ltr">{APP_VERSION}</span></p>
      {sheets}
    </div>
  );
};

function PaymentsSheet({ web, onClose }: { web: boolean; onClose: () => void }) {
  const tm = useMg();
  const { defaultPay, setDefaultPay } = useApp();
  const opts: { k: PayMethod; label: string; sub: string }[] = [
    { k: 'cash', label: tm('payment_cash'), sub: tm('payCounterSub') },
    { k: 'card', label: tm('payment_card'), sub: tm('payCardCounterSub') },
  ];
  return (
    <Sheet open onClose={onClose} label={tm('payments')} web={web}>
      <div className="flex flex-col gap-1">
        <h2 className={`m-0 font-display ${web ? 'font-extrabold text-[28px] leading-8 tracking-[-0.03em]' : 'font-bold text-[24px] leading-8 tracking-[-0.02em]'}`}>{tm('payments')}</h2>
        <span className="text-[14px] leading-5 text-muted-fg">{tm('defaultPayment')}</span>
      </div>
      <div role="radiogroup" className="border border-line rounded-[14px] overflow-hidden">
        {opts.map(o => (
          <button key={o.k} role="radio" aria-checked={defaultPay === o.k} onClick={() => setDefaultPay(o.k)}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-0 border-b border-line -mb-px bg-transparent text-fg text-start hover:bg-accent">
            <RadioDot on={defaultPay === o.k} web={web} />
            <span className="flex-1 flex flex-col">
              <span className="font-semibold text-[14px] leading-5">{o.label}</span>
              <span className="text-[12px] leading-4 text-muted-fg">{o.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div style={web ? undefined : { height: 'env(safe-area-inset-bottom, 0px)' }} />
    </Sheet>
  );
}
