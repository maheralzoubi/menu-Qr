import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Users, Clock, XCircle, Trash2, Mail,
  User, ChevronRight, Search, Map as MapIcon, CalendarDays, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../src/lib/auth';
import { pushNavParam, goBack } from '../lib/navHistory';

interface Reservation {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  guests: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  createdAt?: string;
}

type ResView = 'list' | 'map';

function parseResNav(search: string): { view: ResView; resId: string | null } {
  const params = new URLSearchParams(search);
  const view: ResView = params.get('resView') === 'map' ? 'map' : 'list';
  return { view, resId: params.get('resId') };
}

const tables = [
  { id: 'T1', capacity: 2, x: 20, y: 20 }, { id: 'T2', capacity: 4, x: 50, y: 20 },
  { id: 'T3', capacity: 2, x: 80, y: 20 }, { id: 'T4', capacity: 6, x: 35, y: 50 },
  { id: 'T5', capacity: 4, x: 65, y: 50 }, { id: 'T6', capacity: 2, x: 20, y: 80 },
  { id: 'T7', capacity: 8, x: 50, y: 80 }, { id: 'T8', capacity: 4, x: 80, y: 80 },
];

export const ReservationManager = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [view, setView] = useState<ResView>(() => parseResNav(window.location.search).view);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResId, setSelectedResId] = useState<string | null>(() => parseResNav(window.location.search).resId);
  const selectedRes = reservations.find(r => (r._id ?? r.id ?? '') === selectedResId) ?? null;
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const onPopState = () => {
      const next = parseResNav(window.location.search);
      setView(next.view);
      setSelectedResId(next.resId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const enterView = useCallback((v: ResView) => {
    setView(v);
    pushNavParam('resView', v);
  }, []);

  const backToListView = useCallback(() => { goBack(); }, []);

  const selectRes = useCallback((id: string) => {
    setSelectedResId(id);
    pushNavParam('resId', id);
  }, []);

  const closeRes = useCallback(() => { goBack(); }, []);

  const fetchReservations = async () => {
    try {
      const res = await authFetch('/api/reservations');
      if (res.ok) setReservations(await res.json());
    } catch (error) { console.error('Failed to fetch reservations:', error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchReservations(); }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await authFetch(`/api/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (res.ok) {
        const updated: Reservation = await res.json();
        setReservations(prev => prev.map(r => resKey(r) === id ? { ...r, status: updated.status } : r));
      }
    } catch (error) { console.error('Failed to update status:', error); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('reservations.deleteConfirm'))) return;
    try {
      const res = await authFetch(`/api/reservations/${id}`, { method: 'DELETE' });
      if (res.ok) { setReservations(prev => prev.filter(r => resKey(r) !== id)); closeRes(); }
    } catch (error) { console.error('Failed to delete reservation:', error); }
  };

  const resKey = (r: Reservation) => r._id ?? r.id ?? '';

  const filteredReservations = reservations.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const today = new Date().toDateString();
  const todayConfirmed = reservations.filter(r =>
    r.status === 'Confirmed' && new Date(r.date).toDateString() === today
  ).length;

  const tableStatuses = tables.map((tb, i) => ({
    ...tb,
    status: i < todayConfirmed ? 'Reserved' : 'Available',
  }));

  const statusLabel = (s: string) => t(`reservations.status.${s}`, { defaultValue: s });

  const statusChip = (s: string) =>
    s === 'Confirmed' ? 'ds-chip-pos' : s === 'Cancelled' ? 'ds-chip-neg' : 'ds-chip-warn';

  const statusTile = (s: string) =>
    s === 'Confirmed' ? 'bg-pos1 text-pos7' : s === 'Cancelled' ? 'bg-neg1 text-neg7' : 'bg-warn1 text-warn7';

  if (view === 'map') {
    return (
      <div className="h-full flex flex-col space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ds-page-title">{t('reservations.tableLayout')}</h1>
            <p className="ds-page-sub">
              {t('reservations.confirmedToday', { count: todayConfirmed })}
            </p>
          </div>
          <button onClick={backToListView} className="ds-btn ds-btn-outline ds-btn-sm">
            {t('reservations.backToList')}
          </button>
        </div>
        <div className="ds-card flex-1 min-h-[420px] p-5 sm:p-8 relative overflow-hidden">
          <div className="relative w-full h-full">
            {tableStatuses.map(table => (
              <motion.div key={table.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ left: `${table.x}%`, top: `${table.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border flex flex-col items-center justify-center cursor-pointer shadow-sm transition-colors ${
                  table.status === 'Reserved' ? 'bg-primary border-primary text-on-primary' : 'bg-surface-container-low border-line text-on-surface hover:bg-surface-container'
                }`}>
                <span className="text-[11px] sm:text-xs font-semibold opacity-70 mb-0.5 sm:mb-1">{table.id}</span>
                <Users className="w-4 h-4 sm:w-5 sm:h-5 mb-1 sm:mb-1.5" />
                <span className="hidden sm:inline text-[11px] font-medium">{t('reservations.seats', { n: table.capacity })}</span>
                <div className="absolute -bottom-2.5 px-2 py-0.5 bg-card rounded-full text-[10px] font-semibold text-on-surface border border-line whitespace-nowrap">
                  {table.status === 'Reserved' ? t('reservations.reserved') : t('reservations.available')}
                </div>
              </motion.div>
            ))}
            <div className="absolute bottom-0 end-0 px-3 py-2 sm:px-4 sm:py-3 bg-card rounded-xl border border-line flex gap-4 sm:gap-6">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><span className="text-[11px] sm:text-xs font-medium">{t('reservations.reserved')}</span></div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-surface-container-highest" /><span className="text-[11px] sm:text-xs font-medium">{t('reservations.available')}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar lg:pe-1 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ds-page-title">{t('reservations.heading')}</h1>
            <p className="ds-page-sub">{t('reservations.subtext')}</p>
          </div>
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 min-w-[160px] sm:flex-none sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input type="text" placeholder={t('reservations.searchPlaceholder')}
                className="ds-input ps-9"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={() => enterView('map')} className="ds-btn ds-btn-outline">
              <MapIcon className="w-4 h-4" /> {t('reservations.tableMap')}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-[72px] bg-surface-container rounded-2xl" />)}</div>
        ) : filteredReservations.length === 0 ? (
          <div className="ds-empty">
            <Calendar className="w-8 h-8 opacity-40" />
            <p className="text-sm">{reservations.length === 0 ? t('reservations.noReservations') : t('reservations.noResults')}</p>
          </div>
        ) : (
          <div className="ds-card p-0 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {filteredReservations.map((res, i) => (
                <motion.div key={resKey(res)} layout initial={{ opacity: 0, x: isRTL ? 8 : -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => selectRes(resKey(res))}
                  className={`group flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 border-b border-line last:border-0 cursor-pointer transition-colors ${
                    selectedRes && resKey(selectedRes) === resKey(res) ? 'bg-acc-soft/50' : 'hover:bg-surface-container-low'
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${statusTile(res.status)}`}>
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 min-w-0 items-center">
                    <div className="min-w-0">
                      <p className="text-[11px] text-on-surface-variant">{t('reservations.guest')}</p>
                      <p className="font-semibold text-sm text-on-surface truncate">{res.name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-on-surface-variant">{t('reservations.dateTime')}</p>
                      <p className="font-semibold text-sm text-on-surface tabular">{res.date} {res.time}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-on-surface-variant">{t('reservations.partySize')}</p>
                      <p className="font-semibold text-sm text-on-surface">{res.guests} {t('reservations.guests')}</p>
                    </div>
                    <div>
                      <span className={`ds-chip ${statusChip(res.status)}`}><span className="ds-dot" />{statusLabel(res.status)}</span>
                    </div>
                  </div>
                  <ChevronRight className="hidden sm:block w-4 h-4 text-on-surface-variant group-hover:text-on-surface transition-colors rtl:-scale-x-100" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="lg:w-96 shrink-0 lg:h-full">
        <AnimatePresence mode="wait">
          {selectedRes ? (
            <motion.div key={resKey(selectedRes)}
              initial={{ opacity: 0, x: isRTL ? -8 : 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? -8 : 8 }}
              className="fixed inset-0 z-40 lg:static lg:inset-auto lg:z-auto h-full bg-card lg:border lg:border-line lg:rounded-2xl lg:shadow-sm p-5 flex flex-col">
              <div className="flex justify-between items-start gap-3 pb-4 mb-4 border-b border-line">
                <div>
                  <h3 className="ds-section-title">{t('reservations.detailHeading')}</h3>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">#{resKey(selectedRes).slice(-6).toUpperCase()}</p>
                </div>
                <button onClick={closeRes} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                <section className="ds-inset p-3.5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-acc-soft text-acc flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-sm text-on-surface truncate">{selectedRes.name}</p>
                      <span className={`ds-chip ${statusChip(selectedRes.status)}`}><span className="ds-dot" />{statusLabel(selectedRes.status)}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-[13px] pt-3 border-t border-line">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Mail className="w-4 h-4 shrink-0" /><span dir="ltr">{selectedRes.email}</span>
                    </div>
                    {selectedRes.phone && (
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <Phone className="w-4 h-4 shrink-0" /><span dir="ltr">{selectedRes.phone}</span>
                      </div>
                    )}
                  </div>
                </section>
                <section className="grid grid-cols-2 gap-3">
                  <div className="ds-inset p-3.5">
                    <Clock className="w-4 h-4 text-acc mb-2" />
                    <p className="text-[11px] text-on-surface-variant">{t('reservations.date')}</p>
                    <p className="font-semibold text-sm text-on-surface tabular">{selectedRes.date}</p>
                  </div>
                  <div className="ds-inset p-3.5">
                    <Clock className="w-4 h-4 text-acc mb-2" />
                    <p className="text-[11px] text-on-surface-variant">{t('reservations.time')}</p>
                    <p className="font-semibold text-sm text-on-surface tabular">{selectedRes.time}</p>
                  </div>
                  <div className="ds-inset p-3.5 col-span-2">
                    <Users className="w-4 h-4 text-acc mb-2" />
                    <p className="text-[11px] text-on-surface-variant">{t('reservations.partySize')}</p>
                    <p className="font-semibold text-sm text-on-surface">{selectedRes.guests} {t('reservations.guests')}</p>
                  </div>
                </section>
                {selectedRes.createdAt && (
                  <p className="text-[11px] text-on-surface-variant text-center">
                    {t('reservations.bookedOn', { date: new Date(selectedRes.createdAt).toLocaleDateString() })}
                  </p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-line space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleUpdateStatus(resKey(selectedRes), 'Cancelled')}
                    className="ds-btn ds-btn-outline">
                    {t('reservations.cancelAction')}
                  </button>
                  <button onClick={() => handleUpdateStatus(resKey(selectedRes), 'Confirmed')}
                    className="ds-btn ds-btn-primary">
                    {t('reservations.confirm')}
                  </button>
                </div>
                <button onClick={() => handleDelete(resKey(selectedRes))}
                  className="ds-btn ds-btn-danger-soft w-full">
                  <Trash2 className="w-4 h-4" /> {t('reservations.deleteReservation')}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="hidden lg:flex h-full ds-empty">
              <Calendar className="w-8 h-8 opacity-40" />
              <p className="text-sm font-semibold text-on-surface">{t('reservations.noSelected')}</p>
              <p className="text-[13px]">{t('reservations.noSelectedMsg')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
