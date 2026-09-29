// App shell for the Menu Go dashboards (vendor admin + owner panel), following the
// Fleet Manager kit: fixed sidebar (brand block · grouped nav · user block), 64px header
// with breadcrumb + actions, content scrolling underneath. Sidebar becomes a sheet < lg.
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Globe, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun, X } from 'lucide-react';
import { applyDashTheme, initialDashTheme, type DashTheme } from './theme';

export interface NavItem { id: string; label: string; icon: ReactNode; badge?: number | string }
export interface NavGroup { label: string; items: NavItem[] }

interface Props {
  /** Small line under "Menu Go" in the brand block (e.g. restaurant name, "Owner Panel"). */
  context: string;
  groups: NavGroup[];
  activeId: string;
  onSelect: (id: string) => void;
  crumbs: { label: string; onClick?: () => void }[];
  actions?: ReactNode;
  user: { name: string; sub?: string; avatar?: string };
  onLogout: () => void;
  labels: { logout: string; theme: string; language: string; collapse: string; menu: string; close: string };
  children: ReactNode;
}

const COLLAPSE_KEY = 'mg_dash_sidebar_collapsed';

export function DashboardShell({ context, groups, activeId, onSelect, crumbs, actions, user, onLogout, labels, children }: Props) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<DashTheme>(initialDashTheme);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => { applyDashTheme(theme); }, [theme]);
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyDashTheme(next, true);
    setTheme(next);
  };
  const toggleLang = () => {
    const next = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(next);
    try { localStorage.setItem('lang', next); } catch { /* ignore */ }
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  };
  const select = (id: string) => { onSelect(id); setOpen(false); };

  // Collapsed rail only applies on desktop; the mobile sheet always shows labels.
  const rail = collapsed && !open;
  const initials = (user.name || '?').trim().slice(0, 2).toUpperCase();
  const iconBtn = 'w-9 h-9 rounded-lg border border-line bg-card text-on-surface-variant flex items-center justify-center hover:bg-accent hover:text-on-surface transition-colors shrink-0';

  const sidebar = (
    <aside
      className={`fixed top-0 bottom-0 start-0 z-50 flex flex-col bg-surface-container-low border-e border-line transition-[transform,width] duration-200
        ${rail ? 'lg:w-[72px]' : 'lg:w-60'} w-64
        ${open ? 'translate-x-0' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full'}`}
    >
      {/* Brand / account block */}
      <div className={`h-16 shrink-0 flex items-center gap-2.5 border-b border-line ${rail ? 'lg:justify-center lg:px-0 px-3' : 'px-3'}`}>
        <img src="/brand/menugo-icon.svg" alt="Menu Go" className="w-8 h-8 rounded-lg shrink-0" />
        <div className={`flex-1 min-w-0 ${rail ? 'lg:hidden' : ''}`}>
          <p className="font-display font-extrabold text-[15px] leading-5 tracking-[-0.02em] text-on-surface">Menu Go</p>
          <p className="text-[11px] leading-4 text-on-surface-variant truncate">{context}</p>
        </div>
        <button aria-label={labels.close} onClick={() => setOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-accent text-on-surface-variant">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto no-scrollbar p-2">
        {groups.map(g => (
          <div key={g.label} className="mb-2">
            <p className={`px-2.5 pt-2 pb-1 text-[10px] leading-4 font-semibold uppercase tracking-[.06em] text-on-surface-variant/80 ${rail ? 'lg:hidden' : ''}`}>{g.label}</p>
            {rail && <div className="hidden lg:block mx-3 my-2 border-t border-line" />}
            {g.items.map(item => {
              const active = item.id === activeId;
              return (
                <button key={item.id} onClick={() => select(item.id)} title={rail ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] transition-colors select-none
                    ${rail ? 'lg:justify-center lg:px-0' : ''}
                    ${active ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-on-surface hover:bg-surface-container'}`}>
                  <span className={`w-[18px] h-[18px] shrink-0 flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px] ${active ? 'text-primary' : 'text-on-surface-variant'}`}>{item.icon}</span>
                  <span className={`flex-1 text-start truncate ${rail ? 'lg:hidden' : ''}`}>{item.label}</span>
                  {item.badge !== undefined && item.badge !== 0 && (
                    <span className={`px-1.5 rounded-full bg-acc-soft text-acc text-[10px] leading-4 font-semibold ${rail ? 'lg:hidden' : ''}`}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User block */}
      <div className="border-t border-line p-2.5 shrink-0">
        <div className={`flex items-center gap-2.5 ${rail ? 'lg:justify-center' : ''}`}>
          {user.avatar
            ? <img src={user.avatar} alt="" className="w-[30px] h-[30px] rounded-full object-cover shrink-0" />
            : <span className="w-[30px] h-[30px] rounded-full bg-acc-soft text-acc flex items-center justify-center text-[11px] font-bold shrink-0">{initials}</span>}
          <div className={`flex-1 min-w-0 ${rail ? 'lg:hidden' : ''}`}>
            <p className="text-[13px] leading-4 font-semibold text-on-surface truncate">{user.name}</p>
            {user.sub && <p className="text-[11px] leading-4 text-on-surface-variant truncate">{user.sub}</p>}
          </div>
        </div>
        <div className={`flex gap-1.5 mt-2.5 ${rail ? 'lg:flex-col lg:items-center' : ''}`}>
          <button onClick={toggleTheme} title={labels.theme} aria-label={labels.theme} className={iconBtn}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={toggleLang} title={labels.language} aria-label={labels.language} className={`${iconBtn} ${rail ? '' : 'w-auto px-2.5 text-xs font-semibold'}`}>
            {rail ? <Globe className="w-4 h-4" /> : <span>{isArabic ? 'EN' : 'عربي'}</span>}
          </button>
          <button onClick={onLogout} title={labels.logout} aria-label={labels.logout}
            className={`${iconBtn} ${rail ? '' : 'flex-1 min-w-0 w-auto px-2.5 gap-1.5 text-xs font-semibold whitespace-nowrap'} hover:text-error`}>
            <LogOut className="w-4 h-4 rtl:-scale-x-100" />
            {!rail && <span className="truncate">{labels.logout}</span>}
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/45 lg:hidden" />}
      {sidebar}

      <div className={`min-h-screen flex flex-col transition-[padding] duration-200 ${rail ? 'lg:ps-[72px]' : 'lg:ps-60'}`}>
        <header className="sticky top-0 z-30 h-16 shrink-0 bg-card border-b border-line flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 min-w-0">
            <button aria-label={labels.menu} onClick={() => setOpen(true)} className={`${iconBtn} lg:hidden`}>
              <Menu className="w-4 h-4" />
            </button>
            <button aria-label={labels.collapse} title={labels.collapse} onClick={() => setCollapsed(c => !c)} className={`${iconBtn} hidden lg:flex`}>
              {collapsed ? <PanelLeftOpen className="w-4 h-4 rtl:-scale-x-100" /> : <PanelLeftClose className="w-4 h-4 rtl:-scale-x-100" />}
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 ms-1 text-[13px]">
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <span key={i} className={`flex items-center gap-1.5 min-w-0 ${last ? '' : 'max-sm:hidden'}`}>
                    {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-outline shrink-0 rtl:-scale-x-100 max-sm:hidden" />}
                    {last ? (
                      <span aria-current="page" className="font-semibold text-on-surface truncate">{c.label}</span>
                    ) : (
                      <button onClick={c.onClick} disabled={!c.onClick} className="text-on-surface-variant hover:text-on-surface truncate disabled:hover:text-on-surface-variant">{c.label}</button>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        </header>

        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
