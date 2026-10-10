import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Megaphone, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ownerFetch } from '../../src/lib/ownerAuth';

interface Banner {
  _id: string;
  title: string;
  subtitle: string;
  emoji: string;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY: Omit<Banner, '_id'> = { title: '', subtitle: '', emoji: '🛍️', isActive: true, sortOrder: 0 };

export const BannersManager = () => {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await ownerFetch('/api/owner/banners');
      if (!res.ok) throw new Error();
      setBanners(await res.json());
    } catch { setError(t('banners.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...EMPTY, sortOrder: banners.length }); setCreating(true); setEditing(null); };
  const openEdit = (b: Banner) => { setForm({ title: b.title, subtitle: b.subtitle, emoji: b.emoji, isActive: b.isActive, sortOrder: b.sortOrder }); setEditing(b); setCreating(false); };
  const closePanel = () => { setCreating(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      let res: Response;
      if (editing) {
        res = await ownerFetch(`/api/owner/banners/${editing._id}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        res = await ownerFetch('/api/owner/banners', { method: 'POST', body: JSON.stringify(form) });
      }
      if (!res.ok) throw new Error();
      await load();
      closePanel();
    } catch { setError(t('banners.saveFailed')); }
    finally { setSaving(false); }
  };

  const handleToggle = async (b: Banner) => {
    try {
      await ownerFetch(`/api/owner/banners/${b._id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !b.isActive }) });
      await load();
    } catch { setError(t('banners.updateFailed')); }
  };

  const handleDelete = async (id: string) => {
    try {
      await ownerFetch(`/api/owner/banners/${id}`, { method: 'DELETE' });
      setDeleteId(null);
      await load();
    } catch { setError(t('banners.deleteFailed')); }
  };

  const panelOpen = creating || !!editing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-page-title">{t('banners.heading')}</h1>
          <p className="ds-page-sub">{t('banners.subtext')}</p>
        </div>
        <button onClick={openCreate} className="ds-btn ds-btn-primary ds-btn-sm">
          <Plus className="w-4 h-4" /> {t('banners.addBanner')}
        </button>
      </div>

      {error && <p className="text-[13px] bg-neg1 text-neg7 rounded-xl px-3.5 py-2.5">{error}</p>}

      {/* Preview */}
      {banners.filter(b => b.isActive).length > 0 && (
        <div className="ds-card ds-card-pad">
          <p className="ds-overline mb-3">{t('banners.livePreview')}</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {banners.filter(b => b.isActive).map(b => (
              <div key={b._id} className="flex-shrink-0 w-64 bg-primary text-on-primary rounded-2xl p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{b.title}</p>
                  {b.subtitle && <p className="text-xs opacity-80 mt-0.5 truncate">{b.subtitle}</p>}
                </div>
                <span className="text-3xl ms-2 shrink-0">{b.emoji}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="ds-card p-0 overflow-hidden">{[1,2,3].map(i => <div key={i} className="h-16 border-b border-line last:border-0 px-4 flex items-center"><div className="h-4 w-1/2 bg-surface-container animate-pulse rounded-2xl" /></div>)}</div>
      ) : banners.length === 0 ? (
        <div className="ds-empty">
          <Megaphone className="w-8 h-8 opacity-40" />
          <p className="text-sm">{t('banners.noBanners')}</p>
        </div>
      ) : (
        <div className="ds-card p-0 overflow-hidden">
          {banners.map(b => (
            <div key={b._id} className={`px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 border-b border-line last:border-0 hover:bg-surface-container-low transition-colors ${!b.isActive ? 'opacity-50' : ''}`}>
              <GripVertical className="hidden sm:block w-4 h-4 text-on-surface-variant/40 shrink-0" />
              <span className="w-9 h-9 rounded-xl bg-surface-container-low border border-line flex items-center justify-center text-xl shrink-0">{b.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{b.title}</p>
                {b.subtitle && <p className="text-xs text-on-surface-variant truncate">{b.subtitle}</p>}
              </div>
              <span className={`hidden sm:inline-flex ds-chip shrink-0 ${b.isActive ? 'ds-chip-pos' : 'ds-chip-neutral'}`}>
                <span className="ds-dot" />
                {b.isActive ? t('banners.active') : t('banners.hidden')}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggle(b)} title={b.isActive ? t('banners.hide') : t('banners.show')} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm text-on-surface-variant">
                  {b.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(b)} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm text-on-surface-variant">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(b._id)} className="ds-btn ds-btn-danger-soft ds-btn-icon ds-btn-sm">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Panel */}
      {panelOpen && (
        <div className="ds-backdrop">
          <div className="ds-modal max-w-md">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h3 className="ds-section-title">{editing ? t('banners.editBanner') : t('banners.newBanner')}</h3>
              <button onClick={closePanel} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="ds-label">{t('banners.titleLabel')}</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t('banners.titlePlaceholder')}
                  className="ds-input" />
              </div>
              <div>
                <label className="ds-label">{t('banners.subtitleLabel')}</label>
                <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder={t('banners.subtitlePlaceholder')}
                  className="ds-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t('banners.emojiLabel')}</label>
                  <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                    placeholder="🛍️"
                    className="ds-input" />
                </div>
                <div>
                  <label className="ds-label">{t('banners.orderLabel')}</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="ds-input tabular" />
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <span className="text-sm font-medium">{t('banners.showOnHome')}</span>
              </label>

              {/* Live preview */}
              {form.title && (
                <div className="bg-primary text-on-primary rounded-2xl p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{form.title}</p>
                    {form.subtitle && <p className="text-xs opacity-80 mt-0.5 truncate">{form.subtitle}</p>}
                  </div>
                  <span className="text-3xl ms-2 shrink-0">{form.emoji || '🛍️'}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
              <button onClick={closePanel} className="ds-btn ds-btn-outline">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={saving || !form.title.trim()}
                className="ds-btn ds-btn-primary">
                {saving ? t('common.saving') : (editing ? t('banners.saveChanges') : t('banners.createBanner'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="ds-backdrop">
          <div className="ds-modal max-w-sm">
            <div className="p-6 space-y-2">
              <h3 className="ds-section-title">{t('banners.deleteConfirmTitle')}</h3>
              <p className="text-sm text-on-surface-variant">{t('banners.deleteConfirmBody')}</p>
            </div>
            <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="ds-btn ds-btn-outline">{t('common.cancel')}</button>
              <button onClick={() => handleDelete(deleteId)} className="ds-btn ds-btn-danger">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
