"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Product } from "@/types/schema";
import { CATEGORIES_DATA } from "@/lib/data/categories";

export default function MerchantProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
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
    setEditForm({
      name: '',
      category: 'Apparel',
      brand: '',
      price: 0,
      discount: 0,
      stock: 10,
      imageUrls: [''],
      description: '',
      tags: [],
    });
  };

  const handleEdit = (product: Product) => {
    setIsAdding(false);
    setEditingId(Number(product.id));
    setEditForm({ ...product, imageUrls: product.imageUrls || [''] });
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
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: (name === 'price' || name === 'stock' || name === 'discount') ? Number(value) : value,
    }));
  };

  const handleImageUrlChange = (index: number, value: string) => {
    setEditForm(prev => {
      const updated = [...(prev.imageUrls || [])];
      updated[index] = value;
      return { ...prev, imageUrls: updated };
    });
  };

  const handleAddImageUrl = () => {
    setEditForm(prev => ({
      ...prev,
      imageUrls: [...(prev.imageUrls || []), '']
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      // 1. Get pre-signed URL from our API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { signedUrl, fileUrl } = await response.json();

      // 2. Upload file directly to S3 using the pre-signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }
      
      setEditForm(prev => {
        const currentUrls = prev.imageUrls || [];
        if (currentUrls.length > 0 && currentUrls[currentUrls.length - 1] === '') {
          const newUrls = [...currentUrls];
          newUrls[newUrls.length - 1] = fileUrl;
          return { ...prev, imageUrls: newUrls };
        } else {
          return { ...prev, imageUrls: [...currentUrls, fileUrl] };
        }
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      const cleanedImages = (editForm.imageUrls || []).filter(url => url.trim() !== '');
      
      const productData: Record<string, unknown> = {
        name: editForm.name || '',
        description: editForm.description || '',
        price: editForm.price || 0,
        discount: editForm.discount || 0,
        brand: editForm.brand || '',
        stock: editForm.stock || 0,
        category: editForm.category || '',
        imageUrls: cleanedImages,
        tags: typeof editForm.tags === 'string' ? (editForm.tags as string).split(',').map((t: string) => t.trim()) : (editForm.tags || []),
        updatedAt: Timestamp.now(),
        merchantId: user.uid
      };

      let saveId = editingId;
      if (isAdding) {
        saveId = products.length > 0 ? Math.max(...products.map(p => Number(p.id))) + 1 : 1;
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
    } catch (error) {
      console.error("Error saving product:", error);
      alert('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const allSystemCategories = useMemo(() => {
    const list: string[] = [];
    [...CATEGORIES_DATA.goods, ...CATEGORIES_DATA.services].forEach(group => {
      group.categories.forEach(cat => {
        list.push(cat.name);
        if (cat.subcategories) list.push(...cat.subcategories);
      });
    });
    return Array.from(new Set(list)).sort();
  }, []);

  if (loading) {
    return <div className="p-8 font-bold animate-pulse">Loading products...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-headline-lg font-black text-4xl uppercase border-b-4 border-on-surface inline-block pb-2">
          My Products
        </h1>
        {(!isAdding && editingId === null) && (
          <button 
            onClick={handleAddNew}
            className="bg-primary-container text-on-surface border-4 border-on-surface px-6 py-2 font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            Add Product
          </button>
        )}
      </div>

      {(isAdding || editingId !== null) ? (
        <form onSubmit={handleSave} className="bg-surface border-4 border-on-surface p-8 mb-8 space-y-6">
          <h2 className="font-bold text-2xl uppercase mb-6">{isAdding ? 'Add New Product' : 'Edit Product'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-bold text-sm uppercase">Product Name</label>
              <input required name="name" value={editForm.name || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
            </div>
            
            <div className="space-y-2">
              <label className="font-bold text-sm uppercase">Category</label>
              <input 
                type="text"
                list="product-category-list"
                name="category" 
                value={editForm.category || ''} 
                onChange={handleChange} 
                placeholder="Select or type a category"
                className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none bg-white" 
              />
              <datalist id="product-category-list">
                {allSystemCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
                {editForm.category && !allSystemCategories.includes(editForm.category) && (
                  <option value={editForm.category} />
                )}
              </datalist>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase">Price ($)</label>
              <input required type="number" min="0" step="0.01" name="price" value={editForm.price || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase">Stock Quantity</label>
              <input required type="number" min="0" name="stock" value={editForm.stock || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase">Discount (%)</label>
              <input type="number" min="0" max="100" name="discount" value={editForm.discount || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase">Brand</label>
              <input name="brand" value={editForm.brand || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="font-bold text-sm uppercase">Description</label>
              <textarea required name="description" value={editForm.description || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 h-24 focus:ring-0 outline-none"></textarea>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="font-bold text-sm uppercase">Tags (comma separated)</label>
              <input name="tags" value={typeof editForm.tags === 'object' ? editForm.tags.join(', ') : editForm.tags || ''} onChange={handleChange} className="w-full border-2 border-on-surface p-2 focus:ring-0 outline-none" placeholder="e.g. vintage, summer, sale" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="font-bold text-sm uppercase block">Image URLs</label>
              {(editForm.imageUrls || ['']).map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input 
                    value={url} 
                    onChange={(e) => handleImageUrlChange(index, e.target.value)} 
                    placeholder="https://..."
                    className="flex-grow border-2 border-on-surface p-2 focus:ring-0 outline-none" 
                  />
                </div>
              ))}
              <button type="button" onClick={handleAddImageUrl} className="text-sm font-bold underline hover:text-primary-container">
                + Add another image URL
              </button>

              <div className="mt-4 p-4 border-2 border-dashed border-on-surface bg-white">
                <p className="text-sm font-bold uppercase mb-2">Or Upload Image</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  disabled={isUploading}
                  className="text-sm w-full"
                />
                {isUploading && <p className="text-sm font-bold mt-2 animate-pulse text-primary-container">Uploading image...</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="submit" 
              disabled={isSaving || isUploading}
              className="bg-primary-container text-on-surface border-4 border-on-surface px-8 py-2 font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Product'}
            </button>
            <button 
              type="button" 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="bg-surface text-on-surface border-4 border-on-surface px-8 py-2 font-bold uppercase hover:bg-surface-dim transition-colors"
            >
              Cancel
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
                <th className="p-4 border-b-4 border-on-surface">Stock</th>
                <th className="p-4 border-b-4 border-on-surface text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-bold">No products found. Add one to get started!</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-on-surface hover:bg-surface-dim transition-colors">
                    <td className="p-4">
                      {product.imageUrls?.[0] ? (
                        <img src={product.imageUrls[0]} alt={product.name} className="w-16 h-16 object-cover border-2 border-on-surface" />
                      ) : (
                        <div className="w-16 h-16 bg-surface-dim border-2 border-on-surface flex items-center justify-center text-xs font-bold">No Img</div>
                      )}
                    </td>
                    <td className="p-4 font-bold max-w-[200px] truncate">{product.name}</td>
                    <td className="p-4">${product.price.toFixed(2)}</td>
                    <td className="p-4">{product.stock}</td>
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
