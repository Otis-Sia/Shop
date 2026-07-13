"use client";

import React, { useState, useEffect } from 'react';
import { Product } from '@/lib/data/products-data';
import { collection, getDocs, doc, setDoc, deleteDoc, Timestamp, query, where, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/Icon';
import { getAllOrders } from '@/lib/api/order';
import { Order } from '@/types/schema';

import { getSystemCategories, seedCategories, createSystemCategory, updateSystemCategory, deleteSystemCategory } from '@/lib/api/categories';
import { SystemCategory, CategoryNode } from '@/types/schema';
import CategoryManager from '@/components/admin/CategoryManager';
import MerchantDetailsPanel from '@/components/admin/MerchantDetailsPanel';

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [merchantsLoading, setMerchantsLoading] = useState(false);
  const [categories, setCategories] = useState<SystemCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'orders' | 'customers' | 'merchants' | 'categories' | 'settings' | 'merchant_details'>('overview');
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'merchant' | 'customer' | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Orders state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Inventory state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Load products initially
  const loadProducts = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const data: Product[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: Number(docSnap.id),
          name: d.name || '',
          price: d.price || 0,
          description: d.description || '',
          category: d.category || '',
          stock: d.stock || 0,
          tags: d.tags || [],
          colors: d.colors || [],
          sizes: d.sizes || [],
          discount: d.discount || 0,
          brand: d.brand || '',
          image_url: d.imageUrls && d.imageUrls.length > 0 ? d.imageUrls[0] : '',
          additional_images: d.imageUrls && d.imageUrls.length > 1 ? d.imageUrls.slice(1) : []
        } as Product;
      });
      // Sort by id descending
      data.sort((a, b) => b.id - a.id);
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status.');
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
    loadCustomers();
    loadMerchants();
  }, []);

  const loadCustomers = async () => {
    setCustomersLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const firstName = d.first_name || '';
        const lastName = d.last_name || '';
        const displayName = d.displayName || `${firstName} ${lastName}`.trim() || 'Customer';

        return {
          id: docSnap.id,
          uid: d.uid || docSnap.id,
          first_name: firstName,
          last_name: lastName,
          displayName,
          email: d.email || '',
          role: d.role || 'customer',
          createdAt: d.createdAt || null,
        };
      });

      data.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setCustomersLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: Timestamp.now()
      });
      setCustomers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error updating user role:', err);
      alert('Failed to update user role.');
    }
  };

  useEffect(() => {
    loadProducts();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCurrentUserRole(userDoc.data().role || 'customer');
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
        }
      } else {
        setCurrentUserRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadMerchants = async () => {
    setMerchantsLoading(true);
    try {
      const q = query(collection(db, 'users'), where('merchantStatus', 'in', ['pending', 'approved', 'rejected', 'verified']));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMerchants(data);
    } catch (err) {
      console.error('Error fetching merchants:', err);
    } finally {
      setMerchantsLoading(false);
    }
  };

  const handleUpdateMerchantStatus = async (merchantId: string, newStatus: string) => {
    try {
      const role = (newStatus === 'approved' || newStatus === 'verified') ? 'merchant' : 'customer';
      await updateDoc(doc(db, 'users', merchantId), { merchantStatus: newStatus, role });
      setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, merchantStatus: newStatus, role } : m));
    } catch (error) {
      console.error('Error updating merchant status:', error);
      alert('Failed to update merchant status.');
    }
  };

  useEffect(() => {
    if (activeTab === 'customers' && customers.length === 0 && !customersLoading) {
      loadCustomers();
    }
    if (activeTab === 'categories') {
      loadCategories();
    }
  }, [activeTab]);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const data = await getSystemCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editingId !== null) {
      setIsSaving(true);
      try {
        const cleanedImages = (editForm.additional_images || []).filter(url => url.trim() !== '');
        const allImages = [editForm.image_url || '', ...cleanedImages].filter(url => url.trim() !== '');
        
        await setDoc(doc(db, 'products', editingId.toString()), {
          name: editForm.name || '',
          description: editForm.description || '',
          price: editForm.price || 0,
          discount: editForm.discount || 0,
          brand: editForm.brand || '',
          currency: 'USD',
          stock: editForm.stock || 0,
          category: editForm.category || '',
          imageUrls: allImages,
          tags: editForm.tags || [],
          colors: editForm.colors || [],
          sizes: editForm.sizes || [],
          updatedAt: Timestamp.now(),
        }, { merge: true });

        const updatedProducts = products.map((p) => {
          if (p.id === editingId) {
            return { ...p, ...editForm, additional_images: cleanedImages } as Product;
          }
          return p;
        });
        
        setProducts(updatedProducts);
        setEditingId(null);
        setIsAdding(false);
      } catch (error) {
        console.error("Error updating product:", error);
        alert('An error occurred while saving.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSaveNew = async () => {
    setIsSaving(true);
    try {
      const newId = Date.now();
      const cleanedImages = (editForm.additional_images || []).filter(url => url.trim() !== '');
      const allImages = [editForm.image_url || '', ...cleanedImages].filter(url => url.trim() !== '');
      
      const newProductDoc = {
        name: editForm.name || '',
        description: editForm.description || '',
        price: editForm.price || 0,
        discount: editForm.discount || 0,
        brand: editForm.brand || '',
        currency: 'USD',
        stock: editForm.stock || 0,
        category: editForm.category || '',
        imageUrls: allImages,
        tags: editForm.tags || [],
        colors: editForm.colors || [],
        sizes: editForm.sizes || [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'products', newId.toString()), newProductDoc);

      const newProduct = { ...editForm, id: newId, additional_images: cleanedImages } as Product;
      setProducts([newProduct, ...products]);
      setEditingId(null);
      setIsAdding(false);
    } catch (error) {
      console.error("Error creating product:", error);
      alert('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setIsAdding(false);
    setEditingId(product.id);
    setEditForm({ ...product });
  };

  const handleAddNew = () => {
    setEditingId(null);
    setIsAdding(true);
    setEditForm({
      name: '',
      category: 'Apparel',
      brand: '',
      price: 0,
      discount: 0,
      stock: 10,
      image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFaQKI8aAiivuScjPrurF-hoEuX3fF2laig6LniCbrjXtkrY_HfdHcUttt7K2FoHUHxQ9GGM0KWc5GbaNY7Sm9_boqsPKZZUyF8-tkjR_FDIB5mcW-E5NubfWV_QxmHKcx6nPISskp-RiZ0xHxmbIpYO4F5r26fKTSV3gOA3_kNmg3PurhY_FcDF5B2r3svJTjoU3cKst9aZhObVrNDD4X4ibkgArawzX_zDM7tKwDTjEHU_Ms7TVc31Kj1cNRozD9hUTBqJjZBSx7',
      additional_images: [],
      description: '',
      tags: [],
      colors: [],
      sizes: []
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: (name === 'price' || name === 'stock' || name === 'discount') ? Number(value) : value,
    }));
  };

  const handleAddImageUrl = () => {
    setEditForm(prev => ({
      ...prev,
      additional_images: [...(prev.additional_images || []), '']
    }));
  };

  const handleRemoveImageUrl = (index: number) => {
    setEditForm(prev => {
      const updated = [...(prev.additional_images || [])];
      updated.splice(index, 1);
      return { ...prev, additional_images: updated };
    });
  };

  const handleImageUrlChange = (index: number, value: string) => {
    setEditForm(prev => {
      const updated = [...(prev.additional_images || [])];
      updated[index] = value;
      return { ...prev, additional_images: updated };
    });
  };

  const handleRemoveProduct = async (productId: number) => {
    if (confirm('Are you absolutely sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', productId.toString()));
        setProducts(products.filter(p => p.id !== productId));
      } catch (error) {
        console.error("Error deleting product:", error);
        alert('Failed to delete product.');
      }
    }
  };

  // Filter products for inventory management
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate dynamic stats
  const totalStockAlerts = products.filter(p => (p.stock ?? 0) <= 5).length;
  const categoriesList = Array.from(new Set(products.map(p => p.category || 'Apparel')));
  const brandsList = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));
  
  // Extract all categories from dynamic state for the form datalist
  const allSystemCategories = React.useMemo(() => {
    const list: string[] = [];
    categories.forEach(group => {
      group.categories.forEach(cat => {
        list.push(cat.name);
        if (cat.subcategories) list.push(...cat.subcategories);
      });
    });
    return Array.from(new Set(list)).sort();
  }, [categories]);

  // Total inventory value
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * (p.stock ?? 0)), 0);

  return (
    <div className="bg-background min-h-screen text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <datalist id="category-options">
        {allSystemCategories.map(cat => (
          <option key={cat} value={cat} />
        ))}
      </datalist>
      <datalist id="brand-options">
        {brandsList.map(brand => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
      
      {/* SIDE NAVIGATION BAR */}
      <aside className="fixed left-0 top-0 h-screen flex flex-col py-6 w-64 bg-surface border-r-2 border-on-surface z-40 hidden lg:flex">
        <div className="px-6 mb-10">
          <Link href="/" className="font-headline-md text-2xl font-black text-on-surface uppercase tracking-tighter hover:text-primary-container transition-colors flex items-center gap-2">
            <Image src="/Logo.svg" alt="Logo" width={32} height={32} className="w-auto h-8 dark:invert dark:hue-rotate-180" />
            <Image src="/name.svg" alt="JUJ4" width={80} height={32} className="w-auto h-5 dark:invert dark:hue-rotate-180" />
            <span className="ml-2">Admin</span>
          </Link>
          <p className="text-xs font-semibold text-secondary uppercase tracking-widest mt-1">System Management</p>
        </div>
        
        <nav className="flex-grow">
          <ul className="space-y-1">
            <li>
              <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                  activeTab === 'overview' 
                    ? 'bg-primary-container text-on-primary-container border-on-surface' 
                    : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                }`}
              >
                <Icon name="dashboard" />
                <span>Overview</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                  activeTab === 'inventory' 
                    ? 'bg-primary-container text-on-primary-container border-on-surface' 
                    : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                }`}
              >
                <Icon name="inventory" />
                <span>Inventory</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                  activeTab === 'orders' 
                    ? 'bg-primary-container text-on-primary-container border-on-surface' 
                    : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                }`}
              >
                <Icon name="shopping_basket" />
                <span>Orders</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('customers')}
                className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                  activeTab === 'customers' 
                    ? 'bg-primary-container text-on-primary-container border-on-surface' 
                    : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                }`}
              >
                <Icon name="group" />
                <span>Customers</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('merchants')}
                className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                  activeTab === 'merchants' || activeTab === 'merchant_details'
                    ? 'bg-primary-container text-on-primary-container border-on-surface' 
                    : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                }`}
              >
                <Icon name="storefront" />
                <span>Merchants</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('categories')}
                className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                  activeTab === 'categories' 
                    ? 'bg-primary-container text-on-primary-container border-on-surface' 
                    : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                }`}
              >
                <Icon name="category" />
                <span>Categories</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                  activeTab === 'settings' 
                    ? 'bg-primary-container text-on-primary-container border-on-surface' 
                    : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                }`}
              >
                <Icon name="settings" />
                <span>Settings</span>
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="px-6 mt-auto space-y-4">
          {/* Add Product removed for Admins */}
          
          <div className="pt-4 border-t border-surface-container-highest flex items-center gap-3">
            <div className="w-10 h-10 bg-on-surface flex items-center justify-center text-surface-bright border border-on-surface font-black">
              A
            </div>
            <div className="overflow-hidden">
              <p className="font-extrabold text-xs uppercase text-on-surface truncate">Admin User</p>
              <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="lg:ml-64 p-4 sm:p-6 md:p-12 min-h-screen">
        
        {/* MOBILE NAVIGATION TOGGLE BUTTON */}
        <div className="lg:hidden mb-6 flex justify-between items-center bg-surface border-2 border-on-surface p-3 shadow-[2px_2px_0px_0px_var(--color-on-surface)]">
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex items-center gap-2 bg-primary-container text-on-surface border-2 border-on-surface px-3 py-1.5 font-bold uppercase text-[11px] shadow-[2px_2px_0px_0px_var(--color-on-surface)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_var(--color-on-surface)] transition-all"
          >
            <Icon name="menu" className="text-sm" />
            <span>Admin Menu</span>
          </button>
          
          <span className="font-black text-[10px] uppercase tracking-wider bg-surface-container px-2.5 py-1 border border-on-surface text-secondary flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-primary-container border border-on-surface rounded-full block animate-pulse"></span>
            Tab: {activeTab === 'merchant_details' ? 'merchants' : activeTab}
          </span>
        </div>

        {/* MOBILE SIDEBAR DRAWER */}
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            {/* Drawer Container */}
            <aside className="fixed left-0 top-0 h-screen flex flex-col py-6 w-64 bg-surface border-r-4 border-on-surface z-50 lg:hidden animate-in slide-in-from-left duration-300">
              <div className="px-6 mb-8 flex justify-between items-center">
                <div>
                  <h3 className="font-headline-sm text-lg font-black text-on-surface uppercase tracking-tight">Admin Menu</h3>
                  <p className="text-[10px] font-semibold text-secondary uppercase tracking-widest mt-0.5">System Management</p>
                </div>
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="text-on-surface hover:text-primary-container"
                >
                  <Icon name="close" className="text-2xl" />
                </button>
              </div>

              <nav className="flex-grow">
                <ul className="space-y-1">
                  <li>
                    <button 
                      onClick={() => { setActiveTab('overview'); setIsMobileSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                        activeTab === 'overview' 
                          ? 'bg-primary-container text-on-primary-container border-on-surface' 
                          : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                      }`}
                    >
                      <Icon name="dashboard" />
                      <span>Overview</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { setActiveTab('inventory'); setIsMobileSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                        activeTab === 'inventory' 
                          ? 'bg-primary-container text-on-primary-container border-on-surface' 
                          : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                      }`}
                    >
                      <Icon name="inventory" />
                      <span>Inventory</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { setActiveTab('orders'); setIsMobileSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                        activeTab === 'orders' 
                          ? 'bg-primary-container text-on-primary-container border-on-surface' 
                          : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                      }`}
                    >
                      <Icon name="shopping_basket" />
                      <span>Orders</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { setActiveTab('customers'); setIsMobileSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                        activeTab === 'customers' 
                          ? 'bg-primary-container text-on-primary-container border-on-surface' 
                          : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                      }`}
                    >
                      <Icon name="group" />
                      <span>Customers</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { setActiveTab('merchants'); setIsMobileSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                        activeTab === 'merchants' || activeTab === 'merchant_details'
                          ? 'bg-primary-container text-on-primary-container border-on-surface' 
                          : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                      }`}
                    >
                      <Icon name="storefront" />
                      <span>Merchants</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { setActiveTab('categories'); setIsMobileSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                        activeTab === 'categories' 
                          ? 'bg-primary-container text-on-primary-container border-on-surface' 
                          : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                      }`}
                    >
                      <Icon name="category" />
                      <span>Categories</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { setActiveTab('settings'); setIsMobileSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-6 py-3 font-extrabold uppercase text-xs tracking-wider transition-all border-l-4 ${
                        activeTab === 'settings' 
                          ? 'bg-primary-container text-on-primary-container border-on-surface' 
                          : 'text-secondary hover:bg-secondary-container hover:text-on-surface border-transparent'
                      }`}
                    >
                      <Icon name="settings" />
                      <span>Settings</span>
                    </button>
                  </li>
                </ul>
              </nav>

              <div className="px-6 mt-auto">
                <div className="pt-4 border-t border-surface-container-highest flex items-center gap-3">
                  <div className="w-10 h-10 bg-on-surface flex items-center justify-center text-surface-bright border border-on-surface font-black">
                    A
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-extrabold text-xs uppercase text-on-surface truncate">Admin User</p>
                    <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Super Admin</p>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* ─── TAB 1: SYSTEM OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <div className="animate-in fade-in duration-300">
            {/* Top Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">Dashboard</p>
                <h2 className="font-headline-md text-3xl md:text-4xl font-black text-on-surface uppercase tracking-tight">System Overview</h2>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <div className="flex items-center bg-surface border-2 border-on-surface px-4 py-2 text-xs font-bold uppercase tracking-wider w-full md:w-auto justify-center">
                  <Icon name="calendar_today" className="mr-2 text-sm" />
                  <span>Last 30 Days</span>
                </div>
                <button className="bg-surface border-2 border-on-surface py-2 px-6 text-xs font-extrabold uppercase tracking-wider hover:bg-surface-container transition-colors active:scale-95 duration-150">
                  Export
                </button>
              </div>
            </header>

            {/* Bento KPI Cards Grid */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              {/* Highlight Card */}
              <div className="md:col-span-2 bg-primary-container border-2 border-on-surface p-6 flex flex-col justify-between shadow-[4px_4px_0px_0px_var(--color-on-surface)] relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-4">
                  <Icon name="trending_up" className="text-[150px] font-black" />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <Icon name="trending_up" className="text-3xl font-black" />
                    <span className="font-extrabold bg-on-surface text-surface px-2 py-0.5 text-[10px] uppercase tracking-wider">+14.2%</span>
                  </div>
                  <h3 className="font-headline-md text-lg font-black mt-6 uppercase tracking-wider">Total Sales Revenue</h3>
                </div>
                <p className="font-headline-md text-4xl md:text-5xl font-black mt-8 text-on-surface tracking-tighter">Ksh 284,902.00</p>
              </div>
 
              {/* Active Users */}
              <div className="md:col-span-2 bg-surface border-2 border-on-surface p-6 flex flex-col justify-between shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:-translate-y-0.5 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Icon name="group" className="text-secondary" />
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Active Now</span>
                  </div>
                  <h3 className="font-extrabold text-xs text-secondary uppercase tracking-wider">Active Users</h3>
                  <p className="font-headline-md text-3xl font-black mt-2 text-on-surface">{customers.length}</p>
                </div>
                <div className="w-full mt-6">
                  <div className="w-full bg-surface-container h-2 border border-on-surface">
                    <div className="bg-primary-container h-full w-[72%]"></div>
                  </div>
                  <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mt-2">72% of daily limit</p>
                </div>
              </div>
 

            </section>

            {/* Data Section: Recent Orders */}
            <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] mb-12">
              <div className="p-6 border-b-2 border-on-surface flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface">
                <h3 className="font-headline-md text-lg font-black uppercase tracking-wider">Recent System Orders</h3>
                <span className="inline-block bg-primary-container text-on-primary-container text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider border border-on-surface">Live Sync Active</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-on-surface text-surface uppercase text-[10px] tracking-widest font-black">
                      <th className="p-4 border-b border-on-surface">Order ID</th>
                      <th className="p-4 border-b border-on-surface">Customer</th>
                      <th className="p-4 border-b border-on-surface">Merchant</th>
                      <th className="p-4 border-b border-on-surface">Status</th>
                      <th className="p-4 border-b border-on-surface">Amount</th>
                      <th className="p-4 border-b border-on-surface">Date</th>
                      <th className="p-4 border-b border-on-surface text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-surface-container-highest text-sm">
                    {ordersLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-secondary font-bold text-xs uppercase tracking-widest">
                          Loading orders...
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-secondary font-bold text-xs uppercase tracking-widest">
                          No recent orders.
                        </td>
                      </tr>
                    ) : (
                      orders.slice(0, 5).map(order => {
                        const statusColors: Record<string, string> = {
                          pending: 'bg-surface-container-highest text-on-surface border-on-surface',
                          processing: 'bg-primary-container text-on-primary-container border-on-surface',
                          shipped: 'bg-on-surface text-surface border-on-surface',
                          delivered: 'bg-green-500 text-white border-on-surface',
                          cancelled: 'border-error text-error bg-error-container',
                        };
                        const statusClass = statusColors[order.status?.toLowerCase()] || 'bg-surface-container text-on-surface border-on-surface';
                        const initials = order.contactInformation?.fullName 
                          ? order.contactInformation.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                          : 'GT';
                          
                        const orderMerchant = merchants.find(m => m.id === order.merchantId);
                        const merchantName = orderMerchant?.storeName || 
                                             (orderMerchant?.first_name ? `${orderMerchant.first_name} ${orderMerchant.last_name || ''}` : null) || 
                                             order.merchantId || 
                                             'Unknown';

                        return (
                          <tr key={order.id} className="hover:bg-secondary-container transition-colors cursor-pointer group">
                            <td className="p-4 font-black">#{order.id?.slice(-6).toUpperCase()}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-primary-fixed border border-on-surface rounded-full flex items-center justify-center text-[10px] font-black text-on-surface">
                                  {initials}
                                </div>
                                <span className="font-semibold text-on-surface">
                                  {order.contactInformation?.fullName || 'Guest'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <button 
                                onClick={() => { setActiveTab('merchant_details'); setSelectedMerchantId(order.merchantId); }}
                                className="font-bold text-primary-container bg-primary-container/10 px-2 py-1 rounded-sm text-xs hover:bg-primary-container/20 transition-colors"
                              >
                                {merchantName}
                              </button>
                            </td>
                            <td className="p-4">
                              {currentUserRole === 'admin' ? (
                                <span className={`text-[10px] px-2.5 py-1 font-black uppercase border border-on-surface ${statusClass}`}>
                                  {order.status}
                                </span>
                              ) : (
                                <select 
                                  value={order.status}
                                  onChange={(e) => order.id && handleUpdateOrderStatus(order.id, e.target.value)}
                                  className={`text-[10px] px-2.5 py-1 font-black uppercase border border-on-surface cursor-pointer outline-none ${statusClass}`}
                                >
                                  <option value="pending">PENDING</option>
                                  <option value="processing">PROCESSING</option>
                                  <option value="shipped">SHIPPED</option>
                                  <option value="delivered">DELIVERED</option>
                                  <option value="cancelled">CANCELLED</option>
                                </select>
                              )}
                            </td>
                            <td className="p-4 font-extrabold">Ksh {order.totalAmount?.toFixed(2)}</td>
                            <td className="p-4 font-semibold text-secondary text-xs uppercase">
                              {order.createdAt ? new Date((order.createdAt as any).seconds ? (order.createdAt as any).seconds * 1000 : (order.createdAt as any)).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-4 text-right">
                              <button className="text-secondary hover:text-on-surface flex items-center justify-center ml-auto" type="button">
                                <Icon name="more_vert" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t-2 border-on-surface flex justify-center bg-surface">
                <button 
                  onClick={() => setActiveTab('orders')}
                  className="font-bold text-xs uppercase tracking-wider text-secondary hover:text-on-surface underline"
                >
                  View All Live Orders
                </button>
              </div>
            </section>

            {/* Performance and Charts Section */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-on-surface text-surface p-6 border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col justify-between">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-headline-md text-lg font-black uppercase tracking-wider">Peak Performance Hours</h3>
                  <Icon name="auto_graph" className="text-primary-container text-2xl" />
                </div>
                {/* Mock Chart Visualization */}
                <div className="flex items-end justify-between h-48 gap-1.5 md:gap-3 px-2">
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '40%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">40%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '55%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">55%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '45%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">45%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '80%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">80%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '100%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">100%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '90%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">90%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '60%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">60%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '30%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">30%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '40%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">40%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '50%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">50%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '70%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">70%</div>
                  </div>
                  <div className="w-full bg-primary-container hover:bg-amber-500 transition-colors cursor-pointer group relative" style={{ height: '85%' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-on-surface font-black px-1.5 py-0.5 text-[9px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity">85%</div>
                  </div>
                </div>
                <div className="flex justify-between mt-4 font-bold text-[10px] text-surface-variant uppercase tracking-wider px-1">
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>00:00</span>
                </div>
              </div>

              <div className="bg-surface border-2 border-on-surface p-6 relative overflow-hidden group shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col justify-between">
                <div>
                  <h3 className="font-headline-md text-lg font-black uppercase tracking-wider mb-6">Quick Analytics</h3>
                  <ul className="space-y-4">
                    <li className="flex justify-between border-b-2 border-surface-container-high pb-2">
                      <span className="font-semibold text-xs text-secondary uppercase tracking-wider">Conversion Rate</span>
                      <span className="font-black text-sm text-on-surface">3.4%</span>
                    </li>
                    <li className="flex justify-between border-b-2 border-surface-container-high pb-2">
                      <span className="font-semibold text-xs text-secondary uppercase tracking-wider">Avg. Order Value</span>
                      <span className="font-black text-sm text-on-surface">Ksh 142.00</span>
                    </li>
                    <li className="flex justify-between border-b-2 border-surface-container-high pb-2">
                      <span className="font-semibold text-xs text-secondary uppercase tracking-wider">Bounce Rate</span>
                      <span className="font-black text-sm text-on-surface">42%</span>
                    </li>
                  </ul>
                </div>
                <button className="mt-8 w-full border-2 border-on-surface py-3 font-bold uppercase tracking-wider text-xs hover:bg-on-surface hover:text-white transition-all active:scale-95 duration-150 shadow-[2px_2px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_var(--color-on-surface)]">
                  Deep Dive Report
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB 2: INVENTORY DATABASE ─── */}
        {activeTab === 'inventory' && (
          <div className="animate-in fade-in duration-300">
            {/* Top Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">Inventory</p>
                <h2 className="font-headline-md text-3xl md:text-4xl font-black text-on-surface uppercase tracking-tight">Products Database</h2>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                {/* Add Product removed for Admins */}
              </div>
            </header>

            {/* Quick Inventory Summary Bento Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-surface border-2 border-on-surface p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-on-surface text-surface flex items-center justify-center">
                  <Icon name="category" className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Total Products</p>
                  <p className="font-black text-lg text-on-surface">{products.length}</p>
                </div>
              </div>
              <div className="bg-surface border-2 border-on-surface p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-container text-on-primary-container flex items-center justify-center border border-on-surface">
                  <Icon name="payments" className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Inventory Value</p>
                  <p className="font-black text-lg text-on-surface">Ksh {totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="bg-surface border-2 border-on-surface p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-red-100 text-error flex items-center justify-center border border-error">
                  <Icon name="warning" className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Low Stock Alerts</p>
                  <p className="font-black text-lg text-on-surface">{totalStockAlerts}</p>
                </div>
              </div>
            </section>

            {/* Live Filter Controls */}
            <section className="bg-surface border-2 border-on-surface p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="w-full md:max-w-md relative">
                <input 
                  type="text"
                  placeholder="Search products by name, tag, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 border-2 border-on-surface rounded-none font-medium placeholder:font-bold placeholder:text-secondary focus:ring-0"
                />
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg" />
              </div>
              {/* Category Filter */}
              <div className="w-full md:w-48">
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-extrabold uppercase text-xs tracking-wider focus:ring-0 bg-surface"
                >
                  <option value="All">All Categories</option>
                  {categoriesList.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Live Products Table */}
            <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-surface">
                  <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
                  <p className="mt-4 font-bold text-xs tracking-widest text-secondary uppercase">Loading Live Inventory...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <Icon name="info" className="text-4xl text-secondary mb-3" />
                  <h4 className="font-extrabold uppercase text-sm">No items found</h4>
                  <p className="text-xs text-secondary mt-1 max-w-[280px]">Adjust your filter query or add a brand new catalog item to get started!</p>
                </div>
              ) : (
                <>
                {/* Desktop view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-on-surface text-surface uppercase text-[10px] tracking-widest font-black border-b border-on-surface">
                        <th className="p-4 w-20">Image</th>
                        <th className="p-4 w-1/3">Name & Details</th>
                        <th className="p-4 text-center w-24">Price</th>
                        <th className="p-4 text-center w-24">Discount</th>
                        <th className="p-4 text-center w-28">Stock</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-surface-container-highest text-sm">
                      {filteredProducts.map((product) => {
                        const originalPrice = Number(product.price);
                        const discount = product.discount || 0;
                        const unitPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
                        const isLowStock = (product.stock ?? 0) <= 5;

                        return (
                          <tr key={product.id} className="hover:bg-secondary-container/50 transition-colors">
                            {/* Product Image */}
                            <td className="p-4">
                              <div className="w-14 bg-surface-container-high border border-on-surface overflow-hidden flex-shrink-0 flex items-center justify-center">
                                <img 
                                  src={product.image_url || 'https://via.placeholder.com/150'} 
                                  alt={product.name} 
                                  className="w-full h-auto object-contain" 
                                />
                              </div>
                            </td>

                            {/* Product Info */}
                            <td className="p-4">
                              <div>
                                <h4 className="font-black text-on-surface uppercase text-sm leading-tight">{product.name}</h4>
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  <span className="bg-surface-container text-on-surface text-[9px] font-black uppercase px-2 py-0.5 border border-on-surface">
                                    {product.category || 'Apparel'}
                                  </span>
                                  {discount > 0 && (
                                    <span className="bg-primary-container text-on-primary-container text-[9px] font-black uppercase px-2 py-0.5 border border-on-surface">
                                      {discount}% OFF
                                    </span>
                                  )}
                                  {product.additional_images && product.additional_images.length > 0 && (
                                    <span className="bg-surface border border-on-surface text-secondary text-[9px] font-bold px-1.5 py-0.5">
                                      +{product.additional_images.length} Pics
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Base Price */}
                            <td className="p-4 text-center font-extrabold">
                              <div>
                                <span className="text-on-surface">Ksh {unitPrice.toFixed(2)}</span>
                                {discount > 0 && (
                                  <div className="text-[10px] text-secondary line-through font-normal">Ksh {originalPrice.toFixed(2)}</div>
                                )}
                              </div>
                            </td>

                            {/* Discount */}
                            <td className="p-4 text-center font-black">
                              <span className={discount > 0 ? "text-primary-container bg-amber-50 px-2 py-0.5 border border-primary-container text-xs" : "text-secondary text-xs font-medium"}>
                                {discount > 0 ? `${discount}%` : '-'}
                              </span>
                            </td>

                            {/* Stock */}
                            <td className="p-4 text-center">
                              <span className={`inline-block px-3 py-1 font-black text-xs uppercase border border-on-surface ${
                                isLowStock 
                                  ? 'bg-red-50 text-error border-error' 
                                  : 'bg-green-50 text-green-700 border-green-700'
                              }`}>
                                {product.stock} {isLowStock ? 'LOW' : 'OK'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                {/* Edit removed for Admins */}
                                <button 
                                  onClick={() => handleRemoveProduct(product.id)}
                                  className="px-3.5 py-1.5 border-2 border-on-surface bg-red-50 hover:bg-red-100 font-extrabold text-[10px] uppercase tracking-wider text-error transition-all active:scale-95"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view */}
                <div className="md:hidden divide-y-2 divide-surface-container-highest">
                  {filteredProducts.map((product) => {
                    const originalPrice = Number(product.price);
                    const discount = product.discount || 0;
                    const unitPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
                    const isLowStock = (product.stock ?? 0) <= 5;

                    return (
                      <div key={product.id} className="p-4 flex flex-col gap-3 animate-in fade-in duration-200">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-surface-container-high border border-on-surface overflow-hidden flex-shrink-0 flex items-center justify-center">
                            <img 
                              src={product.image_url || 'https://via.placeholder.com/150'} 
                              alt={product.name} 
                              className="w-full h-auto object-contain" 
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-on-surface uppercase text-sm leading-tight break-words">{product.name}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="bg-surface-container text-on-surface text-[9px] font-black uppercase px-2 py-0.5 border border-on-surface">
                                {product.category || 'Apparel'}
                              </span>
                              {discount > 0 && (
                                <span className="bg-primary-container text-on-primary-container text-[9px] font-black uppercase px-2 py-0.5 border border-on-surface">
                                  {discount}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-1 border-t border-on-surface/10">
                          <div>
                            <span className="text-[9px] font-black text-secondary uppercase tracking-widest block mb-0.5">Price</span>
                            <span className="font-extrabold text-sm block">Ksh {unitPrice.toFixed(2)}</span>
                            {discount > 0 && (
                              <span className="text-[10px] text-secondary line-through font-normal block">Ksh {originalPrice.toFixed(2)}</span>
                            )}
                          </div>
                          <div className="text-center">
                            <span className="text-[9px] font-black text-secondary uppercase tracking-widest block mb-0.5">Discount</span>
                            <span className={discount > 0 ? "text-primary-container bg-amber-50 px-2 py-0.5 border border-primary-container text-[10px] font-black inline-block" : "text-secondary text-[10px] font-medium block"}>
                              {discount > 0 ? `${discount}%` : '-'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black text-secondary uppercase tracking-widest block mb-0.5">Stock Status</span>
                            <span className={`inline-block px-2.5 py-0.5 font-black text-[10px] uppercase border border-on-surface ${
                              isLowStock 
                                ? 'bg-red-50 text-error border-error' 
                                : 'bg-green-50 text-green-700 border-green-700'
                            }`}>
                              {product.stock} {isLowStock ? 'LOW' : 'OK'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-on-surface/10">
                          <button 
                            onClick={() => handleRemoveProduct(product.id)}
                            className="px-3.5 py-1.5 border-2 border-on-surface bg-red-50 hover:bg-red-100 font-extrabold text-[10px] uppercase tracking-wider text-error transition-all active:scale-95"
                          >
                            Delete Product
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* ─── TAB 3: SYSTEM ORDERS (MOCK) ─── */}
        {activeTab === 'orders' && (
          <div className="animate-in fade-in duration-300">
            <header className="mb-8">
              <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">System Reports</p>
              <h2 className="font-headline-md text-3xl font-black text-on-surface uppercase tracking-tight">Full System Orders</h2>
            </header>

            {/* Orders Table */}
            <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-on-surface text-surface uppercase text-[10px] tracking-widest font-black">
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Merchant</th>
                      <th className="p-4">Delivery Status</th>
                      <th className="p-4">Items Count</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-surface-container-highest text-sm">
                    {ordersLoading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-secondary font-bold text-xs uppercase tracking-widest">
                          Loading orders...
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-secondary font-bold text-xs uppercase tracking-widest">
                          No orders found.
                        </td>
                      </tr>
                    ) : (
                      orders.map(order => {
                        // Calculate items count
                        const itemsCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
                        
                        const orderMerchant = merchants.find(m => m.id === order.merchantId);
                        const merchantName = orderMerchant?.storeName || 
                                             (orderMerchant?.first_name ? `${orderMerchant.first_name} ${orderMerchant.last_name || ''}` : null) || 
                                             order.merchantId || 
                                             'Unknown';

                        // Status color mapping
                        const statusColors: Record<string, string> = {
                          pending: 'bg-surface-container-highest text-on-surface border-on-surface',
                          processing: 'bg-primary-container text-on-primary-container border-on-surface',
                          shipped: 'bg-on-surface text-surface border-on-surface',
                          delivered: 'bg-green-500 text-white border-on-surface',
                          cancelled: 'border-error text-error bg-error-container',
                        };
                        const statusClass = statusColors[order.status?.toLowerCase()] || 'bg-surface-container text-on-surface border-on-surface';

                        return (
                          <React.Fragment key={order.id}>
                            <tr className="hover:bg-secondary-container transition-colors">
                              <td className="p-4 font-black">#{order.id?.slice(-6).toUpperCase()}</td>
                              <td className="p-4">
                                {order.contactInformation?.fullName || 'Guest'} 
                                {order.contactInformation?.email ? ` (${order.contactInformation.email})` : ''}
                              </td>
                              <td className="p-4">
                                <button 
                                  onClick={() => { setActiveTab('merchant_details'); setSelectedMerchantId(order.merchantId); }}
                                  className="font-bold text-primary-container bg-primary-container/10 px-2 py-1 rounded-sm text-xs hover:bg-primary-container/20 transition-colors"
                                >
                                  {merchantName}
                                </button>
                              </td>
                              <td className="p-4">
                                {currentUserRole === 'admin' ? (
                                  <span className={`text-[10px] px-2 py-0.5 border font-black uppercase ${statusClass}`}>
                                    {order.status}
                                  </span>
                                ) : (
                                  <select 
                                    value={order.status}
                                    onChange={(e) => order.id && handleUpdateOrderStatus(order.id, e.target.value)}
                                    className={`text-[10px] px-2 py-1 border font-black uppercase cursor-pointer outline-none ${statusClass}`}
                                  >
                                    <option value="pending">PENDING</option>
                                    <option value="processing">PROCESSING</option>
                                    <option value="shipped">SHIPPED</option>
                                    <option value="delivered">DELIVERED</option>
                                    <option value="cancelled">CANCELLED</option>
                                  </select>
                                )}
                              </td>
                              <td className="p-4 font-bold">{itemsCount} Item{itemsCount !== 1 && 's'}</td>
                              <td className="p-4 font-black">Ksh {order.totalAmount?.toFixed(2)}</td>
                              <td className="p-4 font-semibold text-secondary text-xs uppercase">
                                {order.createdAt ? new Date((order.createdAt as any).seconds ? (order.createdAt as any).seconds * 1000 : (order.createdAt as any)).toLocaleString() : 'N/A'}
                              </td>
                              <td className="p-4 text-right">
                                <button 
                                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : (order.id || null))}
                                  className="text-xs font-bold underline cursor-pointer hover:text-primary-container"
                                >
                                  {expandedOrderId === order.id ? 'HIDE ITEMS' : 'VIEW ITEMS'}
                                </button>
                              </td>
                            </tr>
                            {expandedOrderId === order.id && (
                              <tr className="bg-surface-container-low border-b-2 border-on-surface">
                                <td colSpan={7} className="p-6">
                                  <div className="font-bold text-xs uppercase tracking-widest text-on-surface mb-3">Order Items:</div>
                                  <ul className="space-y-2">
                                    {order.items?.map((item, idx) => (
                                      <li key={idx} className="flex justify-between items-center bg-surface p-3 border border-on-surface shadow-[2px_2px_0px_0px_var(--color-on-surface)] text-sm">
                                        <span className="font-semibold">{item.name || 'Unknown Product'}</span>
                                        <div className="flex gap-6 items-center">
                                          <span className="text-secondary font-bold text-xs uppercase tracking-wider">Qty: {item.quantity}</span>
                                          <span className="font-black text-primary-container">Ksh {item.price?.toFixed(2)}</span>
                                        </div>
                                      </li>
                                    ))}
                                    {(!order.items || order.items.length === 0) && (
                                      <li className="text-secondary text-xs font-bold uppercase tracking-widest">No items found for this order.</li>
                                    )}
                                  </ul>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB 4: SYSTEM CUSTOMERS ─── */}
        {activeTab === 'customers' && (
          <div className="animate-in fade-in duration-300">
            <header className="mb-8">
              <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">System Users</p>
              <h2 className="font-headline-md text-3xl font-black text-on-surface uppercase tracking-tight">All System Users</h2>
            </header>

            {customersLoading ? (
              <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] p-10 text-center">
                <Icon name="sync" className="text-4xl animate-spin text-primary-container mx-auto" />
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-secondary">Loading customers...</p>
              </section>
            ) : customers.length === 0 ? (
              <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] p-10 text-center">
                <Icon name="info" className="text-4xl text-secondary mx-auto" />
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-secondary">No users found</p>
              </section>
            ) : (
              <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-on-surface text-surface uppercase text-[10px] tracking-widest font-black">
                        <th className="p-4">Initials</th>
                        <th className="p-4">User Name</th>
                        <th className="p-4">Email Address</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">User ID</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-surface-container-highest text-sm">
                      {customers.map((customer) => {
                        const initials = `${customer.first_name?.[0] || ''}${customer.last_name?.[0] || ''}`.toUpperCase() || 'C';

                        return (
                          <tr key={customer.id} className="hover:bg-secondary-container transition-colors">
                            <td className="p-4">
                              <div className="w-8 h-8 rounded-full bg-primary-fixed border border-on-surface flex items-center justify-center font-bold text-xs text-on-surface">
                                {initials}
                              </div>
                            </td>
                            <td className="p-4 font-black">{customer.displayName}</td>
                            <td className="p-4 font-medium text-secondary">{customer.email}</td>
                            <td className="p-4">
                              <select 
                                value={customer.role}
                                onChange={(e) => handleUpdateUserRole(customer.id, e.target.value)}
                                className={`text-[10px] font-black uppercase px-2 py-1 border outline-none cursor-pointer ${
                                  customer.role === 'admin' 
                                    ? 'bg-primary-container text-on-primary-container border-on-surface' 
                                    : customer.role === 'merchant'
                                    ? 'bg-blue-100 text-blue-800 border-blue-800'
                                    : 'bg-green-100 text-green-800 border-green-800'
                                }`}
                              >
                                <option value="customer">CUSTOMER</option>
                                <option value="merchant">MERCHANT</option>
                                <option value="admin">ADMIN</option>
                              </select>
                            </td>
                            <td className="p-4 font-mono text-[11px] text-secondary">{customer.uid}</td>
                            <td className="p-4 text-right">
                              <span className="text-xs font-bold underline cursor-pointer hover:text-primary-container">DETAILS</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
        {/* ─── TAB: MERCHANTS ─── */}
        {activeTab === 'merchants' && (
          <div className="animate-in fade-in duration-300">
            <header className="mb-8">
              <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">Marketplace</p>
              <h2 className="font-headline-md text-3xl font-black text-on-surface uppercase tracking-tight">Merchant Applications</h2>
            </header>

            {merchantsLoading ? (
              <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] p-10 text-center">
                <Icon name="sync" className="text-4xl animate-spin text-primary-container mx-auto" />
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-secondary">Loading merchants...</p>
              </section>
            ) : merchants.length === 0 ? (
              <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] p-10 text-center">
                <Icon name="info" className="text-4xl text-secondary mx-auto" />
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-secondary">No merchants found</p>
              </section>
            ) : (
              <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-on-surface text-surface uppercase text-[10px] tracking-widest font-black">
                        <th className="p-4">Email</th>
                        <th className="p-4">Store Details</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-surface-container-highest text-sm">
                      {merchants.map((merchant) => (
                        <tr key={merchant.id} className="hover:bg-secondary-container transition-colors">
                          <td className="p-4 font-medium text-secondary">{merchant.email}</td>
                          <td className="p-4">
                            <div className="flex flex-col items-start">
                              <button 
                                onClick={() => { setActiveTab('merchant_details'); setSelectedMerchantId(merchant.id); }}
                                className="font-bold text-primary-container hover:underline text-left"
                              >
                                {merchant.storeName || 'N/A'}
                              </button>
                              <span className="text-xs text-secondary">{merchant.location || 'N/A'}</span>
                              <p className="font-medium text-secondary truncate mt-0.5">
                                {merchant.businessCategories?.join(', ') || (merchant as any).businessCategory || 'N/A'} • {merchant.businessType || 'N/A'}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`border text-[9px] font-black uppercase px-2 py-0.5 ${merchant.merchantStatus === 'verified' ? 'bg-blue-100 text-blue-800 border-blue-800' : merchant.merchantStatus === 'approved' ? 'bg-green-100 text-green-800 border-green-800' : merchant.merchantStatus === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-800' : 'bg-red-100 text-red-800 border-red-800'}`}>
                              {merchant.merchantStatus}
                            </span>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            {merchant.merchantStatus === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleUpdateMerchantStatus(merchant.id, 'approved')}
                                  className="text-xs font-bold border border-green-800 px-2 py-1 text-green-800 hover:bg-green-800 hover:text-white transition-colors"
                                >
                                  APPROVE
                                </button>
                                <button 
                                  onClick={() => handleUpdateMerchantStatus(merchant.id, 'rejected')}
                                  className="text-xs font-bold border border-red-800 px-2 py-1 text-red-800 hover:bg-red-800 hover:text-white transition-colors"
                                >
                                  REJECT
                                </button>
                              </>
                            )}
                            {merchant.merchantStatus === 'rejected' && (
                              <button 
                                onClick={() => handleUpdateMerchantStatus(merchant.id, 'approved')}
                                className="text-xs font-bold border border-green-800 px-2 py-1 text-green-800 hover:bg-green-800 hover:text-white transition-colors"
                              >
                                APPROVE
                              </button>
                            )}
                            {merchant.merchantStatus === 'approved' && (
                              <>
                                <button 
                                  onClick={() => handleUpdateMerchantStatus(merchant.id, 'verified')}
                                  className="text-xs font-bold border border-blue-800 px-2 py-1 text-blue-800 hover:bg-blue-800 hover:text-white transition-colors"
                                >
                                  VERIFY
                                </button>
                                <button 
                                  onClick={() => handleUpdateMerchantStatus(merchant.id, 'rejected')}
                                  className="text-xs font-bold border border-red-800 px-2 py-1 text-red-800 hover:bg-red-800 hover:text-white transition-colors"
                                >
                                  REVOKE
                                </button>
                              </>
                            )}
                            {merchant.merchantStatus === 'verified' && (
                              <>
                                <button 
                                  onClick={() => handleUpdateMerchantStatus(merchant.id, 'approved')}
                                  className="text-xs font-bold border border-gray-500 px-2 py-1 text-gray-600 hover:bg-gray-500 hover:text-white transition-colors"
                                >
                                  UNVERIFY
                                </button>
                                <button 
                                  onClick={() => handleUpdateMerchantStatus(merchant.id, 'rejected')}
                                  className="text-xs font-bold border border-red-800 px-2 py-1 text-red-800 hover:bg-red-800 hover:text-white transition-colors"
                                >
                                  REVOKE
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ─── TAB X: CATEGORIES MANAGEMENT ─── */}
        {activeTab === 'categories' && (
          <div className="animate-in fade-in duration-300">
             <CategoryManager categories={categories} loading={categoriesLoading} onRefresh={loadCategories} />
          </div>
        )}

        {/* ─── TAB 5: SYSTEM CONFIGURATION (MOCK) ─── */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-300">
            <header className="mb-8">
              <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">System Options</p>
              <h2 className="font-headline-md text-3xl font-black text-on-surface uppercase tracking-tight">Store Settings</h2>
            </header>

            <section className="bg-surface border-2 border-on-surface p-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)] max-w-2xl space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Store Identity Name</label>
                  <input type="text" defaultValue="JUJ4 Store" className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Support Email</label>
                  <input type="email" defaultValue="support@juj4.com" className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Trademark Accent Color</label>
                  <div className="flex gap-2">
                    <div className="w-12 h-12 border-2 border-on-surface bg-primary-container"></div>
                    <input type="text" defaultValue="#FF8C00" className="flex-1 h-12 px-4 border-2 border-on-surface rounded-none font-medium" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Free Shipping Threshold (Ksh)</label>
                  <input type="number" defaultValue={150} className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">System Maintenance Active</label>
                <div className="flex items-center gap-3 mt-2">
                  <input type="checkbox" id="maintenance" className="w-5 h-5 border-2 border-on-surface text-on-surface rounded-none focus:ring-0" />
                  <label htmlFor="maintenance" className="font-bold text-xs uppercase tracking-wider text-secondary cursor-pointer">Enable maintenance overlay storefront-wide</label>
                </div>
              </div>
              <button 
                onClick={() => alert('Settings synchronized with system registry successfully!')}
                className="bg-primary-container text-on-primary-container border-2 border-on-surface py-3.5 px-8 font-black uppercase tracking-wider text-xs hover:bg-amber-500 transition-all active:scale-95 duration-150 shadow-[3px_3px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--color-on-surface)]"
              >
                Save Registry Settings
              </button>
            </section>
          </div>
        )}
        
        {/* ─── TAB: MERCHANT DETAILS ─── */}
        {activeTab === 'merchant_details' && selectedMerchantId && (
          <div className="animate-in fade-in duration-300">
            <MerchantDetailsPanel 
              key={selectedMerchantId}
              merchant={merchants.find(m => m.id === selectedMerchantId) || { id: selectedMerchantId, storeName: 'Unknown Merchant' }}
              onBack={() => { setActiveTab('merchants'); setSelectedMerchantId(null); }}
              onUpdateMerchant={async (merchantId, updates) => {
                await updateDoc(doc(db, 'users', merchantId), updates);
                setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, ...updates } : m));
              }}
            />
          </div>
        )}
      </main>

      {/* ─── NEOBRUTALIST MODAL FOR ADDING/EDITING ─── */}
      {(editingId !== null || isAdding) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-surface shadow-[8px_8px_0px_0px_var(--color-on-surface)] w-full max-w-3xl flex flex-col my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-primary-container p-5 border-b-4 border-on-surface flex justify-between items-center">
              <h3 className="font-headline-md text-xl font-black text-on-primary-container uppercase tracking-tight">
                {isAdding ? 'Add Product' : 'Edit Product Details'}
              </h3>
              <button 
                onClick={() => { setEditingId(null); setIsAdding(false); }}
                className="w-10 h-10 border-2 border-on-surface bg-surface hover:bg-surface-container flex items-center justify-center active:scale-90 transition-transform font-black text-on-surface"
              >
                X
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* Row 1: Name, Category, Brand */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Product Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={editForm.name || ''} 
                    onChange={handleChange}
                    placeholder="e.g. JUJ4-01 Speed Runner"
                    className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium transition-all"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Category</label>
                  <input 
                    type="text" 
                    name="category" 
                    list="category-options"
                    value={editForm.category || ''} 
                    onChange={handleChange}
                    placeholder="e.g. Footwear"
                    className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium transition-all"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Brand</label>
                  <input 
                    type="text" 
                    name="brand" 
                    list="brand-options"
                    value={editForm.brand || ''} 
                    onChange={handleChange}
                    placeholder="e.g. Nike"
                    className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Price, Discount, Stock */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Price (Ksh)</label>
                  <input 
                    type="number" 
                    name="price" 
                    value={editForm.price || ''} 
                    onChange={handleChange}
                    className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Discount (%)</label>
                  <input 
                    type="number" 
                    name="discount" 
                    value={editForm.discount || 0} 
                    onChange={handleChange}
                    className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Stock Level</label>
                  <input 
                    type="number" 
                    name="stock" 
                    value={editForm.stock || 0} 
                    onChange={handleChange}
                    className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium transition-all"
                  />
                </div>
              </div>

              {/* Row 3: Description */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Description</label>
                <textarea 
                  name="description" 
                  value={editForm.description || ''} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Write product specifications and high-velocity features..."
                  rows={3}
                  className="w-full p-4 border-2 border-on-surface rounded-none font-medium transition-all"
                />
              </div>

              {/* Row 4: Image URL and Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Main Image URL</label>
                  <input 
                    type="text" 
                    name="image_url" 
                    value={editForm.image_url || ''} 
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium transition-all animate-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Preview</label>
                  <div className="w-full bg-surface-container border-2 border-on-surface overflow-hidden flex items-center justify-center">
                    {editForm.image_url ? (
                      <img src={editForm.image_url} alt="Preview" className="w-full h-auto object-contain" />
                    ) : (
                      <span className="text-[10px] text-secondary uppercase font-black">No Image</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 5: Tags, Colors, Sizes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t-2 border-surface-container pt-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Tags (comma-separated)</label>
                  <input 
                    type="text" 
                    value={(editForm.tags || []).join(', ')} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value.split(',').map(s => s.trim()) }))}
                    placeholder="e.g. Runner, Orange"
                    className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Colors (comma-separated)</label>
                  <input 
                    type="text" 
                    value={(editForm.colors || []).join(', ')} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, colors: e.target.value.split(',').map(s => s.trim()) }))}
                    placeholder="e.g. Orange, Black"
                    className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Sizes (comma-separated)</label>
                  <input 
                    type="text" 
                    value={(editForm.sizes || []).join(', ')} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, sizes: e.target.value.split(',').map(s => s.trim()) }))}
                    placeholder="e.g. S, M, L"
                    className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium transition-all"
                  />
                </div>
              </div>

              {/* Additional Images URL Input */}
              <div className="space-y-2 border-t-2 border-surface-container pt-4">
                <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Additional Product Pictures</label>
                <div className="space-y-3">
                  {(editForm.additional_images || []).map((url, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="w-12 bg-surface-container border-2 border-on-surface flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {url ? (
                          <img src={url} alt="additional-preview" className="w-full h-auto object-contain" />
                        ) : (
                          <span className="text-[9px] text-secondary font-black uppercase">Empty</span>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={url} 
                        onChange={(e) => handleImageUrlChange(idx, e.target.value)}
                        placeholder="https://..."
                        className="flex-1 h-12 px-4 border-2 border-on-surface rounded-none font-medium focus:ring-0"
                      />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveImageUrl(idx)}
                        className="px-4 py-3 border-2 border-on-surface bg-red-50 text-error hover:bg-red-100 font-extrabold text-xs uppercase transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={handleAddImageUrl}
                    className="text-xs font-black text-primary-container hover:underline uppercase tracking-widest flex items-center gap-1.5 mt-1"
                  >
                    + Add New Image URL
                  </button>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-surface p-5 border-t-4 border-on-surface flex justify-end gap-3">
              <button 
                onClick={() => { setEditingId(null); setIsAdding(false); }}
                className="px-6 py-3 border-2 border-on-surface bg-surface hover:bg-surface-container font-extrabold text-xs uppercase tracking-wider transition-transform active:scale-95 duration-100"
              >
                Cancel
              </button>
              <button 
                onClick={isAdding ? handleSaveNew : handleSaveEdit}
                disabled={isSaving}
                className="px-8 py-3 bg-primary-container text-on-primary-container border-2 border-on-surface font-headline-md font-black text-xs uppercase tracking-wider transition-transform active:scale-95 shadow-[3px_3px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--color-on-surface)] disabled:opacity-50 duration-100"
              >
                {isSaving ? 'Saving...' : (isAdding ? 'Add Item' : 'Save System Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
