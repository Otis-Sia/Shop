"use client";
import { useToast } from '@/components/providers/ToastProvider';
import { useSearchParams } from "next/navigation";

import React, { useEffect, useState, useMemo } from "react";
import { auth } from "@/lib/firebase";
import { getProducts, Product } from "@/lib/api/products";
import { getUserProfile } from "@/lib/api/auth";
import { useCategories } from '@/hooks/useCategories';
import Icon from '@/components/Icon';
import { CURRENCY_CONFIG } from '@/lib/utils/currency';
import SendToWhatsAppModal from '@/components/admin/SendToWhatsAppModal';
import { ProductEditor } from "./components/ProductEditor";

export default function MerchantProducts() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingQuick, setIsDraggingQuick] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);
  const [newImageUrlInput, setNewImageUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<(string | number)[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const { categories } = useCategories();
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const searchParams = useSearchParams();
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState(searchParams?.get("supplier") || "");

  useEffect(() => {
    const supplierParam = searchParams?.get("supplier");
    if (supplierParam !== null && supplierParam !== undefined) {
      setSelectedSupplierFilter(supplierParam);
    }
  }, [searchParams]);

  const [selectedStockFilter, setSelectedStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // WhatsApp & Single Item Sync State
  const [whatsAppModalProduct, setWhatsAppModalProduct] = useState<{ id: string; name: string } | null>(null);
  const [userAuthToken, setUserAuthToken] = useState<string>("");
  const [singleSyncingId, setSingleSyncingId] = useState<string | number | null>(null);

  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [draftToResume, setDraftToResume] = useState<any>(null);
  const [draftSaveStatus, setDraftSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingFromDetails, setIsGeneratingFromDetails] = useState(false);

  const handleAIAnalyze = async () => {
    if (!editForm.name) {
      showToast("Please enter a product name first.", "warning");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/admin/products/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          images: editForm.imageUrls || []
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze product');
      
      setEditForm((prev: any) => {
        const altTextsObj = { ...(prev.imageAltTexts || {}) };
        if (Array.isArray(data.imageAltTexts) && prev.imageUrls) {
          prev.imageUrls.forEach((url: string, idx: number) => {
            if (data.imageAltTexts[idx]) {
              altTextsObj[url] = data.imageAltTexts[idx];
            }
          });
        }
        
        return {
          ...prev,
          shortDescription: data.shortDescription || prev.shortDescription,
          description: data.description || prev.description,
          groupCategory: data.groupCategory || prev.groupCategory,
          category: data.category || prev.category,
          brand: data.brand || prev.brand,
          countryOfOrigin: data.countryOfOrigin || prev.countryOfOrigin,
          subcategories: Array.isArray(data.subcategories) && data.subcategories.length > 0 
            ? data.subcategories.join(', ') : prev.subcategories,
          tags: Array.isArray(data.tags) && data.tags.length > 0 
            ? data.tags.join(', ') : prev.tags,
          labels: Array.isArray(data.labels) && data.labels.length > 0 
            ? data.labels.join(', ') : prev.labels,
          imageAltTexts: Object.keys(altTextsObj).length > 0 ? altTextsObj : prev.imageAltTexts,
        };
      });
      showToast("AI Analysis complete!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to analyze product", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate fields from free‑form details using AI
  const saveAIAutoFill = async (rawDetails: string, generatedJson: any) => {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      await fetch('/api/ai-fills/auto-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rawDetails,
          generatedJson,
          productId: editingId !== null ? products.find((p: any) => p.internalId === editingId || p.id === editingId)?.id : null
        })
      });
    } catch (err) {
      console.error('Failed to save AI auto-fill data', err);
    }
  };

  const handleAIFromDetails = async () => {
    if ((!editForm.rawDetails || !editForm.rawDetails.trim()) && (!editForm.imageUrls || editForm.imageUrls.length === 0)) {
      showToast('Please enter free‑form product details or upload an image first.', 'warning');
      return;
    }
    setIsGeneratingFromDetails(true);
    try {
      const res = await fetch('/api/admin/products/ai-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rawDetails: editForm.rawDetails,
          images: editForm.imageUrls || [],
          currentName: editForm.name || ''
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI details parsing failed');
      
      setEditForm((prev: any) => {
        const altTextsObj = { ...(prev.imageAltTexts || {}) };
        if (Array.isArray(data.imageAltTexts) && prev.imageUrls) {
          prev.imageUrls.forEach((url: string, idx: number) => {
            if (data.imageAltTexts[idx]) {
              altTextsObj[url] = data.imageAltTexts[idx];
            }
          });
        }
        const finalName = data.name || prev.name;
        const finalSupplier = data.supplierName || prev.supplierName;
        const finalSku = (!isSkuManuallyEdited && (data.name || data.supplierName)) 
          ? generateSku(finalSupplier, finalName) 
          : (data.sku || prev.sku);

        return {
          ...prev,
          name: finalName,
          shortDescription: data.shortDescription || prev.shortDescription,
          description: data.description || prev.description,
          groupCategory: data.groupCategory || prev.groupCategory,
          category: data.category || prev.category,
          brand: data.brand || prev.brand,
          countryOfOrigin: data.countryOfOrigin || prev.countryOfOrigin || 'Kenya',
          currency: data.currency || prev.currency || 'KES',
          supplierName: finalSupplier,
          sku: finalSku,
          capacity: data.capacity || prev.capacity,
          power: data.power || prev.power,
          weight: data.weight !== undefined && data.weight !== null ? data.weight : (data.estimatedWeight !== undefined && data.estimatedWeight !== null ? data.estimatedWeight : prev.weight),
          weightUnit: data.weightUnit || prev.weightUnit || 'kg',
          attributes: data.attributes ? (typeof data.attributes === 'object' ? data.attributes : prev.attributes) : prev.attributes,
          price: data.price !== null && data.price !== undefined ? data.price : prev.price,
          salePrice: data.salePrice !== null && data.salePrice !== undefined ? data.salePrice : prev.salePrice,
          costPrice: data.costPrice !== null && data.costPrice !== undefined ? data.costPrice : prev.costPrice,
          stock: data.stock !== null && data.stock !== undefined ? data.stock : prev.stock,
          features: Array.isArray(data.features) && data.features.length > 0 
            ? data.features.join('\n') : (typeof data.features === 'string' ? data.features : prev.features),
          subcategories: Array.isArray(data.subcategories) && data.subcategories.length > 0 
            ? data.subcategories.join(', ') : (typeof data.subcategories === 'string' ? data.subcategories : prev.subcategories),
          tags: Array.isArray(data.tags) && data.tags.length > 0 
            ? data.tags.join(', ') : (typeof data.tags === 'string' ? data.tags : prev.tags),
          labels: Array.isArray(data.labels) && data.labels.length > 0 
            ? data.labels.join(', ') : (typeof data.labels === 'string' ? data.labels : prev.labels),
          colors: Array.isArray(data.colors) && data.colors.length > 0 
            ? data.colors.join(', ') : (typeof data.colors === 'string' ? data.colors : prev.colors),
          sizes: Array.isArray(data.sizes) && data.sizes.length > 0 
            ? data.sizes.join(', ') : (typeof data.sizes === 'string' ? data.sizes : prev.sizes),
          grades: Array.isArray(data.grades) && data.grades.length > 0 
            ? data.grades.join(', ') : (typeof data.grades === 'string' ? data.grades : prev.grades),
          hasVariants: Array.isArray(data.variants) && data.variants.length > 0 
            ? true 
            : (Array.isArray(data.colors) && data.colors.length > 1 ? true : prev.hasVariants),
          variants: (Array.isArray(data.variants) && data.variants.length > 0)
            ? data.variants.map((v: any, vIdx: number) => {
                const vColor = v.color || (Array.isArray(v.attributes) ? v.attributes.find((a: any) => a.name?.toLowerCase() === 'color')?.value : '') || '';
                const vSize = v.size || (Array.isArray(v.attributes) ? v.attributes.find((a: any) => ['size', 'capacity', 'dimension'].includes(a.name?.toLowerCase()))?.value : '') || '';
                const vName = v.name && !v.name.toLowerCase().startsWith('option ') && !v.name.toLowerCase().startsWith('variant ')
                  ? v.name 
                  : ([vColor, vSize].filter(Boolean).join(' - ') || `Variant ${vIdx + 1}`);
                return {
                  ...v,
                  id: v.id || `v_${Date.now()}_${vIdx}`,
                  name: vName,
                  color: vColor,
                  size: vSize,
                  price: v.price !== null && v.price !== undefined ? Number(v.price) : (data.price || prev.price || 0),
                  stock: v.stock !== null && v.stock !== undefined ? Number(v.stock) : (data.stock || prev.stock || 0),
                  sku: v.sku || `${finalSku || 'SKU'}-${vColor ? vColor.substring(0, 3).toUpperCase() : vIdx + 1}`
                };
              })
            : ((Array.isArray(data.colors) && data.colors.length > 1)
                ? data.colors.map((c: string, cIdx: number) => ({
                    id: `v_${Date.now()}_${cIdx}`,
                    name: c,
                    color: c,
                    size: Array.isArray(data.sizes) && data.sizes.length === 1 ? data.sizes[0] : '',
                    price: data.price || prev.price || 0,
                    stock: data.stock || prev.stock || 0,
                    sku: `${finalSku || 'SKU'}-${c.substring(0, 3).toUpperCase()}`
                  }))
                : prev.variants),
          imageAltTexts: Object.keys(altTextsObj).length > 0 ? altTextsObj : prev.imageAltTexts,
        };
      });
      showToast('Product fields populated from details!', 'success');
      
      // Save the auto-fill data to db
      await saveAIAutoFill(editForm.rawDetails, data);
      showToast('Auto-fill data saved.', 'info');
      
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Unexpected error during AI parsing.', 'error');
    } finally {
      setIsGeneratingFromDetails(false);
    }
  };

  const handleLoadPreviousAIFill = async () => {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      const res = await fetch('/api/ai-fills/latest', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load previous AI fill');
      if (json.data) {
        setEditForm((prev: any) => ({
          ...prev,
          rawDetails: json.data.raw_details,
          ...json.data.generated_json,
        }));
        showToast('Previous AI fill loaded successfully!', 'success');
      } else {
        showToast('No previous AI fill found.', 'info');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to load previous AI fill.', 'error');
    }
  };


  // Auto SKU Generation Helper
  function generateSku(supplierName: string = '', productName: string = '') {
    // Preserve original casing instead of forcing toUpperCase()
    const cleanTarget = (supplierName || '').replace(/[^a-zA-Z]/g, '');
    let uniqueSupplierLetters = 'XXXX';
    
    if (cleanTarget) {
      // Build an ordered list of all existing suppliers to ensure stable deterministic prefixes
      const allSuppliers = Array.from(new Set(products.map(p => p.supplierName).filter((s): s is string => Boolean(s))));
      const list = [...new Set(allSuppliers)].map(s => s.replace(/[^a-zA-Z]/g, '')).filter(Boolean);
      if (!list.includes(cleanTarget)) list.push(cleanTarget);

      const assignedPrefixes = new Map<string, string>();
      const usedPrefixesLower = new Set<string>();

      for (const sup of list) {
        if (assignedPrefixes.has(sup)) continue;
        
        let base = sup;
        if (base.length < 4) base = base.padEnd(4, 'x'); // using lowercase x for padding just in case
        let prefix = base.slice(0, 4);
        
        if (!usedPrefixesLower.has(prefix.toLowerCase())) {
          assignedPrefixes.set(sup, prefix);
          usedPrefixesLower.add(prefix.toLowerCase());
        } else {
          // Collision: try replacing 4th letter
          let found = false;
          for (let i = 4; i < base.length; i++) {
            let candidate = base.slice(0, 3) + base[i];
            if (!usedPrefixesLower.has(candidate.toLowerCase())) {
               prefix = candidate;
               found = true;
               break;
            }
          }
          // If still collision, append a number
          if (!found) {
             let counter = 1;
             while (true) {
                let candidate = (base.slice(0, 3) + counter.toString()).slice(0, 4);
                if (!usedPrefixesLower.has(candidate.toLowerCase())) {
                   prefix = candidate;
                   break;
                }
                counter++;
             }
          }
          assignedPrefixes.set(sup, prefix);
          usedPrefixesLower.add(prefix.toLowerCase());
        }
      }
      uniqueSupplierLetters = assignedPrefixes.get(cleanTarget) || 'XXXX';
    }

    // 2. Generate a deterministic short code from the product name
    let hash = 0;
    const nameToHash = productName || 'DEFAULT';
    for (let i = 0; i < nameToHash.length; i++) {
      hash = (hash << 5) - hash + nameToHash.charCodeAt(i);
      hash |= 0;
    }
    const productCode = Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);

    if (uniqueSupplierLetters === 'XXXX' && !productName) return '';
    return `${uniqueSupplierLetters}-${productCode}`;
  };

  const handleFullSync = async () => {
    setIsSyncingCatalog(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please log in first.");
      const token = await user.getIdToken();

      const res = await fetch("/api/meta/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}), // Empty body triggers full catalog sync
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        const msg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.error?.error?.message || "Failed to sync catalog to WhatsApp";
        throw new Error(msg);
      }

      showToast(`Successfully synced ${data.synced || products.length} products to WhatsApp Catalog!`, "success");
    } catch (err: any) {
      console.error("Full sync error:", err);
      showToast(err.message || "Failed to sync to WhatsApp Catalog", "error");
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  const handleSingleSync = async (product: Product) => {
    const prodId = String(product.id);
    setSingleSyncingId(product.id);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please log in first.");
      const token = await user.getIdToken();

      const res = await fetch("/api/meta/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: prodId }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        const msg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.error?.error?.message || "Failed to sync product to WhatsApp";
        throw new Error(msg);
      }

      showToast(`"${product.name}" synced to WhatsApp Catalog!`, "success");
    } catch (err: any) {
      console.error("Single sync error:", err);
      showToast(err.message || "Failed to sync product", "error");
    } finally {
      setSingleSyncingId(null);
    }
  };
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    core: true,
    categories: true,
    media: true,
    pricing: true
  });
  const [viewTab, setViewTab] = useState<'catalog' | 'suppliers'>('catalog');

  const [bulkSizes, setBulkSizes] = useState('');
  const [bulkColors, setBulkColors] = useState('');
  const [bulkPrice, setBulkPrice] = useState(0);
  const [bulkStock, setBulkStock] = useState(0);

  // Load products, templates, and drafts initially
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const token = await user.getIdToken();
        setUserAuthToken(token);

        // Fetch offering type
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          
        }

        // Fetch products
        const productsList = await getProducts({
          adminId: userProfile?.role === 'admin' ? undefined : user.uid,
          includeUnapproved: true,
        });
        setProducts(productsList);

        // Load Templates from Supabase API
        try {
          const tplRes = await fetch('/api/templates', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (tplRes.ok) {
            const tplData = await tplRes.json();
            setTemplates(tplData.templates || []);
          }
        } catch (tErr) {
          console.error("Error loading templates:", tErr);
        }

        // Load Draft from Supabase API
        try {
          const draftRes = await fetch('/api/drafts', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (draftRes.ok) {
            const draftData = await draftRes.json();
            if (draftData.draft && !isAdding && editingId === null) {
              const ef = draftData.draft.editForm || {};
              const hasContent = Boolean(
                ef.name?.trim() ||
                ef.description?.trim() ||
                ef.sku?.trim() ||
                (ef.pricing && (ef.pricing.price || ef.pricing.compareAtPrice)) ||
                ef.price ||
                (ef.media && ef.media.length > 0) ||
                (ef.imageUrls && Array.isArray(ef.imageUrls) && ef.imageUrls.some((u: string) => u && u.trim() !== ''))
              );
              if (hasContent) {
                setDraftToResume({
                  ...draftData.draft,
                  timestamp: draftData.draft.updatedAt ? new Date(draftData.draft.updatedAt).getTime() : Date.now()
                });
              }
            }
          }
        } catch (dErr) {
          console.error("Error loading draft:", dErr);
        }
      } catch (error) {
        console.error("Error fetching merchant products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchData();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchData();
      });
      return () => unsubscribe();
    }
  }, [isAdding, editingId]);

  // Debounced auto-save draft to Supabase
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || (!isAdding && editingId === null)) return;
    if (!editForm || Object.keys(editForm).length === 0) return;

    // Check if editForm contains meaningful data
    const hasContent = Boolean(
      editForm.name?.trim() ||
      editForm.description?.trim() ||
      editForm.sku?.trim() ||
      (editForm.pricing && (editForm.pricing.price || editForm.pricing.compareAtPrice)) ||
      editForm.price ||
      (editForm.media && editForm.media.length > 0) ||
      (editForm.imageUrls && Array.isArray(editForm.imageUrls) && editForm.imageUrls.some((u: string) => u && u.trim() !== ''))
    );
    if (!hasContent) return;

    setDraftSaveStatus('saving');
    const delayDebounceFn = setTimeout(async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/drafts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            editForm,
            isAdding,
            editingId: editingId ? String(editingId) : null,
            isQuickAdd
          })
        });
        if (res.ok) {
          setDraftSaveStatus('saved');
        } else {
          setDraftSaveStatus('error');
        }
      } catch (err) {
        console.error("Error auto-saving draft to DB:", err);
        setDraftSaveStatus('error');
      }
    }, 2000); // 2.0 seconds debounce

    return () => clearTimeout(delayDebounceFn);
  }, [editForm, isAdding, editingId, isQuickAdd]);

  const clearDraft = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        await fetch('/api/drafts', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setDraftSaveStatus('idle');
      } catch (err) {
        console.error("Error clearing draft from DB:", err);
      }
    }
  };

  const toggleSelection = (productId: string | number) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProductIds(displayedItems.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedProductIds.length} products?`)) return;
    
    setIsBulkDeleting(true);
    try {
      const urlsToDel = new Set<string>();
      
      for (const id of selectedProductIds) {
        const product = products.find(p => String(p.id) === String(id));
        if (product) {
          if ((product as any).image_url) urlsToDel.add((product as any).image_url);
          if (product.imageUrls) product.imageUrls.forEach((u: string) => urlsToDel.add(u));
          if ((product as any).additional_images) (product as any).additional_images.forEach((u: string) => urlsToDel.add(u));
          if (product.variants) {
            product.variants.forEach((v: any) => {
              if (v.imageUrl) urlsToDel.add(v.imageUrl);
            });
          }
        }
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : '';
        await fetch(`/api/products/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      setProducts(products.filter(p => !selectedProductIds.includes(p.id)));
      setSelectedProductIds([]);
      showToast(`Successfully deleted ${selectedProductIds.length} products`, 'success');

      const urlsArray = Array.from(urlsToDel).filter(u => u && u.includes('amazonaws.com'));
      if (urlsArray.length > 0) {
        fetch('/api/upload', {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.currentUser ? await auth.currentUser.getIdToken() : ''}`
            },
          body: JSON.stringify({ fileUrls: urlsArray }),
        }).catch(err => console.error('Failed to delete S3 images for bulk delete', err));
      }

      // Delete from Meta Catalog
      fetch('/api/meta/sync', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.currentUser ? await auth.currentUser.getIdToken() : ''}`
        },
        body: JSON.stringify({ productIds: selectedProductIds.map(String) }),
      }).catch(err => console.error('Failed to bulk delete from Meta Catalog', err));
    } catch (error) {
      console.error('Error during bulk delete:', error);
      showToast('Failed to delete some products.', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setIsAdding(true);
    setIsQuickAdd(false);
    setIsSkuManuallyEdited(false);
    setFormErrors({});
    setEditForm({
      name: '',
      shortDescription: '',
      description: '',
      brand: '',
      sku: '',
      supplierName: '',
      costPrice: '',

      groupCategory: '',
      category: 'Apparel',
      subcategories: '',
      tags: '',
      features: '',
      labels: '',
      colors: '',
      sizes: '',
      hasVariants: false,
      variants: [],
      
      imageUrls: [''],
      imageAltTexts: {},
      videoUrl: '',
      
      price: 0,
      salePrice: 0,
      saleStartDate: '',
      saleEndDate: '',
      
      trackInventory: false,
      stock: '',
      lowStockAlert: false,
      allowBackorders: false,
    });

    setOpenSections({
      core: true,
      categories: true,
      media: true,
      pricing: true
    });
  };

  const handleEdit = (product: Product) => {
    setIsAdding(false);
    setEditingId(product.id);
    setIsQuickAdd(false);
    setIsSkuManuallyEdited(Boolean(product.sku));
    setFormErrors({});
    
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
      supplierName: product.supplierName || '',
      costPrice: product.costPrice !== undefined && product.costPrice !== null ? product.costPrice : '',
      groupCategory: product.groupCategory || '',
      imageUrls: product.imageUrls || [''],
      tags: product.tags?.join(', ') || '',
      features: product.features?.join('\n') || '',
      labels: product.labels?.join(', ') || '',
      colors: product.colors?.join(', ') || '',
      sizes: product.sizes?.join(', ') || '',
      hasVariants: product.hasVariants || false,
      variants: product.variants || [],
      subcategories: product.subcategories?.join(', ') || '',
      saleStartDate: formattedStartDate,
      saleEndDate: formattedEndDate,
    });

    // Default to collapsed for edits
    setOpenSections({
      core: false,
      categories: false,
      media: false,
      pricing: false
    });
    setImagesToDelete([]);
  };

  const handleDuplicate = (product: Product) => {
    setIsAdding(true);
    setEditingId(null);
    setIsQuickAdd(false);
    setIsSkuManuallyEdited(false);
    setFormErrors({});

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

    const clonedVariants = (product.variants || []).map(v => ({
      ...v,
      id: Date.now().toString() + Math.floor(Math.random() * 10000)
    }));

    const autoSku = generateSku(product.supplierName || '', `Copy of ${product.name}`);

    setEditForm({
      ...product,
      id: undefined,
      name: `Copy of ${product.name}`,
      supplierName: product.supplierName || '',
      costPrice: product.costPrice !== undefined && product.costPrice !== null ? product.costPrice : '',
      sku: autoSku,
      groupCategory: product.groupCategory || '',
      imageUrls: product.imageUrls || [''],
      tags: product.tags?.join(', ') || '',
      features: product.features?.join('\n') || '',
      labels: product.labels?.join(', ') || '',
      colors: product.colors?.join(', ') || '',
      sizes: product.sizes?.join(', ') || '',
      hasVariants: product.hasVariants || false,
      variants: clonedVariants,
      subcategories: product.subcategories?.join(', ') || '',
      saleStartDate: formattedStartDate,
      saleEndDate: formattedEndDate,
    });

    setOpenSections({
      core: true,
      categories: true,
      media: true,
      pricing: true
    });
    setImagesToDelete([]);
    showToast("Product fields duplicated. You can modify and save now.", "success");
  };

  const handleDelete = async (productId: string | number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const productToDelete = products.find(p => String(p.id) === String(productId));
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to delete product');
      }

      setProducts(products.filter(p => String(p.id) !== String(productId)));

      if (productToDelete) {
        const urlsToDel = new Set<string>();
        if ((productToDelete as any).image_url) urlsToDel.add((productToDelete as any).image_url);
        if (productToDelete.imageUrls) productToDelete.imageUrls.forEach((u: string) => urlsToDel.add(u));
        if ((productToDelete as any).additional_images) (productToDelete as any).additional_images.forEach((u: string) => urlsToDel.add(u));
        if (productToDelete.variants) {
          productToDelete.variants.forEach((v: any) => {
            if (v.imageUrl) urlsToDel.add(v.imageUrl);
          });
        }
        
        const urlsArray = Array.from(urlsToDel).filter(u => u && u.includes('amazonaws.com'));
        if (urlsArray.length > 0) {
          fetch('/api/upload', {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.currentUser ? await auth.currentUser.getIdToken() : ''}`
            },
            body: JSON.stringify({ fileUrls: urlsArray }),
          }).catch(err => console.error('Failed to delete S3 images for product', err));
        }

        // Delete from Meta Catalog
        fetch('/api/meta/sync', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.currentUser ? await auth.currentUser.getIdToken() : ''}`
          },
          body: JSON.stringify({ productIds: [productId.toString()] }),
        }).catch(err => console.error('Failed to delete from Meta Catalog', err));
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete product.', 'error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (formErrors[name]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (name === 'sku') {
      setIsSkuManuallyEdited(true);
    }

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditForm((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      const parsedVal = (name === 'price' || name === 'stock' || name === 'discount' || name === 'salePrice') 
        ? (value === '' ? '' : Number(value)) 
        : value;

      // Auto-generate SKU in real-time when name or supplierName changes, if user hasn't manually locked SKU
      if (!isSkuManuallyEdited && (name === 'name' || name === 'supplierName')) {
        const currentName = name === 'name' ? value : (editForm.name || '');
        const currentSupplier = name === 'supplierName' ? value : (editForm.supplierName || '');
        const autoSku = generateSku(currentSupplier, currentName);
        setEditForm((prev: any) => ({
          ...prev,
          [name]: parsedVal,
          sku: autoSku
        }));
      } else {
        setEditForm((prev: any) => ({
          ...prev,
          [name]: parsedVal,
        }));
      }
    }
  };

  const handleImageUrlChange = (index: number, value: string) => {
    if (formErrors.imageUrls) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next.imageUrls;
        return next;
      });
    }
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

  const handleRemoveImage = (indexToRemove: number) => {
    setEditForm((prev: any) => {
      const currentUrls = [...(prev.imageUrls || [])];
      const removedUrl = currentUrls[indexToRemove];
      if (removedUrl) {
        setImagesToDelete(prevImages => [...prevImages, removedUrl]);
      }
      currentUrls.splice(indexToRemove, 1);
      return { ...prev, imageUrls: currentUrls };
    });
    showToast("Image removed", "info");
  };

  const handleDragStartImage = (index: number) => {
    setDraggedImageIndex(index);
  };

  const handleDragOverImage = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverImageIndex !== index) {
      setDragOverImageIndex(index);
    }
  };

  const handleDragLeaveImage = () => {
    setDragOverImageIndex(null);
  };

  const handleDropImageReorder = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if files were dropped instead of reordering an existing image
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFilesUpload(e.dataTransfer.files);
      setDraggedImageIndex(null);
      setDragOverImageIndex(null);
      return;
    }

    if (draggedImageIndex === null || draggedImageIndex === targetIndex) {
      setDraggedImageIndex(null);
      setDragOverImageIndex(null);
      return;
    }

    setEditForm((prev: any) => {
      const urls = [...(prev.imageUrls || []).filter((u: string) => typeof u === 'string' && u.trim() !== '')];
      if (draggedImageIndex >= urls.length || targetIndex >= urls.length) return prev;
      const [movedItem] = urls.splice(draggedImageIndex, 1);
      urls.splice(targetIndex, 0, movedItem);
      return { ...prev, imageUrls: urls };
    });

    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
    showToast("Gallery images reordered", "info");
  };

  const handleDragEndImage = () => {
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  };

  const handleSetMainImage = (index: number) => {
    if (index === 0) return;
    setEditForm((prev: any) => {
      const urls = [...(prev.imageUrls || []).filter((u: string) => typeof u === 'string' && u.trim() !== '')];
      if (index >= urls.length) return prev;
      const [movedItem] = urls.splice(index, 1);
      urls.unshift(movedItem);
      return { ...prev, imageUrls: urls };
    });
    showToast("Main product image updated", "success");
  };

  const handleMoveImage = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    setEditForm((prev: any) => {
      const urls = [...(prev.imageUrls || []).filter((u: string) => typeof u === 'string' && u.trim() !== '')];
      if (toIndex < 0 || toIndex >= urls.length) return prev;
      const [movedItem] = urls.splice(fromIndex, 1);
      urls.splice(toIndex, 0, movedItem);
      return { ...prev, imageUrls: urls };
    });
  };

  const handleAddCustomImageUrl = () => {
    const url = newImageUrlInput.trim();
    if (!url) return;
    if (formErrors.imageUrls) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next.imageUrls;
        return next;
      });
    }
    setEditForm((prev: any) => {
      const currentUrls = [...(prev.imageUrls || []).filter((u: string) => typeof u === 'string' && u.trim() !== '')];
      return { ...prev, imageUrls: [...currentUrls, url] };
    });
    setNewImageUrlInput("");
    setShowUrlInput(false);
    showToast("Image URL added to gallery", "success");
  };

  const handleMultipleFilesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.currentUser ? await auth.currentUser.getIdToken() : ''}`
            },
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
        return fileUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      
      if (formErrors.imageUrls) {
        setFormErrors(prev => {
          const next = { ...prev };
          delete next.imageUrls;
          return next;
        });
      }

      setEditForm((prev: any) => {
        let currentUrls = (prev.imageUrls || []).filter((u: string) => typeof u === 'string' && u.trim() !== '');
        return { ...prev, imageUrls: [...currentUrls, ...uploadedUrls] };
      });
      showToast(`Successfully uploaded ${uploadedUrls.length} image(s)`, "success");
    } catch (error) {
      console.error("Error uploading image:", error);
      showToast("Failed to upload one or more images.", 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (typeof index === 'number') {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.currentUser ? await auth.currentUser.getIdToken() : ''}`
            },
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        });
        if (!response.ok) throw new Error('Failed to get upload URL');
        const { signedUrl, fileUrl } = await response.json();
        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!uploadResponse.ok) throw new Error('Failed to upload file to S3');
        
        if (formErrors.imageUrls) {
          setFormErrors(prev => {
            const next = { ...prev };
            delete next.imageUrls;
            return next;
          });
        }

        setEditForm((prev: any) => {
          const currentUrls = [...(prev.imageUrls || [])];
          currentUrls[index] = fileUrl;
          return { ...prev, imageUrls: currentUrls };
        });
        showToast("Image uploaded successfully", "success");
      } catch (error) {
        console.error("Error uploading image:", error);
        showToast("Failed to upload image.", 'error');
      } finally {
        setIsUploading(false);
      }
    } else {
      await handleMultipleFilesUpload(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleMultipleFilesUpload(e.dataTransfer.files);
    }
  };

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.currentUser ? await auth.currentUser.getIdToken() : ''}`
            },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
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
        const variants = [...(prev.variants || [])];
        variants[variantIndex] = { ...variants[variantIndex], imageUrl: fileUrl };
        
        let currentUrls = [...(prev.imageUrls || [])];
        if (!currentUrls.includes(fileUrl)) {
           while(currentUrls.length > 0 && currentUrls[currentUrls.length - 1] === '') currentUrls.pop();
           currentUrls.push(fileUrl);
        }
        return { ...prev, variants, imageUrls: currentUrls };
      });
    } catch (error) {
      console.error("Error uploading variant image:", error);
      showToast("Failed to upload variant image.", 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddVariant = () => {
    setEditForm((prev: any) => ({
      ...prev,
      variants: [...(prev.variants || []), { id: Date.now().toString(), price: 0, stock: 0, size: '', color: '' }]
    }));
  };

  const handleGenerateVariants = () => {
    const sizes = bulkSizes.split(',').map(s => s.trim()).filter(Boolean);
    const colors = bulkColors.split(',').map(c => c.trim()).filter(Boolean);

    if (sizes.length === 0 && colors.length === 0) {
      showToast('Enter at least one size or color to generate variants.', 'warning');
      return;
    }

    const newVariants: any[] = [];
    const existingVariants = editForm.variants || [];

    const existingCombos = new Set(
      existingVariants.map((v: any) => `${(v.size || '').toLowerCase()}|${(v.color || '').toLowerCase()}`)
    );

    const effectiveSizes = sizes.length > 0 ? sizes : [''];
    const effectiveColors = colors.length > 0 ? colors : [''];

    for (const size of effectiveSizes) {
      for (const color of effectiveColors) {
        const combo = `${size.toLowerCase()}|${color.toLowerCase()}`;
        if (!existingCombos.has(combo)) {
          newVariants.push({
            id: Date.now().toString() + Math.floor(Math.random() * 10000),
            size: size || '',
            color: color || '',
            price: bulkPrice || editForm.price || 0,
            stock: bulkStock || 0,
          });
          existingCombos.add(combo);
        }
      }
    }

    if (newVariants.length === 0) {
      showToast('All those combinations already exist as variants.', 'warning');
      return;
    }

    setEditForm((prev: any) => ({
      ...prev,
      variants: [...(prev.variants || []), ...newVariants],
    }));

    setBulkSizes('');
    setBulkColors('');
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    setEditForm((prev: any) => {
      const updated = [...(prev.variants || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const handleRemoveVariant = (index: number) => {
    setEditForm((prev: any) => {
      const updated = [...(prev.variants || [])];
      updated.splice(index, 1);
      return { ...prev, variants: updated };
    });
  };

  const handleSaveAsTemplate = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    const templateName = prompt("Enter a name for this template:");
    if (!templateName) return;
    
    try {
      const templateData = {
        name: templateName,
        data: {
          
          groupCategory: editForm.groupCategory,
          category: editForm.category,
          subcategories: editForm.subcategories,
          tags: editForm.tags,
          features: editForm.features,
          labels: editForm.labels,
          colors: editForm.colors,
          sizes: editForm.sizes,
          hasVariants: editForm.hasVariants,
          variants: (editForm.variants || []).map((v: any) => ({
            size: v.size || '',
            color: v.color || '',
            price: v.price || 0,
            stock: v.stock || 0
          })),
          price: editForm.price,
          salePrice: editForm.salePrice,
          trackInventory: editForm.trackInventory,
          lowStockAlert: editForm.lowStockAlert,
          allowBackorders: editForm.allowBackorders,
          allowMultiplePurchases: editForm.allowMultiplePurchases,
          
        }
      };
      
      const token = await user.getIdToken();
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(templateData)
      });

      if (!res.ok) throw new Error('Failed to save template');
      const data = await res.json();
      setTemplates(prev => [...prev, data.template]);
      showToast(`Template "${templateName}" saved to database`, "success");
    } catch (err) {
      console.error("Error saving template to DB:", err);
      showToast("Failed to save template to database", "error");
    }
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

    const errors: Record<string, string> = {};
    const name = (editForm.name || '').trim();
    if (!name) {
      errors.name = `${'Product'} name is required.`;
    }

    const price = Number(editForm.price);
    if (editForm.price === undefined || editForm.price === null || editForm.price === '' || isNaN(price) || price <= 0) {
      errors.price = 'A valid price (> 0) is required.';
    }

    const costPrice = Number(editForm.costPrice);
    if (editForm.costPrice === undefined || editForm.costPrice === null || editForm.costPrice === '' || isNaN(costPrice) || costPrice <= 0) {
      errors.costPrice = 'A valid cost (> 0) is required.';
    }

    const category = (editForm.category || '').trim();
    if (!category) {
      errors.category = 'Category selection is required.';
    }

    const supplier = (editForm.supplierName || '').trim();
    if (!supplier) {
      errors.supplierName = 'Supplier selection is required.';
    }

    const cleanedImages = (editForm.imageUrls || []).filter((url: string) => typeof url === 'string' && url.trim() !== '');
    if (cleanedImages.length === 0) {
      errors.imageUrls = 'At least one product image is required.';
    }
    if (editForm.trackInventory ?? true) {
      const stock = Number(editForm.stock);
      if (editForm.stock === undefined || editForm.stock === null || editForm.stock === '' || isNaN(stock) || stock < 0) {
        errors.stock = 'Stock quantity is required when inventory tracking is enabled.';
      }
    }

    if (editForm.hasVariants) {
      const variants = editForm.variants || [];
      if (variants.length === 0) {
        errors.variants = 'Please add or generate at least one variant when variants are enabled.';
      } else {
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          if (v.price === undefined || v.price === null || v.price === '' || isNaN(Number(v.price)) || Number(v.price) < 0) {
            errors.variants = `Variant #${i + 1} must have a valid price.`;
            break;
          }
          if ((editForm.trackInventory ?? true) && (v.stock === undefined || v.stock === null || v.stock === '' || isNaN(Number(v.stock)) || Number(v.stock) < 0)) {
            errors.variants = `Variant #${i + 1} must have a valid stock quantity.`;
            break;
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setOpenSections(prev => ({
        ...prev,
        core: prev.core || !!errors.name,
        categories: prev.categories || !!errors.category || !!errors.groupCategory,
        media: prev.media || !!errors.imageUrls,
        pricing: prev.pricing || !!errors.price || !!errors.stock || !!errors.variants,
      }));
      showToast("Please fill in all mandatory fields marked in red.", "error");
      return;
    }

    setFormErrors({});
    setIsSaving(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      const startTimestamp = editForm.saleStartDate ? new Date(editForm.saleStartDate).toISOString() : null;
      const endTimestamp = editForm.saleEndDate ? new Date(editForm.saleEndDate).toISOString() : null;
      
      const productData: Record<string, unknown> = {
        name: editForm.name || '',
        shortDescription: editForm.shortDescription || '',
        description: editForm.description || editForm.shortDescription || editForm.name || '',
        sku: editForm.sku || '',
        capacity: editForm.capacity || '',
        power: editForm.power || '',
        supplierName: editForm.supplierName || '',
        costPrice: editForm.costPrice !== undefined && editForm.costPrice !== null && editForm.costPrice !== '' ? Number(editForm.costPrice) : null,
        brand: editForm.brand || '',
        countryOfOrigin: editForm.countryOfOrigin || 'Kenya',
        currency: editForm.currency || 'KES',
        weight: editForm.weight !== undefined && editForm.weight !== null && editForm.weight !== '' ? Number(editForm.weight) : null,
        weightUnit: editForm.weightUnit || 'kg',
        attributes: typeof editForm.attributes === 'object' && editForm.attributes !== null ? editForm.attributes : {},
        
        groupCategory: editForm.groupCategory || selectedGroupNode?.name || '',
        category: editForm.category || '',
        subcategories: Array.isArray(editForm.subcategories) ? editForm.subcategories : (typeof editForm.subcategories === 'string' ? editForm.subcategories.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
        tags: typeof editForm.tags === 'string' ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.tags || []),
        features: typeof editForm.features === 'string' ? editForm.features.split('\n').map((t: string) => t.trim()).filter(Boolean) : (editForm.features || []),
        labels: typeof editForm.labels === 'string' ? editForm.labels.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.labels || []),
        colors: typeof editForm.colors === 'string' ? editForm.colors.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.colors || []),
        sizes: typeof editForm.sizes === 'string' ? editForm.sizes.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.sizes || []),
        grades: typeof editForm.grades === 'string' ? editForm.grades.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.grades || []),
        
        hasVariants: editForm.hasVariants || false,
        variants: editForm.hasVariants && editForm.variants ? editForm.variants : [],
        
        imageUrls: cleanedImages,
        imageAltTexts: editForm.imageAltTexts || {},
        videoUrl: editForm.videoUrl || '',
        
        price: editForm.price || 0,
        salePrice: editForm.salePrice || 0,
        saleStartDate: startTimestamp,
        saleEndDate: endTimestamp,
        
        trackInventory: editForm.trackInventory ?? true,
        stock: (editForm.trackInventory ?? true) ? (editForm.stock || 0) : null,
        lowStockAlert: editForm.lowStockAlert ?? false,
        allowBackorders: editForm.allowBackorders ?? false,
      };

      let saveId = editingId;
      if (isAdding) {
        saveId = Date.now();
      }

      const token = await user.getIdToken();
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...productData,
          id: saveId
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to save product');
      }

      const savedRes = await res.json();
      const newProduct = savedRes.product || { ...productData, id: saveId, variants: editForm.hasVariants ? editForm.variants : [] };
      
      if (isAdding) {
        setProducts([newProduct, ...products]);
      } else {
        setProducts(products.map(p => String(p.id) === String(saveId) ? newProduct : p));
      }

      setEditingId(null);
      setIsAdding(false);
      clearDraft();

      if (imagesToDelete.length > 0) {
        fetch('/api/upload', {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.currentUser ? await auth.currentUser.getIdToken() : ''}`
            },
          body: JSON.stringify({ fileUrls: imagesToDelete.filter(u => u.includes('amazonaws.com')) }),
        }).catch(err => console.error('Failed to delete removed images', err));
        setImagesToDelete([]);
      }

      // Automatically sync to Meta Catalog
      try {
        await fetch('/api/meta/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.currentUser ? await auth.currentUser.getIdToken() : ''}`
          },
          body: JSON.stringify({ productId: saveId!.toString() })
        });
      } catch (syncErr) {
        console.error('Failed to auto-sync to Meta Catalog', syncErr);
      }

      showToast("Product saved successfully!", "success");
    } catch (error) {
      console.error("Error saving product:", error);
      showToast('An error occurred while saving.', 'error');
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

  const uniqueSuppliers = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.supplierName && p.supplierName.trim()) {
        set.add(p.supplierName.trim());
      }
    });
    return Array.from(set).sort();
  }, [products]);

  const displayedItems = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(q)))
      );
    }

    if (selectedCategoryFilter) {
      result = result.filter(p => p.category === selectedCategoryFilter || p.groupCategory === selectedCategoryFilter);
    }

    if (selectedSupplierFilter) {
      result = result.filter(p => p.supplierName?.toLowerCase().trim() === selectedSupplierFilter.toLowerCase().trim());
    }

    if (selectedStockFilter === 'in_stock') {
      result = result.filter(p => p.stock === null || p.stock > 0);
    } else if (selectedStockFilter === 'low_stock') {
      result = result.filter(p => p.stock !== null && p.stock > 0 && p.stock <= 5);
    } else if (selectedStockFilter === 'out_of_stock') {
      result = result.filter(p => p.stock !== null && p.stock <= 0);
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'popularity_desc') {
      result.sort((a, b) => (b.analytics?.popularityScore ?? 0) - (a.analytics?.popularityScore ?? 0));
    } else if (sortBy === 'views_desc') {
      result.sort((a, b) => (b.analytics?.views ?? 0) - (a.analytics?.views ?? 0));
    } else if (sortBy === 'purchases_desc') {
      result.sort((a, b) => (b.analytics?.purchases ?? 0) - (a.analytics?.purchases ?? 0));
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => Number(a.price ?? (a as any).pricing?.price ?? 0) - Number(b.price ?? (b as any).pricing?.price ?? 0));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => Number(b.price ?? (b as any).pricing?.price ?? 0) - Number(a.price ?? (a as any).pricing?.price ?? 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'stock_asc') {
      result.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
    }

    return result;
  }, [products, searchQuery, selectedCategoryFilter, selectedSupplierFilter, selectedStockFilter, sortBy]);

  if (loading) {
    return <div className="p-8 font-bold animate-pulse">Loading items...</div>;
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Draft Recovery Banner */}
      {draftToResume && (
        <div className="bg-primary-container text-on-surface border-4 border-on-surface p-4 mb-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div>
            <p className="font-bold uppercase text-sm">You have an unsaved draft from {new Date(draftToResume.timestamp).toLocaleString()}</p>
            <p className="text-xs text-on-surface/80">Product: {draftToResume.editForm?.name || 'Untitled Product'}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => {
                setEditForm(draftToResume.editForm || {});
                setIsAdding(draftToResume.isAdding !== undefined ? draftToResume.isAdding : !draftToResume.editingId);
                setEditingId(draftToResume.editingId || null);
                setIsQuickAdd(draftToResume.isQuickAdd || false);
                setDraftToResume(null);
                showToast("Draft recovered successfully", "success");
              }}
              className="bg-on-surface text-surface px-4 py-1.5 text-xs font-black uppercase border-2 border-on-surface hover:bg-surface hover:text-on-surface transition-colors cursor-pointer"
            >
              Resume Editing
            </button>
            <button 
              onClick={async () => {
                await clearDraft();
                setDraftToResume(null);
                showToast("Draft discarded", "info");
              }}
              className="bg-surface text-on-surface px-4 py-1.5 text-xs font-black uppercase border-2 border-on-surface hover:bg-on-surface hover:text-surface transition-colors cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-headline-lg font-black text-2xl sm:text-4xl uppercase border-b-4 border-on-surface inline-block pb-2">
            {'My Products'}
          </h1>
          {(!isAdding && editingId === null) && (
            <div className="flex gap-4 border-b-2 border-surface-container mt-2">
              <button 
                onClick={() => setViewTab('catalog')}
                className={`pb-2 text-sm font-black uppercase tracking-wider ${viewTab === 'catalog' ? 'text-primary-container border-b-4 border-primary-container' : 'text-secondary hover:text-on-surface'}`}
              >
                Catalog
              </button>
              <button 
                onClick={() => setViewTab('suppliers')}
                className={`pb-2 text-sm font-black uppercase tracking-wider ${viewTab === 'suppliers' ? 'text-primary-container border-b-4 border-primary-container' : 'text-secondary hover:text-on-surface'}`}
              >
                Suppliers & SKUs
              </button>
            </div>
          )}
        </div>
        {(!isAdding && editingId === null) && (
          <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 sm:mt-0">
            <Link 
              href="/admin/products/duplicates"
              className="bg-yellow-400 text-yellow-900 border-4 border-yellow-600 px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-base font-bold uppercase shadow-[4px_4px_0px_0px_#ca8a04] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_#ca8a04] transition-all inline-flex items-center gap-1.5"
            >
              Scan Duplicates
            </Link>
            <button 
              onClick={handleFullSync}
              disabled={isSyncingCatalog}
              className="bg-surface text-green-700 border-4 border-green-600 px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-base font-bold uppercase shadow-[4px_4px_0px_0px_#16a34a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_#16a34a] transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isSyncingCatalog ? "Syncing..." : "Sync to WhatsApp"}
            </button>
            <button 
              onClick={() => {
                handleAddNew();
                setIsQuickAdd(true);
              }}
              className="bg-secondary-container text-on-surface border-4 border-on-surface px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-base font-bold uppercase shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all"
            >
              Quick Add
            </button>
            <button 
              onClick={() => {
                handleAddNew();
                setIsQuickAdd(false);
              }}
              className="bg-primary-container text-on-surface border-4 border-on-surface px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-base font-bold uppercase shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all"
            >
              Add Product
            </button>
          </div>
        )}
      </div>

      {(isAdding || editingId !== null) ? (
        <ProductEditor 
          isAdding={isAdding}
          initialData={editForm || {}}
          onChange={(updated) => setEditForm(updated)}
          draftSaveStatus={draftSaveStatus}
          existingSuppliers={Array.from(new Set(products.map(p => p.supplierName).filter(Boolean))) as string[]}
          existingProducts={products.map(p => ({ id: p.id, name: p.name, thumbnail: p.image_url || (p.image_urls && p.image_urls[0]) }))}
          onSave={async (data) => {
            try {
              const token = await auth.currentUser?.getIdToken();
              const payload = {
                ...data,
                merchantId: auth.currentUser?.uid || "admin",
              };
              const res = await fetch(editingId ? `/api/v1/products/${editingId}` : '/api/v1/products', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
              });
              const result = await res.json();
              if (res.ok) {
                await clearDraft();
                showToast(`Product successfully ${isAdding ? 'created' : 'updated'}`, 'success');
                setIsAdding(false);
                setEditingId(null);
                setEditForm({});
                setDraftSaveStatus('idle');
                const savedItem = result.data;
                const normalizedProduct: Product = {
                  ...savedItem,
                  id: isNaN(Number(savedItem.id)) ? savedItem.id : Number(savedItem.id),
                  price: Number(savedItem.pricing?.price ?? savedItem.price ?? 0),
                  salePrice: savedItem.pricing?.salePrice ? Number(savedItem.pricing.salePrice) : (savedItem.salePrice ? Number(savedItem.salePrice) : undefined),
                  costPrice: savedItem.pricing?.costPrice !== undefined && savedItem.pricing?.costPrice !== null ? Number(savedItem.pricing.costPrice) : (savedItem.costPrice !== undefined && savedItem.costPrice !== null ? Number(savedItem.costPrice) : undefined),
                  stock: savedItem.stockQuantity !== undefined && savedItem.stockQuantity !== null ? Number(savedItem.stockQuantity) : (savedItem.stock !== undefined && savedItem.stock !== null ? Number(savedItem.stock) : 0),
                  category: savedItem.categoryIds?.[0] || savedItem.category || 'General',
                  imageUrls: savedItem.media && Array.isArray(savedItem.media) && savedItem.media.length > 0 
                    ? savedItem.media.map((m: any) => m.url) 
                    : (savedItem.imageUrls || []),
                  image_url: savedItem.media?.[0]?.url || savedItem.imageUrls?.[0] || savedItem.image_url || '',
                };

                // Optimistically update the list
                if (isAdding) {
                  setProducts([normalizedProduct, ...products]);
                } else {
                  setProducts(products.map(p => String(p.id) === String(editingId) ? normalizedProduct : p));
                }
              } else {
                const errMsg = result.issues && Array.isArray(result.issues)
                  ? result.issues.map((i: any) => `${i.path}: ${i.message}`).join(', ')
                  : (result.message || result.error || 'Error saving product');
                showToast(errMsg, 'error');
                throw new Error(errMsg);
              }
            } catch (err: any) {
              console.error(err);
              throw err;
            }
          }}
          onCancel={() => {
            setIsAdding(false);
            setEditingId(null);
            setEditForm({});
            setDraftSaveStatus('idle');
          }}
        />
      ) : (
        viewTab === 'catalog' ? (
          <div className="space-y-6">
          {/* SEARCH & FILTER TOOLBAR */}
          <div className="bg-surface border-4 border-on-surface p-4 shadow-[4px_4px_0px_0px_var(--color-on-surface)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Bar */}
              <div className="lg:col-span-2 relative">
                <label className="block text-[10px] font-black uppercase text-secondary mb-1">Search Products</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, SKU, supplier, tag..."
                    className="w-full border-2 border-on-surface p-2 text-sm focus:ring-0 outline-none pr-8 bg-surface"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-secondary hover:text-on-surface"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Filter by Category */}
              <div>
                <label className="block text-[10px] font-black uppercase text-secondary mb-1">Category</label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full border-2 border-on-surface p-2 text-sm focus:ring-0 outline-none bg-surface font-bold uppercase"
                >
                  <option value="">All Categories</option>
                  {allSystemCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Supplier */}
              <div>
                <label className="block text-[10px] font-black uppercase text-secondary mb-1">Dropship Supplier</label>
                <select
                  value={selectedSupplierFilter}
                  onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                  className="w-full border-2 border-on-surface p-2 text-sm focus:ring-0 outline-none bg-surface font-bold uppercase"
                >
                  <option value="">All Suppliers</option>
                  {uniqueSuppliers.map((sup) => (
                    <option key={sup} value={sup}>
                      {sup}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-[10px] font-black uppercase text-secondary mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full border-2 border-on-surface p-2 text-sm focus:ring-0 outline-none bg-surface font-bold uppercase"
                >
                  <option value="newest">Newest First</option>
                  <option value="popularity_desc">Highest Popularity Score</option>
                  <option value="views_desc">Most Views</option>
                  <option value="purchases_desc">Most Purchased</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="stock_asc">Stock: Low to High</option>
                </select>
              </div>
            </div>

            {/* Filter Tags & Active Counts */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-on-surface/10 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold uppercase text-secondary">Stock Filter:</span>
                {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStockFilter(st)}
                    className={`px-2.5 py-0.5 font-bold uppercase border-2 text-[11px] transition-colors ${
                      selectedStockFilter === st
                        ? 'bg-on-surface text-surface border-on-surface'
                        : 'bg-surface text-on-surface border-on-surface/40 hover:border-on-surface'
                    }`}
                  >
                    {st === 'all' && 'All'}
                    {st === 'in_stock' && 'In Stock'}
                    {st === 'low_stock' && 'Low Stock (≤5)'}
                    {st === 'out_of_stock' && 'Out of Stock'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {(searchQuery || selectedCategoryFilter || selectedSupplierFilter || selectedStockFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategoryFilter("");
                      setSelectedSupplierFilter("");
                      setSelectedStockFilter("all");
                    }}
                    className="text-xs font-black uppercase text-error hover:underline"
                  >
                    Reset Filters
                  </button>
                )}
                <span className="font-black uppercase text-[11px] bg-primary-container px-2 py-0.5 border border-on-surface">
                  Showing {displayedItems.length} of {products.length} Products
                </span>
              </div>
            </div>
          </div>

          {/* Bulk Action Header */}
          {selectedProductIds.length > 0 && (
            <div className="p-4 bg-error-container text-error border-4 border-on-surface flex items-center justify-between font-bold">
              <span>{selectedProductIds.length} item(s) selected</span>
              <button 
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="bg-error text-white border-2 border-on-surface px-4 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_var(--color-on-surface)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_var(--color-on-surface)] transition-all disabled:opacity-50"
              >
                {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block bg-surface border-4 border-on-surface overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-on-surface text-surface uppercase font-bold text-xs tracking-wider">
                  <th className="p-4 border-b-4 border-on-surface w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll} 
                      checked={displayedItems.length > 0 && selectedProductIds.length === displayedItems.length}
                      className="accent-primary-container w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 border-b-4 border-on-surface">Product & SKU</th>
                  <th className="p-4 border-b-4 border-on-surface">Supplier</th>
                  <th className="p-4 border-b-4 border-on-surface">Pricing</th>
                  <th className="p-4 border-b-4 border-on-surface">Stock</th>
                  <th className="p-4 border-b-4 border-on-surface">Performance & Engagement</th>
                  <th className="p-4 border-b-4 border-on-surface text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center font-bold text-secondary">
                      No products match the selected filters.
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((product) => {
                    const isLowStock = product.stock !== null && product.stock > 0 && product.stock <= 5;
                    const isOutOfStock = product.stock !== null && product.stock <= 0;
                    const isSingleSyncing = singleSyncingId === product.id;

                    return (
                      <tr key={product.id} className="border-b border-on-surface hover:bg-surface-dim transition-colors">
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedProductIds.includes(product.id)}
                            onChange={() => toggleSelection(product.id)}
                            className="accent-primary-container w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {product.imageUrls?.[0] ? (
                              <img src={product.imageUrls[0]} alt={product.name} className="w-14 h-14 object-cover border-2 border-on-surface shrink-0" />
                            ) : (
                              <div className="w-14 h-14 bg-surface-dim border-2 border-on-surface flex items-center justify-center text-[10px] font-bold shrink-0">No Img</div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate max-w-[220px]" title={product.name}>{product.name}</p>
                              {product.sku && (
                                <p className="font-mono text-[11px] text-secondary tracking-tight font-semibold">
                                  SKU: {product.sku}
                                </p>
                              )}
                              <span className="inline-block mt-0.5 text-[10px] uppercase font-bold text-secondary bg-surface-dim px-1.5 py-0.5 border border-on-surface/20">
                                {product.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {product.supplierName ? (
                            <span className="inline-flex items-center gap-1 font-bold text-xs bg-primary-container text-on-surface px-2 py-0.5 border border-on-surface">
                              <Icon name="store" className="text-xs" />
                              {product.supplierName}
                            </span>
                          ) : (
                            <span className="text-xs text-secondary italic">None</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-xs space-y-0.5">
                            <p className="font-bold text-sm">
                              {CURRENCY_CONFIG.symbol} {Number(product.price ?? (product as any).pricing?.price ?? 0).toFixed(2)}
                            </p>
                            {product.salePrice && Number(product.salePrice) > 0 ? (
                              <p className="text-[10px] font-bold text-green-700">
                                Sale: {CURRENCY_CONFIG.symbol} {Number(product.salePrice).toFixed(2)}
                              </p>
                            ) : null}
                            {product.costPrice !== undefined && product.costPrice !== null && !isNaN(Number(product.costPrice)) && (
                              <p className="text-[10px] text-secondary font-semibold">
                                Cost: {CURRENCY_CONFIG.symbol} {Number(product.costPrice).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {product.stock === null ? (
                            <span className="text-xs font-bold text-secondary">Unlimited</span>
                          ) : isOutOfStock ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-black uppercase bg-error text-white border border-on-surface">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-black uppercase bg-amber-400 text-black border border-on-surface">
                              Low: {product.stock}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-on-surface">
                              {product.stock} in stock
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[11px] bg-primary-container text-on-surface px-1.5 py-0.5 border border-on-surface">
                                Score: {product.analytics?.popularityScore ?? 0}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-secondary font-medium">
                              <span>Views (1pt): <strong className="text-on-surface">{product.analytics?.views ?? 0}</strong></span>
                              <span>Wishlist (2pt): <strong className="text-on-surface">{product.analytics?.wishlistAdditions ?? 0}</strong></span>
                              <span>Cart (4pt): <strong className="text-on-surface">{product.analytics?.cartAdditions ?? 0}</strong></span>
                              <span>Bought (7pt): <strong className="text-on-surface text-green-700">{product.analytics?.purchases ?? 0}</strong></span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-wrap gap-1.5 justify-end items-center">
                            {/* WhatsApp Share Button */}
                            <button
                              type="button"
                              onClick={() => setWhatsAppModalProduct({ id: String(product.id), name: product.name })}
                              title="Send to WhatsApp Catalog / Customer"
                              className="text-xs border-2 border-green-700 bg-green-50 text-green-800 px-2 py-1 font-bold hover:bg-green-700 hover:text-white transition-colors shadow-[2px_2px_0px_0px_#15803d] inline-flex items-center gap-1"
                            >
                              <Icon name="chat" className="text-xs" />
                              WhatsApp
                            </button>

                            {/* Single Sync to Meta */}
                            <button
                              type="button"
                              onClick={() => handleSingleSync(product)}
                              disabled={isSingleSyncing}
                              title="Sync this product to Meta / WhatsApp Catalog"
                              className="text-xs border-2 border-on-surface bg-surface text-on-surface px-2 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors shadow-[2px_2px_0px_0px_var(--color-on-surface)] disabled:opacity-50"
                            >
                              {isSingleSyncing ? "..." : "Sync"}
                            </button>

                            <button 
                              onClick={() => handleDuplicate(product)}
                              className="text-xs border-2 border-on-surface bg-primary-container text-on-surface px-2 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                            >
                              Duplicate
                            </button>
                            <button 
                              onClick={() => handleEdit(product)}
                              className="text-xs border-2 border-on-surface px-2.5 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(product.id)}
                              className="text-xs border-2 border-error text-error px-2 py-1 font-bold hover:bg-error hover:text-white transition-colors shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-4">
            {displayedItems.length === 0 ? (
              <div className="bg-surface border-4 border-on-surface p-8 text-center font-bold text-secondary">
                No products match the selected filters.
              </div>
            ) : (
              displayedItems.map((product) => {
                const isLowStock = product.stock !== null && product.stock > 0 && product.stock <= 5;
                const isOutOfStock = product.stock !== null && product.stock <= 0;
                const isSingleSyncing = singleSyncingId === product.id;

                return (
                  <div key={product.id} className="bg-surface border-4 border-on-surface p-4 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col gap-3">
                    <div className="flex gap-4 items-start">
                      <input 
                        type="checkbox" 
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => toggleSelection(product.id)}
                        className="accent-primary-container w-4 h-4 cursor-pointer mt-1 shrink-0"
                      />
                      
                      {product.imageUrls?.[0] ? (
                        <img src={product.imageUrls[0]} alt={product.name} className="w-16 h-16 object-cover border-2 border-on-surface shrink-0" />
                      ) : (
                        <div className="w-16 h-16 bg-surface-dim border-2 border-on-surface flex items-center justify-center text-xs font-bold shrink-0">No Img</div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate">{product.name}</h3>
                        {product.sku && (
                          <p className="font-mono text-[11px] text-secondary font-semibold mt-0.5">
                            SKU: {product.sku}
                          </p>
                        )}
                        {product.supplierName && (
                          <span className="inline-block mt-1 text-[10px] font-bold bg-primary-container text-on-surface px-1.5 py-0.5 border border-on-surface">
                            Supplier: {product.supplierName}
                          </span>
                        )}
                        <p className="text-xs font-semibold mt-1 text-primary-container">
                          {CURRENCY_CONFIG.symbol} {Number(product.price ?? (product as any).pricing?.price ?? 0).toFixed(2)}
                        </p>
                        <div className="mt-1">
                          {product.stock === null ? (
                            <span className="text-[11px] text-secondary font-medium">Unlimited stock</span>
                          ) : isOutOfStock ? (
                            <span className="px-1.5 py-0.2 text-[10px] font-black uppercase bg-error text-white">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="px-1.5 py-0.2 text-[10px] font-black uppercase bg-amber-400 text-black">Low: {product.stock}</span>
                          ) : (
                            <span className="text-[11px] text-secondary font-medium">Stock: <strong className="text-on-surface">{product.stock}</strong></span>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-on-surface/10 text-[10px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold bg-primary-container text-on-surface px-1 py-0.5 border border-on-surface text-[10px]">
                              Score: {product.analytics?.popularityScore ?? 0}
                            </span>
                            <span className="text-secondary font-semibold">
                              Views: <strong className="text-on-surface">{product.analytics?.views ?? 0}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-secondary font-semibold">
                            <span>Wishlist: <strong className="text-on-surface">{product.analytics?.wishlistAdditions ?? 0}</strong></span>
                            <span>•</span>
                            <span>Cart: <strong className="text-on-surface">{product.analytics?.cartAdditions ?? 0}</strong></span>
                            <span>•</span>
                            <span>Bought: <strong className="text-green-700 font-bold">{product.analytics?.purchases ?? 0}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end border-t-2 border-surface-container pt-3">
                      <button
                        type="button"
                        onClick={() => setWhatsAppModalProduct({ id: String(product.id), name: product.name })}
                        className="text-xs border-2 border-green-700 bg-green-50 text-green-800 px-2 py-1 font-bold shadow-[2px_2px_0px_0px_#15803d]"
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSingleSync(product)}
                        disabled={isSingleSyncing}
                        className="text-xs border-2 border-on-surface px-2 py-1 font-bold shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                      >
                        {isSingleSyncing ? "..." : "Sync"}
                      </button>
                      <button 
                        onClick={() => handleDuplicate(product)}
                        className="text-xs border-2 border-on-surface bg-primary-container text-on-surface px-2.5 py-1 font-bold shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                      >
                        Duplicate
                      </button>
                      <button 
                        onClick={() => handleEdit(product)}
                        className="text-xs border-2 border-on-surface px-2.5 py-1 font-bold shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="text-xs border-2 border-error text-error px-2.5 py-1 font-bold shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="bg-surface border-4 border-on-surface p-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <h2 className="font-bold text-xl uppercase mb-6 border-b-2 border-on-surface/20 pb-2 flex items-center gap-2">
            <Icon name="inventory" />
            Supplier & SKU Directory
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-container-low border-b-2 border-on-surface">
                  <th className="p-3 text-xs font-black uppercase tracking-wider border-r-2 border-on-surface/20">Supplier</th>
                  <th className="p-3 text-xs font-black uppercase tracking-wider border-r-2 border-on-surface/20">Product Name</th>
                  <th className="p-3 text-xs font-black uppercase tracking-wider">SKU</th>
                </tr>
              </thead>
              <tbody>
                {[...products].sort((a, b) => (a.supplierName || 'Unknown').localeCompare(b.supplierName || 'Unknown')).map((product) => (
                  <tr key={product.id} className="border-b-2 border-on-surface/10 hover:bg-surface-dim transition-colors">
                    <td className="p-3 text-sm font-bold border-r-2 border-on-surface/10">{product.supplierName || <span className="text-secondary italic">No Supplier</span>}</td>
                    <td className="p-3 text-sm border-r-2 border-on-surface/10">{product.name}</td>
                    <td className="p-3">
                      <span className="font-mono text-xs bg-primary-container text-on-surface px-2 py-1 font-bold border border-on-surface shadow-sm">
                        {product.sku || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-secondary font-bold uppercase text-sm">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    )}

      {/* WhatsApp Sharing Modal */}
      {whatsAppModalProduct && (
        <SendToWhatsAppModal
          productId={whatsAppModalProduct.id}
          productName={whatsAppModalProduct.name}
          isOpen={Boolean(whatsAppModalProduct)}
          onClose={() => setWhatsAppModalProduct(null)}
          userToken={userAuthToken}
        />
      )}
    </div>
  );
}



