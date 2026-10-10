import { useEffect, useRef, useState } from 'react';
import { useApp, useMg } from '../../contexts/AppContext';
import { useCart } from '../../contexts/CartContext';
import { useNav } from '../../navigation';
import type { MenuItem } from '../../types';
import { ICheck, IChat, ISend, ISparkles, IX } from './Icons';

type Action =
  | { type: 'add'; itemId: string; quantity: number; note: string }
  | { type: 'set'; itemId: string; quantity: number }
  | { type: 'checkout' };

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  /** Cart changes made by this reply, shown as chips under the bubble. */
  changes?: string[];
  checkout?: boolean;
  /** Local-only failure notice; never sent back to the server. */
  error?: boolean;
}

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo?: string;
  items: MenuItem[];
  web: boolean;
}

/** Last ~30 turns, trimmed so the window opens on a user message (the API requires it). */
function historyWindow(msgs: Msg[]) {
  const recent = msgs.slice(-30);
  const start = recent.findIndex(m => m.role === 'user');
  return recent.slice(start).map(m => ({ role: m.role, content: m.content }));
}

const storageKey = (id: string) => `mg_chat_${id}`;

function loadMsgs(id: string): Msg[] {
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    const m = raw ? JSON.parse(raw) : null;
    if (Array.isArray(m)) return m;
  } catch { /* ignore */ }
  return [];
}

/** Floating "ask the restaurant" assistant that can answer menu questions and fill the cart. */
export function ChatAssistant({ restaurantId, restaurantName, restaurantLogo, items, web }: Props) {
  const tm = useMg();
  const nav = useNav();
  const cart = useCart();
  const { lang, toast, orderType, table } = useApp();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => loadMsgs(restaurantId));
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { sessionStorage.setItem(storageKey(restaurantId), JSON.stringify(msgs.slice(-40))); } catch { /* ignore */ }
  }, [msgs, restaurantId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, sending, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    let prev = '';
    if (!web) { prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (!web) document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, web]);

  const applyActions = (actions: Action[]) => {
    const changes: string[] = [];
    let replaced = false;
    for (const a of actions) {
      if (a.type === 'checkout') continue;
      const item = items.find(i => i.id === a.itemId);
      if (!item) continue;
      if (a.type === 'add') {
        replaced = cart.addItem(item, restaurantId, restaurantName, restaurantLogo ?? '', { qty: a.quantity, note: a.note }) || replaced;
        changes.push(`${tm('chatAdded')} ${a.quantity} × ${item.name}`);
      } else {
        cart.setItemQty(item.id, a.quantity);
        changes.push(a.quantity > 0 ? `${item.name} × ${a.quantity}` : `${tm('chatRemoved')} ${item.name}`);
      }
    }
    if (replaced) toast(`${tm('replaced')} ${restaurantName}`);
    return changes;
  };

  const send = async (content: string) => {
    const body = content.trim();
    if (!body || sending) return;
    const next: Msg[] = [...msgs.filter(m => !m.error), { role: 'user', content: body }];
    setMsgs(next);
    setText('');
    setSending(true);
    try {
      const sameRestaurant = cart.restaurantId === restaurantId;
      const res = await fetch(`/api/restaurants/${restaurantId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyWindow(next),
          cart: sameRestaurant ? cart.items.map(l => ({ id: l.id, quantity: l.quantity, note: l.note })) : [],
          lang: lang === 'ar' ? 'ar' : 'en',
          table: orderType === 'dinein' && table ? table : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.reply) throw new Error(data?.message || tm('chatError'));
      const actions: Action[] = Array.isArray(data.actions) ? data.actions : [];
      const changes = applyActions(actions);
      setMsgs(m => [...m, { role: 'assistant', content: data.reply, changes, checkout: actions.some(a => a.type === 'checkout') }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', content: e instanceof Error && e.message ? e.message : tm('chatError'), error: true }]);
    } finally {
      setSending(false);
    }
  };

  const suggestions = [tm('chatSuggest1'), tm('chatSuggest2'), tm('chatSuggest3')];
  // Phone: clear the floating cart bar on the restaurant screen.
  const liftForCart = cart.items.length > 0;

  const fab = !open && (
    <button aria-label={tm('chatOpen')} onClick={() => setOpen(true)}
      className={`fixed z-[25] h-14 ps-4 pe-5 rounded-full border-0 bg-primary text-on-primary shadow-mg-lg flex items-center gap-2 font-semibold text-[15px] leading-none hover:opacity-95 animate-mg-in ${web ? 'end-6' : 'end-4'}`}
      style={{ bottom: web ? (liftForCart ? 96 : 24) : `calc(${liftForCart ? 92 : 24}px + env(safe-area-inset-bottom, 0px))` }}>
      <IChat size={20} />
      <span>{tm('chatFab')}</span>
    </button>
  );

  const panelBody = (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line shrink-0">
        <span className="w-10 h-10 rounded-full bg-acc-soft text-acc flex items-center justify-center shrink-0"><ISparkles size={20} /></span>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="font-semibold text-[15px] leading-5 truncate">{tm('chatTitle', { name: restaurantName })}</span>
          <span className="text-[12px] leading-4 text-muted-fg">{tm('chatSub')}</span>
        </div>
        <button aria-label="Close" onClick={() => setOpen(false)}
          className="w-10 h-10 rounded-full border-0 bg-muted text-fg flex items-center justify-center shrink-0 hover:bg-accent"><IX size={18} /></button>
      </div>

      <div ref={listRef} aria-live="polite" className="mg-scroll flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {msgs.length === 0 && (
          <div className="flex flex-col gap-3">
            <div className="max-w-[85%] self-start px-3.5 py-2.5 rounded-[18px] rounded-ss-md bg-muted text-fg text-[14px] leading-5 whitespace-pre-wrap">
              {tm('chatGreeting', { name: restaurantName })}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="h-9 px-3.5 rounded-full border border-line bg-bg text-fg text-[13px] leading-none font-medium hover:border-fg">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => m.role === 'user' ? (
          <div key={i} className="max-w-[85%] self-end px-3.5 py-2.5 rounded-[18px] rounded-se-md bg-primary text-on-primary text-[14px] leading-5 whitespace-pre-wrap break-words">
            <bdi>{m.content}</bdi>
          </div>
        ) : (
          <div key={i} className="max-w-[85%] self-start flex flex-col gap-2">
            <div className={`px-3.5 py-2.5 rounded-[18px] rounded-ss-md text-[14px] leading-5 whitespace-pre-wrap break-words ${m.error ? 'bg-warn1 text-warn7' : 'bg-muted text-fg'}`}>
              <bdi>{m.content}</bdi>
            </div>
            {m.changes && m.changes.length > 0 && (
              <div className="flex flex-col gap-1">
                {m.changes.map((c, j) => (
                  <span key={j} className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pos1 text-pos7 text-[12px] leading-4 font-semibold">
                    <ICheck size={12} sw={3} />{c}
                  </span>
                ))}
              </div>
            )}
            {m.checkout && cart.items.length > 0 && (
              <button onClick={() => { setOpen(false); nav.go({ name: 'cart' }); }}
                className="self-start h-10 px-4 rounded-full border-0 bg-primary text-on-primary font-semibold text-[14px] leading-none hover:opacity-95">
                {tm('chatCheckout')}
              </button>
            )}
          </div>
        ))}
        {sending && (
          <div role="status" aria-label={tm('chatTyping')} className="self-start px-4 py-3 rounded-[18px] rounded-ss-md bg-muted flex gap-1">
            {[0, 1, 2].map(d => <span key={d} className="w-2 h-2 rounded-full bg-muted-fg animate-mg-pulse" style={{ animationDelay: `${d * 0.2}s` }} />)}
          </div>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); send(text); }}
        className="shrink-0 flex items-end gap-2 px-3 pt-2 border-t border-line"
        style={{ paddingBottom: web ? 12 : 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        <textarea ref={inputRef} rows={1} value={text} maxLength={2000} aria-label={tm('chatPh')} placeholder={tm('chatPh')}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(text); } }}
          className="flex-1 min-w-0 max-h-28 resize-none px-4 py-3 rounded-[22px] border-0 outline-none bg-muted text-fg text-[16px] leading-5" />
        <button type="submit" aria-label={tm('chatSend')} disabled={!text.trim() || sending}
          className="w-11 h-11 shrink-0 rounded-full border-0 bg-primary text-on-primary flex items-center justify-center disabled:opacity-40">
          <ISend size={18} />
        </button>
      </form>
    </>
  );

  if (web) {
    return (
      <>
        {fab}
        {open && (
          <div role="dialog" aria-label={tm('chatTitle', { name: restaurantName })}
            className="fixed bottom-6 end-6 z-50 w-[380px] max-w-[calc(100vw-32px)] h-[min(600px,calc(100vh-120px))] flex flex-col bg-card text-fg rounded-3xl border border-line shadow-mg-lg overflow-hidden animate-mg-up">
            {panelBody}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {fab}
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/45 animate-mg-fade flex items-end">
          <div role="dialog" aria-modal="true" aria-label={tm('chatTitle', { name: restaurantName })} onClick={e => e.stopPropagation()}
            className="w-full h-[88%] flex flex-col bg-bg rounded-t-[28px] overflow-hidden animate-mg-up">
            <div className="flex justify-center pt-2 shrink-0"><span className="w-9 h-1 rounded-full bg-line" /></div>
            {panelBody}
          </div>
        </div>
      )}
    </>
  );
}
