/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Edit2, Search, ChevronRight, CheckCircle,
  Image as ImageIcon, Camera, PlusCircle, GripVertical, X, Upload, Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, Category } from '../../src/types';
import { authFetch, getToken } from '../../src/lib/auth';

type View = 'list' | 'add' | 'categories';

const DIETARY_TAGS = ['Vegan', 'Gluten-Free', 'Spicy', 'Dairy-Free', 'Pescatarian', 'Nut-Free', 'Halal'];

const emptyItem = (): Partial<MenuItem> => ({
  name: '', description: '', price: 0, category: '',
  image: '', featured: false, ingredients: [], allergens: [],
});

export const MenuManager = () => {
  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [newItem, setNewItem] = useState<Partial<MenuItem>>(emptyItem());
  const [uploadingImage, setUploadingImage] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [showCustomTag, setShowCustomTag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    try {
      const [res, catRes] = await Promise.all([fetch('/api/menu'), fetch('/api/categories')]);
      setItems(await res.json());
      setCategories(await catRes.json());
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  // Toggle a dietary tag in allergens array
  const toggleTag = (tag: string) => {
    const current = newItem.allergens ?? [];
    const has = current.includes(tag);
    setNewItem({ ...newItem, allergens: has ? current.filter(t => t !== tag) : [...current, tag] });
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (!tag) return;
    const current = newItem.allergens ?? [];
    if (!current.includes(tag)) setNewItem({ ...newItem, allergens: [...current, tag] });
    setCustomTag('');
    setShowCustomTag(false);
  };

  // Upload image to /api/upload
  const handleImageFile = async (file: File) => {
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      if (res.ok) {
        const { url } = await res.json();
        setNewItem(prev => ({ ...prev, image: url }));
      }
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/menu', { method: 'POST', body: JSON.stringify(newItem) });
      if (res.ok) {
        setView('list');
        fetchItems();
        setNewItem(emptyItem());
      }
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await authFetch(`/api/menu/${id}`, { method: 'DELETE' });
      if (res.ok) fetchItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All Items' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // ── ADD DISH VIEW ──────────────────────────────────────────────────────────
  if (view === 'add') {
    const selectedTags = newItem.allergens ?? [];

    return (
      <div className="space-y-10">
        <div className="flex justify-between items-end mb-12">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant/60 mb-2 uppercase tracking-widest">
              <button onClick={() => { setView('list'); setNewItem(emptyItem()); }} className="hover:text-primary transition-colors">
                Menu Management
              </button>
              <ChevronRight className="w-3 h-3" />
              <span className="text-primary">New Dish</span>
            </nav>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight">Add New Dish</h2>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => { setView('list'); setNewItem(emptyItem()); }}
              className="px-8 py-3 rounded-xl font-semibold text-on-surface bg-surface-container-high hover:bg-surface-variant transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-3 rounded-xl font-semibold text-on-primary btn-gradient shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              Save Dish
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-10">
          {/* Left column — main fields */}
          <div className="col-span-8 space-y-10">
            <section className="bg-surface-container-low p-8 rounded-4xl space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Dish Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Truffle-Infused Wild Mushroom Risotto"
                    className="w-full bg-surface-container-lowest border-none rounded-xl py-4 px-6 text-lg font-medium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/30 shadow-sm"
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Category</label>
                  <select
                    className="w-full bg-surface-container-lowest border-none rounded-xl py-4 px-6 font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm appearance-none"
                    value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Price</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant">$</span>
                    <input
                      type="number" step="0.01" min="0"
                      className="w-full bg-surface-container-lowest border-none rounded-xl py-4 pl-10 pr-6 font-bold text-lg focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                      value={newItem.price}
                      onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Description</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the flavors, ingredients, and presentation..."
                    className="w-full bg-surface-container-lowest border-none rounded-xl py-4 px-6 font-body leading-relaxed focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/30 shadow-sm"
                    value={newItem.description}
                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>
              </div>
            </section>

            {/* Image upload */}
            <section className="space-y-4">
              <h3 className="text-lg font-headline font-bold px-1">Dish Photo</h3>
              <div className="grid grid-cols-3 gap-6">
                <div
                  className="col-span-2 aspect-video bg-surface-container-high border-2 border-dashed border-outline-variant/30 rounded-4xl flex flex-col items-center justify-center text-on-surface-variant/50 hover:bg-surface-variant transition-all cursor-pointer group relative overflow-hidden"
                  onClick={() => !uploadingImage && fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleImageFile(file);
                  }}
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-sm font-medium text-on-surface">Uploading...</p>
                    </div>
                  ) : newItem.image ? (
                    <>
                      <img src={newItem.image} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-white">
                          <Upload className="w-8 h-8" />
                          <span className="text-sm font-bold">Change Photo</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Camera className="w-8 h-8 text-primary" />
                      </div>
                      <p className="font-semibold text-on-surface">Click or drag to upload</p>
                      <p className="text-sm mt-1">JPG, PNG, WEBP — max 5 MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
                  />
                </div>

                {/* Preview */}
                <div className="bg-surface-container-high rounded-4xl relative overflow-hidden flex items-center justify-center">
                  {newItem.image ? (
                    <>
                      <img src={newItem.image} className="absolute inset-0 w-full h-full object-cover" />
                      <button
                        className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        onClick={() => setNewItem({ ...newItem, image: '' })}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="w-10 h-10 text-on-surface-variant/20" />
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="col-span-4 space-y-8">
            {/* Featured toggle */}
            <div className="bg-surface-container-low p-8 rounded-4xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Live Status</h3>
              <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary fill-current" />
                  <span className="font-bold">Featured Dish</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewItem({ ...newItem, featured: !newItem.featured })}
                  className={`w-12 h-6 rounded-full relative transition-colors ${newItem.featured ? 'bg-primary' : 'bg-surface-variant'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newItem.featured ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Dietary Identity — fully functional */}
            <div className="bg-surface-container-low p-8 rounded-4xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Dietary Identity</h3>
              {selectedTags.length > 0 && (
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                  {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map(tag => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-full font-bold text-xs transition-all ${
                        active
                          ? 'bg-primary text-on-primary shadow-md'
                          : 'bg-surface-container-highest text-on-surface-variant hover:bg-primary/10'
                      }`}
                    >
                      {active && <span className="mr-1">✓</span>}{tag}
                    </button>
                  );
                })}

                {/* Custom tags added by the user */}
                {selectedTags.filter(t => !DIETARY_TAGS.includes(t)).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="px-4 py-2 rounded-full font-bold text-xs bg-primary text-on-primary shadow-md transition-all"
                  >
                    ✓ {tag}
                  </button>
                ))}

                {showCustomTag ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={customTag}
                      onChange={e => setCustomTag(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } if (e.key === 'Escape') setShowCustomTag(false); }}
                      placeholder="Tag name"
                      className="px-3 py-1.5 rounded-full bg-surface-container-lowest border border-primary/30 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 w-24"
                    />
                    <button type="button" onClick={addCustomTag} className="text-primary font-bold text-xs hover:underline">Add</button>
                    <button type="button" onClick={() => setShowCustomTag(false)} className="text-on-surface-variant/40 text-xs">✕</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCustomTag(true)}
                    className="px-3 py-2 rounded-full border border-dashed border-outline-variant/50 text-on-surface-variant/50 font-bold text-xs flex items-center gap-1.5 hover:border-primary/50 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Custom Tag
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CATEGORIES VIEW ────────────────────────────────────────────────────────
  if (view === 'categories') {
    const handleAddCategory = async () => {
      const name = prompt('Enter new category name:');
      const desc = prompt('Enter description:');
      if (!name) return;
      try {
        await authFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name, description: desc || '' }) });
        fetchItems();
      } catch (err) { console.error(err); }
    };

    const handleDeleteCategory = async (id: string) => {
      if (!confirm('Delete this category?')) return;
      try {
        await authFetch(`/api/categories/${id}`, { method: 'DELETE' });
        fetchItems();
      } catch (err) { console.error(err); }
    };

    return (
      <div className="space-y-10">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h3 className="text-4xl font-headline font-extrabold tracking-tight mb-2">Category Management</h3>
            <p className="text-on-surface-variant font-medium">Organize your menu structure and dish groupings.</p>
          </div>
          <button onClick={handleAddCategory} className="flex items-center gap-2 btn-gradient text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:opacity-90 active:scale-95 transition-all">
            <PlusCircle className="w-5 h-5" /> Add New Category
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map(cat => (
            <div key={cat.id} className="bg-surface-container-low rounded-3xl p-6 flex flex-col group hover:bg-surface-container-lowest transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {cat.name.charAt(0)}
                </div>
                <GripVertical className="w-5 h-5 text-stone-300 group-hover:text-primary cursor-grab" />
              </div>
              <h4 className="text-xl font-headline font-bold mb-1">{cat.name}</h4>
              <p className="text-on-surface-variant text-xs mb-6 h-8 line-clamp-2">{cat.description}</p>
              <div className="mt-auto flex items-center justify-between border-t border-stone-200/40 pt-4">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{items.filter(i => i.category === cat.name).length} Items</span>
                <button onClick={() => handleDeleteCategory(cat.id)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 text-rose-500 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          <div onClick={handleAddCategory} className="border-2 border-dashed border-stone-200 rounded-3xl flex flex-col items-center justify-center p-8 group hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-all">
              <Plus className="w-6 h-6" />
            </div>
            <p className="font-bold text-stone-500 group-hover:text-primary transition-all">Create New Category</p>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight font-headline">Menu Catalog</h2>
          <p className="text-on-surface-variant mt-2 max-w-lg">Manage your seasonal offerings and curate the ultimate dining experience.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['All Items', ...categories.map(c => c.name)].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                activeCategory === cat ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              {cat}
            </button>
          ))}
          <button onClick={() => setView('categories')} className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-container-highest transition-all">
            Manage Categories
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
        <input
          type="text"
          placeholder="Search dishes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-high border-none rounded-xl py-3 pl-12 pr-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading
          ? [1, 2, 3].map(i => <div key={i} className="h-80 bg-surface-container-low rounded-3xl animate-pulse" />)
          : filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-surface-container-low rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="relative h-56 overflow-hidden bg-surface-container-high">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-surface-container-lowest/90 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-primary">
                    {item.category}
                  </span>
                </div>
                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="w-10 h-10 bg-surface-container-lowest rounded-full flex items-center justify-center text-rose-500 hover:scale-110 transition-transform shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Show dietary tags */}
                {item.allergens && item.allergens.length > 0 && (
                  <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap">
                    {item.allergens.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold rounded-full uppercase tracking-widest">
                        {tag}
                      </span>
                    ))}
                    {item.allergens.length > 3 && (
                      <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold rounded-full">+{item.allergens.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold font-headline leading-tight">{item.name}</h3>
                    <span className="text-lg font-bold text-primary">${item.price.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant line-clamp-2">{item.description}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-semibold text-on-surface-variant">Available</span>
                  {item.featured && <span className="ml-auto px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-widest">Featured</span>}
                </div>
              </div>
            </motion.div>
          ))
        }

        <div
          onClick={() => setView('add')}
          className="group border-2 border-dashed border-outline-variant/50 rounded-3xl flex flex-col items-center justify-center p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-surface-container-low/50 transition-all"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold font-headline">Expand the Menu</h3>
          <p className="text-sm text-on-surface-variant mt-2">Add a new dish to your collection.</p>
        </div>
      </div>

      {/* Summary row */}
      <div className="bg-surface-container-high rounded-4xl p-8 flex items-center justify-between">
        <div>
          <h4 className="text-4xl font-extrabold text-primary font-headline">{items.length}</h4>
          <p className="text-sm font-bold">Total Menu Items</p>
        </div>
        <div>
          <h4 className="text-4xl font-extrabold text-primary font-headline">{categories.length}</h4>
          <p className="text-sm font-bold">Categories</p>
        </div>
        <div>
          <h4 className="text-4xl font-extrabold text-primary font-headline">{items.filter(i => i.featured).length}</h4>
          <p className="text-sm font-bold">Featured Dishes</p>
        </div>
      </div>
    </div>
  );
};
