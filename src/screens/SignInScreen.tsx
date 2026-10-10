import { useEffect, useRef, useState } from 'react';
import { useApp, useMg } from '../contexts/AppContext';
import { useNav, type SignInAfter } from '../navigation';
import { useViewport } from '../hooks/useViewport';
import { BRAND_ICON } from '../components/mg/Chrome';
import { IArrowLeft } from '../components/mg/Icons';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COOLDOWN = 30;

function markOnboarded() {
  try { localStorage.setItem('mg_onboarded', '1'); } catch { /* ignore */ }
}

export const SignInScreen = ({ after }: { after: SignInAfter }) => {
  const tm = useMg();
  const nav = useNav();
  const { mid } = useViewport();
  const { signIn, setGuestCheckout, lang } = useApp();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);
  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  const leave = () => {
    markOnboarded();
    if (after === 'home') nav.go({ name: 'home' }, { replace: true });
    else nav.back();
  };

  const requestCode = async (): Promise<boolean> => {
    const res = await fetch('/api/app/auth/request-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), lang }),
    });
    if (res.ok) { setCooldown(COOLDOWN); return true; }
    const d = await res.json().catch(() => ({}));
    const msg = d.code === 'TOO_SOON' ? tm('tooSoon') : d.code === 'INVALID_EMAIL' ? tm('phoneErr') : d.code === 'EMAIL_FAILED' ? tm('emailFailed') : tm('networkError');
    if (step === 'email') setEmailErr(msg); else setCodeErr(msg);
    return false;
  };

  const submitEmail = async () => {
    if (!EMAIL_RE.test(email.trim())) { setEmailErr(tm('phoneErr')); return; }
    setBusy(true);
    try {
      if (await requestCode()) { setCode(''); setCodeErr(''); setStep('code'); }
    } catch { setEmailErr(tm('networkError')); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setCodeErr('');
    try { await requestCode(); } catch { setCodeErr(tm('networkError')); }
  };

  const verify = async () => {
    if (code.length !== 4) { setCodeErr(tm('otpErr')); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/app/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), code }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setCodeErr(d.code === 'EXPIRED_CODE' ? tm('codeExpired') : tm('otpErr')); return; }
      signIn(d.token, d.user);
      leave();
    } catch { setCodeErr(tm('networkError')); }
    finally { setBusy(false); }
  };

  const skip = () => {
    if (after === 'cart') setGuestCheckout(true);
    leave();
  };

  const digits = [0, 1, 2, 3].map(i => ({ d: code[i] ?? '', cur: code.length === i }));
  const resendLabel = cooldown > 0 ? tm('resendIn', { s: cooldown }) : tm('resend');
  const codeInput = (
    <input ref={codeRef} aria-label="Code" inputMode="numeric" autoComplete="one-time-code" value={code}
      onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setCodeErr(''); }}
      onKeyDown={e => e.key === 'Enter' && verify()}
      className="absolute inset-0 opacity-0 w-full h-full border-0" />
  );

  // ── Web ───────────────────────────────────────────────────────────
  if (mid) {
    return (
      <div data-screen-label="Sign In" className="max-w-[1040px] mx-auto px-[clamp(16px,4vw,32px)] pt-[clamp(24px,5vw,64px)] pb-24 animate-mg-in-slow">
        <div className="flex flex-wrap rounded-[32px] overflow-hidden border border-line bg-card shadow-mg-md">
          <div className="flex-[1_1_360px] relative overflow-hidden bg-primary text-white p-[clamp(28px,5vw,48px)] flex flex-col justify-end min-h-[240px]">
            <span className="absolute end-[-80px] top-[-80px] w-80 h-80 rounded-full bg-white/[.12]" />
            <img src={BRAND_ICON} alt="" className="relative w-[72px] h-[72px] rounded-[18px] mb-5 shadow-[0_0_0_2px_rgb(255_255_255/.35)]" />
            <span className="relative font-display font-extrabold text-[clamp(34px,4.4vw,52px)] leading-none tracking-[-0.04em] max-w-[10ch]">{tm('appName')}</span>
            <span className="relative text-[16px] leading-6 opacity-[.92] mt-3 max-w-[32ch]">{tm('signInSub')}</span>
          </div>
          <div className="flex-[1_1_380px] p-[clamp(28px,5vw,48px)] flex flex-col gap-4 box-border">
            {step === 'code' ? (
              <>
                <button onClick={() => setStep('email')} className="self-start flex items-center gap-1.5 border-0 bg-transparent p-0 text-muted-fg font-medium text-[14px] leading-5">
                  <IArrowLeft size={16} />{tm('signInTitle')}
                </button>
                <h1 className="m-0 font-display font-extrabold text-[34px] leading-10 tracking-[-0.035em]">{tm('otpTitle')}</h1>
                <p className="m-0 text-[15px] leading-[22px] text-muted-fg">{tm('otpSub')} <strong dir="ltr" className="text-fg font-semibold bidi-isolate">{email.trim()}</strong></p>
                <label dir="ltr" className="relative grid grid-cols-4 gap-3 max-w-[320px] mt-2">
                  {codeInput}
                  {digits.map((o, i) => (
                    <div key={i} className={`h-16 rounded-2xl border flex items-center justify-center font-display font-bold text-[28px] leading-none bg-bg ${codeErr ? 'border-destructive' : 'border-input'}`}>
                      {o.d}{o.cur && <span className="w-0.5 h-7 bg-primary animate-mg-blink" />}
                    </div>
                  ))}
                </label>
                {codeErr && <span role="alert" className="font-medium text-[13px] leading-[18px] text-destructive">{codeErr}</span>}
                <div className="flex gap-4 items-center flex-wrap text-[13px] leading-[18px] text-muted-fg">
                  <span>{tm('otpHint')}</span>
                  <button onClick={resend} disabled={cooldown > 0} className="border-0 bg-transparent p-0 text-acc font-semibold text-[14px] leading-5 disabled:text-muted-fg">{resendLabel}</button>
                </div>
                <button onClick={verify} disabled={busy}
                  className="mt-2 h-[54px] border-0 rounded-full bg-primary text-white font-semibold text-[16px] leading-none hover:opacity-[.92] disabled:opacity-60">{busy ? tm('verifying') : tm('verify')}</button>
              </>
            ) : (
              <>
                <h1 className="m-0 font-display font-extrabold text-[34px] leading-10 tracking-[-0.035em]">{tm('signInTitle')}</h1>
                <label htmlFor="mg-email" className="font-semibold text-[14px] leading-5 mt-2">{tm('phone')}</label>
                <input id="mg-email" type="email" inputMode="email" autoComplete="email" dir="ltr" value={email}
                  onChange={e => { setEmail(e.target.value.replace(/\s/g, '').slice(0, 80)); setEmailErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && submitEmail()} placeholder="name@example.com"
                  className={`-mt-2 h-[54px] px-4 border rounded-2xl bg-bg text-fg text-[17px] leading-none ${emailErr ? 'border-destructive' : 'border-input'}`} />
                {emailErr && <span role="alert" className="font-medium text-[13px] leading-[18px] text-destructive">{emailErr}</span>}
                <button onClick={submitEmail} disabled={busy}
                  className="mt-2 h-[54px] border-0 rounded-full bg-primary text-white font-semibold text-[16px] leading-none hover:opacity-[.92] disabled:opacity-60">{busy ? tm('sending') : tm('cont')}</button>
                <button onClick={skip} className="h-12 border-0 rounded-full bg-transparent text-fg font-semibold text-[15px] leading-none hover:bg-accent">{tm('skip')}</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Phone ─────────────────────────────────────────────────────────
  const fill = { minHeight: 'calc(100vh - env(safe-area-inset-top, 0px))' };
  if (step === 'code') {
    return (
      <div className="flex flex-col pt-2 px-6 box-border animate-mg-in" style={{ ...fill, paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}>
        <button aria-label="Back" onClick={() => setStep('email')}
          className="w-11 h-11 rounded-[14px] border border-line bg-bg text-fg flex items-center justify-center hover:bg-accent">
          <IArrowLeft size={20} />
        </button>
        <h1 className="mt-6 mb-2 font-display font-bold text-[32px] leading-10 tracking-[-0.02em]">{tm('otpTitle')}</h1>
        <p className="m-0 mb-8 text-[16px] leading-[22px] text-muted-fg">{tm('otpSub')} <span dir="ltr" className="text-fg font-semibold bidi-isolate">{email.trim()}</span></p>
        <label dir="ltr" className="relative grid grid-cols-4 gap-3">
          {codeInput}
          {digits.map((o, i) => (
            <div key={i} className={`h-16 rounded-[14px] border flex items-center justify-center font-semibold text-[28px] leading-none bg-bg ${codeErr ? 'border-destructive' : 'border-input'}`}>
              {o.d}{o.cur && <span className="w-0.5 h-7 bg-fg animate-mg-blink" />}
            </div>
          ))}
        </label>
        {codeErr && <div role="alert" className="mt-3 text-[12px] leading-4 text-destructive">{codeErr}</div>}
        <div className="mt-4 flex justify-between items-center gap-3 text-[12px] leading-4 text-muted-fg">
          <span>{tm('otpHint')}</span>
          <button onClick={resend} disabled={cooldown > 0} className="border-0 bg-transparent py-2 px-0 text-acc font-semibold text-[14px] leading-5 shrink-0 disabled:text-muted-fg">{resendLabel}</button>
        </div>
        <div className="flex-1 min-h-8" />
        <button onClick={verify} disabled={busy}
          className="h-12 border-0 rounded-[14px] bg-primary text-on-primary font-semibold text-[16px] leading-none hover:opacity-90 disabled:opacity-60">{busy ? tm('verifying') : tm('verify')}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-6 px-6 box-border animate-mg-in" style={{ ...fill, paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}>
      <img src={BRAND_ICON} alt="Menu Go" className="w-12 h-12 rounded-xl block" />
      <h1 className="mt-8 mb-2 font-display font-bold text-[32px] leading-10 tracking-[-0.02em]">{tm('signInTitle')}</h1>
      <p className="m-0 mb-8 text-[16px] leading-[22px] text-muted-fg text-pretty">{tm('signInSub')}</p>
      <label htmlFor="mg-email" className="font-semibold text-[14px] leading-5 mb-2">{tm('phone')}</label>
      <input id="mg-email" type="email" inputMode="email" autoComplete="email" dir="ltr" value={email}
        onChange={e => { setEmail(e.target.value.replace(/\s/g, '').slice(0, 80)); setEmailErr(''); }}
        onKeyDown={e => e.key === 'Enter' && submitEmail()} placeholder="name@example.com"
        className={`h-12 px-3.5 border rounded-[14px] bg-bg text-fg text-[16px] leading-none ${emailErr ? 'border-destructive' : 'border-input'}`} />
      {emailErr && <div role="alert" className="mt-2 text-[12px] leading-4 text-destructive">{emailErr}</div>}
      <div className="flex-1 min-h-8" />
      <div className="flex flex-col gap-2">
        <button onClick={submitEmail} disabled={busy}
          className="h-12 border-0 rounded-[14px] bg-primary text-on-primary font-semibold text-[16px] leading-none hover:opacity-90 disabled:opacity-60">{busy ? tm('sending') : tm('cont')}</button>
        <button onClick={skip} className="h-12 border-0 rounded-[14px] bg-transparent text-fg font-semibold text-[16px] leading-none hover:bg-accent">{tm('skip')}</button>
      </div>
    </div>
  );
};
