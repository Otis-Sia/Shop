"use client";
import { useToast } from '@/components/providers/ToastProvider';

import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, Timestamp, getDoc, addDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Product } from "@/types/schema";
import { useCategories } from '@/hooks/useCategories';
import Icon from '@/components/Icon';
import { CURRENCY_CONFIG } from '@/lib/utils/currency';

export default function MerchantProducts() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [offeringType, setOfferingType] = useState<'goods' | 'services' | 'both'>('goods');
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
  const [isDragging, setIsDragging] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const { categories } = useCategories();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Speed & UX Improvements States
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [draftToResume, setDraftToResume] = useState<any>(null);
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
        // Fetch offering type
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userOffering = userDoc.data().offeringType || 'goods';
          setOfferingType(userOffering);
          if (userOffering === 'services') setActiveTab('services');
        }

        // Fetch products
        const productsQuery = query(collection(db, "products"), where("merchantId", "==", user.uid));
        const snapshot = await getDocs(productsQuery);
        const productsListPromises = snapshot.docs.map(async (docSnap) => {
          const productData = { id: Number(docSnap.id), ...docSnap.data() } as unknown as Product;
          if (productData.hasVariants) {
            try {
              const variantsSnap = await getDocs(collection(db, "products", docSnap.id, "variants"));
              if (variantsSnap.docs.length > 0) {
                productData.variants = variantsSnap.docs.map(vDoc => ({ id: vDoc.id, ...vDoc.data() })) as any;
              }
            } catch (err) {
              console.error("Error fetching variants for product", docSnap.id, err);
            }
          }
          return productData;
        });
        const productsList = await Promise.all(productsListPromises);
        productsList.sort((a, b) => Number(b.id) - Number(a.id));
        setProducts(productsList);

        // Load Templates from Firestore
        const templatesQuery = query(collection(db, "templates"), where("merchantId", "==", user.uid));
        const templatesSnapshot = await getDocs(templatesQuery);
        const templatesList = templatesSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setTemplates(templatesList);

        // Load Draft from Firestore
        const draftDocSnap = await getDoc(doc(db, "drafts", user.uid));
        if (draftDocSnap.exists()) {
          const draftData = draftDocSnap.data();
          if (!isAdding && editingId === null) {
            // Check if draft has timestamp or format it
            const formattedDraft = {
              ...draftData,
              timestamp: draftData.updatedAt?.toDate ? draftData.updatedAt.toDate().getTime() : Date.now()
            };
            setDraftToResume(formattedDraft);
          }
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

  // Debounced auto-save draft to Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || (!isAdding && editingId === null)) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const draftData = {
          merchantId: user.uid,
          editForm,
          isAdding,
          editingId,
          isQuickAdd,
          updatedAt: Timestamp.now()
        };
        await setDoc(doc(db, "drafts", user.uid), draftData, { merge: true });
      } catch (err) {
        console.error("Error auto-saving draft to DB:", err);
      }
    }, 3000); // 3.0 seconds debounce to minimize database write operations

    return () => clearTimeout(delayDebounceFn);
  }, [editForm, isAdding, editingId, isQuickAdd]);

  const clearDraft = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteDoc(doc(db, "drafts", user.uid));
      } catch (err) {
        console.error("Error clearing draft from DB:", err);
      }
    }
  };

  const toggleSelection = (productId: number) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProductIds(displayedItems.map(p => Number(p.id)));
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
        const product = products.find(p => Number(p.id) === id);
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
        await deleteDoc(doc(db, 'products', id.toString()));
      }
      
      setProducts(products.filter(p => !selectedProductIds.includes(Number(p.id))));
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
      stock: activeTab === 'services' ? 0 : '',
      lowStockAlert: false,
      allowBackorders: false,
      duration: activeTab === 'services' ? 60 : undefined,
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
    setEditingId(Number(product.id));
    setIsQuickAdd(false);
    
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

    setEditForm({
      ...product,
      id: undefined,
      name: `Copy of ${product.name}`,
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

  const handleDelete = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const productToDelete = products.find(p => Number(p.id) === productId);
      
      await deleteDoc(doc(db, 'products', productId.toString()));
      setProducts(products.filter(p => Number(p.id) !== productId));

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
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete product.', 'error');
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
        merchantId: user.uid,
        name: templateName,
        data: {
          itemType: editForm.itemType,
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
          duration: editForm.duration
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, "templates"), templateData);
      setTemplates(prev => [...prev, { id: docRef.id, ...templateData }]);
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
        description: editForm.description || editForm.shortDescription || editForm.name || '',
        sku: editForm.sku || '',
        brand: editForm.brand || '',
        
        groupCategory: editForm.groupCategory || selectedGroupNode?.name || '',
        category: editForm.category || '',
        subcategories: Array.isArray(editForm.subcategories) ? editForm.subcategories : (typeof editForm.subcategories === 'string' ? editForm.subcategories.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
        tags: typeof editForm.tags === 'string' ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.tags || []),
        labels: typeof editForm.labels === 'string' ? editForm.labels.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.labels || []),
        colors: typeof editForm.colors === 'string' ? editForm.colors.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.colors || []),
        sizes: typeof editForm.sizes === 'string' ? editForm.sizes.split(',').map((t: string) => t.trim()).filter(Boolean) : (editForm.sizes || []),
        
        hasVariants: editForm.hasVariants || false,
        itemType: editForm.itemType || 'goods',
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
        duration: editForm.duration || 0,
        
        updatedAt: Timestamp.now(),
        merchantId: user.uid
      };

      let saveId = editingId;
      if (isAdding) {
        saveId = Date.now();
        productData.createdAt = Timestamp.now();
      }

      const productDocRef = doc(db, 'products', saveId!.toString());
      await setDoc(productDocRef, productData, { merge: true });

      // Handle variants subcollection
      if (editForm.hasVariants && editForm.variants && editForm.variants.length > 0) {
        const variantsRef = collection(productDocRef, 'variants');
        const existingVariantsSnap = await getDocs(variantsRef);
        const existingVariantIds = new Set(existingVariantsSnap.docs.map(d => d.id));
        
        const currentVariantIds = new Set();
        
        for (const variant of editForm.variants) {
          const variantId = variant.id?.toString() || Date.now().toString() + Math.floor(Math.random()*1000);
          currentVariantIds.add(variantId);
          await setDoc(doc(variantsRef, variantId), {
            ...variant,
            updatedAt: Timestamp.now()
          }, { merge: true });
        }

        for (const id of existingVariantIds) {
          if (!currentVariantIds.has(id)) {
            await deleteDoc(doc(variantsRef, id));
          }
        }
      } else {
        const variantsRef = collection(productDocRef, 'variants');
        const existingVariantsSnap = await getDocs(variantsRef);
        for (const d of existingVariantsSnap.docs) {
          await deleteDoc(d.ref);
        }
      }

      const newProduct = { ...productData, id: saveId, variants: editForm.hasVariants ? editForm.variants : [] } as unknown as Product;
      
      if (isAdding) {
        setProducts([newProduct, ...products]);
      } else {
        setProducts(products.map(p => Number(p.id) === saveId ? newProduct : p));
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

  if (loading) {
    return <div className="p-8 font-bold animate-pulse">Loading items...</div>;
  }

  const displayedItems = products.filter(p => {
    if (activeTab === 'services') return p.itemType === 'service';
    return p.itemType !== 'service';
  });

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
          {activeTab === 'services' ? 'My Services' : 'My Products'}
        </h1>
        {(!isAdding && editingId === null) && (
          <div className="flex gap-2 sm:gap-4">
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
              Add {activeTab === 'services' ? 'Service' : 'Product'}
            </button>
          </div>
        )}
      </div>

      {(!isAdding && editingId === null && offeringType === 'both') && (
        <div className="flex border-b-4 border-on-surface mb-8 w-full">
          <button 
            onClick={() => setActiveTab('products')}
            className={`flex-1 px-2 sm:px-8 py-2.5 sm:py-3 font-black uppercase tracking-wider text-center text-xs sm:text-base transition-all ${activeTab === 'products' ? 'bg-on-surface text-surface' : 'bg-surface text-on-surface hover:bg-surface-dim'}`}
          >
            Physical Products
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`flex-1 px-2 sm:px-8 py-2.5 sm:py-3 font-black uppercase tracking-wider text-center text-xs sm:text-base transition-all border-l-4 border-on-surface ${activeTab === 'services' ? 'bg-on-surface text-surface' : 'bg-surface text-on-surface hover:bg-surface-dim'}`}
          >
            Services
          </button>
        </div>
      )}

      {(isAdding || editingId !== null) ? (
        <form onSubmit={handleSave} className="bg-surface border-4 border-on-surface p-8 mb-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-2 border-on-surface pb-4">
            <div>
              <h2 className="font-bold text-2xl uppercase">
                {isAdding ? 'Add New' : 'Edit'} {editForm.itemType === 'service' ? 'Service' : 'Product'} 
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
                        await deleteDoc(doc(db, "templates", selectedId));
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
                <label className="font-bold text-sm uppercase">Product Name *</label>
                <input required name="name" value={editForm.name || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase">Price ({CURRENCY_CONFIG.symbol}) *</label>
                <input required type="number" min="0" step="0.01" name="price" value={editForm.price || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="font-bold text-sm uppercase">Category *</label>
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

                    setEditForm((prev: any) => ({
                      ...prev,
                      groupCategory: resolvedGroup,
                      category: resolvedCat || selectedValue,
                      subcategories: resolvedSubs
                    }));
                  }}
                  className="w-full border-2 border-on-surface p-2.5 focus:ring-0 outline-none bg-surface font-bold text-sm"
                >
                  <option value="">-- Select Category --</option>
                  {allSystemCategories.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase">Short Description</label>
                <textarea name="shortDescription" value={editForm.shortDescription || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 h-16 focus:ring-0 outline-none" placeholder="Optional brief summary..."></textarea>
              </div>
              
              {/* Main Image */}
              <div className="space-y-2 md:col-span-2">
                <label className="font-bold text-sm uppercase">Main Product Image *</label>
                <div className="flex gap-2 items-center">
                  <input 
                    required
                    value={editForm.imageUrls?.[0] || ''} 
                    onChange={(e) => handleImageUrlChange(0, e.target.value)} 
                    placeholder="Image URL (https://...)"
                    className="flex-1 border-2 border-on-surface p-2 focus:ring-0 outline-none" 
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
              </div>

              {/* Stock Input */}
              <div className="space-y-4 p-4 border-2 border-on-surface bg-surface md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="trackInventory" checked={editForm.trackInventory ?? true} onChange={handleChange} className="w-5 h-5 accent-primary-container" />
                  <span className="font-bold text-sm uppercase">Track Inventory</span>
                </label>
                {(editForm.trackInventory ?? true) && (
                  <div className="space-y-1">
                    <label className="font-bold text-xs uppercase text-secondary block">Quantity in Stock *</label>
                    <input required type="number" min="0" name="stock" value={editForm.stock || ''} onChange={handleChange} className="w-32 border-2 border-on-surface p-2 focus:ring-0 outline-none" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* COLLAPSED ACCORDION FULL FORM MODE */
            <div className="space-y-4">
              
              {/* Accordion 1: Core Info */}
              <div className="border-4 border-on-surface">
                <button 
                  type="button"
                  onClick={() => setOpenSections(prev => ({ ...prev, core: !prev.core }))}
                  className="w-full bg-on-surface text-surface uppercase font-black px-6 py-3 flex justify-between items-center text-left"
                >
                  <span>1. Core Information</span>
                  <span className="text-xl">{openSections.core ? "−" : "+"}</span>
                </button>
                {openSections.core && (
                  <div className="p-6 bg-surface grid grid-cols-1 md:grid-cols-2 gap-6 border-t-4 border-on-surface animate-in fade-in duration-200">
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
              </div>

              {/* Accordion 2: Categories */}
              <div className="border-4 border-on-surface">
                <button 
                  type="button"
                  onClick={() => setOpenSections(prev => ({ ...prev, categories: !prev.categories }))}
                  className="w-full bg-on-surface text-surface uppercase font-black px-6 py-3 flex justify-between items-center text-left"
                >
                  <span>2. Categories & Organization</span>
                  <span className="text-xl">{openSections.categories ? "−" : "+"}</span>
                </button>
                {openSections.categories && (
                  <div className="p-6 bg-surface grid grid-cols-1 md:grid-cols-2 gap-6 border-t-4 border-on-surface animate-in fade-in duration-200">
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
              </div>

              {/* Accordion 3: Media */}
              <div className="border-4 border-on-surface">
                <button 
                  type="button"
                  onClick={() => setOpenSections(prev => ({ ...prev, media: !prev.media }))}
                  className="w-full bg-on-surface text-surface uppercase font-black px-6 py-3 flex justify-between items-center text-left"
                >
                  <span>3. Media</span>
                  <span className="text-xl">{openSections.media ? "−" : "+"}</span>
                </button>
                {openSections.media && (
                  <div className="p-6 bg-surface grid grid-cols-1 md:grid-cols-2 gap-6 border-t-4 border-on-surface animate-in fade-in duration-200">
                    <div className="space-y-4 md:col-span-2">
                      <label className="font-bold text-sm uppercase block">Main & Gallery Images *</label>
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
                              required={index === 0 && !!url}
                              value={(editForm.imageAltTexts && editForm.imageAltTexts[url]) || ''} 
                              onChange={(e) => handleImageAltChange(url, e.target.value)} 
                              placeholder={index === 0 ? "Alternative text (required for main image)" : "Alternative text (optional)"}
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
              <div className="border-4 border-on-surface">
                <button 
                  type="button"
                  onClick={() => setOpenSections(prev => ({ ...prev, pricing: !prev.pricing }))}
                  className="w-full bg-on-surface text-surface uppercase font-black px-6 py-3 flex justify-between items-center text-left"
                >
                  <span>4. Pricing & Inventory</span>
                  <span className="text-xl">{openSections.pricing ? "−" : "+"}</span>
                </button>
                {openSections.pricing && (
                  <div className="p-6 bg-surface grid grid-cols-1 md:grid-cols-2 gap-6 border-t-4 border-on-surface animate-in fade-in duration-200">
                    
                    {/* VARIANTS */}
                    <div className="space-y-4 md:col-span-2 mb-2 p-4 border-2 border-on-surface bg-surface-container-low">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" name="hasVariants" checked={editForm.hasVariants || false} onChange={handleChange} className="w-5 h-5 accent-primary-container" />
                        <span className="font-bold text-sm uppercase">Enable Product Variants (Different prices/stock by Size/Color)</span>
                      </label>
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
                                <input type="number" min="0" step="0.01" placeholder="Price" value={v.price === 0 && !v.price.toString().match(/^0$/) ? '' : v.price} onChange={(e) => handleVariantChange(index, 'price', Number(e.target.value))} className="w-24 border-2 border-on-surface p-1.5 text-sm outline-none" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-secondary">Stock</label>
                                <input type="number" min="0" placeholder="Stock" value={v.stock === 0 && !v.stock.toString().match(/^0$/) ? '' : v.stock} onChange={(e) => handleVariantChange(index, 'stock', Number(e.target.value))} className="w-20 border-2 border-on-surface p-1.5 text-sm outline-none" />
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

                    {/* PRICING */}
                    <div className="space-y-2">
                      <label className="font-bold text-sm uppercase">Regular Price ({CURRENCY_CONFIG.symbol}) *</label>
                      <input required type="number" min="0" step="0.01" name="price" value={editForm.price || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="font-bold text-sm uppercase">Sale Price ({CURRENCY_CONFIG.symbol})</label>
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
        <div className="space-y-4">
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
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-on-surface text-surface uppercase font-bold text-sm">
                  <th className="p-4 border-b-4 border-on-surface w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll} 
                      checked={displayedItems.length > 0 && selectedProductIds.length === displayedItems.length}
                      className="accent-primary-container w-4 h-4 cursor-pointer"
                    />
                  </th>
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
                    <td colSpan={activeTab === 'services' ? 5 : 6} className="p-8 text-center font-bold">No {activeTab === 'services' ? 'services' : 'products'} found. Add one to get started!</td>
                  </tr>
                ) : (
                  displayedItems.map((product) => (
                    <tr key={product.id} className="border-b border-on-surface hover:bg-surface-dim transition-colors">
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedProductIds.includes(Number(product.id))}
                          onChange={() => toggleSelection(Number(product.id))}
                          className="accent-primary-container w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        {product.imageUrls?.[0] ? (
                          <img src={product.imageUrls[0]} alt={product.name} className="w-16 h-16 object-cover border-2 border-on-surface" />
                        ) : (
                          <div className="w-16 h-16 bg-surface-dim border-2 border-on-surface flex items-center justify-center text-xs font-bold">No Img</div>
                        )}
                      </td>
                      <td className="p-4 font-bold max-w-[200px] truncate">{product.name}</td>
                      <td className="p-4">{CURRENCY_CONFIG.symbol} {product.price.toFixed(2)}</td>
                      {activeTab !== 'services' && <td className="p-4">{product.stock === null ? 'N/A' : product.stock}</td>}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2 justify-end">
                          <button 
                            onClick={() => handleDuplicate(product)}
                            className="text-xs sm:text-sm border-2 border-on-surface bg-primary-container text-on-surface px-2.5 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                          >
                            Duplicate
                          </button>
                          <button 
                            onClick={() => handleEdit(product)}
                            className="text-xs sm:text-sm border-2 border-on-surface px-2.5 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(Number(product.id))}
                            className="text-xs sm:text-sm border-2 border-error text-error px-2.5 py-1 font-bold hover:bg-error hover:text-white transition-colors shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-4">
            {displayedItems.length === 0 ? (
              <div className="bg-surface border-4 border-on-surface p-8 text-center font-bold">
                No {activeTab === 'services' ? 'services' : 'products'} found. Add one to get started!
              </div>
            ) : (
              displayedItems.map((product) => (
                <div key={product.id} className="bg-surface border-4 border-on-surface p-4 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col gap-3">
                  <div className="flex gap-4 items-start">
                    <input 
                      type="checkbox" 
                      checked={selectedProductIds.includes(Number(product.id))}
                      onChange={() => toggleSelection(Number(product.id))}
                      className="accent-primary-container w-4 h-4 cursor-pointer mt-1 shrink-0"
                    />
                    
                    {product.imageUrls?.[0] ? (
                      <img src={product.imageUrls[0]} alt={product.name} className="w-16 h-16 object-cover border-2 border-on-surface shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-surface-dim border-2 border-on-surface flex items-center justify-center text-xs font-bold shrink-0">No Img</div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate">{product.name}</h3>
                      <p className="text-xs font-semibold mt-1 text-primary-container">
                        {CURRENCY_CONFIG.symbol} {product.price.toFixed(2)}
                      </p>
                      {activeTab !== 'services' && (
                        <p className="text-[11px] text-secondary mt-1 font-medium">
                          Stock: <span className="font-bold text-on-surface">{product.stock === null ? 'N/A' : product.stock}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end border-t-2 border-surface-container pt-3">
                    <button 
                      onClick={() => handleDuplicate(product)}
                      className="text-xs border-2 border-on-surface bg-primary-container text-on-surface px-3 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                    >
                      Duplicate
                    </button>
                    <button 
                      onClick={() => handleEdit(product)}
                      className="text-xs border-2 border-on-surface px-3 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(Number(product.id))}
                      className="text-xs border-2 border-error text-error px-3 py-1 font-bold hover:bg-error hover:text-white transition-colors shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
