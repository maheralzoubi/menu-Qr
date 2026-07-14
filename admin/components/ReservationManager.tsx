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

  if (view === 'map') {
    return (
      <div className="h-full flex flex-col space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('reservations.tableLayout')}</h2>
            <p className="text-on-surface-variant font-medium">
              {t('reservations.confirmedToday', { count: todayConfirmed })}
            </p>
          </div>
          <button onClick={backToListView} className="px-6 py-3 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-all">
            {t('reservations.backToList')}
          </button>
        </div>
        <div className="flex-1 bg-surface-container-low rounded-4xl p-10 relative overflow-hidden border border-outline-variant/10">
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative w-full h-full">
            {tableStatuses.map(table => (
              <motion.div key={table.id} initial={{ scale: 0 }} animate={{ scale: 1 }}
                style={{ left: `${table.x}%`, top: `${table.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-3xl flex flex-col items-center justify-center cursor-pointer shadow-lg transition-all hover:scale-110 ${
                  table.status === 'Reserved' ? 'bg-[#303942] text-white' : 'bg-surface-container-highest text-on-surface'
                }`}>
                <span className="text-xs font-bold opacity-60 mb-1">{table.id}</span>
                <Users className="w-6 h-6 mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t('reservations.seats', { n: table.capacity })}</span>
                <div className="absolute -bottom-2 px-2 py-0.5 bg-white rounded-full text-[8px] font-bold text-on-surface shadow-sm border border-outline-variant/10">
                  {table.status === 'Reserved' ? t('reservations.reserved') : t('reservations.available')}
                </div>
              </motion.div>
            ))}
            <div className="absolute bottom-0 end-0 p-6 bg-surface-container-lowest/80 backdrop-blur-md rounded-3xl border border-outline-variant/10 flex gap-8">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#303942]/30" /><span className="text-xs font-bold">{t('reservations.reserved')}</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-surface-container-highest" /><span className="text-xs font-bold">{t('reservations.available')}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-10">
      <div className="flex-1 space-y-10 overflow-y-auto no-scrollbar pe-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('reservations.heading')}</h2>
            <p className="text-on-surface-variant font-medium">{t('reservations.subtext')}</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
              <input type="text" placeholder={t('reservations.searchPlaceholder')}
                className="bg-surface-container-high border-none rounded-xl py-3 ps-12 pe-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={() => enterView('map')} className="flex items-center gap-2 px-6 py-3 bg-surface-container-high rounded-xl font-bold text-sm hover:bg-surface-variant transition-all">
              <MapIcon className="w-4 h-4" /> {t('reservations.tableMap')}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-surface-container-low rounded-3xl" />)}</div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredReservations.map((res, i) => (
                <motion.div key={resKey(res)} layout initial={{ opacity: 0, x: isRTL ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => selectRes(resKey(res))}
                  className={`group flex items-center p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10 hover:bg-surface-container-lowest hover:shadow-xl transition-all cursor-pointer ${
                    selectedRes && resKey(selectedRes) === resKey(res) ? 'ring-2 ring-primary bg-surface-container-lowest' : ''
                  }`}>
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0 me-6 group-hover:scale-110 transition-transform">
                    <CalendarDays className={`w-6 h-6 ${res.status === 'Confirmed' ? 'text-primary' : res.status === 'Cancelled' ? 'text-primary' : 'text-[#303942]'}`} />
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('reservations.guest')}</p>
                      <p className="font-bold text-sm truncate">{res.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('reservations.dateTime')}</p>
                      <p className="font-bold text-sm">{res.date} {res.time}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('reservations.partySize')}</p>
                      <p className="font-bold text-sm">{res.guests} {t('reservations.guests')}</p>
                    </div>
                    <div>
                      <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mt-1 ${
                        res.status === 'Confirmed' ? 'bg-primary/10 text-primary' :
                        res.status === 'Cancelled' ? 'bg-[#303942]/10 text-[#303942]' : 'bg-[#303942]/10 text-[#303942]'
                      }`}>{statusLabel(res.status)}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-on-surface-variant/30 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform ms-6 rtl:scale-x-[-1]" />
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredReservations.length === 0 && (
              <div className="text-center py-20 text-on-surface-variant/40">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">{reservations.length === 0 ? t('reservations.noReservations') : t('reservations.noResults')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="w-96 shrink-0 h-full">
        <AnimatePresence mode="wait">
          {selectedRes ? (
            <motion.div key={resKey(selectedRes)}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
              className="h-full bg-surface-container-low rounded-4xl p-8 flex flex-col shadow-2xl shadow-primary/5">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-headline font-extrabold tracking-tight">{t('reservations.detailHeading')}</h3>
                  <p className="text-on-surface-variant font-mono text-sm mt-1">#{resKey(selectedRes).slice(-6).toUpperCase()}</p>
                </div>
                <button onClick={closeRes} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
                <section className="bg-surface-container-lowest p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold">{selectedRes.name}</p>
                      <div className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                        selectedRes.status === 'Confirmed' ? 'bg-primary/10 text-primary' :
                        selectedRes.status === 'Cancelled' ? 'bg-[#303942]/10 text-[#303942]' : 'bg-[#303942]/10 text-[#303942]'
                      }`}>{statusLabel(selectedRes.status)}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm pt-2 border-t border-outline-variant/10">
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
                  <div className="bg-surface-container-lowest p-4 rounded-2xl">
                    <Clock className="w-4 h-4 text-primary mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('reservations.date')}</p>
                    <p className="font-bold text-sm">{selectedRes.date}</p>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-2xl">
                    <Clock className="w-4 h-4 text-primary mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('reservations.time')}</p>
                    <p className="font-bold text-sm">{selectedRes.time}</p>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-2xl col-span-2">
                    <Users className="w-4 h-4 text-primary mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t('reservations.partySize')}</p>
                    <p className="font-bold">{selectedRes.guests} {t('reservations.guests')}</p>
                  </div>
                </section>
                {selectedRes.createdAt && (
                  <p className="text-[10px] text-on-surface-variant/40 text-center">
                    {t('reservations.bookedOn', { date: new Date(selectedRes.createdAt).toLocaleDateString() })}
                  </p>
                )}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => handleUpdateStatus(resKey(selectedRes), 'Cancelled')}
                  className="py-4 rounded-2xl bg-surface-container-high font-bold text-sm hover:bg-rose-50 hover:text-rose-600 transition-all">
                  {t('reservations.cancelAction')}
                </button>
                <button onClick={() => handleUpdateStatus(resKey(selectedRes), 'Confirmed')}
                  className="py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                  {t('reservations.confirm')}
                </button>
              </div>
              <button onClick={() => handleDelete(resKey(selectedRes))}
                className="mt-3 w-full py-3 rounded-2xl text-primary font-bold text-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> {t('reservations.deleteReservation')}
              </button>
            </motion.div>
          ) : (
            <div className="h-full bg-surface-container-low/50 border-2 border-dashed border-outline-variant/30 rounded-4xl flex flex-col items-center justify-center p-12 text-center text-on-surface-variant/40">
              <Calendar className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold">{t('reservations.noSelected')}</p>
              <p className="text-sm">{t('reservations.noSelectedMsg')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
