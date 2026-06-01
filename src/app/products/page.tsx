'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProducts } from '@/lib/api/products';
import { CATEGORIES_DATA } from '@/lib/data/categories';
import { addToCart } from '@/lib/api/cart';
import { addToWishlist, removeFromWishlist, getWishlist } from '@/lib/api/wishlist';
import { Product } from '@/lib/data/products-data';
import Icon from '@/components/Icon';
import ProductRatingBadge from '@/components/shop/ProductRatingBadge';
import './products.css';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('search') || '';
    }
    return '';
  });
  const [maxPrice, setMaxPrice] = useState('');
  const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [addingToCart, setAddingToCart] = useState<Record<number, boolean>>({});
  const [addedToCart, setAddedToCart] = useState<Record<number, boolean>>({});
  const router = useRouter();

  const fetchProducts = async (filters: { keyword?: string; maxPrice?: number; category?: string } = {}) => {
    setLoading(true);
    try {
      const data = await getProducts(filters);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchProducts({ keyword: keyword || undefined });

    
    const fetchW = async () => {
      try {
        const w = await getWishlist();
        setWishlistedIds(new Set(w.map(p => p.id)));
      } catch (err) {
        console.error('Error fetching wishlist:', err);
      }
    };
    fetchW();
  }, []);

  const handleToggleWishlist = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    const isW = wishlistedIds.has(productId);
    const newW = new Set(wishlistedIds);
    if (isW) {
      newW.delete(productId);
      setWishlistedIds(newW);
      try { await removeFromWishlist(productId); } catch(e) { console.error(e); }
    } else {
      newW.add(productId);
      setWishlistedIds(newW);
      try { await addToWishlist(productId); } catch(e) { console.error(e); }
    }
  };

  const handleApplyFilters = () => {
    fetchProducts({
      keyword: keyword || undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      category: category || undefined,
    });
  };

  const handleClearFilters = () => {
    setKeyword('');
    setMaxPrice('');
    setCategory('');
    setSortBy('default');
    fetchProducts();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleApplyFilters();
  };

  const handleAddToCart = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    setAddingToCart(prev => ({ ...prev, [productId]: true }));
    try {
      await addToCart(productId, 1);
      setAddedToCart(prev => ({ ...prev, [productId]: true }));
      setTimeout(() => {
        setAddedToCart(prev => ({ ...prev, [productId]: false }));
        setAddingToCart(prev => ({ ...prev, [productId]: false }));
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 flex-grow">
      
      {/* Page Header */}
      <header className="mb-12">
        <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">Catalog</p>
        <h1 className="font-headline-md text-3xl md:text-5xl font-black uppercase tracking-tighter text-on-surface">
          Shop All Products
        </h1>
        <p className="font-body-md text-sm text-secondary uppercase font-semibold mt-2">
          Discover our curated collection of premium high-velocity items.
        </p>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Filters Sidebar */}
        <aside className="lg:col-span-3 bg-white border-2 border-on-surface p-6 shadow-[4px_4px_0px_0px_rgba(26,28,28,1)] space-y-6 lg:sticky lg:top-24">
          <h3 className="font-headline-md text-base font-black uppercase tracking-wider text-on-surface flex items-center gap-2 pb-3 border-b-2 border-surface-container">
            <Icon name="tune" className="font-black text-sm" />
            <span>Refine Search</span>
          </h3>
          
          <div className="space-y-4">
            {/* Search Input */}
            <div className="space-y-1">
              <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Search Products</label>
              <input
                type="text"
                placeholder="Search by name..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium text-sm transition-all focus:ring-0 focus:border-primary-container"
              />
            </div>
            
            {/* Max Price */}
            <div className="space-y-1">
              <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Max Price ($)</label>
              <input
                type="number"
                placeholder="e.g., 500"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium text-sm transition-all focus:ring-0 focus:border-primary-container"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-12 px-4 border-2 border-on-surface rounded-none font-medium text-sm transition-all focus:ring-0 focus:border-primary-container bg-white"
              >
                <option value="">All Categories</option>
                {CATEGORIES_DATA.goods.map(group => (
                  <optgroup label={group.name} key={`goods-${group.name}`}>
                    {group.categories.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
                {CATEGORIES_DATA.services.map(group => (
                  <optgroup label={group.name} key={`services-${group.name}`}>
                    {group.categories.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button 
              onClick={handleApplyFilters}
              className="w-full bg-primary-container text-on-primary-container py-3 font-headline-md font-bold uppercase tracking-wider text-xs border-2 border-on-surface transition-transform active:scale-95 shadow-[3px_3px_0px_0px_rgba(26,28,28,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(26,28,28,1)] hover:bg-amber-500"
            >
              Apply Filters
            </button>
            <button 
              onClick={handleClearFilters}
              className="w-full bg-white text-secondary py-3.5 font-bold uppercase tracking-wider text-xs border-2 border-on-surface transition-colors hover:bg-surface-container active:scale-95"
            >
              Clear Filters
            </button>
          </div>
        </aside>

        {/* Products Grid Content */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-surface-container pb-4 gap-4">
            <div className="font-bold text-xs uppercase tracking-wider text-secondary">
              {loading ? 'Analyzing live products...' : `Showing ${products.length} product${products.length !== 1 ? 's' : ''}`}
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 border-2 border-on-surface rounded-none font-bold text-xs uppercase bg-white cursor-pointer"
              >
                <option value="default">Sort By: Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>

              <div className="flex border-2 border-on-surface bg-white">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface hover:bg-surface-container'}`}
                  aria-label="Grid view"
                >
                  <Icon name="grid_view" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 border-l-2 border-on-surface ${viewMode === 'list' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface hover:bg-surface-container'}`}
                  aria-label="List view"
                >
                  <Icon name="view_list" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-on-surface">
              <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
              <p className="mt-4 font-bold text-xs tracking-widest text-secondary uppercase">Loading Catalog...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-white border-2 border-on-surface">
              <Icon name="info" className="text-4xl text-secondary mb-3" />
              <h4 className="font-extrabold uppercase text-sm">No items found</h4>
              <p className="text-xs text-secondary mt-1 max-w-[280px]">Adjust your filter query or clear searches to reset the collection grid.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-6"}>
              {[...products].sort((a, b) => {
                const priceA = a.discount ? a.price * (1 - a.discount / 100) : a.price;
                const priceB = b.discount ? b.price * (1 - b.discount / 100) : b.price;
                switch (sortBy) {
                  case 'price-asc': return priceA - priceB;
                  case 'price-desc': return priceB - priceA;
                  case 'name-asc': return a.name.localeCompare(b.name);
                  case 'name-desc': return b.name.localeCompare(a.name);
                  default: return 0;
                }
              }).map((product, idx) => {
                const discount = product.discount || 0;
                const originalPrice = parseFloat(String(product.price));
                const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
                const isExpress = product.stock > 10;

                return (
                  <article 
                    key={product.id} 
                    className={`bg-white border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(26,28,28,1)] flex group hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(26,28,28,1)] transition-all ${viewMode === 'list' ? 'flex-col sm:flex-row' : 'flex-col'}`}
                  >
                    <Link href={`/products/${product.id}`} className={`block relative overflow-hidden bg-surface-container-low border-on-surface shrink-0 ${viewMode === 'list' ? 'sm:w-64 sm:border-r-2 border-b-2 sm:border-b-0' : 'border-b-2 aspect-[4/3]'}`}>
                      <img 
                        src={product.image_url || 'https://via.placeholder.com/150'} 
                        alt={product.name} 
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${viewMode === 'list' ? 'h-64 sm:h-full' : ''}`}
                        loading={idx > 3 ? 'lazy' : 'eager'}
                      />
                      {isExpress && (
                        <span className="absolute top-3 left-3 bg-on-surface text-white text-[10px] font-black uppercase px-2.5 py-1 border border-on-surface">
                          Express
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="absolute top-3 right-3 bg-red-50 text-error border border-error text-[10px] font-black uppercase px-2.5 py-1">
                          -{discount}%
                        </span>
                      )}
                    </Link>
                    
                    <button 
                      onClick={(e) => handleToggleWishlist(e, product.id)}
                      className={`absolute top-3 ${discount > 0 ? 'right-16' : 'right-3'} z-10 w-8 h-8 flex items-center justify-center bg-white border border-on-surface shadow-sm hover:scale-110 transition-transform ${wishlistedIds.has(product.id) ? 'text-error' : 'text-on-surface'}`}
                    >
                      <Icon name={wishlistedIds.has(product.id) ? "favorite" : "favorite_border"} className="text-lg" />
                    </button>

                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="font-headline-md text-sm font-black uppercase text-on-surface mb-1">
                        {product.name}
                      </h3>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-2">
                        Category: {product.category || 'Apparel'}
                      </p>
                      
                      <div className="mb-4 mt-1">
                        <ProductRatingBadge productId={product.id} />
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-headline-md text-base font-black text-on-surface">
                            Kes. {finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {discount > 0 && (
                            <span className="text-[10px] text-secondary line-through font-bold">
                              Kes. {originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={(e) => handleAddToCart(e, product.id)}
                          disabled={addingToCart[product.id]}
                          className={`px-4 py-2 border-2 border-on-surface bg-primary-container text-on-primary-container font-headline-md font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(26,28,28,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(26,28,28,1)] hover:bg-amber-500 disabled:opacity-50 ${addedToCart[product.id] ? '!bg-green-600 !text-white' : ''}`}
                        >
                          {addingToCart[product.id] ? (addedToCart[product.id] ? 'Added ✓' : 'Adding...') : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </main>
  );
}
