import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Search, CheckCircle,
  Image as ImageIcon, Camera, PlusCircle, X, Upload, Loader,
  Edit2, Tag, ChevronRight, FolderOpen, Check, UtensilsCrossed, Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MenuItem, Category } from '../../src/types';
import { authFetch, getToken } from '../../src/lib/auth';
import { formatCurrency, getCurrencySymbol } from '../../src/lib/currency';
import { pushNavParam, goBack } from '../lib/navHistory';

type View  = 'list' | 'add';
type Panel = 'none' | 'categories' | 'edit';

function parseMenuNav(search: string): { view: View; editId: string | null } {
  const params = new URLSearchParams(search);
  const view: View = params.get('menuView') === 'add' ? 'add' : 'list';
  return { view, editId: params.get('menuEditId') };
}

const DIETARY_TAGS = ['Vegan', 'Gluten-Free', 'Spicy', 'Dairy-Free', 'Pescatarian', 'Nut-Free', 'Halal'];

const emptyItem = (): Partial<MenuItem> => ({
  name: '', description: '', price: 0, category: '', image: '', featured: false, allergens: [],
});

function useImageUpload(setter: (url: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form });
      if (res.ok) { const { url } = await res.json(); setter(url); }
    } catch (e) { console.error('Upload failed:', e); }
    finally { setUploading(false); }
  };
  return { ref, uploading, upload };
}

const TagSelector = ({ selected, onChange }: { selected: string[]; onChange: (tags: string[]) => void }) => {
  const { t } = useTranslation();
  const [customTag, setCustomTag] = useState('');
  const [showInput, setShowInput] = useState(false);
  const toggle = (tag: string) => onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]);
  const addCustom = () => {
    const tg = customTag.trim();
    if (tg && !selected.includes(tg)) onChange([...selected, tg]);
    setCustomTag(''); setShowInput(false);
  };
  const tagLabel = (tag: string) => t(`menu.dietaryTagLabels.${tag}`, { defaultValue: tag });
  return (
    <div className="flex flex-wrap gap-2">
      {DIETARY_TAGS.map(tag => {
        const active = selected.includes(tag);
        return (
          <button key={tag} type="button" onClick={() => toggle(tag)}
            className={`inline-flex items-center gap-1 h-8 px-3 rounded-full border text-xs font-semibold transition-colors ${active ? 'bg-acc-soft text-acc border-primary/40' : 'bg-card text-on-surface-variant border-line hover:bg-accent hover:text-on-surface'}`}>
            {active && <Check className="w-3 h-3" />}{tagLabel(tag)}
          </button>
        );
      })}
      {selected.filter(tag => !DIETARY_TAGS.includes(tag)).map(tag => (
        <button key={tag} type="button" onClick={() => toggle(tag)}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-full border text-xs font-semibold bg-acc-soft text-acc border-primary/40 transition-colors">
          <Check className="w-3 h-3" /> {tag}
        </button>
      ))}
      {showInput ? (
        <div className="flex items-center gap-2">
          <input autoFocus type="text" value={customTag}
            onChange={e => setCustomTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } if (e.key === 'Escape') setShowInput(false); }}
            placeholder={t('menu.tagName')}
            className="ds-input h-8 w-28 rounded-full text-xs" />
          <button type="button" onClick={addCustom} className="ds-btn ds-btn-ghost h-8 px-2.5 text-xs text-acc">{t('menu.addTag')}</button>
          <button type="button" onClick={() => setShowInput(false)} className="ds-btn ds-btn-ghost ds-btn-icon h-8 w-8 text-on-surface-variant"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowInput(true)}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-dashed border-input text-on-surface-variant text-xs font-semibold hover:border-primary/50 hover:text-on-surface transition-colors">
          <Plus className="w-3 h-3" /> {t('menu.custom')}
        </button>
      )}
    </div>
  );
};

const ImageUploadZone = ({ image, uploading, fileRef, onFile, onClear }: {
  image: string; uploading: boolean; fileRef: React.RefObject<HTMLInputElement>;
  onFile: (f: File) => void; onClear: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="relative aspect-video bg-surface-container-low border border-dashed border-input rounded-2xl flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container hover:border-primary/40 cursor-pointer group overflow-hidden transition-colors"
      onClick={() => !uploading && fileRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}>
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader className="w-6 h-6 text-acc animate-spin" />
          <p className="text-xs font-medium text-on-surface">{t('menu.uploading')}</p>
        </div>
      ) : image ? (
        <>
          <img src={image} className="absolute inset-0 w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex flex-col items-center gap-1.5 text-white"><Upload className="w-5 h-5" /><span className="text-xs font-semibold">{t('menu.change')}</span></div>
          </div>
          <button type="button" onClick={e => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 end-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10">
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <>
          <div className="ds-icon-tile mb-3">
            <Camera className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-on-surface">{t('menu.uploadClick')}</p>
          <p className="ds-help">{t('menu.uploadHint')}</p>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
};

export const MenuManager = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [view, setView]   = useState<View>(() => parseMenuNav(window.location.search).view);
  const [panel, setPanel] = useState<Panel>('none');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Items');

  const [newItem, setNewItem] = useState<Partial<MenuItem>>(emptyItem());
  const addImg = useImageUpload(url => setNewItem(p => ({ ...p, image: url })));

  const [editItem, setEditItem] = useState<Partial<MenuItem> & { id?: string }>(emptyItem());
  const editImg = useImageUpload(url => setEditItem(p => ({ ...p, image: url })));
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [catName, setCatName]     = useState('');
  const [catDesc, setCatDesc]     = useState('');
  const [catAdding, setCatAdding] = useState(false);

  const [editingCatId,  setEditingCatId]  = useState<string | null>(null);
  const [editCatName,   setEditCatName]   = useState('');
  const [editCatDesc,   setEditCatDesc]   = useState('');
  const [editCatSaving, setEditCatSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const [res, catRes] = await Promise.all([authFetch('/api/menu'), authFetch('/api/categories')]);
      if (res.ok) setItems(await res.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const [currency, setCurrency] = useState('USD');
  useEffect(() => {
    authFetch('/api/settings/restaurant').then(r => r.ok ? r.json() : null).then(st => { if (st?.currency) setCurrency(st.currency); }).catch(() => {});
  }, []);

  useEffect(() => { fetchItems(); }, []);

  // Restore/react to the URL — including on browser back/forward — so drilling
  // into "Add Dish" or an item's edit panel creates a real history entry
  // instead of only ever replacing the app's single initial entry.
  useEffect(() => {
    const applyNav = () => {
      const next = parseMenuNav(window.location.search);
      setView(next.view);
      if (!next.editId) {
        // Only close the URL-tracked edit panel; leave the untracked categories panel alone.
        setPanel(prev => prev === 'edit' ? 'none' : prev);
        return;
      }
      const item = items.find(i => i.id === next.editId);
      if (item) { setEditItem({ ...item }); setPanel('edit'); }
    };
    applyNav();
    window.addEventListener('popstate', applyNav);
    return () => window.removeEventListener('popstate', applyNav);
  }, [items]);

  const openAddView = () => { setView('add'); pushNavParam('menuView', 'add'); };
  const closeAddView = () => { goBack(); };

  const openPanel = (p: Panel) => setPanel(prev => prev === p ? 'none' : p);
  const openEdit = (item: MenuItem) => { setEditItem({ ...item }); setEditError(''); setPanel('edit'); pushNavParam('menuEditId', item.id); };
  const closeEditPanel = () => { goBack(); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/menu', { method: 'POST', body: JSON.stringify(newItem) });
      if (res.ok) { closeAddView(); fetchItems(); setNewItem(emptyItem()); }
    } catch (e) { console.error(e); }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem.id) return;
    setEditError(''); setEditSaving(true);
    try {
      const res = await authFetch(`/api/menu/${editItem.id}`, { method: 'PATCH', body: JSON.stringify(editItem) });
      if (!res.ok) { const d = await res.json(); setEditError(d.message ?? 'Failed to save.'); return; }
      await fetchItems(); closeEditPanel();
    } catch { setEditError('Network error. Try again.'); }
    finally { setEditSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('menu.deleteConfirm'))) return;
    try {
      const res = await authFetch(`/api/menu/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchItems(); if (panel === 'edit' && editItem.id === id) closeEditPanel(); }
    } catch (e) { console.error(e); }
  };

  const handleAddCategory = async () => {
    if (!catName.trim()) return;
    setCatAdding(true);
    try {
      await authFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name: catName.trim(), description: catDesc.trim() }) });
      setCatName(''); setCatDesc(''); fetchItems();
    } catch (e) { console.error(e); }
    finally { setCatAdding(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(t('menu.deleteCategoryConfirm'))) return;
    try { await authFetch(`/api/categories/${id}`, { method: 'DELETE' }); fetchItems(); }
    catch (e) { console.error(e); }
  };

  const startEditCat = (cat: Category) => { setEditingCatId(cat.id); setEditCatName(cat.name); setEditCatDesc(cat.description ?? ''); };
  const cancelEditCat = () => { setEditingCatId(null); setEditCatName(''); setEditCatDesc(''); };

  const handleEditCategory = async (id: string) => {
    if (!editCatName.trim()) return;
    setEditCatSaving(true);
    try {
      const res = await authFetch(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ name: editCatName.trim(), description: editCatDesc.trim() }) });
      if (res.ok) { await fetchItems(); cancelEditCat(); }
    } catch (e) { console.error(e); }
    finally { setEditCatSaving(false); }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === 'All Items' || item.category === activeCategory;
    return matchSearch && matchCat;
  });

  const allItemsLabel = t('menu.allItems');

  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <nav className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant mb-1.5">
              <button onClick={() => { closeAddView(); setNewItem(emptyItem()); }} className="hover:text-on-surface transition-colors">{t('menu.breadcrumbMenu')}</button>
              <ChevronRight className="w-3 h-3 rtl:-scale-x-100" /><span className="text-acc">{t('menu.breadcrumbNew')}</span>
            </nav>
            <h1 className="ds-page-title">{t('menu.addNewDish')}</h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => { closeAddView(); setNewItem(emptyItem()); }}
              className="ds-btn ds-btn-secondary flex-1 sm:flex-none">
              {t('menu.cancel')}
            </button>
            <button onClick={handleSave}
              className="ds-btn ds-btn-primary flex-1 sm:flex-none">
              <Check className="w-4 h-4" /> {t('menu.saveDish')}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            <section className="ds-card ds-card-pad space-y-4">
              <div>
                <label className="ds-label">{t('menu.dishName')}</label>
                <input type="text" placeholder={t('menu.dishNamePlaceholder')}
                  className="ds-input"
                  value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">{t('menu.category')}</label>
                  <select className="ds-select"
                    value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                    <option value="">{t('menu.selectCategory')}</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ds-label">{t('menu.price')}</label>
                  <div className="relative">
                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-on-surface-variant">{getCurrencySymbol(currency)}</span>
                    <input type="number" step="0.01" min="0"
                      className="ds-input ps-7 tabular"
                      value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>
              <div>
                <label className="ds-label">{t('menu.description')}</label>
                <textarea rows={3} placeholder={t('menu.descriptionPlaceholder')}
                  className="ds-textarea leading-relaxed"
                  value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
              </div>
            </section>
            <section className="ds-card ds-card-pad space-y-3">
              <h3 className="ds-section-title">{t('menu.dishPhoto')}</h3>
              <ImageUploadZone image={newItem.image ?? ''} uploading={addImg.uploading} fileRef={addImg.ref}
                onFile={addImg.upload} onClear={() => setNewItem(p => ({ ...p, image: '' }))} />
            </section>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="ds-card ds-card-pad space-y-3">
              <h3 className="ds-section-title">{t('menu.status')}</h3>
              <div className="ds-inset p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5"><CheckCircle className="w-4 h-4 text-acc" /><span className="font-semibold text-sm">{t('menu.featured')}</span></div>
                <button type="button" onClick={() => setNewItem({ ...newItem, featured: !newItem.featured })}
                  className="inline-flex items-center">
                  <span className={`ds-switch ${newItem.featured ? 'ds-switch-on' : ''}`} />
                </button>
              </div>
            </div>
            <div className="ds-card ds-card-pad space-y-3">
              <h3 className="ds-section-title">{t('menu.dietaryTags')}</h3>
              <TagSelector selected={newItem.allergens ?? []} onChange={tags => setNewItem({ ...newItem, allergens: tags })} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={`transition-all duration-300 ease-in-out space-y-6 ${panel !== 'none' ? 'lg:pe-[440px]' : ''}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ds-page-title">{t('menu.heading')}</h1>
            <p className="ds-page-sub">{t('menu.subtext')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px] sm:flex-none">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input type="text" placeholder={t('menu.searchPlaceholder')} value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ds-input h-9 ps-9 text-[13px] sm:w-56" />
            </div>
            <button onClick={() => openPanel('categories')}
              className={`ds-btn ds-btn-sm ${panel === 'categories' ? 'ds-btn-secondary ring-1 ring-primary/40' : 'ds-btn-outline'}`}>
              <FolderOpen className="w-4 h-4" /> {t('menu.categories')}
            </button>
            <button onClick={openAddView}
              className="ds-btn ds-btn-sm ds-btn-primary">
              <Plus className="w-4 h-4" /> {t('menu.addDish')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { labelKey: 'menu.totalDishes',      value: items.length,                        icon: UtensilsCrossed },
            { labelKey: 'menu.totalCategories',  value: categories.length,                   icon: FolderOpen },
            { labelKey: 'menu.featuredCount',    value: items.filter(i => i.featured).length, icon: Star },
          ].map(s => (
            <div key={s.labelKey} className="ds-card ds-card-pad flex items-center gap-3">
              <div className="ds-icon-tile"><s.icon className="w-5 h-5" /></div>
              <div>
                <p className="ds-metric-lbl">{t(s.labelKey)}</p>
                <p className="ds-metric-val tabular">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="ds-seg max-w-full overflow-x-auto no-scrollbar">
          {[allItemsLabel, ...categories.map(c => c.name)].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat === allItemsLabel ? 'All Items' : cat)}
              className={`ds-seg-item shrink-0 whitespace-nowrap ${(activeCategory === 'All Items' && cat === allItemsLabel) || activeCategory === cat ? 'ds-seg-item-active' : ''}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading
            ? [1, 2, 3].map(i => <div key={i} className="h-72 bg-surface-container animate-pulse rounded-2xl" />)
            : filteredItems.map((item, i) => (
              <motion.div key={item.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`group ds-card p-0 overflow-hidden flex flex-col transition-colors hover:border-input ${panel === 'edit' && editItem.id === item.id ? 'ring-2 ring-primary' : ''}`}>
                <div className="relative h-44 overflow-hidden bg-surface-container-low border-b border-line">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40"><ImageIcon className="w-8 h-8" /></div>
                  }
                  <div className="absolute top-2.5 start-2.5">
                    <span className="ds-chip bg-card/95 text-on-surface border border-line">{item.category}</span>
                  </div>
                  <div className="absolute top-2.5 end-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(item)}
                      className="ds-btn ds-btn-outline ds-btn-icon ds-btn-sm">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      className="ds-btn ds-btn-outline ds-btn-icon ds-btn-sm text-error">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {item.allergens && item.allergens.length > 0 && (
                    <div className="absolute bottom-2.5 start-2.5 flex gap-1 flex-wrap">
                      {item.allergens.slice(0, 3).map(tag => (
                        <span key={tag} className="ds-chip bg-card/95 text-on-surface-variant border border-line">{tag}</span>
                      ))}
                      {item.allergens.length > 3 && <span className="ds-chip bg-card/95 text-on-surface-variant border border-line">+{item.allergens.length - 3}</span>}
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="text-sm font-semibold leading-tight line-clamp-1">{item.name}</h3>
                    <span className="font-display font-bold tabular text-on-surface shrink-0">{formatCurrency(item.price, currency)}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-2 flex-1">{item.description}</p>
                  <div className="mt-3 pt-3 border-t border-line flex items-center gap-2">
                    <span className="ds-chip ds-chip-pos"><span className="ds-dot" />{t('menu.available')}</span>
                    {item.featured && <span className="ms-auto ds-chip ds-chip-brand">{t('menu.featured')}</span>}
                  </div>
                </div>
              </motion.div>
            ))
          }
          <div onClick={openAddView}
            className="group ds-empty py-10 min-h-[200px] cursor-pointer hover:border-primary/50 hover:bg-surface-container-low transition-colors">
            <PlusCircle className="w-8 h-8 opacity-40 group-hover:opacity-100 group-hover:text-acc transition-opacity" />
            <h3 className="text-sm font-semibold text-on-surface">{t('menu.addNewDishCard')}</h3>
            <p className="text-xs text-on-surface-variant">{t('menu.expandMenu')}</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANELS */}
      <AnimatePresence>
        {panel !== 'none' && (
          <motion.div key={panel}
            initial={{ x: isRTL ? '-100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isRTL ? '-100%' : '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            className="fixed top-0 end-0 border-s border-line h-screen w-full sm:w-[420px] bg-card shadow-2xl z-30 flex flex-col">

            {/* CATEGORIES PANEL */}
            {panel === 'categories' && (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                  <div className="flex items-center gap-2.5">
                    <div className="ds-icon-tile w-8 h-8 rounded-lg"><Tag className="w-4 h-4" /></div>
                    <h3 className="ds-section-title">{t('menu.categories')}</h3>
                  </div>
                  <button onClick={() => setPanel('none')} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-5 space-y-2">
                  {categories.length === 0 && (
                    <div className="ds-empty">
                      <FolderOpen className="w-8 h-8 opacity-40" />
                      <p className="text-sm">{t('menu.noCategoriesYet')}</p>
                    </div>
                  )}
                  <AnimatePresence>
                    {categories.map(cat => (
                      <motion.div key={cat.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="ds-inset overflow-hidden group">
                        {editingCatId === cat.id ? (
                          <div className="p-3.5 space-y-2">
                            <input autoFocus type="text" value={editCatName} onChange={e => setEditCatName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleEditCategory(cat.id); if (e.key === 'Escape') cancelEditCat(); }}
                              className="ds-input font-semibold" />
                            <input type="text" placeholder={t('menu.descriptionOptional')} value={editCatDesc} onChange={e => setEditCatDesc(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleEditCategory(cat.id); if (e.key === 'Escape') cancelEditCat(); }}
                              className="ds-input" />
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => handleEditCategory(cat.id)} disabled={!editCatName.trim() || editCatSaving}
                                className="ds-btn ds-btn-sm ds-btn-primary flex-1">
                                {editCatSaving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                {t('menu.saveChanges')}
                              </button>
                              <button onClick={cancelEditCat}
                                className="ds-btn ds-btn-sm ds-btn-outline flex-1">
                                <X className="w-3.5 h-3.5" /> {t('menu.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between px-3.5 py-3 hover:bg-surface-container transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-acc-soft text-acc text-xs font-bold flex items-center justify-center shrink-0">
                                {cat.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm leading-tight truncate">{cat.name}</p>
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                  {t('menu.dishCount', { count: items.filter(i => i.category === cat.name).length })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditCat(cat)} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteCategory(cat.id)} className="ds-btn ds-btn-danger-soft ds-btn-icon ds-btn-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="px-5 py-4 border-t border-line space-y-2.5">
                  <p className="ds-label mb-0">{t('menu.newCategory')}</p>
                  <input type="text" placeholder={t('menu.categoryName')} value={catName} onChange={e => setCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                    className="ds-input" />
                  <input type="text" placeholder={t('menu.descriptionOptional')} value={catDesc} onChange={e => setCatDesc(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                    className="ds-input" />
                  <button onClick={handleAddCategory} disabled={!catName.trim() || catAdding}
                    className="ds-btn ds-btn-primary w-full">
                    {catAdding ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {t('menu.addCategory')}
                  </button>
                </div>
              </>
            )}

            {/* EDIT PANEL */}
            {panel === 'edit' && (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                  <div className="flex items-center gap-2.5">
                    <div className="ds-icon-tile w-8 h-8 rounded-lg"><Edit2 className="w-4 h-4" /></div>
                    <h3 className="ds-section-title">{t('menu.editDish')}</h3>
                  </div>
                  <button onClick={closeEditPanel} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto no-scrollbar px-5 py-5 space-y-4">
                  <div>
                    <label className="ds-label">{t('menu.dishName')}</label>
                    <input type="text" placeholder={t('menu.dishName')} value={editItem.name ?? ''}
                      onChange={e => setEditItem(p => ({ ...p, name: e.target.value }))}
                      className="ds-input" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="ds-label">{t('menu.category')}</label>
                      <select value={editItem.category ?? ''} onChange={e => setEditItem(p => ({ ...p, category: e.target.value }))}
                        className="ds-select">
                        <option value="">{t('menu.selectPlaceholder')}</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ds-label">{t('menu.price')}</label>
                      <div className="relative">
                        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-on-surface-variant">{getCurrencySymbol(currency)}</span>
                        <input type="number" step="0.01" min="0" value={editItem.price ?? 0}
                          onChange={e => setEditItem(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                          className="ds-input ps-7 tabular" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="ds-label">{t('menu.description')}</label>
                    <textarea rows={3} placeholder={t('menu.descriptionEditPlaceholder')} value={editItem.description ?? ''}
                      onChange={e => setEditItem(p => ({ ...p, description: e.target.value }))}
                      className="ds-textarea leading-relaxed" />
                  </div>
                  <div>
                    <label className="ds-label">{t('menu.photo')}</label>
                    <ImageUploadZone image={editItem.image ?? ''} uploading={editImg.uploading} fileRef={editImg.ref}
                      onFile={editImg.upload} onClear={() => setEditItem(p => ({ ...p, image: '' }))} />
                  </div>
                  <div className="ds-inset p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-acc" />
                      <span className="font-semibold text-sm">{t('menu.featuredDish')}</span>
                    </div>
                    <button type="button" onClick={() => setEditItem(p => ({ ...p, featured: !p.featured }))}
                      className="inline-flex items-center">
                      <span className={`ds-switch ${editItem.featured ? 'ds-switch-on' : ''}`} />
                    </button>
                  </div>
                  <div>
                    <label className="ds-label">{t('menu.dietaryTags')}</label>
                    <TagSelector selected={editItem.allergens ?? []} onChange={tags => setEditItem(p => ({ ...p, allergens: tags }))} />
                  </div>
                  <AnimatePresence>
                    {editError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-sm bg-neg1 text-neg7 rounded-xl px-3.5 py-2.5">{editError}</motion.p>
                    )}
                  </AnimatePresence>
                </form>
                <div className="px-5 py-4 border-t border-line flex gap-2">
                  <button type="button" onClick={closeEditPanel}
                    className="ds-btn ds-btn-outline flex-1">
                    {t('menu.cancel')}
                  </button>
                  <button type="button" onClick={handleEditSave} disabled={editSaving}
                    className="ds-btn ds-btn-primary flex-1">
                    {editSaving ? <><Loader className="w-4 h-4 animate-spin" /> {t('menu.saving')}</> : t('menu.saveChanges')}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
