import React, { useState } from 'react';
import { SystemCategory, CategoryNode } from '@/types/schema';
import { createSystemCategory, updateSystemCategory, deleteSystemCategory, seedCategories } from '@/lib/api/categories';
import Icon from '@/components/Icon';

interface Props {
  categories: SystemCategory[];
  loading: boolean;
  onRefresh: () => void;
}

export default function CategoryManager({ categories, loading, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SystemCategory>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeType, setActiveType] = useState<'goods' | 'services'>('goods');

  const handleEdit = (cat: SystemCategory) => {
    setEditingId(cat.id!);
    setEditData(cat);
  };

  const handleAddNew = () => {
    setEditingId('new');
    setEditData({ type: activeType, name: '', categories: [] });
  };

  const handleSave = async () => {
    if (!editData.name) return;
    setIsSaving(true);
    try {
      if (editingId === 'new') {
        await createSystemCategory(editData as Omit<SystemCategory, 'id'>);
      } else {
        await updateSystemCategory(editingId!, editData);
      }
      setEditingId(null);
      setEditData({});
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category group?')) return;
    try {
      await deleteSystemCategory(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeed = async () => {
    await seedCategories();
    onRefresh();
  };

  const addSubcategory = () => {
    setEditData(prev => ({
      ...prev,
      categories: [...(prev.categories || []), { name: '', subcategories: [] }]
    }));
  };

  const updateSubcategoryName = (index: number, name: string) => {
    const updated = [...(editData.categories || [])];
    updated[index].name = name;
    setEditData(prev => ({ ...prev, categories: updated }));
  };

  const removeSubcategory = (index: number) => {
    const updated = [...(editData.categories || [])];
    updated.splice(index, 1);
    setEditData(prev => ({ ...prev, categories: updated }));
  };

  const addNestedSubcategory = (index: number) => {
    const updated = [...(editData.categories || [])];
    updated[index].subcategories = [...(updated[index].subcategories || []), ''];
    setEditData(prev => ({ ...prev, categories: updated }));
  };

  const updateNestedSubcategory = (catIndex: number, subIndex: number, val: string) => {
    const updated = [...(editData.categories || [])];
    const subs = [...(updated[catIndex].subcategories || [])];
    subs[subIndex] = val;
    updated[catIndex].subcategories = subs;
    setEditData(prev => ({ ...prev, categories: updated }));
  };

  const removeNestedSubcategory = (catIndex: number, subIndex: number) => {
    const updated = [...(editData.categories || [])];
    const subs = [...(updated[catIndex].subcategories || [])];
    subs.splice(subIndex, 1);
    updated[catIndex].subcategories = subs;
    setEditData(prev => ({ ...prev, categories: updated }));
  };

  if (loading) {
    return (
      <div className="bg-surface border-2 border-on-surface p-10 text-center shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        <Icon name="sync" className="text-4xl animate-spin text-primary-container mx-auto" />
      </div>
    );
  }

  const filteredCategories = categories.filter(c => c.type === activeType);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end mb-4">
        <div>
          <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">Taxonomy</p>
          <h2 className="font-headline-md text-3xl font-black text-on-surface uppercase tracking-tight">Category Management</h2>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <button onClick={handleSeed} className="bg-surface-container text-on-surface border-2 border-on-surface px-4 py-2 font-bold text-xs uppercase hover:bg-surface-dim">
              Seed Defaults
            </button>
          )}
          <button onClick={handleAddNew} className="bg-primary-container text-on-primary-container border-2 border-on-surface px-4 py-2 font-bold text-xs uppercase hover:brightness-110 shadow-[2px_2px_0px_0px_var(--color-on-surface)]">
            + New Category Group
          </button>
        </div>
      </header>

      {/* Tabs for Goods / Services */}
      <div className="flex gap-4 border-b-2 border-on-surface mb-6">
        <button 
          onClick={() => setActiveType('goods')}
          className={`px-4 py-2 font-black uppercase text-sm ${activeType === 'goods' ? 'bg-on-surface text-surface' : 'hover:bg-surface-container'}`}
        >
          Goods
        </button>
        <button 
          onClick={() => setActiveType('services')}
          className={`px-4 py-2 font-black uppercase text-sm ${activeType === 'services' ? 'bg-on-surface text-surface' : 'hover:bg-surface-container'}`}
        >
          Services
        </button>
      </div>

      {editingId ? (
        <div className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] p-6">
          <h3 className="font-black text-xl mb-6 uppercase border-b-2 border-on-surface pb-2">
            {editingId === 'new' ? 'Add New Category Group' : 'Edit Category Group'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">Group Name</label>
              <input 
                type="text" 
                value={editData.name || ''} 
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full bg-surface-container border-2 border-on-surface p-2 font-medium focus:outline-none focus:border-primary-container"
                placeholder="e.g. Electronics"
              />
            </div>
            
            <div className="pt-4">
              <label className="block text-xs font-bold uppercase tracking-wider mb-4 border-b border-surface-container pb-2">Top-Level Categories</label>
              {(editData.categories || []).map((cat, i) => (
                <div key={i} className="mb-6 p-4 border-2 border-surface-container-highest bg-surface-container-lowest relative">
                  <button onClick={() => removeSubcategory(i)} className="absolute top-2 right-2 text-error hover:text-red-700">
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                  <div className="mb-3 pr-8">
                     <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Category Name</label>
                     <input 
                       type="text" 
                       value={cat.name} 
                       onChange={(e) => updateSubcategoryName(i, e.target.value)}
                       className="w-full bg-surface border border-on-surface p-1.5 text-sm"
                     />
                  </div>
                  <div className="pl-4 border-l-2 border-secondary-container">
                     <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-secondary">Nested Subcategories</label>
                     <div className="space-y-2 mb-2">
                       {(cat.subcategories || []).map((sub, j) => (
                         <div key={j} className="flex gap-2">
                           <input 
                             type="text" 
                             value={sub} 
                             onChange={(e) => updateNestedSubcategory(i, j, e.target.value)}
                             className="flex-1 bg-surface border border-surface-container-highest p-1 text-xs"
                             placeholder="Subcategory name"
                           />
                           <button onClick={() => removeNestedSubcategory(i, j)} className="text-secondary hover:text-error">
                             <Icon name="close" className="text-[16px]" />
                           </button>
                         </div>
                       ))}
                     </div>
                     <button onClick={() => addNestedSubcategory(i)} className="text-[10px] font-bold uppercase text-primary-container hover:underline flex items-center gap-1">
                       <Icon name="add" className="text-[14px]" /> Add Subcategory
                     </button>
                  </div>
                </div>
              ))}
              <button onClick={addSubcategory} className="mt-2 text-xs font-bold uppercase border-2 border-secondary text-secondary px-3 py-1.5 hover:bg-secondary hover:text-white transition-colors">
                + Add Top-Level Category
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t-2 border-on-surface">
              <button onClick={() => setEditingId(null)} className="px-6 py-2 border-2 border-on-surface font-bold text-xs uppercase hover:bg-surface-container">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-on-surface text-surface border-2 border-on-surface font-bold text-xs uppercase hover:bg-surface-dim flex items-center gap-2">
                {isSaving ? <Icon name="sync" className="animate-spin text-[14px]" /> : <Icon name="save" className="text-[14px]" />} Save Group
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col relative group">
              <div className="p-4 border-b-2 border-surface-container flex justify-between items-center bg-surface-container-low">
                <h4 className="font-black text-lg uppercase tracking-tight truncate pr-4">{cat.name}</h4>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(cat)} className="text-secondary hover:text-primary-container">
                    <Icon name="edit" className="text-[18px]" />
                  </button>
                  <button onClick={() => handleDelete(cat.id!)} className="text-secondary hover:text-error">
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1">
                <div className="flex flex-wrap gap-2">
                  {cat.categories.slice(0, 8).map((sub, i) => (
                    <span key={i} className="text-[10px] font-bold bg-surface-container px-2 py-1 uppercase border border-surface-container-highest">
                      {sub.name}
                    </span>
                  ))}
                  {cat.categories.length > 8 && (
                    <span className="text-[10px] font-bold text-secondary px-2 py-1 uppercase">
                      +{cat.categories.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
             <div className="col-span-full text-center py-12 text-secondary">
               <Icon name="category" className="text-4xl mb-2 opacity-50" />
               <p className="text-sm font-bold uppercase tracking-wider">No {activeType} categories found.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
