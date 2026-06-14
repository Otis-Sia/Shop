"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, Timestamp, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Product } from "@/types/schema";
import { useCategories } from '@/hooks/useCategories';

export default function MerchantProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [offeringType, setOfferingType] = useState<'goods' | 'services' | 'both'>('goods');
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');

  const [isAdding, setIsAdding] = useState(false);
  const { categories } = useCategories();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const fetchProducts = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userOffering = userDoc.data().offeringType || 'goods';
          setOfferingType(userOffering);
          if (userOffering === 'services') setActiveTab('services');
        }

        const productsQuery = query(collection(db, "products"), where("merchantId", "==", user.uid));
        const snapshot = await getDocs(productsQuery);
        const productsList = snapshot.docs.map(docSnap => ({ id: Number(docSnap.id), ...docSnap.data() } as unknown as Product));
        productsList.sort((a, b) => Number(b.id) - Number(a.id));
        setProducts(productsList);
      } catch (error) {
        console.error("Error fetching merchant products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchProducts();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchProducts();
      });
      return () => unsubscribe();
    }
  }, []);

  const handleAddNew = () => {
    setEditingId(null);
    setIsAdding(true);
    setCurrentStep(1);
    setEditForm({
      name: '',
      shortDescription: '',
      description: '',
      brand: '',
      sku: '',
      
      itemType: activeTab === 'services' ? 'service' : 'goods',
      groupCategory: '',
      category: activeTab === 'services' ? 'Other' : 'Apparel',
      subcategories: '',
      tags: '',
      labels: '',
      
      imageUrls: [''],
      imageAltTexts: {},
      videoUrl: '',
      
      price: 0,
      salePrice: 0,
      saleStartDate: '',
      saleEndDate: '',
      
      trackInventory: true,
      stock: activeTab === 'services' ? 0 : 10,
      lowStockAlert: false,
      allowBackorders: false,
      duration: activeTab === 'services' ? 60 : undefined,
    });
  };

  const handleEdit = (product: Product) => {
    setIsAdding(false);
    setEditingId(Number(product.id));
    setCurrentStep(1);
    
    // Format dates for inputs if they exist
    let formattedStartDate = '';
    let formattedEndDate = '';
    
    if (product.saleStartDate) {
      const d = (product.saleStartDate as any).toDate ? (product.saleStartDate as any).toDate() : new Date(product.saleStartDate as any);
      formattedStartDate = d.toISOString().split('T')[0];
    }
    if (product.saleEndDate) {
      const d = (product.saleEndDate as any).toDate ? (product.saleEndDate as any).toDate() : new Date(product.saleEndDate as any);
      formattedEndDate = d.toISOString().split('T')[0];
    }

    setEditForm({ 
      ...product, 
      groupCategory: product.groupCategory || '',
      imageUrls: product.imageUrls || [''],
      tags: product.tags?.join(', ') || '',
      labels: product.labels?.join(', ') || '',
      subcategories: product.subcategories?.join(', ') || '',
      saleStartDate: formattedStartDate,
      saleEndDate: formattedEndDate,
    });
  };

  const handleDelete = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId.toString()));
      setProducts(products.filter(p => Number(p.id) !== productId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete product.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditForm((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setEditForm((prev: any) => ({
        ...prev,
        [name]: (name === 'price' || name === 'stock' || name === 'discount' || name === 'duration' || name === 'salePrice') ? Number(value) : value,
      }));
    }
  };

  const handleImageUrlChange = (index: number, value: string) => {
    setEditForm((prev: any) => {
      const updated = [...(prev.imageUrls || [])];
      updated[index] = value;
      return { ...prev, imageUrls: updated };
    });
  };

  const handleImageAltChange = (url: string, text: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      imageAltTexts: {
        ...(prev.imageAltTexts || {}),
        [url]: text
      }
    }));
  };

  const handleAddImageUrl = () => {
    setEditForm((prev: any) => ({
      ...prev,
      imageUrls: [...(prev.imageUrls || []), '']
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!response.ok) throw new Error('Failed to get upload URL');

      const { signedUrl, fileUrl } = await response.json();

      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload file to S3');
      
      setEditForm((prev: any) => {
        const currentUrls = [...(prev.imageUrls || [])];
        if (typeof index === 'number') {
          currentUrls[index] = fileUrl;
        } else {
          if (currentUrls.length > 0 && currentUrls[currentUrls.length - 1] === '') {
            currentUrls[currentUrls.length - 1] = fileUrl;
          } else {
            currentUrls.push(fileUrl);
          }
        }
        return { ...prev, imageUrls: currentUrls };
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 4) setCurrentStep(s => s + 1);
  };

  const availableGroups = categories.map(g => g.name);
  
  const selectedGroupNode = useMemo(() => {
    if (editForm.groupCategory) {
      return categories.find(g => g.name === editForm.groupCategory) || null;
    }
    if (editForm.category) {
      return categories.find(g => g.categories.some(c => c.name === editForm.category)) || null;
    }
    return null;
  }, [categories, editForm.groupCategory, editForm.category]);

  const availableTopLevelCategories = selectedGroupNode?.categories || [];

  const selectedCatNode = useMemo(() => {
    if (selectedGroupNode) {
      const found = selectedGroupNode.categories.find(c => c.name === editForm.category);
      if (found) return found;
    }
    for (const group of categories) {
      const found = group.categories.find(c => c.name === editForm.category);
      if (found) return found;
    }
    return null;
  }, [categories, selectedGroupNode, editForm.category]);

  const availableSubcategories = selectedCatNode?.subcategories || [];

  const allSubcategoriesMap = useMemo(() => {
    const map = new Map<string, { group: string, topLevel: string }>();
    categories.forEach(g => {
      g.categories.forEach(c => {
        (c.subcategories || []).forEach(sub => {
          if (!map.has(sub)) {
            map.set(sub, { group: g.name, topLevel: c.name });
          }
        });
      });
    });
    return map;
  }, [categories]);

  const handleQuickSubcategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const found = allSubcategoriesMap.get(val);
    if (found) {
      setEditForm((prev: any) => {
        const currentSubs = Array.isArray(prev.subcategories) 
          ? prev.subcategories 
          : typeof prev.subcategories === 'string' 
            ? prev.subcategories.split(',').map((s: string) => s.trim()).filter(Boolean) 
            : [];
        if (!currentSubs.includes(val)) {
            currentSubs.push(val);
        }
        return {
          ...prev,
          groupCategory: found.group,
          category: found.topLevel,
          subcategories: currentSubs
        };
      });
      e.target.value = '';
    }
  };

  const handleSubcategoryChange = (sub: string, checked: boolean) => {
    const currentSubs = Array.isArray(editForm.subcategories) 
      ? editForm.subcategories 
      : typeof editForm.subcategories === 'string' 
        ? editForm.subcategories.split(',').map((s: string) => s.trim()).filter(Boolean) 
        : [];
        
    let newSubs;
    if (checked) {
      newSubs = [...currentSubs, sub];
    } else {
      newSubs = currentSubs.filter((s: string) => s !== sub);
    }
    setEditForm((prev: any) => ({ ...prev, subcategories: newSubs }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 4) {
      handleNextStep(e);
      return;
    }

    setIsSaving(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      const cleanedImages = (editForm.imageUrls || []).filter((url: string) => url.trim() !== '');
      
      let startTimestamp = null;
      let endTimestamp = null;
      if (editForm.saleStartDate) startTimestamp = Timestamp.fromDate(new Date(editForm.saleStartDate));
      if (editForm.saleEndDate) endTimestamp = Timestamp.fromDate(new Date(editForm.saleEndDate));
      
      const productData: Record<string, unknown> = {
        name: editForm.name || '',
        shortDescription: editForm.shortDescription || '',
        description: editForm.description || '',
        sku: editForm.sku || '',
        brand: editForm.brand || '',
        
        groupCategory: editForm.groupCategory || selectedGroupNode?.name || '',
        category: editForm.category || '',
        subcategories: Array.isArray(editForm.subcategories) ? editForm.subcategories : (typeof editForm.subcategories === 'string' ? editForm.subcategories.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
        tags: typeof editForm.tags === 'string' ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.tags || []),
        labels: typeof editForm.labels === 'string' ? editForm.labels.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.labels || []),
        
        itemType: editForm.itemType || 'goods',
        imageUrls: cleanedImages,
        imageAltTexts: editForm.imageAltTexts || {},
        videoUrl: editForm.videoUrl || '',
        
        price: editForm.price || 0,
        salePrice: editForm.salePrice || 0,
        saleStartDate: startTimestamp,
        saleEndDate: endTimestamp,
        
        trackInventory: editForm.trackInventory ?? true,
        stock: editForm.stock || 0,
        lowStockAlert: editForm.lowStockAlert ?? false,
        allowBackorders: editForm.allowBackorders ?? false,
        duration: editForm.duration || 0,
        
        updatedAt: Timestamp.now(),
        merchantId: user.uid
      };

      let saveId = editingId;
      if (isAdding) {
        saveId = Date.now();
        productData.createdAt = Timestamp.now();
      }

      await setDoc(doc(db, 'products', saveId!.toString()), productData, { merge: true });

      const newProduct = { ...productData, id: saveId } as unknown as Product;
      
      if (isAdding) {
        setProducts([newProduct, ...products]);
      } else {
        setProducts(products.map(p => Number(p.id) === saveId ? newProduct : p));
      }

      setEditingId(null);
      setIsAdding(false);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error saving product:", error);
      alert('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const allSystemCategories = useMemo(() => {
    const list: string[] = [];
    categories.forEach(group => {
      group.categories.forEach(cat => {
        list.push(cat.name);
        if (cat.subcategories) list.push(...cat.subcategories);
      });
    });
    return Array.from(new Set(list)).sort();
  }, [categories]);

  if (loading) {
    return <div className="p-8 font-bold animate-pulse">Loading items...</div>;
  }

  const displayedItems = products.filter(p => {
    if (activeTab === 'services') return p.itemType === 'service';
    return p.itemType !== 'service'; // default to goods
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-headline-lg font-black text-4xl uppercase border-b-4 border-on-surface inline-block pb-2">
          {activeTab === 'services' ? 'My Services' : 'My Products'}
        </h1>
        {(!isAdding && editingId === null) && (
          <button 
            onClick={handleAddNew}
            className="bg-primary-container text-on-surface border-4 border-on-surface px-6 py-2 font-bold uppercase shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all"
          >
            Add {activeTab === 'services' ? 'Service' : 'Product'}
          </button>
        )}
      </div>

      {(!isAdding && editingId === null && offeringType === 'both') && (
        <div className="flex border-b-4 border-on-surface mb-8">
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-8 py-3 font-black uppercase tracking-wider transition-all ${activeTab === 'products' ? 'bg-on-surface text-surface' : 'bg-surface text-on-surface hover:bg-surface-dim'}`}
          >
            Physical Products
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`px-8 py-3 font-black uppercase tracking-wider transition-all border-l-4 border-on-surface ${activeTab === 'services' ? 'bg-on-surface text-surface' : 'bg-surface text-on-surface hover:bg-surface-dim'}`}
          >
            Services
          </button>
        </div>
      )}

      {(isAdding || editingId !== null) ? (
        <form onSubmit={handleSave} className="bg-surface border-4 border-on-surface p-8 mb-8 space-y-6">
          <div className="flex items-center justify-between mb-8 border-b-2 border-on-surface pb-4">
            <h2 className="font-bold text-2xl uppercase">{isAdding ? `Add New ${editForm.itemType === 'service' ? 'Service' : 'Product'}` : `Edit ${editForm.itemType === 'service' ? 'Service' : 'Product'}`}</h2>
            <div className="text-sm font-bold bg-primary-container text-on-surface px-4 py-1 border-2 border-on-surface">
              Step {currentStep} of 4
            </div>
          </div>
          
          {/* STEP 1: Core Information */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2 md:col-span-2">
                <h3 className="font-black text-xl uppercase border-b-2 border-on-surface/20 pb-2 mb-4">Core Information</h3>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase">{editForm.itemType === 'service' ? 'Service Name' : 'Product Name'} *</label>
                <input required name="name" value={editForm.name || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase">Short Description</label>
                <textarea name="shortDescription" value={editForm.shortDescription || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 h-16 focus:ring-0 outline-none" placeholder="A brief summary for previews..."></textarea>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase">Full Description *</label>
                <textarea required name="description" value={editForm.description || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 h-32 focus:ring-0 outline-none"></textarea>
              </div>
              {editForm.itemType !== 'service' && (
                <div className="space-y-2">
                  <label className="font-bold text-sm uppercase">Brand / Manufacturer</label>
                  <input name="brand" value={editForm.brand || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
                </div>
              )}
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase">SKU</label>
                <input name="sku" value={editForm.sku || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
              </div>
            </div>
          )}

          {/* STEP 2: Categories & Organization */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2 md:col-span-2">
                <h3 className="font-black text-xl uppercase border-b-2 border-on-surface/20 pb-2 mb-4">Categories & Organization</h3>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase">Group Category *</label>
                <input 
                  required
                  type="text"
                  list="product-group-categories"
                  name="groupCategory"
                  value={editForm.groupCategory || (editForm.category ? selectedGroupNode?.name || '' : '')}
                  onChange={(e) => {
                    handleChange(e);
                    setEditForm((prev: any) => ({ ...prev, category: '', subcategories: [] }));
                  }}
                  placeholder="Select or type a group category..."
                  className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none bg-surface"
                />
                <datalist id="product-group-categories">
                  {availableGroups.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </datalist>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase">Top Level Category *</label>
                <input 
                  required
                  type="text"
                  list="product-main-categories"
                  name="category"
                  value={editForm.category || ''}
                  onChange={(e) => {
                    handleChange(e);
                    setEditForm((prev: any) => ({ ...prev, subcategories: [] }));
                  }}
                  disabled={!editForm.groupCategory}
                  placeholder={editForm.groupCategory ? "Select or type a top level category..." : "Select a group category first"}
                  className={`w-full border-2 border-on-surface p-2 focus:ring-0 outline-none bg-surface ${!editForm.groupCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <datalist id="product-main-categories">
                  {availableTopLevelCategories.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </datalist>
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2 mb-2">
                  <label className="font-bold text-sm uppercase">Nested Subcategories</label>
                  {!editForm.groupCategory && (
                    <div className="relative w-full md:max-w-xs">
                      <input 
                        type="text"
                        list="all-subcategories"
                        placeholder="Search any subcategory to auto-fill..."
                        onChange={handleQuickSubcategoryChange}
                        className="w-full border-2 border-primary-container p-1 text-xs focus:ring-0 outline-none bg-surface"
                      />
                      <datalist id="all-subcategories">
                        {Array.from(allSubcategoriesMap.keys()).map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </datalist>
                    </div>
                  )}
                </div>
                {availableSubcategories.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {availableSubcategories.map(sub => {
                      const currentSubs = Array.isArray(editForm.subcategories) 
                        ? editForm.subcategories 
                        : typeof editForm.subcategories === 'string' 
                          ? editForm.subcategories.split(',').map((s: string) => s.trim()).filter(Boolean) 
                          : [];
                      const isChecked = currentSubs.includes(sub);
                      return (
                        <label key={sub} className="flex items-center gap-2 cursor-pointer border-2 border-on-surface/20 p-2 hover:bg-surface-dim transition-colors">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => handleSubcategoryChange(sub, e.target.checked)}
                            className="accent-primary-container w-4 h-4"
                          />
                          <span className="text-sm font-bold">{sub}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-secondary italic border-2 border-on-surface/20 p-3 bg-surface-dim">
                    {editForm.category ? "No nested subcategories available for this category." : "Select a top level category first to see subcategories."}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase">Tags (comma separated)</label>
                <input name="tags" value={editForm.tags || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" placeholder="e.g. vintage, sale" />
              </div>
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase">Labels (comma separated)</label>
                <input name="labels" value={editForm.labels || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" placeholder="e.g. New Arrival, Bestseller" />
              </div>
            </div>
          )}

          {/* STEP 3: Media */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2 md:col-span-2">
                <h3 className="font-black text-xl uppercase border-b-2 border-on-surface/20 pb-2 mb-4">Media</h3>
              </div>
              <div className="space-y-4 md:col-span-2">
                <label className="font-bold text-sm uppercase block">Main & Gallery Images *</label>
                {(editForm.imageUrls || ['']).map((url: string, index: number) => (
                  <div key={index} className="flex flex-col md:flex-row gap-2 mb-4 p-4 border-2 border-on-surface bg-surface relative">
                    {index === 0 && <span className="absolute -top-3 -left-2 bg-primary-container text-on-surface text-[10px] font-black px-2 py-1 uppercase border-2 border-on-surface">Main Image</span>}
                    <div className="flex-1 space-y-2">
                      <div className="flex w-full gap-2 items-center">
                        <input 
                          required={index === 0}
                          value={url} 
                          onChange={(e) => handleImageUrlChange(index, e.target.value)} 
                          placeholder="Image URL (https://...)"
                          className="flex-1 border-2 border-on-surface p-2 focus:ring-0 outline-none" 
                        />
                        <label className="bg-primary-container text-on-primary-container border-2 border-on-surface px-4 py-2 font-bold cursor-pointer hover:bg-surface-container hover:text-on-surface transition-colors flex items-center justify-center min-w-[100px]">
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => handleFileUpload(e, index)}
                          />
                          <span className="text-xs uppercase tracking-wider">Upload File</span>
                        </label>
                      </div>
                      <input 
                        required={!!url}
                        value={(editForm.imageAltTexts && editForm.imageAltTexts[url]) || ''} 
                        onChange={(e) => handleImageAltChange(url, e.target.value)} 
                        placeholder="Alternative text (required for accessibility)"
                        className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none bg-surface" 
                      />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={handleAddImageUrl} className="text-sm font-bold underline hover:text-primary-container">
                  + Add another gallery image
                </button>
              </div>

              <div className="mt-4 p-4 border-2 border-dashed border-on-surface bg-surface md:col-span-2">
                <p className="text-sm font-bold uppercase mb-2">Upload Image</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileUpload(e)} 
                  disabled={isUploading}
                  className="text-sm w-full"
                />
                {isUploading && <p className="text-sm font-bold mt-2 animate-pulse text-primary-container">Uploading image...</p>}
              </div>

              <div className="space-y-2 md:col-span-2 mt-4">
                <label className="font-bold text-sm uppercase">Video URL</label>
                <input type="url" name="videoUrl" value={editForm.videoUrl || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" placeholder="YouTube or Vimeo link..." />
              </div>
            </div>
          )}

          {/* STEP 4: Pricing & Inventory */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2 md:col-span-2">
                <h3 className="font-black text-xl uppercase border-b-2 border-on-surface/20 pb-2 mb-4">Pricing & Inventory</h3>
              </div>
              
              {/* PRICING */}
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase">Regular Price (Ksh) *</label>
                <input required type="number" min="0" step="0.01" name="price" value={editForm.price || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase">Sale Price (Ksh)</label>
                <input type="number" min="0" step="0.01" name="salePrice" value={editForm.salePrice || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase">Sale Start Date</label>
                <input type="date" name="saleStartDate" value={editForm.saleStartDate || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none bg-surface" />
              </div>
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase">Sale End Date</label>
                <input type="date" name="saleEndDate" value={editForm.saleEndDate || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none bg-surface" />
              </div>

              {/* INVENTORY (Goods Only) */}
              {editForm.itemType !== 'service' && (
                <>
                  <div className="space-y-4 md:col-span-2 mt-6 p-6 border-2 border-on-surface bg-surface">
                    <h4 className="font-bold text-lg uppercase mb-2">Inventory Management</h4>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="trackInventory" checked={editForm.trackInventory ?? true} onChange={handleChange} className="w-5 h-5 accent-primary-container" />
                      <span className="font-bold text-sm uppercase">Track Inventory</span>
                    </label>

                    {(editForm.trackInventory ?? true) && (
                      <div className="space-y-2 pl-8 border-l-2 border-on-surface/20 ml-2">
                        <label className="font-bold text-sm uppercase">Quantity in Stock *</label>
                        <input required type="number" min="0" name="stock" value={editForm.stock || ''} onChange={handleChange} className="w-full max-w-[200px] border-2 border-on-surface p-2 focus:ring-0 outline-none" />
                      </div>
                    )}

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="lowStockAlert" checked={editForm.lowStockAlert ?? false} onChange={handleChange} className="w-5 h-5 accent-primary-container" />
                      <span className="font-bold text-sm uppercase">Enable Low Stock Alert</span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="allowBackorders" checked={editForm.allowBackorders ?? false} onChange={handleChange} className="w-5 h-5 accent-primary-container" />
                      <span className="font-bold text-sm uppercase">Allow Backorders</span>
                    </label>
                  </div>
                </>
              )}

              {editForm.itemType === 'service' && (
                <div className="space-y-2 mt-6">
                  <label className="font-bold text-sm uppercase">Duration (mins) *</label>
                  <input required type="number" min="1" name="duration" value={editForm.duration || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-8 mt-8 border-t-2 border-on-surface/20">
            <button 
              type="button" 
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep(s => s - 1);
                } else {
                  setIsAdding(false); 
                  setEditingId(null);
                }
              }}
              className="bg-surface text-on-surface border-4 border-on-surface px-6 py-2 font-bold uppercase hover:bg-surface-dim transition-colors"
            >
              {currentStep > 1 ? 'Back' : 'Cancel'}
            </button>
            
            <button 
              type="submit" 
              disabled={isSaving || isUploading}
              className="bg-primary-container text-on-surface border-4 border-on-surface px-8 py-2 font-bold uppercase shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : currentStep < 4 ? 'Next Step' : 'Save Product'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-surface border-4 border-on-surface overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-on-surface text-surface uppercase font-bold text-sm">
                <th className="p-4 border-b-4 border-on-surface">Image</th>
                <th className="p-4 border-b-4 border-on-surface">Name</th>
                <th className="p-4 border-b-4 border-on-surface">Price</th>
                {activeTab !== 'services' && <th className="p-4 border-b-4 border-on-surface">Stock</th>}
                <th className="p-4 border-b-4 border-on-surface text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'services' ? 4 : 5} className="p-8 text-center font-bold">No {activeTab === 'services' ? 'services' : 'products'} found. Add one to get started!</td>
                </tr>
              ) : (
                displayedItems.map((product) => (
                  <tr key={product.id} className="border-b border-on-surface hover:bg-surface-dim transition-colors">
                    <td className="p-4">
                      {product.imageUrls?.[0] ? (
                        <img src={product.imageUrls[0]} alt={product.name} className="w-16 h-16 object-cover border-2 border-on-surface" />
                      ) : (
                        <div className="w-16 h-16 bg-surface-dim border-2 border-on-surface flex items-center justify-center text-xs font-bold">No Img</div>
                      )}
                    </td>
                    <td className="p-4 font-bold max-w-[200px] truncate">{product.name}</td>
                    <td className="p-4">Ksh {product.price.toFixed(2)}</td>
                    {activeTab !== 'services' && <td className="p-4">{product.stock}</td>}
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="text-sm border-2 border-on-surface px-3 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors mr-2"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(Number(product.id))}
                        className="text-sm border-2 border-error text-error px-3 py-1 font-bold hover:bg-error hover:text-white transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
