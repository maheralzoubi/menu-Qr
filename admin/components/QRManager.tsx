import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Download, QrCode, ToggleLeft, ToggleRight, Minus, Upload, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { authFetch, getToken } from '../../src/lib/auth';
import { pushNavParam, goBack } from '../lib/navHistory';

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
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('tableId')
  );
  const selectedTable = tables.find(tb => tb._id === selectedTableId) ?? null;
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [qrStyle, setQrStyle] = useState<QRStyle>({ dark: '#1a0a05', light: '#ffffff', logo: null });
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    const onPopState = () => setSelectedTableId(new URLSearchParams(window.location.search).get('tableId'));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const selectTable = (table: Table) => {
    setSelectedTableId(table._id);
    pushNavParam('tableId', table._id);
  };
  const closeTable = () => { goBack(); };

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
        if (selectedTable?._id === id) closeTable();
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
    <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar lg:pe-1 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ds-page-title">{t('qr.heading')}</h1>
            <p className="ds-page-sub">{t('qr.subtext')}</p>
          </div>
          <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="ds-btn ds-btn-sm ds-btn-primary">
            <Plus className="w-4 h-4" /> {t('qr.addTable')}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { labelKey: 'qr.totalTables', value: tables.length, icon: QrCode, tile: 'bg-acc-soft text-acc' },
            { labelKey: 'qr.occupied',    value: occupied,      icon: ToggleRight, tile: 'bg-warn1 text-warn7' },
            { labelKey: 'qr.free',        value: free,          icon: ToggleLeft,  tile: 'bg-pos1 text-pos7' },
          ].map(s => (
            <div key={s.labelKey} className="ds-card p-3.5 sm:p-5 flex items-center gap-3">
              <div className={`ds-icon-tile hidden sm:flex ${s.tile}`}><s.icon className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="ds-metric-lbl truncate">{t(s.labelKey)}</p>
                <p className="ds-metric-val tabular text-xl sm:text-[28px]">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {adding && (
            <motion.form initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              onSubmit={handleAdd}
              className="ds-card border-primary/40 p-3 flex flex-wrap items-center gap-2">
              <div className="ds-icon-tile w-9 h-9"><QrCode className="w-4 h-4" /></div>
              <input ref={inputRef} type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)}
                placeholder={t('qr.tablePlaceholder')}
                className="ds-input h-9 flex-1 min-w-[120px]" />
              <button type="submit" className="ds-btn ds-btn-sm ds-btn-primary">{t('qr.add')}</button>
              <button type="button" onClick={() => { setAdding(false); setNewTableName(''); }}
                className="ds-btn ds-btn-sm ds-btn-secondary">{t('qr.cancel')}</button>
            </motion.form>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-80 bg-surface-container animate-pulse rounded-2xl" />)}
          </div>
        ) : tables.length === 0 ? (
          <div className="ds-empty">
            <QrCode className="w-8 h-8 opacity-40" />
            <p className="text-sm font-semibold text-on-surface">{t('qr.noTables')}</p>
            <p className="text-[13px]">{t('qr.noTablesMsg')}</p>
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="ds-btn ds-btn-sm ds-btn-outline mt-2"><Plus className="w-4 h-4" /> {t('qr.addFirstTable')}</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {tables.map((table, i) => {
                const isOccupied = table.status === 'occupied';
                const isManual = table.manualStatus !== null;
                const isSelected = selectedTable?._id === table._id;
                return (
                  <motion.div key={table._id} layout
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => isSelected ? closeTable() : selectTable(table)}
                    className={`ds-card p-4 flex flex-col gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'border-primary ring-2 ring-primary/25' : 'hover:border-input'
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold leading-tight truncate">{table.name}</h3>
                        <span className={`ds-chip mt-1.5 ${isOccupied ? 'ds-chip-warn' : 'ds-chip-pos'}`}>
                          <span className="ds-dot" />
                          {isOccupied ? t('qr.occupied') : t('qr.free')}
                          {isManual && ` ${t('qr.manual')}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center rounded-xl border border-line p-3" style={{ background: qrStyle.light }}>
                      {qrUrls[table._id] ? (
                        <img src={qrUrls[table._id]} alt={t('qr.altQrFor', { table: table.name })} className="w-full max-w-[140px]" />
                      ) : (
                        <div className="w-32 h-32 bg-surface-container animate-pulse rounded-xl" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(table._id, table.name); }}
                        className="ds-btn ds-btn-sm ds-btn-secondary flex-1">
                        <Download className="w-3.5 h-3.5" /> {t('qr.download')}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleStatusCycle(table); }}
                        className={`ds-btn ds-btn-sm ds-btn-icon ${
                          table.manualStatus === null ? 'ds-btn-secondary text-on-surface-variant'
                          : table.manualStatus === 'occupied' ? 'bg-warn1 text-warn7 hover:bg-warn1/80'
                          : 'bg-pos1 text-pos7 hover:bg-pos1/80'
                        }`}
                        title={table.manualStatus === null ? t('qr.autoMode') : t(table.manualStatus === 'occupied' ? 'qr.manualOccupied' : 'qr.manualFree')}>
                        {table.manualStatus === null ? <Minus className="w-3.5 h-3.5" /> :
                         table.manualStatus === 'occupied' ? <ToggleRight className="w-3.5 h-3.5" /> :
                         <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(table._id); }}
                        className="ds-btn ds-btn-sm ds-btn-icon ds-btn-danger-soft">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {tables.length > 0 && (
          <div className="flex items-center gap-5 text-xs text-on-surface-variant flex-wrap">
            <div className="flex items-center gap-1.5"><Minus className="w-3.5 h-3.5" /> {t('qr.autoMode')}</div>
            <div className="flex items-center gap-1.5"><ToggleRight className="w-3.5 h-3.5 text-warn7" /> {t('qr.manualOccupied')}</div>
            <div className="flex items-center gap-1.5"><ToggleLeft className="w-3.5 h-3.5 text-pos6" /> {t('qr.manualFree')}</div>
          </div>
        )}
      </div>

      {/* Customization side panel */}
      <div className="lg:w-96 shrink-0 lg:h-full">
        <AnimatePresence mode="wait">
          {selectedTable ? (
            <motion.div key={selectedTable._id}
              initial={{ opacity: 0, x: isRTL ? -8 : 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? -8 : 8 }}
              className="fixed inset-0 z-40 lg:static lg:inset-auto lg:z-auto h-full bg-card lg:border lg:border-line lg:rounded-2xl lg:shadow-sm flex flex-col overflow-y-auto no-scrollbar">

              <div className="flex justify-between items-center px-5 py-4 border-b border-line shrink-0">
                <h3 className="ds-section-title">{t('qr.styleHeading')}</h3>
                <button onClick={closeTable} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR preview */}
              <div className="flex flex-col items-center px-5 py-5 border-b border-line shrink-0">
                <div className="w-48 h-48 rounded-2xl border border-line flex items-center justify-center overflow-hidden" style={{ background: qrStyle.light }}>
                  {qrUrls[selectedTable._id] ? (
                    <img src={qrUrls[selectedTable._id]} alt={t('qr.altPreview')} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-surface-container animate-pulse" />
                  )}
                </div>
                <p className="mt-3 font-semibold text-sm">{selectedTable.name}</p>
                <button onClick={() => handleDownload(selectedTable._id, selectedTable.name)}
                  className="mt-3 ds-btn ds-btn-primary">
                  <Download className="w-4 h-4" /> {t('qr.download')}
                </button>
              </div>

              <div className="space-y-5 flex-1 px-5 py-5">
                {/* Color presets */}
                <div>
                  <p className="ds-label">{t('qr.presets')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map(preset => (
                      <button key={preset.name} onClick={() => applyStyle({ ...qrStyle, dark: preset.dark, light: preset.light })}
                        className={`relative h-12 rounded-xl overflow-hidden border transition-colors ${
                          qrStyle.dark === preset.dark && qrStyle.light === preset.light
                            ? 'border-primary ring-2 ring-primary/30' : 'border-line hover:border-input'
                        }`}
                        title={t(`qr.presetNames.${preset.name}`)}>
                        <div className="absolute inset-0" style={{ background: preset.light }} />
                        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded" style={{ background: preset.dark }} />
                          <span className="text-[11px] font-semibold" style={{ color: preset.dark }}>{t(`qr.presetNames.${preset.name}`)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual colors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="ds-label">{t('qr.fgColor')}</p>
                    <label className="ds-inset flex items-center gap-2.5 p-2.5 cursor-pointer hover:bg-surface-container transition-colors">
                      <div className="w-7 h-7 rounded-lg border border-line shrink-0" style={{ background: qrStyle.dark }} />
                      <span className="font-mono text-[13px] font-semibold truncate">{qrStyle.dark}</span>
                      <input type="color" value={qrStyle.dark}
                        onChange={e => applyStyle({ ...qrStyle, dark: e.target.value })}
                        className="sr-only" />
                    </label>
                  </div>
                  <div>
                    <p className="ds-label">{t('qr.bgColor')}</p>
                    <label className="ds-inset flex items-center gap-2.5 p-2.5 cursor-pointer hover:bg-surface-container transition-colors">
                      <div className="w-7 h-7 rounded-lg border border-line shrink-0" style={{ background: qrStyle.light }} />
                      <span className="font-mono text-[13px] font-semibold truncate">{qrStyle.light}</span>
                      <input type="color" value={qrStyle.light}
                        onChange={e => applyStyle({ ...qrStyle, light: e.target.value })}
                        className="sr-only" />
                    </label>
                  </div>
                </div>

                {/* Center logo */}
                <div>
                  <p className="ds-label">{t('qr.centerLogo')}</p>
                  {qrStyle.logo ? (
                    <div className="ds-inset flex items-center gap-3 p-2.5">
                      <img src={qrStyle.logo} alt={t('qr.altLogo')} className="w-10 h-10 rounded-lg object-cover border border-line" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-on-surface-variant truncate">{t('qr.logoSet')}</p>
                      </div>
                      <button onClick={() => applyStyle({ ...qrStyle, logo: null })}
                        className="ds-btn ds-btn-sm ds-btn-icon ds-btn-danger-soft shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {brandLogo && (
                        <button onClick={() => applyStyle({ ...qrStyle, logo: brandLogo })}
                          className="ds-inset w-full flex items-center gap-3 p-2.5 hover:bg-surface-container transition-colors text-start">
                          <img src={brandLogo} alt={t('qr.altBrandLogo')} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-line" />
                          <span className="text-[13px] font-semibold">{t('qr.useBrandLogo')}</span>
                        </button>
                      )}
                      <button onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-dashed border-input text-[13px] font-semibold text-on-surface-variant hover:border-primary/50 hover:text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50">
                        {logoUploading ? (
                          <span className="animate-pulse">{t('qr.uploading')}</span>
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
            <div className="hidden lg:flex ds-empty h-full bg-card">
              <QrCode className="w-8 h-8 opacity-40" />
              <p className="text-sm font-semibold text-on-surface">{t('qr.noTableSelected')}</p>
              <p className="text-[13px]">{t('qr.noTableSelectedMsg')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
