import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Download, QrCode, ToggleLeft, ToggleRight, Minus, Upload, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { authFetch, getToken } from '../../src/lib/auth';

interface Table {
  _id: string;
  name: string;
  status: 'occupied' | 'free';
  manualStatus: 'occupied' | 'free' | null;
}

interface QRStyle {
  dark: string;
  light: string;
  logo: string | null;
}

interface Props { restaurantId: string; }

const BASE_URL = window.location.origin.replace(':3001', ':3000');

const PRESETS: { name: string; dark: string; light: string }[] = [
  { name: 'Classic',  dark: '#1a0a05', light: '#ffffff' },
  { name: 'Noir',     dark: '#000000', light: '#ffffff' },
  { name: 'Slate',    dark: '#1e293b', light: '#f8fafc' },
  { name: 'Forest',   dark: '#14532d', light: '#f0fdf4' },
  { name: 'Berry',    dark: '#581c87', light: '#faf5ff' },
  { name: 'Ocean',    dark: '#0c4a6e', light: '#f0f9ff' },
];

async function generateQR(url: string, style: QRStyle): Promise<string> {
  const size = 400;
  const dataUrl = await QRCode.toDataURL(url, {
    width: size, margin: 2,
    color: { dark: style.dark, light: style.light },
    errorCorrectionLevel: style.logo ? 'H' : 'M',
  });

  if (!style.logo) return dataUrl;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 0, 0);
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.onload = () => {
        const logoSize = 76;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;
        const pad = 8;
        const r = 10;
        const rx = x - pad, ry = y - pad, rw = logoSize + pad * 2, rh = logoSize + pad * 2;
        ctx.fillStyle = style.light;
        ctx.beginPath();
        ctx.moveTo(rx + r, ry);
        ctx.lineTo(rx + rw - r, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
        ctx.lineTo(rx + rw, ry + rh - r);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
        ctx.lineTo(rx + r, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
        ctx.lineTo(rx, ry + r);
        ctx.quadraticCurveTo(rx, ry, rx + r, ry);
        ctx.closePath();
        ctx.fill();
        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve(dataUrl);
      logoImg.src = style.logo!;
    };
    qrImg.src = dataUrl;
  });
}

export const QRManager = ({ restaurantId }: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTableName, setNewTableName] = useState('');
  const [adding, setAdding] = useState(false);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [qrStyle, setQrStyle] = useState<QRStyle>({ dark: '#1a0a05', light: '#ffffff', logo: null });
  const [logoUploading, setLogoUploading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const buildUrl = (name: string) =>
    `${BASE_URL}?restaurant=${restaurantId}&table=${encodeURIComponent(name)}`;

  const regenerateAll = useCallback(async (tbList: Table[], style: QRStyle) => {
    const urls: Record<string, string> = {};
    await Promise.all(tbList.map(async (tb) => {
      urls[tb._id] = await generateQR(buildUrl(tb.name), style);
    }));
    setQrUrls(urls);
  }, [restaurantId]);

  const fetchTables = useCallback(async () => {
    try {
      const [tabRes, brandRes] = await Promise.all([
        authFetch('/api/tables'),
        authFetch('/api/settings/restaurant'),
      ]);
      if (tabRes.ok) {
        const data: Table[] = await tabRes.json();
        setTables(data);
        await regenerateAll(data, qrStyle);
      }
      if (brandRes.ok) {
        const brand = await brandRes.json();
        if (brand.logo) setBrandLogo(brand.logo);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [restaurantId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const applyStyle = async (newStyle: QRStyle) => {
    setQrStyle(newStyle);
    await regenerateAll(tables, newStyle);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    try {
      const res = await authFetch('/api/tables', { method: 'POST', body: JSON.stringify({ name: newTableName.trim() }) });
      if (res.ok) {
        const table: Table = await res.json();
        const qr = await generateQR(buildUrl(table.name), qrStyle);
        setTables(prev => [...prev, { ...table, status: 'free' }]);
        setQrUrls(prev => ({ ...prev, [table._id]: qr }));
        setNewTableName('');
        setAdding(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('qr.deleteConfirm'))) return;
    try {
      const res = await authFetch(`/api/tables/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTables(prev => prev.filter(tb => tb._id !== id));
        setQrUrls(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
        if (selectedTable?._id === id) setSelectedTable(null);
      }
    } catch (e) { console.error(e); }
  };

  const handleStatusCycle = async (table: Table) => {
    let next: 'occupied' | 'free' | null;
    if (table.manualStatus === null) next = 'occupied';
    else if (table.manualStatus === 'occupied') next = 'free';
    else next = null;
    try {
      const res = await authFetch(`/api/tables/${table._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      if (res.ok) {
        const updated = { ...table, manualStatus: next, status: next ?? table.status };
        setTables(prev => prev.map(tb => tb._id === table._id ? updated : tb));
        if (selectedTable?._id === table._id) setSelectedTable(updated);
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

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (res.ok) {
        const { url } = await res.json();
        await applyStyle({ ...qrStyle, logo: url });
      }
    } catch (e) { console.error(e); }
    finally { setLogoUploading(false); }
  };

  const occupied = tables.filter(tb => tb.status === 'occupied').length;
  const free = tables.filter(tb => tb.status === 'free').length;

  return (
    <div className="flex h-full gap-10">
      {/* Main content */}
      <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pe-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('qr.heading')}</h2>
            <p className="text-on-surface-variant font-medium">{t('qr.subtext')}</p>
          </div>
          <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="flex items-center gap-2 btn-gradient text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> {t('qr.addTable')}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            { labelKey: 'qr.totalTables', value: tables.length },
            { labelKey: 'qr.occupied',    value: occupied, color: 'text-amber-600' },
            { labelKey: 'qr.free',        value: free,     color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.labelKey} className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">{t(s.labelKey)}</p>
              <h4 className={`text-3xl font-headline font-extrabold ${s.color ?? ''}`}>{s.value}</h4>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {adding && (
            <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              onSubmit={handleAdd}
              className="flex items-center gap-3 bg-surface-container-low p-4 rounded-2xl border border-primary/20">
              <QrCode className="w-5 h-5 text-primary shrink-0" />
              <input ref={inputRef} type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)}
                placeholder={t('qr.tablePlaceholder')}
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-on-surface-variant/40" />
              <button type="submit" className="px-5 py-2 rounded-xl btn-gradient text-white font-bold text-sm">{t('qr.add')}</button>
              <button type="button" onClick={() => { setAdding(false); setNewTableName(''); }}
                className="px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">{t('qr.cancel')}</button>
            </motion.form>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-80 bg-surface-container-low rounded-3xl" />)}
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-24 bg-surface-container-low rounded-4xl space-y-4">
            <QrCode className="w-16 h-16 mx-auto text-on-surface-variant/20" />
            <p className="font-bold text-on-surface-variant">{t('qr.noTables')}</p>
            <p className="text-sm text-on-surface-variant/60">{t('qr.noTablesMsg')}</p>
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="mt-2 text-primary font-bold text-sm hover:underline">{t('qr.addFirstTable')}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {tables.map((table, i) => {
                const isOccupied = table.status === 'occupied';
                const isManual = table.manualStatus !== null;
                const isSelected = selectedTable?._id === table._id;
                return (
                  <motion.div key={table._id} layout
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedTable(isSelected ? null : table)}
                    className={`bg-surface-container-low rounded-3xl overflow-hidden border shadow-sm flex flex-col cursor-pointer transition-all hover:shadow-xl ${
                      isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant/10 hover:border-primary/30'
                    }`}>
                    <div className={`h-1.5 w-full ${isOccupied ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <div className="p-5 flex flex-col flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-headline font-bold text-lg leading-tight">{table.name}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              {isOccupied ? t('qr.occupied') : t('qr.free')}
                              {isManual && ` ${t('qr.manual')}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-center rounded-2xl p-3" style={{ background: qrStyle.light }}>
                        {qrUrls[table._id] ? (
                          <img src={qrUrls[table._id]} alt={`QR for ${table.name}`} className="w-full max-w-[140px]" />
                        ) : (
                          <div className="w-32 h-32 bg-surface-container-low rounded-xl animate-pulse" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(table._id, table.name); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-colors">
                          <Download className="w-3.5 h-3.5" /> {t('qr.download')}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleStatusCycle(table); }}
                          className={`p-2.5 rounded-xl font-bold text-xs transition-colors ${
                            table.manualStatus === null ? 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                            : table.manualStatus === 'occupied' ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                          }`}
                          title={table.manualStatus === null ? t('qr.autoMode') : t(table.manualStatus === 'occupied' ? 'qr.manualOccupied' : 'qr.manualFree')}>
                          {table.manualStatus === null ? <Minus className="w-3.5 h-3.5" /> :
                           table.manualStatus === 'occupied' ? <ToggleRight className="w-3.5 h-3.5" /> :
                           <ToggleLeft className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(table._id); }}
                          className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors">
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

        {tables.length > 0 && (
          <div className="flex items-center gap-6 text-xs text-on-surface-variant/60 font-medium flex-wrap">
            <div className="flex items-center gap-2"><Minus className="w-3 h-3" /> {t('qr.autoMode')}</div>
            <div className="flex items-center gap-2"><ToggleRight className="w-3 h-3 text-amber-600" /> {t('qr.manualOccupied')}</div>
            <div className="flex items-center gap-2"><ToggleLeft className="w-3 h-3 text-emerald-600" /> {t('qr.manualFree')}</div>
          </div>
        )}
      </div>

      {/* Customization side panel */}
      <div className="w-96 shrink-0 h-full">
        <AnimatePresence mode="wait">
          {selectedTable ? (
            <motion.div key={selectedTable._id}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
              className="h-full bg-surface-container-low rounded-4xl p-8 flex flex-col shadow-2xl shadow-primary/5 overflow-y-auto no-scrollbar">

              <div className="flex justify-between items-start mb-6 shrink-0">
                <h3 className="text-2xl font-headline font-extrabold tracking-tight">{t('qr.styleHeading')}</h3>
                <button onClick={() => setSelectedTable(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* QR preview */}
              <div className="flex flex-col items-center mb-6 shrink-0">
                <div className="w-48 h-48 rounded-3xl flex items-center justify-center shadow-lg" style={{ background: qrStyle.light }}>
                  {qrUrls[selectedTable._id] ? (
                    <img src={qrUrls[selectedTable._id]} alt="QR Preview" className="w-full h-full object-contain rounded-3xl" />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-surface-container-low animate-pulse" />
                  )}
                </div>
                <p className="mt-3 font-bold text-lg">{selectedTable.name}</p>
                <button onClick={() => handleDownload(selectedTable._id, selectedTable.name)}
                  className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl btn-gradient text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
                  <Download className="w-4 h-4" /> {t('qr.download')}
                </button>
              </div>

              <div className="space-y-6 flex-1">
                {/* Color presets */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-3">{t('qr.presets')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map(preset => (
                      <button key={preset.name} onClick={() => applyStyle({ ...qrStyle, dark: preset.dark, light: preset.light })}
                        className={`relative h-14 rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 ${
                          qrStyle.dark === preset.dark && qrStyle.light === preset.light
                            ? 'border-primary shadow-md' : 'border-transparent'
                        }`}
                        title={preset.name}>
                        <div className="absolute inset-0" style={{ background: preset.light }} />
                        <div className="absolute inset-0 flex items-center justify-center gap-1">
                          <div className="w-4 h-4 rounded" style={{ background: preset.dark }} />
                          <span className="text-[10px] font-bold" style={{ color: preset.dark }}>{preset.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-2">{t('qr.fgColor')}</p>
                    <label className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-2xl cursor-pointer hover:bg-surface-container-high transition-colors">
                      <div className="w-8 h-8 rounded-lg border border-outline-variant/30 shrink-0" style={{ background: qrStyle.dark }} />
                      <span className="font-mono text-sm font-bold">{qrStyle.dark}</span>
                      <input type="color" value={qrStyle.dark}
                        onChange={e => applyStyle({ ...qrStyle, dark: e.target.value })}
                        className="sr-only" />
                    </label>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-2">{t('qr.bgColor')}</p>
                    <label className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-2xl cursor-pointer hover:bg-surface-container-high transition-colors">
                      <div className="w-8 h-8 rounded-lg border border-outline-variant/30 shrink-0" style={{ background: qrStyle.light }} />
                      <span className="font-mono text-sm font-bold">{qrStyle.light}</span>
                      <input type="color" value={qrStyle.light}
                        onChange={e => applyStyle({ ...qrStyle, light: e.target.value })}
                        className="sr-only" />
                    </label>
                  </div>
                </div>

                {/* Center logo */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-3">{t('qr.centerLogo')}</p>
                  {qrStyle.logo ? (
                    <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-2xl">
                      <img src={qrStyle.logo} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-outline-variant/20" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-on-surface-variant truncate">Logo set</p>
                      </div>
                      <button onClick={() => applyStyle({ ...qrStyle, logo: null })}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {brandLogo && (
                        <button onClick={() => applyStyle({ ...qrStyle, logo: brandLogo })}
                          className="w-full flex items-center gap-3 p-3 bg-surface-container-lowest rounded-2xl hover:bg-surface-container-high transition-colors text-start">
                          <img src={brandLogo} alt="Brand logo" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-outline-variant/20" />
                          <span className="text-sm font-bold">{t('qr.useBrandLogo')}</span>
                        </button>
                      )}
                      <button onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-high transition-all text-sm font-bold text-on-surface-variant disabled:opacity-50">
                        {logoUploading ? (
                          <span className="animate-pulse">Uploading…</span>
                        ) : (
                          <><Upload className="w-4 h-4" /> {t('qr.uploadCustomLogo')}</>
                        )}
                      </button>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full bg-surface-container-low/50 border-2 border-dashed border-outline-variant/30 rounded-4xl flex flex-col items-center justify-center p-12 text-center text-on-surface-variant/40">
              <QrCode className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold">{t('qr.noTableSelected')}</p>
              <p className="text-sm">{t('qr.noTableSelectedMsg')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
