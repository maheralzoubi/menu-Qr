import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-headline font-extrabold">{t('banners.heading')}</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">{t('banners.subtext')}</p>
        </div>
        <button onClick={openCreate} className="btn-gradient text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('banners.addBanner')}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Preview */}
      {banners.filter(b => b.isActive).length > 0 && (
        <div className="bg-surface-container rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">{t('banners.livePreview')}</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {banners.filter(b => b.isActive).map(b => (
              <div key={b._id} className="flex-shrink-0 w-64 bg-gradient-to-r from-primary to-primary-container rounded-2xl p-4 flex items-center justify-between">
                <div className="text-white min-w-0">
                  <p className="font-extrabold text-sm truncate">{b.title}</p>
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
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-surface-container rounded-2xl h-16 animate-pulse" />)}</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <p className="text-4xl mb-3">📢</p>
          <p className="text-sm">{t('banners.noBanners')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {banners.map(b => (
            <div key={b._id} className={`bg-surface-container rounded-2xl px-4 py-3.5 flex items-center gap-4 ${!b.isActive ? 'opacity-50' : ''}`}>
              <GripVertical className="w-4 h-4 text-on-surface-variant/40 shrink-0" />
              <span className="text-2xl shrink-0">{b.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{b.title}</p>
                {b.subtitle && <p className="text-xs text-on-surface-variant truncate">{b.subtitle}</p>}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${b.isActive ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                {b.isActive ? t('banners.active') : t('banners.hidden')}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggle(b)} title={b.isActive ? t('banners.hide') : t('banners.show')} className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors">
                  {b.isActive ? <EyeOff className="w-4 h-4 text-on-surface-variant" /> : <Eye className="w-4 h-4 text-on-surface-variant" />}
                </button>
                <button onClick={() => openEdit(b)} className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors">
                  <Pencil className="w-4 h-4 text-on-surface-variant" />
                </button>
                <button onClick={() => setDeleteId(b._id)} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold font-headline">{editing ? t('banners.editBanner') : t('banners.newBanner')}</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('banners.titleLabel')}</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t('banners.titlePlaceholder')}
                  className="mt-1 w-full bg-surface-container rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('banners.subtitleLabel')}</label>
                <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder={t('banners.subtitlePlaceholder')}
                  className="mt-1 w-full bg-surface-container rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('banners.emojiLabel')}</label>
                <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                  placeholder="🛍️"
                  className="mt-1 w-full bg-surface-container rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('banners.orderLabel')}</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="mt-1 w-full bg-surface-container rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <span className="text-sm font-semibold">{t('banners.showOnHome')}</span>
              </label>
            </div>

            {/* Live preview */}
            {form.title && (
              <div className="bg-gradient-to-r from-primary to-primary-container rounded-2xl p-4 flex items-center justify-between">
                <div className="text-white min-w-0">
                  <p className="font-extrabold text-sm truncate">{form.title}</p>
                  {form.subtitle && <p className="text-xs opacity-80 mt-0.5 truncate">{form.subtitle}</p>}
                </div>
                <span className="text-3xl ms-2 shrink-0">{form.emoji || '🛍️'}</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl bg-surface-container text-sm font-bold hover:bg-surface-container-high transition-colors">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl btn-gradient text-white text-sm font-bold disabled:opacity-50">
                {saving ? t('common.saving') : (editing ? t('banners.saveChanges') : t('banners.createBanner'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-extrabold text-lg">{t('banners.deleteConfirmTitle')}</h3>
            <p className="text-sm text-on-surface-variant">{t('banners.deleteConfirmBody')}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl bg-surface-container text-sm font-bold">{t('common.cancel')}</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
