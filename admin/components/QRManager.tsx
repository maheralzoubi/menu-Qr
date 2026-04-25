import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Download, QrCode, ToggleLeft, ToggleRight, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { authFetch } from '../../src/lib/auth';

interface Table {
  _id: string;
  name: string;
  status: 'occupied' | 'free';
  manualStatus: 'occupied' | 'free' | null;
}

interface Props { restaurantId: string; }

const BASE_URL = window.location.origin.replace(':3001', ':3000');

async function generateQRDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#1a0a05', light: '#ffffff' } });
}

export const QRManager = ({ restaurantId }: Props) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTableName, setNewTableName] = useState('');
  const [adding, setAdding] = useState(false);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTables = useCallback(async () => {
    try {
      const res = await authFetch('/api/tables');
      if (res.ok) {
        const data: Table[] = await res.json();
        setTables(data);

        // Generate QR codes for each table
        const urls: Record<string, string> = {};
        await Promise.all(data.map(async (t) => {
          const url = `${BASE_URL}?restaurant=${restaurantId}&table=${encodeURIComponent(t.name)}`;
          urls[t._id] = await generateQRDataUrl(url);
        }));
        setQrUrls(urls);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [restaurantId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    try {
      const res = await authFetch('/api/tables', {
        method: 'POST',
        body: JSON.stringify({ name: newTableName.trim() }),
      });
      if (res.ok) {
        const table: Table = await res.json();
        const url = `${BASE_URL}?restaurant=${restaurantId}&table=${encodeURIComponent(table.name)}`;
        const qr = await generateQRDataUrl(url);
        setTables(prev => [...prev, { ...table, status: 'free' }]);
        setQrUrls(prev => ({ ...prev, [table._id]: qr }));
        setNewTableName('');
        setAdding(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this table?')) return;
    try {
      const res = await authFetch(`/api/tables/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTables(prev => prev.filter(t => t._id !== id));
        setQrUrls(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
      }
    } catch (e) { console.error(e); }
  };

  const handleStatusCycle = async (table: Table) => {
    // Cycle: auto → occupied → free → auto
    let next: 'occupied' | 'free' | null;
    if (table.manualStatus === null) next = 'occupied';
    else if (table.manualStatus === 'occupied') next = 'free';
    else next = null;

    try {
      const res = await authFetch(`/api/tables/${table._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setTables(prev => prev.map(t =>
          t._id === table._id ? { ...t, manualStatus: next, status: next ?? t.status } : t
        ));
      }
    } catch (e) { console.error(e); }
  };

  const handleDownload = (id: string, name: string) => {
    const url = qrUrls[id];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-${name.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const occupied = tables.filter(t => t.status === 'occupied').length;
  const free = tables.filter(t => t.status === 'free').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">QR for Table</h2>
          <p className="text-on-surface-variant font-medium">Each table has a unique QR code customers can scan to order.</p>
        </div>
        <button
          onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="flex items-center gap-2 btn-gradient text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Table
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'Total Tables', value: tables.length },
          { label: 'Occupied', value: occupied, color: 'text-amber-600' },
          { label: 'Free', value: free, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">{s.label}</p>
            <h4 className={`text-3xl font-headline font-extrabold ${s.color ?? ''}`}>{s.value}</h4>
          </div>
        ))}
      </div>

      {/* Add table inline form */}
      <AnimatePresence>
        {adding && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleAdd}
            className="flex items-center gap-3 bg-surface-container-low p-4 rounded-2xl border border-primary/20"
          >
            <QrCode className="w-5 h-5 text-primary shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={newTableName}
              onChange={e => setNewTableName(e.target.value)}
              placeholder="e.g. Table 1, VIP Room, Patio 3"
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-on-surface-variant/40"
            />
            <button type="submit" className="px-5 py-2 rounded-xl btn-gradient text-white font-bold text-sm">Add</button>
            <button type="button" onClick={() => { setAdding(false); setNewTableName(''); }} className="px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Cancel</button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Table grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-80 bg-surface-container-low rounded-3xl" />)}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-24 bg-surface-container-low rounded-4xl space-y-4">
          <QrCode className="w-16 h-16 mx-auto text-on-surface-variant/20" />
          <p className="font-bold text-on-surface-variant">No tables yet</p>
          <p className="text-sm text-on-surface-variant/60">Add your first table to generate a QR code</p>
          <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="mt-2 text-primary font-bold text-sm hover:underline">Add first table</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {tables.map((table, i) => {
              const isOccupied = table.status === 'occupied';
              const isManual = table.manualStatus !== null;
              return (
                <motion.div
                  key={table._id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10 shadow-sm flex flex-col"
                >
                  {/* Status bar */}
                  <div className={`h-1.5 w-full ${isOccupied ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                  <div className="p-5 flex flex-col flex-1 space-y-4">
                    {/* Name + status */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-headline font-bold text-lg leading-tight">{table.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            {isOccupied ? 'Occupied' : 'Free'}
                            {isManual && ' (manual)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* QR code */}
                    <div className="flex-1 flex items-center justify-center bg-white rounded-2xl p-3">
                      {qrUrls[table._id] ? (
                        <img src={qrUrls[table._id]} alt={`QR for ${table.name}`} className="w-full max-w-[160px]" />
                      ) : (
                        <div className="w-32 h-32 bg-surface-container-low rounded-xl animate-pulse" />
                      )}
                    </div>

                    {/* QR URL label */}
                    <p className="text-[9px] text-on-surface-variant/40 text-center font-mono truncate">
                      ?restaurant=...&table={encodeURIComponent(table.name)}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(table._id, table.name)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-colors"
                        title="Download QR as PNG"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                      <button
                        onClick={() => handleStatusCycle(table)}
                        className={`p-2.5 rounded-xl font-bold text-xs transition-colors ${
                          table.manualStatus === null
                            ? 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                            : table.manualStatus === 'occupied'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                        title={table.manualStatus === null ? 'Auto (click to set manual)' : `Manual: ${table.manualStatus} (click to cycle)`}
                      >
                        {table.manualStatus === null ? <Minus className="w-3.5 h-3.5" /> :
                         table.manualStatus === 'occupied' ? <ToggleRight className="w-3.5 h-3.5" /> :
                         <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(table._id)}
                        className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                        title="Delete table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Legend */}
      {tables.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-on-surface-variant/60 font-medium">
          <div className="flex items-center gap-2"><Minus className="w-3 h-3" /> Auto (based on orders)</div>
          <div className="flex items-center gap-2"><ToggleRight className="w-3 h-3 text-amber-600" /> Manual: Occupied</div>
          <div className="flex items-center gap-2"><ToggleLeft className="w-3 h-3 text-emerald-600" /> Manual: Free</div>
        </div>
      )}
    </div>
  );
};
