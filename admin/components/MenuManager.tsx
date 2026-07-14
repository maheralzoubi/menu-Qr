import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Search, CheckCircle,
  Image as ImageIcon, Camera, PlusCircle, X, Upload, Loader,
  Edit2, Tag, ChevronRight, FolderOpen, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MenuItem, Category } from '../../src/types';
import { authFetch, getToken } from '../../src/lib/auth';
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
            className={`px-3 py-1.5 rounded-full font-bold text-xs transition-all ${active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-highest text-on-surface-variant hover:bg-primary/10'}`}>
            {active && '✓ '}{tagLabel(tag)}
          </button>
        );
      })}
      {selected.filter(tag => !DIETARY_TAGS.includes(tag)).map(tag => (
        <button key={tag} type="button" onClick={() => toggle(tag)}
          className="px-3 py-1.5 rounded-full font-bold text-xs bg-primary text-on-primary shadow-sm">
          ✓ {tag}
        </button>
      ))}
      {showInput ? (
        <div className="flex items-center gap-2">
          <input autoFocus type="text" value={customTag}
            onChange={e => setCustomTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } if (e.key === 'Escape') setShowInput(false); }}
            placeholder={t('menu.tagName')}
            className="px-3 py-1.5 rounded-full bg-surface-container-lowest border border-primary/30 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 w-24" />
          <button type="button" onClick={addCustom} className="text-primary font-bold text-xs hover:underline">{t('menu.addTag')}</button>
          <button type="button" onClick={() => setShowInput(false)} className="text-on-surface-variant/40 text-xs">✕</button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowInput(true)}
          className="px-3 py-1.5 rounded-full border border-dashed border-outline-variant/50 text-on-surface-variant/50 font-bold text-xs flex items-center gap-1.5 hover:border-primary/50 transition-colors">
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
    <div className="relative aspect-video bg-surface-container-high border-2 border-dashed border-outline-variant/30 rounded-3xl flex flex-col items-center justify-center text-on-surface-variant/50 hover:bg-surface-container cursor-pointer group overflow-hidden transition-all"
      onClick={() => !uploading && fileRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}>
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader className="w-7 h-7 text-primary animate-spin" />
          <p className="text-xs font-medium text-on-surface">{t('menu.uploading')}</p>
        </div>
      ) : image ? (
        <>
          <img src={image} className="absolute inset-0 w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex flex-col items-center gap-1.5 text-white"><Upload className="w-6 h-6" /><span className="text-xs font-bold">{t('menu.change')}</span></div>
          </div>
          <button type="button" onClick={e => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 end-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10">
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-semibold text-on-surface">{t('menu.uploadClick')}</p>
          <p className="text-xs mt-1">{t('menu.uploadHint')}</p>
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
      <div className="space-y-10">
        <div className="flex justify-between items-end mb-12">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant/60 mb-2 uppercase tracking-widest">
              <button onClick={() => { closeAddView(); setNewItem(emptyItem()); }} className="hover:text-primary transition-colors">{t('menu.breadcrumbMenu')}</button>
              <ChevronRight className="w-3 h-3 rtl:scale-x-[-1]" /><span className="text-primary">{t('menu.breadcrumbNew')}</span>
            </nav>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight">{t('menu.addNewDish')}</h2>
          </div>
          <div className="flex gap-4">
            <button onClick={() => { closeAddView(); setNewItem(emptyItem()); }}
              className="px-8 py-3 rounded-xl font-semibold bg-surface-container-high hover:bg-surface-container-highest transition-all">
              {t('menu.cancel')}
            </button>
            <button onClick={handleSave}
              className="px-8 py-3 rounded-xl font-semibold text-on-primary btn-gradient shadow-lg shadow-primary/20 active:scale-95 transition-all">
              {t('menu.saveDish')}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-8 space-y-8">
            <section className="bg-surface-container-low p-8 rounded-4xl space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ms-1">{t('menu.dishName')}</label>
                <input type="text" placeholder={t('menu.dishNamePlaceholder')}
                  className="w-full bg-surface-container-lowest border-none rounded-xl py-4 px-6 text-lg font-medium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/30"
                  value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ms-1">{t('menu.category')}</label>
                  <select className="w-full bg-surface-container-lowest border-none rounded-xl py-4 px-6 font-medium focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                    <option value="">{t('menu.selectCategory')}</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ms-1">{t('menu.price')}</label>
                  <div className="relative">
                    <span className="absolute start-6 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant">$</span>
                    <input type="number" step="0.01" min="0"
                      className="w-full bg-surface-container-lowest border-none rounded-xl py-4 ps-10 pe-6 font-bold text-lg focus:ring-2 focus:ring-primary/20 transition-all"
                      value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ms-1">{t('menu.description')}</label>
                <textarea rows={3} placeholder={t('menu.descriptionPlaceholder')}
                  className="w-full bg-surface-container-lowest border-none rounded-xl py-4 px-6 leading-relaxed focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/30"
                  value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
              </div>
            </section>
            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant px-1">{t('menu.dishPhoto')}</h3>
              <ImageUploadZone image={newItem.image ?? ''} uploading={addImg.uploading} fileRef={addImg.ref}
                onFile={addImg.upload} onClear={() => setNewItem(p => ({ ...p, image: '' }))} />
            </section>
          </div>
          <div className="col-span-4 space-y-6">
            <div className="bg-surface-container-low p-6 rounded-4xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('menu.status')}</h3>
              <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl">
                <div className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-primary fill-current" /><span className="font-bold text-sm">{t('menu.featured')}</span></div>
                <button type="button" onClick={() => setNewItem({ ...newItem, featured: !newItem.featured })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${newItem.featured ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${newItem.featured ? 'end-1' : 'start-1'}`} />
                </button>
              </div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-4xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('menu.dietaryTags')}</h3>
              <TagSelector selected={newItem.allergens ?? []} onChange={tags => setNewItem({ ...newItem, allergens: tags })} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={`transition-all duration-300 ease-in-out space-y-8 ${panel !== 'none' ? 'pe-[440px]' : ''}`}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight font-headline">{t('menu.heading')}</h2>
            <p className="text-on-surface-variant mt-1">{t('menu.subtext')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
              <input type="text" placeholder={t('menu.searchPlaceholder')} value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-surface-container-high border-none rounded-xl py-2.5 ps-11 pe-5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none w-52" />
            </div>
            <button onClick={() => openPanel('categories')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${panel === 'categories' ? 'bg-primary text-white shadow-md' : 'bg-surface-container-high hover:bg-surface-container-highest'}`}>
              <FolderOpen className="w-4 h-4" /> {t('menu.categories')}
            </button>
            <button onClick={openAddView}
              className="flex items-center gap-2 btn-gradient text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all">
              <Plus className="w-4 h-4" /> {t('menu.addDish')}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[allItemsLabel, ...categories.map(c => c.name)].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat === allItemsLabel ? 'All Items' : cat)}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${(activeCategory === 'All Items' && cat === allItemsLabel) || activeCategory === cat ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading
            ? [1, 2, 3].map(i => <div key={i} className="h-72 bg-surface-container-low rounded-3xl animate-pulse" />)
            : filteredItems.map((item, i) => (
              <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                className={`group bg-surface-container-low rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col ${panel === 'edit' && editItem.id === item.id ? 'ring-2 ring-primary' : ''}`}>
                <div className="relative h-48 overflow-hidden bg-surface-container-high">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20"><ImageIcon className="w-10 h-10" /></div>
                  }
                  <div className="absolute top-3 start-3">
                    <span className="px-2.5 py-1 bg-surface-container-lowest/90 backdrop-blur-md rounded-full text-xs font-bold text-primary">{item.category}</span>
                  </div>
                  <div className="absolute top-3 end-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(item)}
                      className="w-9 h-9 bg-surface-container-lowest rounded-full flex items-center justify-center text-primary hover:scale-110 transition-transform shadow-md">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      className="w-9 h-9 bg-surface-container-lowest rounded-full flex items-center justify-center text-primary hover:scale-110 transition-transform shadow-md">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {item.allergens && item.allergens.length > 0 && (
                    <div className="absolute bottom-2 start-2 flex gap-1 flex-wrap">
                      {item.allergens.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold rounded-full uppercase tracking-widest">{tag}</span>
                      ))}
                      {item.allergens.length > 3 && <span className="px-2 py-0.5 bg-black/50 text-white text-[9px] font-bold rounded-full">+{item.allergens.length - 3}</span>}
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="font-bold font-headline leading-tight line-clamp-1">{item.name}</h3>
                    <span className="font-bold text-primary ms-2 shrink-0">${item.price.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-2 flex-1">{item.description}</p>
                  <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-xs font-semibold text-on-surface-variant">{t('menu.available')}</span>
                    {item.featured && <span className="ms-auto px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">{t('menu.featured')}</span>}
                  </div>
                </div>
              </motion.div>
            ))
          }
          <div onClick={openAddView}
            className="group border-2 border-dashed border-outline-variant/50 rounded-3xl flex flex-col items-center justify-center p-10 cursor-pointer hover:border-primary/50 hover:bg-surface-container-low/50 transition-all min-h-[200px]">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-bold font-headline text-sm">{t('menu.addNewDishCard')}</h3>
            <p className="text-xs text-on-surface-variant mt-1 text-center">{t('menu.expandMenu')}</p>
          </div>
        </div>

        <div className="bg-surface-container-high rounded-3xl p-6 flex items-center justify-around">
          {[
            { labelKey: 'menu.totalDishes',      value: items.length },
            { labelKey: 'menu.totalCategories',  value: categories.length },
            { labelKey: 'menu.featuredCount',    value: items.filter(i => i.featured).length },
          ].map(s => (
            <div key={s.labelKey} className="text-center">
              <h4 className="text-3xl font-extrabold text-primary font-headline">{s.value}</h4>
              <p className="text-xs font-bold text-on-surface-variant mt-0.5">{t(s.labelKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANELS */}
      <AnimatePresence>
        {panel !== 'none' && (
          <motion.div key={panel}
            initial={{ x: isRTL ? -440 : 440 }} animate={{ x: 0 }} exit={{ x: isRTL ? -440 : 440 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed top-0 ${isRTL ? 'left-0 border-r' : 'right-0 border-l'} h-screen w-[420px] bg-surface border-surface-container shadow-2xl z-30 flex flex-col`}>

            {/* CATEGORIES PANEL */}
            {panel === 'categories' && (
              <>
                <div className="flex items-center justify-between px-7 py-5 border-b border-surface-container">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Tag className="w-4 h-4" /></div>
                    <h3 className="font-extrabold text-lg font-headline">{t('menu.categories')}</h3>
                  </div>
                  <button onClick={() => setPanel('none')} className="p-2 hover:bg-surface-container rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar px-7 py-6 space-y-3">
                  {categories.length === 0 && (
                    <p className="text-sm text-on-surface-variant/50 text-center py-8">{t('menu.noCategoriesYet')}</p>
                  )}
                  <AnimatePresence>
                    {categories.map(cat => (
                      <motion.div key={cat.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="bg-surface-container-low rounded-2xl overflow-hidden group">
                        {editingCatId === cat.id ? (
                          <div className="p-4 space-y-2.5">
                            <input autoFocus type="text" value={editCatName} onChange={e => setEditCatName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleEditCategory(cat.id); if (e.key === 'Escape') cancelEditCat(); }}
                              className="w-full bg-surface-container border border-primary/30 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all" />
                            <input type="text" placeholder={t('menu.descriptionOptional')} value={editCatDesc} onChange={e => setEditCatDesc(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleEditCategory(cat.id); if (e.key === 'Escape') cancelEditCat(); }}
                              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all" />
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => handleEditCategory(cat.id)} disabled={!editCatName.trim() || editCatSaving}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl btn-gradient text-white text-xs font-bold disabled:opacity-50 transition-all">
                                {editCatSaving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                {t('menu.saveChanges')}
                              </button>
                              <button onClick={cancelEditCat}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-outline-variant text-xs font-semibold hover:bg-surface-container transition-all">
                                <X className="w-3.5 h-3.5" /> {t('menu.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-4 hover:bg-surface-container transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                {cat.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-sm leading-none">{cat.name}</p>
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                  {t('menu.dishCount', { count: items.filter(i => i.category === cat.name).length })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditCat(cat)} className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 hover:bg-rose-50 text-primary rounded-xl transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="px-7 py-5 border-t border-surface-container space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('menu.newCategory')}</p>
                  <input type="text" placeholder={t('menu.categoryName')} value={catName} onChange={e => setCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                  <input type="text" placeholder={t('menu.descriptionOptional')} value={catDesc} onChange={e => setCatDesc(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                  <button onClick={handleAddCategory} disabled={!catName.trim() || catAdding}
                    className="w-full btn-gradient text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                    {catAdding ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {t('menu.addCategory')}
                  </button>
                </div>
              </>
            )}

            {/* EDIT PANEL */}
            {panel === 'edit' && (
              <>
                <div className="flex items-center justify-between px-7 py-5 border-b border-surface-container">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Edit2 className="w-4 h-4" /></div>
                    <h3 className="font-extrabold text-lg font-headline">{t('menu.editDish')}</h3>
                  </div>
                  <button onClick={closeEditPanel} className="p-2 hover:bg-surface-container rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto no-scrollbar px-7 py-6 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('menu.dishName')}</label>
                    <input type="text" placeholder={t('menu.dishName')} value={editItem.name ?? ''}
                      onChange={e => setEditItem(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('menu.category')}</label>
                      <select value={editItem.category ?? ''} onChange={e => setEditItem(p => ({ ...p, category: e.target.value }))}
                        className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all appearance-none">
                        <option value="">{t('menu.selectPlaceholder')}</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('menu.price')}</label>
                      <div className="relative">
                        <span className="absolute start-4 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant text-sm">$</span>
                        <input type="number" step="0.01" min="0" value={editItem.price ?? 0}
                          onChange={e => setEditItem(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-surface-container border border-outline-variant rounded-2xl py-3 ps-8 pe-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('menu.description')}</label>
                    <textarea rows={3} placeholder={t('menu.descriptionEditPlaceholder')} value={editItem.description ?? ''}
                      onChange={e => setEditItem(p => ({ ...p, description: e.target.value }))}
                      className="w-full bg-surface-container border border-outline-variant rounded-2xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('menu.photo')}</label>
                    <ImageUploadZone image={editItem.image ?? ''} uploading={editImg.uploading} fileRef={editImg.ref}
                      onFile={editImg.upload} onClear={() => setEditItem(p => ({ ...p, image: '' }))} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-primary fill-current" />
                      <span className="font-bold text-sm">{t('menu.featuredDish')}</span>
                    </div>
                    <button type="button" onClick={() => setEditItem(p => ({ ...p, featured: !p.featured }))}
                      className={`w-11 h-6 rounded-full relative transition-colors ${editItem.featured ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${editItem.featured ? 'end-1' : 'start-1'}`} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('menu.dietaryTags')}</label>
                    <TagSelector selected={editItem.allergens ?? []} onChange={tags => setEditItem(p => ({ ...p, allergens: tags }))} />
                  </div>
                  <AnimatePresence>
                    {editError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3">{editError}</motion.p>
                    )}
                  </AnimatePresence>
                </form>
                <div className="px-7 py-5 border-t border-surface-container flex gap-3">
                  <button type="button" onClick={closeEditPanel}
                    className="flex-1 py-3 rounded-xl border border-outline-variant text-sm font-semibold hover:bg-surface-container transition-all">
                    {t('menu.cancel')}
                  </button>
                  <button type="button" onClick={handleEditSave} disabled={editSaving}
                    className="flex-1 btn-gradient text-white py-3 rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                    {editSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('menu.saving')}</> : t('menu.saveChanges')}
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
