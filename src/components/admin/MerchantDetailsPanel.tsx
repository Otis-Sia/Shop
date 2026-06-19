"use client";
import { useToast } from '@/components/providers/ToastProvider';
import React, { useState, useEffect } from 'react';
import { getProducts } from '@/lib/api/products';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/types/schema';
import { Product } from '@/lib/data/products-data';
import Icon from '@/components/Icon';
import { CURRENCY_CONFIG } from '@/lib/utils/currency';

interface MerchantDetailsPanelProps {
  merchant: any;
  onBack: () => void;
  onUpdateMerchant: (merchantId: string, updates: any) => Promise<void>;
}

export default function MerchantDetailsPanel({ merchant, onBack, onUpdateMerchant }: MerchantDetailsPanelProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'settings'>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Settings State
  const [storeName, setStoreName] = useState(merchant.storeName || '');
  const [location, setLocation] = useState(merchant.location || '');
  const [status, setStatus] = useState(merchant.merchantStatus || 'pending');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, [merchant.id]);

  useEffect(() => {
    setStoreName(merchant.storeName || '');
    setLocation(merchant.location || '');
    setStatus(merchant.merchantStatus || 'pending');
  }, [merchant]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const prods = await getProducts({ merchantId: merchant.id, includeUnapproved: true });
      setProducts(prods);
    } catch (error) {
      console.error('Error fetching merchant products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const q = query(collection(db, 'orders'), where('merchantId', '==', merchant.id));
      const snapshot = await getDocs(q);
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      fetchedOrders.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
      });
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error fetching merchant orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await onUpdateMerchant(merchant.id, {
        merchantStatus: status,
      });
      showToast('Merchant settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error updating merchant:', error);
      showToast('Failed to save settings.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-surface-container-highest text-on-surface border-on-surface',
    processing: 'bg-primary-container text-on-primary-container border-on-surface',
    shipped: 'bg-on-surface text-surface border-on-surface',
    delivered: 'bg-green-500 text-white border-on-surface',
    cancelled: 'border-error text-error bg-error-container',
  };

  return (
    <div className="animate-in fade-in duration-300">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-secondary hover:text-primary-container transition-colors mb-6"
      >
        <Icon name="arrow_back" />
        Back to Dashboard
      </button>

      <header className="mb-8 flex justify-between items-end border-b-4 border-on-surface pb-6">
        <div>
          <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">Merchant Profile</p>
          <h2 className="font-headline-md text-4xl font-black text-on-surface uppercase tracking-tight">{merchant.storeName || 'Unknown Store'}</h2>
          <p className="text-sm font-bold text-secondary mt-2">Owner: {merchant.first_name} {merchant.last_name} ({merchant.email})</p>
        </div>
        <div className="flex bg-surface-container border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-3 font-black text-xs uppercase tracking-wider ${activeTab === 'inventory' ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container-high text-on-surface'}`}
          >
            Inventory ({products.length})
          </button>
          <div className="w-[2px] bg-on-surface"></div>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-black text-xs uppercase tracking-wider ${activeTab === 'orders' ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container-high text-on-surface'}`}
          >
            Orders ({orders.length})
          </button>
          <div className="w-[2px] bg-on-surface"></div>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-black text-xs uppercase tracking-wider ${activeTab === 'settings' ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container-high text-on-surface'}`}
          >
            Settings
          </button>
        </div>
      </header>

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-on-surface text-surface uppercase text-[10px] tracking-widest font-black">
                  <th className="p-4">Product ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-surface-container-highest text-sm">
                {loadingProducts ? (
                  <tr><td colSpan={5} className="p-8 text-center text-secondary font-bold text-xs uppercase tracking-widest">Loading inventory...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-secondary font-bold text-xs uppercase tracking-widest">No products found.</td></tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id} className="hover:bg-secondary-container transition-colors">
                      <td className="p-4 font-black">#{product.id}</td>
                      <td className="p-4 font-bold">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-8 h-8 object-cover border border-on-surface" />
                          ) : (
                            <div className="w-8 h-8 bg-surface-container border border-on-surface flex items-center justify-center">
                              <Icon name="image" className="text-[14px]" />
                            </div>
                          )}
                          {product.name}
                          {(merchant.merchantStatus !== 'approved' && merchant.merchantStatus !== 'verified') && (
                            <span className="ml-2 bg-error text-white text-[9px] px-1.5 py-0.5 font-black uppercase tracking-wider border border-on-surface whitespace-nowrap">
                              Hidden
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-black text-primary-container">{CURRENCY_CONFIG.symbol} {product.price?.toFixed(2)}</td>
                      <td className="p-4 font-bold">{product.stock}</td>
                      <td className="p-4"><span className="text-[10px] px-2 py-0.5 border border-on-surface font-black uppercase bg-surface-container">{product.category}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <section className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-on-surface text-surface uppercase text-[10px] tracking-widest font-black">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Items Count</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-surface-container-highest text-sm">
                {loadingOrders ? (
                  <tr><td colSpan={6} className="p-8 text-center text-secondary font-bold text-xs uppercase tracking-widest">Loading orders...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-secondary font-bold text-xs uppercase tracking-widest">No orders received.</td></tr>
                ) : (
                  orders.map(order => {
                    const statusClass = statusColors[order.status?.toLowerCase()] || 'bg-surface-container text-on-surface border-on-surface';
                    const itemsCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
                    return (
                      <tr key={order.id} className="hover:bg-secondary-container transition-colors">
                        <td className="p-4 font-black">#{order.id?.slice(-6).toUpperCase()}</td>
                        <td className="p-4 font-bold">{order.contactInformation?.fullName || 'Guest'}</td>
                        <td className="p-4"><span className={`text-[10px] px-2 py-0.5 border font-black uppercase ${statusClass}`}>{order.status}</span></td>
                        <td className="p-4 font-bold">{itemsCount} Items</td>
                        <td className="p-4 font-black text-primary-container">{CURRENCY_CONFIG.symbol} {order.totalAmount?.toFixed(2)}</td>
                        <td className="p-4 font-semibold text-secondary text-xs uppercase">
                          {order.createdAt ? new Date((order.createdAt as any).seconds ? (order.createdAt as any).seconds * 1000 : (order.createdAt as any)).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-surface p-8 border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] max-w-2xl">
          <h3 className="font-headline-md text-2xl font-black uppercase mb-6">Merchant Settings</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2 text-secondary">Store Name</label>
              <input 
                type="text" 
                value={storeName}
                readOnly
                className="w-full p-4 border-2 border-surface-container-highest bg-surface-container text-secondary cursor-not-allowed font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2 text-secondary">Location</label>
              <input 
                type="text" 
                value={location}
                readOnly
                className="w-full p-4 border-2 border-surface-container-highest bg-surface-container text-secondary cursor-not-allowed font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2">Verification Status</label>
              <select 
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full p-4 border-2 border-on-surface bg-surface-container focus:bg-surface focus:outline-none transition-colors font-bold uppercase cursor-pointer"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="verified">Verified (Priority)</option>
                <option value="rejected">Revoked / Rejected</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={updating}
              className="mt-4 bg-on-surface text-surface px-8 py-4 font-black tracking-widest uppercase hover:bg-primary-container hover:text-on-surface transition-colors w-full flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {updating ? (
                <><div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin"></div> Saving...</>
              ) : (
                <><Icon name="save" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
