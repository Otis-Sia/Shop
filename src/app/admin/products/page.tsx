"use client";
import { useToast } from '@/components/providers/ToastProvider';

import React, { useEffect, useState, useMemo } from "react";
import { auth } from "@/lib/firebase";
import { getProducts, Product } from "@/lib/api/products";
import { getUserProfile } from "@/lib/api/auth";
import { useCategories } from '@/hooks/useCategories';
import Icon from '@/components/Icon';
import { CURRENCY_CONFIG } from '@/lib/utils/currency';
import SendToWhatsAppModal from '@/components/admin/SendToWhatsAppModal';

export default function MerchantProducts() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDragging, setIsDragging] = useState(false);
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
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("");
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

  // Auto SKU Generation Helper
  const generateSku = (supplierName: string = '', productName: string = '') => {
    const cleanSupplier = (supplierName || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const cleanProduct = (productName || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSupplier && !cleanProduct) return '';
    if (!cleanSupplier) return cleanProduct;
    if (!cleanProduct) return cleanSupplier;
    return `${cleanSupplier}-${cleanProduct}`;
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
        throw new Error(data.error?.message || data.error || "Failed to sync catalog to WhatsApp");
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
        throw new Error(data.error?.message || data.error || "Failed to sync product to WhatsApp");
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
              setDraftToResume({
                ...draftData.draft,
                timestamp: draftData.draft.updatedAt ? new Date(draftData.draft.updatedAt).getTime() : Date.now()
              });
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

    const delayDebounceFn = setTimeout(async () => {
      try {
        const token = await user.getIdToken();
        await fetch('/api/drafts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            editForm,
            isAdding,
            editingId,
            isQuickAdd
          })
        });
      } catch (err) {
        console.error("Error auto-saving draft to DB:", err);
      }
    }, 3000); // 3.0 seconds debounce

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
      
      trackInventory: true,
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
        let currentUrls = [...(prev.imageUrls || [])];
        // Remove trailing empty strings before adding new ones
        while(currentUrls.length > 0 && currentUrls[currentUrls.length - 1] === '') {
          currentUrls.pop();
        }
        return { ...prev, imageUrls: [...currentUrls, ...uploadedUrls] };
      });
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
    if (editForm.price === undefined || editForm.price === null || editForm.price === '' || isNaN(price) || price < 0) {
      errors.price = 'A valid price (>= 0) is required.';
    }

    const category = (editForm.category || '').trim();
    if (!category) {
      errors.category = 'Category selection is required.';
    }

    if (!isQuickAdd && !(editForm.groupCategory || selectedGroupNode?.name)) {
      errors.groupCategory = 'Group category is required.';
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
        supplierName: editForm.supplierName || '',
        costPrice: editForm.costPrice !== undefined && editForm.costPrice !== null && editForm.costPrice !== '' ? Number(editForm.costPrice) : null,
        brand: editForm.brand || '',
        
        groupCategory: editForm.groupCategory || selectedGroupNode?.name || '',
        category: editForm.category || '',
        subcategories: Array.isArray(editForm.subcategories) ? editForm.subcategories : (typeof editForm.subcategories === 'string' ? editForm.subcategories.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
        tags: typeof editForm.tags === 'string' ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.tags || []),
        labels: typeof editForm.labels === 'string' ? editForm.labels.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.labels || []),
        colors: typeof editForm.colors === 'string' ? editForm.colors.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.colors || []),
        sizes: typeof editForm.sizes === 'string' ? editForm.sizes.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.sizes || []),
        
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
      result = result.filter(p => p.supplierName === selectedSupplierFilter);
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
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
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
                setEditForm(draftToResume.editForm);
                setIsAdding(draftToResume.isAdding);
                setEditingId(draftToResume.editingId);
                setIsQuickAdd(draftToResume.isQuickAdd || false);
                setDraftToResume(null);
                showToast("Draft recovered successfully", "success");
              }}
              className="bg-on-surface text-surface px-4 py-1.5 text-xs font-black uppercase border-2 border-on-surface hover:bg-surface hover:text-on-surface transition-colors"
            >
              Resume Editing
            </button>
            <button 
              onClick={async () => {
                await clearDraft();
                setDraftToResume(null);
                showToast("Draft discarded", "info");
              }}
              className="bg-surface text-on-surface px-4 py-1.5 text-xs font-black uppercase border-2 border-on-surface hover:bg-on-surface hover:text-surface transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
        <h1 className="font-headline-lg font-black text-2xl sm:text-4xl uppercase border-b-4 border-on-surface inline-block pb-2">
          {'My Products'}
        </h1>
        {(!isAdding && editingId === null) && (
          <div className="flex flex-wrap gap-2 sm:gap-4">
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
        <form onSubmit={handleSave} className="bg-surface border-4 border-on-surface p-8 mb-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-2 border-on-surface pb-4">
            <div>
              <h2 className="font-bold text-2xl uppercase">
                {isAdding ? 'Add New' : 'Edit'} {'Product'} 
                {isQuickAdd && ' (Quick Add)'}
              </h2>
            </div>
            {/* Template Selection */}
            {isAdding && templates.length > 0 && (
              <div className="flex items-center gap-2 p-2 border-2 border-dashed border-on-surface bg-surface-dim">
                <span className="text-xs font-black uppercase">Start from template:</span>
                <select 
                  id="template-selector"
                  onChange={(e) => {
                    const tId = e.target.value;
                    if (!tId) return;
                    const selectedT = templates.find(t => t.id === tId);
                    if (selectedT) {
                      setEditForm((prev: any) => ({
                        ...prev,
                        ...selectedT.data,
                        name: prev.name || '',
                        description: prev.description || '',
                        imageUrls: prev.imageUrls || ['']
                      }));
                      showToast(`Loaded template "${selectedT.name}"`, "success");
                    }
                  }}
                  className="border-2 border-on-surface p-1 text-xs outline-none font-bold uppercase bg-surface"
                >
                  <option value="">-- Choose Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={async () => {
                    const selectEl = document.getElementById("template-selector") as HTMLSelectElement;
                    const selectedId = selectEl?.value;
                    if (!selectedId) {
                      showToast("Please select a template to delete first", "warning");
                      return;
                    }
                    const selectedT = templates.find(t => t.id === selectedId);
                    if (selectedT && confirm(`Delete template "${selectedT.name}"?`)) {
                      try {
                        const user = auth.currentUser;
                        const token = user ? await user.getIdToken() : '';
                        const delRes = await fetch(`/api/templates?id=${encodeURIComponent(selectedId)}`, {
                          method: 'DELETE',
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!delRes.ok) throw new Error('Failed to delete template');
                        setTemplates(prev => prev.filter(t => t.id !== selectedId));
                        showToast(`Template "${selectedT.name}" deleted`, "success");
                        if (selectEl) selectEl.value = "";
                      } catch (err) {
                        console.error("Error deleting template:", err);
                        showToast("Failed to delete template", "error");
                      }
                    }
                  }}
                  className="text-[10px] font-black uppercase text-error hover:underline ml-2"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>

          {isQuickAdd ? (
            /* QUICK ADD FORM MODE */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase flex items-center gap-1">
                  Product Name <span className="text-error font-black">*</span>
                </label>
                <input 
                  required 
                  name="name" 
                  value={editForm.name || ''} 
                  onChange={handleChange} 
                  placeholder="e.g. Vintage Denim Jacket"
                  className={`w-full border-2 p-2 focus:ring-0 outline-none ${formErrors.name ? 'border-error bg-error/5' : 'border-on-surface'}`} 
                />
                {formErrors.name && <p className="text-xs text-error font-bold">{formErrors.name}</p>}
              </div>

              {/* Supplier Identification */}
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase flex items-center justify-between">
                  <span>Supplier Name</span>
                  <span className="text-[10px] text-secondary font-semibold uppercase">Dropship Supplier</span>
                </label>
                <input 
                  type="text"
                  name="supplierName" 
                  list="quick-supplier-suggestions"
                  value={editForm.supplierName || ''} 
                  onChange={handleChange} 
                  placeholder="e.g. Shenzhen Tech, CJ Dropship..."
                  className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none bg-surface" 
                />
                <datalist id="quick-supplier-suggestions">
                  {uniqueSuppliers.map(sup => (
                    <option key={sup} value={sup}>{sup}</option>
                  ))}
                </datalist>
              </div>

              {/* Auto-Generated / Custom SKU */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-sm uppercase">SKU (Product Code)</label>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 border ${isSkuManuallyEdited ? 'border-secondary text-secondary bg-surface-dim' : 'border-primary-container text-on-surface bg-primary-container'}`}>
                    {isSkuManuallyEdited ? 'Custom SKU' : 'Auto from Supplier'}
                  </span>
                </div>
                <input 
                  name="sku" 
                  value={editForm.sku || ''} 
                  onChange={handleChange} 
                  placeholder="Auto-generated from Supplier + Name..."
                  className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none font-mono text-sm" 
                />
                {isSkuManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSkuManuallyEdited(false);
                      const autoSku = generateSku(editForm.supplierName, editForm.name);
                      setEditForm((prev: any) => ({ ...prev, sku: autoSku }));
                      showToast("Reset SKU to auto-generated format", "info");
                    }}
                    className="text-[10px] font-bold text-primary-container hover:underline uppercase block"
                  >
                    ↺ Revert to Auto-Generated SKU
                  </button>
                )}
              </div>

              {/* Selling Price */}
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase flex items-center gap-1">
                  Price ({CURRENCY_CONFIG.symbol}) <span className="text-error font-black">*</span>
                </label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  name="price" 
                  value={editForm.price === 0 && !editForm.price.toString().match(/^0$/) ? '' : (editForm.price ?? '')} 
                  onChange={handleChange} 
                  className={`w-full border-2 p-2 focus:ring-0 outline-none ${formErrors.price ? 'border-error bg-error/5' : 'border-on-surface'}`} 
                />
                {formErrors.price && <p className="text-xs text-error font-bold">{formErrors.price}</p>}
              </div>

              {/* Cost Price (Optional) */}
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase flex items-center justify-between">
                  <span>Cost Price ({CURRENCY_CONFIG.symbol})</span>
                  <span className="text-[10px] text-secondary font-semibold uppercase">Optional Supplier Cost</span>
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  name="costPrice" 
                  value={editForm.costPrice === 0 && !editForm.costPrice.toString().match(/^0$/) ? '' : (editForm.costPrice ?? '')} 
                  onChange={handleChange} 
                  placeholder="e.g. 15.00"
                  className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" 
                />
                {editForm.price > 0 && editForm.costPrice !== undefined && editForm.costPrice !== '' && Number(editForm.costPrice) >= 0 && (
                  <div className="text-[11px] font-bold p-1 bg-surface-dim border border-on-surface/30 flex justify-between">
                    <span>Est. Profit: <strong className={Number(editForm.price) - Number(editForm.costPrice) >= 0 ? 'text-green-700' : 'text-error'}>{CURRENCY_CONFIG.symbol} {(Number(editForm.price) - Number(editForm.costPrice)).toFixed(2)}</strong></span>
                    <span className="text-secondary">({(((Number(editForm.price) - Number(editForm.costPrice)) / Number(editForm.price)) * 100).toFixed(1)}% margin)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase flex items-center gap-1">
                  Category <span className="text-error font-black">*</span>
                </label>
                <select 
                  required
                  name="category"
                  value={editForm.category || ''}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    let resolvedGroup = '';
                    let resolvedCat = '';
                    let resolvedSubs: string[] = [];

                    for (const group of categories) {
                      if (group.name === selectedValue) {
                        resolvedGroup = group.name;
                        break;
                      }
                      for (const cat of group.categories) {
                        if (cat.name === selectedValue) {
                          resolvedGroup = group.name;
                          resolvedCat = cat.name;
                          break;
                        }
                        if (cat.subcategories?.includes(selectedValue)) {
                          resolvedGroup = group.name;
                          resolvedCat = cat.name;
                          resolvedSubs = [selectedValue];
                          break;
                        }
                      }
                    }

                    if (formErrors.category) {
                      setFormErrors(prev => {
                        const next = { ...prev };
                        delete next.category;
                        return next;
                      });
                    }

                    setEditForm((prev: any) => ({
                      ...prev,
                      groupCategory: resolvedGroup,
                      category: resolvedCat || selectedValue,
                      subcategories: resolvedSubs
                    }));
                  }}
                  className={`w-full border-2 p-2.5 focus:ring-0 outline-none bg-surface font-bold text-sm ${formErrors.category ? 'border-error bg-error/5' : 'border-on-surface'}`}
                >
                  <option value="">-- Select Category --</option>
                  {allSystemCategories.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {formErrors.category && <p className="text-xs text-error font-bold">{formErrors.category}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase">Short Description</label>
                <textarea name="shortDescription" value={editForm.shortDescription || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 h-16 focus:ring-0 outline-none" placeholder="Optional brief summary..."></textarea>
              </div>
              
              {/* Main Image */}
              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase flex items-center gap-1">
                  Main Product Image <span className="text-error font-black">*</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input 
                    required
                    value={editForm.imageUrls?.[0] || ''} 
                    onChange={(e) => handleImageUrlChange(0, e.target.value)} 
                    placeholder="Image URL (https://...)"
                    className={`flex-1 border-2 p-2 focus:ring-0 outline-none ${formErrors.imageUrls ? 'border-error bg-error/5' : 'border-on-surface'}`} 
                  />
                  <label className="bg-primary-container text-on-primary-container border-2 border-on-surface px-4 py-2 font-bold cursor-pointer hover:bg-surface-container hover:text-on-surface transition-colors flex items-center justify-center min-w-[100px]">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleFileUpload(e, 0)}
                    />
                    <span className="text-xs uppercase tracking-wider">Upload</span>
                  </label>
                </div>
                {formErrors.imageUrls && <p className="text-xs text-error font-bold">{formErrors.imageUrls}</p>}
              </div>

              {/* Stock Input */}
              <div className="space-y-4 p-4 border-2 border-on-surface bg-surface md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="trackInventory" checked={editForm.trackInventory ?? true} onChange={handleChange} className="w-5 h-5 accent-primary-container" />
                  <span className="font-bold text-sm uppercase">Track Inventory</span>
                </label>
                {(editForm.trackInventory ?? true) && (
                  <div className="space-y-1">
                    <label className="font-bold text-xs uppercase text-secondary flex items-center gap-1">
                      Quantity in Stock <span className="text-error font-black">*</span>
                    </label>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      name="stock" 
                      value={editForm.stock === 0 && !editForm.stock.toString().match(/^0$/) ? '' : (editForm.stock ?? '')} 
                      onChange={handleChange} 
                      className={`w-32 border-2 p-2 focus:ring-0 outline-none ${formErrors.stock ? 'border-error bg-error/5' : 'border-on-surface'}`} 
                    />
                    {formErrors.stock && <p className="text-xs text-error font-bold">{formErrors.stock}</p>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* COLLAPSED ACCORDION FULL FORM MODE */
            <div className="space-y-4">
              
              {/* Accordion 1: Core Info */}
              <div className={`border-4 ${formErrors.name ? 'border-error' : 'border-on-surface'}`}>
                <button 
                  type="button" 
                  onClick={() => setOpenSections(prev => ({ ...prev, core: !prev.core }))}
                  className={`w-full ${formErrors.name ? 'bg-error text-white' : 'bg-on-surface text-surface'} uppercase font-black px-6 py-3 flex justify-between items-center text-left`}
                >
                  <span className="flex items-center gap-2">
                    1. Core Information
                    {formErrors.name && <span className="text-xs bg-white text-error font-black px-2 py-0.5 uppercase">Needs Attention</span>}
                  </span>
                  <span className="text-xl">{openSections.core ? "−" : "+"}</span>
                </button>
                {openSections.core && (
                  <div className="p-6 bg-surface grid grid-cols-1 md:grid-cols-2 gap-6 border-t-4 border-on-surface animate-in fade-in duration-200">
                    <div className="space-y-2 md:col-span-2">
                      <label className="font-bold text-sm uppercase flex items-center gap-1">
                        {'Product Name'} <span className="text-error font-black">*</span>
                      </label>
                      <input 
                        required 
                        name="name" 
                        value={editForm.name || ''} 
                        onChange={handleChange} 
                        placeholder="e.g. Wireless Noise-Cancelling Headphones"
                        className={`w-full border-2 p-2 focus:ring-0 outline-none ${formErrors.name ? 'border-error bg-error/5' : 'border-on-surface'}`} 
                      />
                      {formErrors.name && <p className="text-xs text-error font-bold">{formErrors.name}</p>}
                    </div>

                    {/* Supplier Name in Core Info */}
                    <div className="space-y-2">
                      <label className="font-bold text-sm uppercase flex items-center justify-between">
                        <span>Supplier / Merchant Name</span>
                        <span className="text-[10px] text-secondary font-semibold uppercase">Dropship Source</span>
                      </label>
                      <input 
                        type="text"
                        name="supplierName" 
                        list="core-supplier-suggestions"
                        value={editForm.supplierName || ''} 
                        onChange={handleChange} 
                        placeholder="e.g. Shenzhen Tech, CJ Dropship..."
                        className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none bg-surface" 
                      />
                      <datalist id="core-supplier-suggestions">
                        {uniqueSuppliers.map(sup => (
                          <option key={sup} value={sup}>{sup}</option>
                        ))}
                      </datalist>
                    </div>

                    {/* SKU in Core Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-sm uppercase">SKU (Product Code)</label>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 border ${isSkuManuallyEdited ? 'border-secondary text-secondary bg-surface-dim' : 'border-primary-container text-on-surface bg-primary-container'}`}>
                          {isSkuManuallyEdited ? 'Custom SKU' : 'Auto from Supplier'}
                        </span>
                      </div>
                      <input 
                        name="sku" 
                        value={editForm.sku || ''} 
                        onChange={handleChange} 
                        placeholder="Auto-generated from Supplier + Name..."
                        className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none font-mono text-sm" 
                      />
                      {isSkuManuallyEdited && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSkuManuallyEdited(false);
                            const autoSku = generateSku(editForm.supplierName, editForm.name);
                            setEditForm((prev: any) => ({ ...prev, sku: autoSku }));
                            showToast("Reset SKU to auto-generated format", "info");
                          }}
                          className="text-[10px] font-bold text-primary-container hover:underline uppercase block"
                        >
                          ↺ Revert to Auto-Generated SKU
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="font-bold text-sm uppercase">Short Description</label>
                      <textarea name="shortDescription" value={editForm.shortDescription || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 h-16 focus:ring-0 outline-none" placeholder="A brief summary for previews..."></textarea>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="font-bold text-sm uppercase">Full Description</label>
                      <textarea name="description" value={editForm.description || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 h-32 focus:ring-0 outline-none" placeholder="Detailed product description..."></textarea>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="font-bold text-sm uppercase">Brand / Manufacturer</label>
                      <input name="brand" value={editForm.brand || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Categories */}
              <div className={`border-4 ${(formErrors.category || formErrors.groupCategory) ? 'border-error' : 'border-on-surface'}`}>
                <button 
                  type="button"
                  onClick={() => setOpenSections(prev => ({ ...prev, categories: !prev.categories }))}
                  className={`w-full ${(formErrors.category || formErrors.groupCategory) ? 'bg-error text-white' : 'bg-on-surface text-surface'} uppercase font-black px-6 py-3 flex justify-between items-center text-left`}
                >
                  <span className="flex items-center gap-2">
                    2. Categories & Organization
                    {(formErrors.category || formErrors.groupCategory) && <span className="text-xs bg-white text-error font-black px-2 py-0.5 uppercase">Needs Attention</span>}
                  </span>
                  <span className="text-xl">{openSections.categories ? "−" : "+"}</span>
                </button>
                {openSections.categories && (
                  <div className="p-6 bg-surface grid grid-cols-1 md:grid-cols-2 gap-6 border-t-4 border-on-surface animate-in fade-in duration-200">
                    <div className="space-y-2 md:col-span-2">
                      <label className="font-bold text-sm uppercase flex items-center gap-1">
                        Group Category <span className="text-error font-black">*</span>
                      </label>
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
                        className={`w-full border-2 p-2 focus:ring-0 outline-none bg-surface ${formErrors.groupCategory ? 'border-error bg-error/5' : 'border-on-surface'}`}
                      />
                      <datalist id="product-group-categories">
                        {availableGroups.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </datalist>
                      {formErrors.groupCategory && <p className="text-xs text-error font-bold">{formErrors.groupCategory}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="font-bold text-sm uppercase flex items-center gap-1">
                        Top Level Category <span className="text-error font-black">*</span>
                      </label>
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
                        className={`w-full border-2 p-2 focus:ring-0 outline-none bg-surface ${formErrors.category ? 'border-error bg-error/5' : 'border-on-surface'} ${!editForm.groupCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      <datalist id="product-main-categories">
                        {availableTopLevelCategories.map(cat => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                      </datalist>
                      {formErrors.category && <p className="text-xs text-error font-bold">{formErrors.category}</p>}
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
                    <div className="space-y-2 md:col-span-2">
                      <label className="font-bold text-sm uppercase">Available Colors (comma separated)</label>
                      <input name="colors" value={editForm.colors || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" placeholder="e.g. Red, Blue, #FFFFFF" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="font-bold text-sm uppercase">Available Sizes (comma separated)</label>
                      <input name="sizes" value={editForm.sizes || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" placeholder="e.g. S, M, L, XL, 10, 11" />
                    </div>
                  </div>
                )}
              </div>              {/* Accordion 3: Media */}
              <div className={`border-4 ${formErrors.imageUrls ? 'border-error' : 'border-on-surface'}`}>
                <button 
                  type="button" 
                  onClick={() => setOpenSections(prev => ({ ...prev, media: !prev.media }))}
                  className={`w-full ${formErrors.imageUrls ? 'bg-error text-white' : 'bg-on-surface text-surface'} uppercase font-black px-6 py-3 flex justify-between items-center text-left`}
                >
                  <span className="flex items-center gap-2">
                    3. Media
                    {formErrors.imageUrls && <span className="text-xs bg-white text-error font-black px-2 py-0.5 uppercase">Needs Attention</span>}
                  </span>
                  <span className="text-xl">{openSections.media ? "−" : "+"}</span>
                </button>
                {openSections.media && (
                  <div className="p-6 bg-surface grid grid-cols-1 md:grid-cols-2 gap-6 border-t-4 border-on-surface animate-in fade-in duration-200">
                    <div className="space-y-4 md:col-span-2">
                      <label className="font-bold text-sm uppercase block flex items-center gap-1">
                        Main & Gallery Images <span className="text-error font-black">*</span>
                      </label>
                      {formErrors.imageUrls && (
                        <div className="p-3 bg-error/10 border-2 border-error text-error text-xs font-bold uppercase">
                          {formErrors.imageUrls}
                        </div>
                      )}
                      {(editForm.imageUrls || ['']).map((url: string, index: number) => (
                        <div key={index} className="flex flex-col md:flex-row gap-2 mb-4 p-4 border-2 border-on-surface bg-surface relative">
                          {index === 0 && <span className="absolute -top-3 -left-2 bg-primary-container text-on-surface text-[10px] font-black px-2 py-1 uppercase border-2 border-on-surface">Main Image</span>}
                          <div className="flex-1 space-y-2 relative">
                            <div className="flex w-full gap-2 items-center">
                              <input 
                                required={index === 0}
                                value={url} 
                                onChange={(e) => handleImageUrlChange(index, e.target.value)} 
                                placeholder="Image URL (https://...)"
                                className={`flex-1 border-2 p-2 focus:ring-0 outline-none ${index === 0 && formErrors.imageUrls ? 'border-error bg-error/5' : 'border-on-surface'}`} 
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
                              value={(editForm.imageAltTexts && editForm.imageAltTexts[url]) || ''} 
                              onChange={(e) => handleImageAltChange(url, e.target.value)} 
                              placeholder={index === 0 ? "Alternative text (recommended for SEO)" : "Alternative text (optional)"}
                              className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none bg-surface" 
                            />
                            <button 
                              type="button" 
                              onClick={() => handleRemoveImage(index)} 
                              className="absolute -top-4 -right-4 bg-error text-white w-6 h-6 flex items-center justify-center font-bold border-2 border-on-surface hover:scale-110 transition-transform"
                              title="Remove Image"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={handleAddImageUrl} className="text-sm font-bold underline hover:text-primary-container">
                        + Add another gallery image
                      </button>
                    </div>

                    <div 
                      className={`mt-4 p-8 border-4 border-dashed transition-colors flex flex-col items-center justify-center text-center cursor-pointer md:col-span-2 ${
                        isDragging ? 'border-primary-container bg-primary-container/10' : 'border-on-surface/40 bg-surface hover:bg-surface-container-low'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('multi-file-upload')?.click()}
                    >
                      <Icon name="cloud_upload" className="text-4xl mb-2 text-secondary" />
                      <p className="text-sm font-bold uppercase mb-1">Drag & Drop images here</p>
                      <p className="text-xs text-secondary mb-4 uppercase tracking-wider">or click to browse</p>
                      <input 
                        id="multi-file-upload"
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={(e) => handleFileUpload(e)} 
                        disabled={isUploading}
                        className="hidden"
                      />
                      {isUploading && <p className="text-sm font-bold mt-2 animate-pulse text-primary-container">Uploading images...</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2 mt-4">
                      <label className="font-bold text-sm uppercase">Video URL</label>
                      <input type="url" name="videoUrl" value={editForm.videoUrl || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" placeholder="YouTube or Vimeo link..." />
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 4: Pricing */}
              <div className={`border-4 ${(formErrors.price || formErrors.stock || formErrors.variants) ? 'border-error' : 'border-on-surface'}`}>
                <button 
                  type="button" 
                  onClick={() => setOpenSections(prev => ({ ...prev, pricing: !prev.pricing }))}
                  className={`w-full ${(formErrors.price || formErrors.stock || formErrors.variants) ? 'bg-error text-white' : 'bg-on-surface text-surface'} uppercase font-black px-6 py-3 flex justify-between items-center text-left`}
                >
                  <span className="flex items-center gap-2">
                    4. Pricing & Inventory
                    {(formErrors.price || formErrors.stock || formErrors.variants) && <span className="text-xs bg-white text-error font-black px-2 py-0.5 uppercase">Needs Attention</span>}
                  </span>
                  <span className="text-xl">{openSections.pricing ? "−" : "+"}</span>
                </button>
                {openSections.pricing && (
                  <div className="p-6 bg-surface grid grid-cols-1 md:grid-cols-2 gap-6 border-t-4 border-on-surface animate-in fade-in duration-200">
                    
                    {/* VARIANTS */}
                    <div className={`space-y-4 md:col-span-2 mb-2 p-4 border-2 ${formErrors.variants ? 'border-error bg-error/5' : 'border-on-surface bg-surface-container-low'}`}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" name="hasVariants" checked={editForm.hasVariants || false} onChange={handleChange} className="w-5 h-5 accent-primary-container" />
                        <span className="font-bold text-sm uppercase">Enable Product Variants (Different prices/stock by Size/Color)</span>
                      </label>
                      {formErrors.variants && <p className="text-xs text-error font-bold">{formErrors.variants}</p>}
                      {(editForm.hasVariants) && (
                        <div className="mt-4 space-y-4 border-t-2 border-on-surface/20 pt-4">
                          {/* Bulk Variant Generator */}
                          <div className="p-4 border-2 border-primary-container bg-surface space-y-3">
                            <h4 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                              <Icon name="auto_awesome" className="text-primary-container text-base" />
                              Quick Generate Variants
                            </h4>
                            <p className="text-[10px] text-secondary font-semibold uppercase">
                              Enter comma-separated values to auto-generate all combinations. Duplicates are skipped.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Sizes (comma separated)</label>
                                <input
                                  type="text"
                                  value={bulkSizes}
                                  onChange={(e) => setBulkSizes(e.target.value)}
                                  placeholder="e.g. S, M, L, XL, XXL"
                                  className="w-full border-2 border-on-surface p-2 text-sm outline-none focus:border-primary-container transition-colors"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Colors (comma separated)</label>
                                <input
                                  type="text"
                                  value={bulkColors}
                                  onChange={(e) => setBulkColors(e.target.value)}
                                  placeholder="e.g. Red, Blue, Black, White"
                                  className="w-full border-2 border-on-surface p-2 text-sm outline-none focus:border-primary-container transition-colors"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Default Price ({CURRENCY_CONFIG.symbol})</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={bulkPrice || ''}
                                  onChange={(e) => setBulkPrice(Number(e.target.value))}
                                  placeholder="Falls back to Regular Price"
                                  className="w-full border-2 border-on-surface p-2 text-sm outline-none focus:border-primary-container transition-colors"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Default Stock per variant</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={bulkStock || ''}
                                  onChange={(e) => setBulkStock(Number(e.target.value))}
                                  placeholder="e.g. 10"
                                  className="w-full border-2 border-on-surface p-2 text-sm outline-none focus:border-primary-container transition-colors"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                type="button"
                                onClick={handleGenerateVariants}
                                className="bg-primary-container text-on-primary-container border-2 border-on-surface px-5 py-2 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_var(--color-on-surface)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_var(--color-on-surface)] transition-all inline-flex items-center gap-2"
                              >
                                <Icon name="auto_awesome" className="text-sm" />
                                Generate Variants
                              </button>
                              {bulkSizes && bulkColors && (
                                <span className="text-[10px] text-secondary font-bold uppercase">
                                  {bulkSizes.split(',').filter(s => s.trim()).length * bulkColors.split(',').filter(c => c.trim()).length} combinations
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Existing Variants List */}
                          <p className="text-xs text-secondary font-semibold uppercase">
                            {(editForm.variants || []).length > 0 
                              ? `${(editForm.variants || []).length} variant(s) configured. Edit individual prices, stock and images below.`
                              : 'No variants yet. Use the generator above or add manually.'}
                          </p>
                          {(editForm.variants || []).map((v: any, index: number) => (
                            <div key={v.id || index} className="flex flex-wrap items-center gap-2 border-2 border-on-surface p-3 bg-surface">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Style/Name</label>
                                <input type="text" placeholder="e.g. Artwork A" value={v.name || ''} onChange={(e) => handleVariantChange(index, 'name', e.target.value)} className="w-24 border-2 border-on-surface p-1.5 text-sm outline-none" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Size</label>
                                <input type="text" placeholder="e.g. M" value={v.size || ''} onChange={(e) => handleVariantChange(index, 'size', e.target.value)} className="w-16 border-2 border-on-surface p-1.5 text-sm outline-none" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Color</label>
                                <input type="text" placeholder="e.g. Red" value={v.color || ''} onChange={(e) => handleVariantChange(index, 'color', e.target.value)} className="w-24 border-2 border-on-surface p-1.5 text-sm outline-none" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Price ({CURRENCY_CONFIG.symbol})</label>
                                <input type="number" min="0" step="0.01" placeholder="Price" value={v.price === 0 && !v.price.toString().match(/^0$/) ? '' : (v.price ?? '')} onChange={(e) => handleVariantChange(index, 'price', Number(e.target.value))} className="w-24 border-2 border-on-surface p-1.5 text-sm outline-none" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Stock</label>
                                <input type="number" min="0" placeholder="Stock" value={v.stock === 0 && !v.stock.toString().match(/^0$/) ? '' : (v.stock ?? '')} onChange={(e) => handleVariantChange(index, 'stock', Number(e.target.value))} className="w-20 border-2 border-on-surface p-1.5 text-sm outline-none" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Image</label>
                                <div className="flex gap-2 items-center">
                                  {v.imageUrl && <img src={v.imageUrl} className="w-8 h-8 object-cover border border-on-surface" alt="Variant" />}
                                  <select 
                                    value={v.imageUrl || ''} 
                                    onChange={(e) => handleVariantChange(index, 'imageUrl', e.target.value)}
                                    className="w-24 border-2 border-on-surface p-1.5 text-[10px] outline-none"
                                  >
                                    <option value="">No Image</option>
                                    {(editForm.imageUrls || []).filter(Boolean).map((url: string, i: number) => (
                                      <option key={i} value={url}>Gallery {i + 1}</option>
                                    ))}
                                  </select>
                                  <label className="cursor-pointer text-[10px] font-bold uppercase bg-primary-container text-on-surface border-2 border-on-surface px-2 py-1 shadow-[2px_2px_0px_0px_var(--color-on-surface)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_var(--color-on-surface)] transition-all">
                                    Upload
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleVariantImageUpload(e, index)} disabled={isUploading} />
                                  </label>
                                </div>
                              </div>
                              <button type="button" onClick={() => handleRemoveVariant(index)} className="text-error font-bold uppercase text-xs hover:underline ml-auto mt-4 p-1">Remove</button>
                            </div>
                          ))}
                          <button type="button" onClick={handleAddVariant} className="text-sm font-bold border-2 border-on-surface px-4 py-2 hover:bg-surface-container uppercase inline-flex items-center gap-1"><span className="text-lg">+</span> Add Single Variant</button>
                        </div>
                      )}
                    </div>

                    {/* PRICING & COST */}
                    <div className="space-y-2">
                      <label className="font-bold text-sm uppercase flex items-center gap-1">
                        Regular Price ({CURRENCY_CONFIG.symbol}) <span className="text-error font-black">*</span>
                      </label>
                      <input 
                        required 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        name="price" 
                        value={editForm.price === 0 && !editForm.price.toString().match(/^0$/) ? '' : (editForm.price ?? '')} 
                        onChange={handleChange} 
                        className={`w-full border-2 p-2 focus:ring-0 outline-none ${formErrors.price ? 'border-error bg-error/5' : 'border-on-surface'}`} 
                      />
                      {formErrors.price && <p className="text-xs text-error font-bold">{formErrors.price}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="font-bold text-sm uppercase">Sale Price ({CURRENCY_CONFIG.symbol})</label>
                      <input type="number" min="0" step="0.01" name="salePrice" value={editForm.salePrice || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" placeholder="Optional" />
                    </div>

                    {/* Cost Price (Supplier Cost) */}
                    <div className="space-y-2 md:col-span-2 p-4 border-2 border-on-surface/20 bg-surface-dim">
                      <label className="font-bold text-sm uppercase flex items-center justify-between">
                        <span>Supplier Cost Price ({CURRENCY_CONFIG.symbol})</span>
                        <span className="text-[10px] text-secondary font-semibold uppercase">Dropshipping Item Cost</span>
                      </label>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        name="costPrice" 
                        value={editForm.costPrice === 0 && !editForm.costPrice.toString().match(/^0$/) ? '' : (editForm.costPrice ?? '')} 
                        onChange={handleChange} 
                        placeholder="e.g. 15.00" 
                        className="w-full max-w-sm border-2 border-on-surface p-2 focus:ring-0 outline-none bg-surface" 
                      />
                      {editForm.price > 0 && editForm.costPrice !== undefined && editForm.costPrice !== '' && Number(editForm.costPrice) >= 0 && (
                        <div className="mt-2 text-xs font-bold p-2 bg-surface border border-on-surface flex items-center justify-between max-w-sm">
                          <span>Estimated Profit: <strong className={Number(editForm.price) - Number(editForm.costPrice) >= 0 ? 'text-green-700' : 'text-error'}>{CURRENCY_CONFIG.symbol} {(Number(editForm.price) - Number(editForm.costPrice)).toFixed(2)}</strong></span>
                          <span className="text-secondary font-semibold">({(((Number(editForm.price) - Number(editForm.costPrice)) / Number(editForm.price)) * 100).toFixed(1)}% margin)</span>
                        </div>
                      )}
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

                      <>
                        <div className="space-y-4 md:col-span-2 mt-6 p-6 border-2 border-on-surface bg-surface">
                          <h4 className="font-bold text-lg uppercase mb-2">Inventory & Purchasing</h4>
                          
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" name="allowMultiplePurchases" checked={editForm.allowMultiplePurchases !== false} onChange={handleChange} className="w-5 h-5 accent-primary-container" />
                            <span className="font-bold text-sm uppercase">Allow Multiple Purchases Per Order</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" name="trackInventory" checked={editForm.trackInventory ?? true} onChange={handleChange} className="w-5 h-5 accent-primary-container" />
                            <span className="font-bold text-sm uppercase">Track Inventory</span>
                          </label>

                          {(editForm.trackInventory ?? true) && (
                            <div className="space-y-2 pl-8 border-l-2 border-on-surface/20 ml-2">
                              <label className="font-bold text-sm uppercase flex items-center gap-1">
                                Quantity in Stock <span className="text-error font-black">*</span>
                              </label>
                              <input 
                                required 
                                type="number" 
                                min="0" 
                                name="stock" 
                                value={editForm.stock === 0 && !editForm.stock.toString().match(/^0$/) ? '' : (editForm.stock ?? '')} 
                                onChange={handleChange} 
                                className={`w-full max-w-[200px] border-2 p-2 focus:ring-0 outline-none ${formErrors.stock ? 'border-error bg-error/5' : 'border-on-surface'}`} 
                              />
                              {formErrors.stock && <p className="text-xs text-error font-bold">{formErrors.stock}</p>}
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



                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col-reverse md:flex-row md:justify-between gap-4 pt-8 mt-8 border-t-2 border-on-surface/20">
            <button 
              type="button" 
              onClick={() => {
                if (confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) {
                  setIsAdding(false); 
                  setEditingId(null);
                  setImagesToDelete([]);
                  clearDraft();
                }
              }}
              className="w-full md:w-auto bg-surface text-on-surface border-4 border-on-surface px-6 py-2 font-bold uppercase hover:bg-surface-dim transition-colors"
            >
              Cancel
            </button>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button 
                type="button" 
                onClick={handleSaveAsTemplate}
                className="w-full sm:w-auto bg-surface text-on-surface border-2 border-on-surface px-4 py-2 font-bold uppercase hover:bg-surface-dim transition-all"
              >
                Save as Template
              </button>
              <button 
                type="submit" 
                disabled={isSaving || isUploading}
                className="w-full sm:w-auto bg-primary-container text-on-surface border-4 border-on-surface px-8 py-2 font-bold uppercase shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </form>
      ) : (
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
                  <th className="p-4 border-b-4 border-on-surface text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center font-bold text-secondary">
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
                              {CURRENCY_CONFIG.symbol} {product.price.toFixed(2)}
                            </p>
                            {product.salePrice && product.salePrice > 0 ? (
                              <p className="text-[10px] font-bold text-green-700">
                                Sale: {CURRENCY_CONFIG.symbol} {product.salePrice.toFixed(2)}
                              </p>
                            ) : null}
                            {product.costPrice !== undefined && product.costPrice !== null && (
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
                          {CURRENCY_CONFIG.symbol} {product.price.toFixed(2)}
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



