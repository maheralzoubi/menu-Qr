import { shortId, useApp, useMg, type Notif } from '../contexts/AppContext';
import { useNav } from '../navigation';
import { useViewport } from '../hooks/useViewport';
import { IArrowLeft, IBell } from '../components/mg/Icons';
import { timeAgo } from '../components/mg/ui';
import { stepLabelFor } from '../components/mg/orderView';

export const NotificationsScreen = () => {
  const tm = useMg();
  const nav = useNav();
  const { mid } = useViewport();
  const { notifs, unread, markRead, markAllRead, restaurantById } = useApp();

  const text = (n: Notif) => {
    const id = shortId(n.orderId);
    const rest = restaurantById(n.restaurantId)?.name ?? '';
    return n.kind === 'placed'
      ? { title: tm('orderPlacedNotif', { id }), body: rest ? tm('orderPlacedBody', { rest }) : '' }
      : { title: tm('statusNotif', { id, label: stepLabelFor(n.status!, n.orderType ?? 'pickup', tm) }), body: rest };
  };
  const open = (n: Notif) => { markRead(n.id); nav.go({ name: 'track', orderId: n.orderId }); };

  const empty = (
    <div className="py-16 px-6 text-center flex flex-col gap-2 items-center">
      <span className="w-14 h-14 rounded-full bg-muted text-muted-fg flex items-center justify-center mb-1"><IBell size={24} /></span>
      <span className={mid ? 'font-display font-bold text-[22px] leading-7' : 'font-semibold text-[16px] leading-[22px]'}>{tm('noNotifs')}</span>
      <span className={`text-muted-fg max-w-[300px] ${mid ? 'text-[15px] leading-[22px]' : 'text-[14px] leading-5'}`}>{tm('noNotifsSub')}</span>
    </div>
  );

  // ── Web ───────────────────────────────────────────────────────────
  if (mid) {
    return (
      <div data-screen-label="Notifications" className="max-w-[760px] mx-auto px-[clamp(16px,4vw,32px)] pt-[clamp(20px,3vw,32px)] pb-24 flex flex-col gap-5 animate-mg-in-slow">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <h1 className="m-0 font-display font-extrabold text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.035em]">{tm('notifications')}</h1>
          {unread > 0 && (
            <button onClick={markAllRead} className="h-10 px-4 border border-line rounded-full bg-card text-fg font-semibold text-[14px] leading-none hover:border-fg">{tm('markRead')}</button>
          )}
        </div>
        {notifs.length === 0 ? empty : (
          <div className="border border-line rounded-3xl bg-card overflow-hidden">
            {notifs.map(n => {
              const { title, body } = text(n);
              return (
                <button key={n.id} onClick={() => open(n)}
                  className="w-full flex gap-3.5 items-start px-[22px] py-[18px] border-0 border-b border-line -mb-px bg-transparent text-fg text-start hover:bg-accent">
                  {n.unread ? <span aria-label="Unread" className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" /> : <span className="w-2.5 shrink-0" />}
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className={`text-[15px] leading-[22px] ${n.unread ? 'font-semibold' : 'font-normal'}`}>{title}</span>
                    {body && <span className="text-[13px] leading-[18px] text-muted-fg">{body}</span>}
                  </span>
                  <span className="text-[13px] leading-[18px] text-muted-fg shrink-0">{timeAgo(n.at, tm)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Phone ─────────────────────────────────────────────────────────
  return (
    <div className="animate-mg-in">
      <div className="pt-2 px-5 pb-3 flex items-center gap-3 border-b border-line">
        <button aria-label="Back" onClick={nav.back}
          className="w-11 h-11 shrink-0 rounded-[14px] border border-line bg-bg text-fg flex items-center justify-center hover:bg-accent">
          <IArrowLeft size={20} />
        </button>
        <h1 className="flex-1 m-0 font-display font-bold text-[20px] leading-7 tracking-[-0.02em]">{tm('notifications')}</h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="h-9 px-2 border-0 bg-transparent text-acc font-semibold text-[14px] leading-none">{tm('markRead')}</button>
        )}
      </div>
      {notifs.length === 0 ? empty : notifs.map(n => {
        const { title, body } = text(n);
        return (
          <button key={n.id} onClick={() => open(n)}
            className="w-full flex gap-3 px-5 py-4 border-0 border-b border-line bg-transparent text-fg text-start hover:bg-accent">
            {n.unread ? <span aria-label="Unread" className="w-2 h-2 rounded-full bg-acc mt-[7px] shrink-0" /> : <span className="w-2 shrink-0" />}
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className={`text-[14px] leading-5 ${n.unread ? 'font-semibold' : 'font-normal'}`}>{title}</span>
              {body && <span className="text-[12px] leading-4 text-muted-fg">{body}</span>}
            </span>
            <span className="text-[12px] leading-4 text-muted-fg shrink-0">{timeAgo(n.at, tm)}</span>
          </button>
        );
      })}
    </div>
  );
};
