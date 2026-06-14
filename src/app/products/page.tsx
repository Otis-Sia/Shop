'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProducts, getCategories, getAvailableTags } from '@/lib/api/products';
import { useCategories } from '@/hooks/useCategories';
import { addToCart } from '@/lib/api/cart';
import { addToWishlist, removeFromWishlist, getWishlist } from '@/lib/api/wishlist';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile, User } from '@/lib/api/auth';
import { Product } from '@/lib/data/products-data';
import Icon from '@/components/Icon';
import ProductRatingBadge from '@/components/shop/ProductRatingBadge';
import './products.css';

const CATEGORY_ICONS: Record<string, string> = {
  "Electronics": "devices",
  "Fashion": "checkroom",
  "Home & Garden": "weekend",
  "Health & Beauty": "health_and_safety",
  "Sports & Outdoors": "sports_basketball",
  "Toys & Games": "toys",
  "Automotive": "directions_car",
  "Grocery & Gourmet": "local_grocery_store",
  "Books & Media": "menu_book",
  "Office Supplies": "print",
  "Pet Supplies": "pets",
  "Baby Products": "child_friendly",
  "Tools & Home Improvement": "handyman",
  "Arts, Crafts & Hobbies": "palette",
  "Musical Instruments & Gear": "music_note",
  "Industrial & Scientific": "science",
  "Digital Goods": "cloud_download",
  "Home Services": "cleaning_services",
  "Professional Services": "work",
  "Education & Tutoring": "school",
  "Travel & Experiences": "flight",
  "Beauty & Wellness Appointments": "spa",
  "Automotive Services": "car_repair",
  "Event Services": "celebration",
  "Pet Services": "pets",
  "Subscriptions & Memberships": "card_membership",
  "Financial & Insurance": "account_balance",
  "Printing & Customization": "print"
};

const formatSellerAge = (createdAt: any): string => {
  if (!createdAt) return 'NEW SELLER';
  
  let date: Date;
  if (createdAt?.toDate) {
    date = createdAt.toDate();
  } else {
    date = new Date(createdAt);
  }

  if (isNaN(date.getTime())) return 'NEW SELLER';

  const diffTime = Math.abs(new Date().getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 0 && diffDays <= 6) return '< 1 WEEK SELLER';
  if (diffDays >= 7 && diffDays <= 14) return '1 WEEK SELLER';
  if (diffDays >= 15 && diffDays <= 30) return '2 WEEKS SELLER';
  if (diffDays >= 31 && diffDays <= 59) return '1 MONTH SELLER';
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} MONTHS SELLER`;
  
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return '1 YEAR SELLER';
  return `${diffYears} YEARS SELLER`;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const { categories } = useCategories();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [addingToCart, setAddingToCart] = useState<Record<number, boolean>>({});
  const [addedToCart, setAddedToCart] = useState<Record<number, boolean>>({});
  const [userRole, setUserRole] = useState<'customer' | 'admin' | 'merchant' | 'guest'>('guest');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
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

    const fetchCats = async () => {
      try {
        const [cats, tags] = await Promise.all([getCategories(), getAvailableTags()]);
        setAvailableCategories(Array.from(new Set([...cats, ...tags])));
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCats();

    
    const fetchW = async () => {
      try {
        const w = await getWishlist();
        setWishlistedIds(new Set(w.map(p => p.id)));
      } catch (err) {
        console.error('Error fetching wishlist:', err);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile && profile.role) {
            setUserRole(profile.role);
          } else {
            setUserRole('customer'); // Default for users without explicit role
          }
          fetchW();
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setUserRole('customer');
        }
      } else {
        setUserRole('guest');
        setWishlistedIds(new Set());
      }
    });

    return () => unsubscribe();
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

  const handleCategoryClick = (newCategory: string) => {
    const targetCategory = category === newCategory ? '' : newCategory;
    setCategory(targetCategory);
    fetchProducts({
      keyword: keyword || undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      category: targetCategory || undefined,
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


      {/* Main Flex Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start relative w-full">
        
        {/* Mobile Filters Toggle Button */}
        <div className="lg:hidden w-full mb-2">
          <button 
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className="w-full bg-surface text-on-surface py-3 px-4 flex items-center justify-between font-bold uppercase text-xs border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all"
          >
            <span className="flex items-center gap-2">
              <Icon name="tune" className="text-lg" />
              {isMobileFiltersOpen ? 'Hide Filters' : 'Show Categories & Filters'}
            </span>
            <Icon name={isMobileFiltersOpen ? "close" : "menu"} className="text-lg" />
          </button>
        </div>

        {/* Filters Sidebar Wrapper */}
        <div 
          className={`${isMobileFiltersOpen ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row lg:sticky lg:top-24 items-start shrink-0 z-30 w-full lg:w-auto`}
          onMouseLeave={() => setHoveredCategory(null)}
        >
          {/* === MOBILE LAYOUT === */}
          <div className="lg:hidden w-full space-y-4">
            {/* Categories as horizontal scrollable chips */}
            <div className="overflow-x-auto hide-scrollbar -mx-1 px-1 pb-2">
              <div className="flex gap-2 w-max">
                <button
                  onClick={() => handleCategoryClick('')}
                  className={`shrink-0 px-4 py-2 border-2 border-on-surface text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                    category === ''
                      ? 'bg-primary-container text-on-primary-container shadow-[3px_3px_0px_0px_var(--color-on-surface)]'
                      : 'bg-surface text-on-surface hover:bg-surface-container'
                  }`}
                >
                  All
                </button>
                {categories
                  .filter(group => 
                    availableCategories.includes(group.name) || 
                    group.categories.some(c => 
                      availableCategories.includes(c.name) || 
                      c.subcategories?.some(sub => availableCategories.includes(sub))
                    )
                  )
                  .map(group => (
                  <button
                    key={group.name}
                    onClick={() => handleCategoryClick(group.name)}
                    className={`shrink-0 px-4 py-2 border-2 border-on-surface text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 ${
                      category === group.name
                        ? 'bg-primary-container text-on-primary-container shadow-[3px_3px_0px_0px_var(--color-on-surface)]'
                        : 'bg-surface text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <Icon name={CATEGORY_ICONS[group.name] || 'label'} className="text-[14px]" />
                    {group.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Search & Price side by side */}
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Search..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full h-10 px-3 border-2 border-on-surface rounded-none font-medium text-sm focus:ring-0 focus:border-primary-container"
                />
              </div>
              <div className="w-28 shrink-0">
                <input
                  type="number"
                  placeholder="Max Ksh"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full h-10 px-3 border-2 border-on-surface rounded-none font-medium text-sm focus:ring-0 focus:border-primary-container"
                />
              </div>
            </div>

            {/* Action buttons side by side */}
            <div className="flex gap-3">
              <button 
                onClick={handleApplyFilters}
                className="flex-1 bg-primary-container text-on-primary-container py-2.5 font-bold uppercase tracking-wider text-xs border-2 border-on-surface shadow-[3px_3px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--color-on-surface)] hover:bg-amber-500 transition-all"
              >
                Apply
              </button>
              <button 
                onClick={handleClearFilters}
                className="flex-1 bg-surface text-secondary py-2.5 font-bold uppercase tracking-wider text-xs border-2 border-on-surface hover:bg-surface-container active:scale-95 transition-all"
              >
                Clear
              </button>
            </div>
          </div>

          {/* === DESKTOP LAYOUT === */}
          <aside className="hidden lg:block w-72 shrink-0 bg-surface border-2 border-on-surface p-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)] space-y-6 z-20 relative">
          
          {/* Categories Menu */}
          <div>
            <h3 className="font-headline-md text-base font-black uppercase tracking-wider text-on-surface flex items-center gap-2 pb-3 border-b-2 border-surface-container">
              <Icon name="category" className="font-black text-sm" />
              <span>Categories</span>
            </h3>
            <ul className="mt-4 flex flex-col gap-1 relative z-30 max-h-[60vh] overflow-y-auto hide-scrollbar">
              <li
                onClick={() => handleCategoryClick('')}
                className={`flex items-center justify-between py-2 px-3 cursor-pointer transition-colors ${
                  category === '' 
                    ? 'bg-surface-container text-primary-container font-bold border-l-4 border-primary-container' 
                    : 'text-on-surface hover:bg-surface-container border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon name="dashboard" className="text-[18px] opacity-80" />
                  <span className="text-xs font-semibold">All Categories</span>
                </div>
              </li>
              {categories
                .filter(group => 
                  availableCategories.includes(group.name) || 
                  group.categories.some(c => 
                    availableCategories.includes(c.name) || 
                    c.subcategories?.some(sub => availableCategories.includes(sub))
                  )
                )
                .map(group => (
                <li
                  key={group.name}
                  onMouseEnter={() => setHoveredCategory(group.name)}
                  onClick={() => handleCategoryClick(group.name)}
                  className={`flex items-center justify-between py-2 px-3 cursor-pointer transition-colors ${
                    category === group.name || hoveredCategory === group.name 
                      ? 'bg-surface-container text-primary-container font-bold border-l-4 border-primary-container' 
                      : 'text-on-surface hover:bg-surface-container border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={CATEGORY_ICONS[group.name] || 'label'} className="text-[18px] opacity-80" />
                    <span className="text-xs font-semibold truncate max-w-[140px]">{group.name}</span>
                  </div>
                  <Icon name="chevron_right" className="text-sm opacity-50 shrink-0" />
                </li>
              ))}
            </ul>

          </div>

          <h3 className="font-headline-md text-base font-black uppercase tracking-wider text-on-surface flex items-center gap-2 pb-3 border-b-2 border-surface-container pt-4 mt-6">
            <Icon name="tune" className="font-black text-sm" />
            <span>Refine Search</span>
          </h3>
          
          <div className="space-y-4">
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
            
            <div className="space-y-1">
              <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Max Price (Ksh)</label>
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
          </div>

          <div className="space-y-2 pt-2">
            <button 
              onClick={handleApplyFilters}
              className="w-full bg-primary-container text-on-primary-container py-3 font-headline-md font-bold uppercase tracking-wider text-xs border-2 border-on-surface transition-transform active:scale-95 shadow-[3px_3px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--color-on-surface)] hover:bg-amber-500"
            >
              Apply Filters
            </button>
            <button 
              onClick={handleClearFilters}
              className="w-full bg-surface text-secondary py-3.5 font-bold uppercase tracking-wider text-xs border-2 border-on-surface transition-colors hover:bg-surface-container active:scale-95"
            >
              Clear Filters
            </button>
          </div>
        </aside>

        {/* Subcategories Flyout Panel (Desktop only) */}
        <div 
           className={`hidden lg:flex overflow-hidden transition-[width,opacity,margin] duration-300 ease-in-out shrink-0 h-full ${hoveredCategory ? 'w-[450px] ml-6 opacity-100' : 'w-0 ml-0 opacity-0'}`}
        >
          {hoveredCategory && (
            <div className="w-[450px] bg-surface border-2 border-on-surface shadow-[6px_6px_0px_0px_var(--color-on-surface)] z-50 p-6 min-h-full">
              <h4 className="font-headline-md text-lg font-black uppercase text-on-surface mb-4 border-b-2 border-surface-container pb-2 flex items-center gap-2">
                <Icon name={CATEGORY_ICONS[hoveredCategory] || 'label'} className="text-xl text-primary-container" />
                {hoveredCategory}
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 max-h-[60vh] overflow-y-auto pr-2 hide-scrollbar">
                {categories
                  .find(g => g.name === hoveredCategory)?.categories
                  .filter(c => availableCategories.includes(c.name) || c.subcategories?.some(sub => availableCategories.includes(sub)))
                  .map(c => {
                    const validSubcategories = c.subcategories?.filter(sub => availableCategories.includes(sub));
                    return (
                    <div key={c.name} className="flex flex-col gap-1.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleCategoryClick(c.name); setHoveredCategory(null); }}
                        className="font-bold text-sm text-on-surface hover:text-primary-container text-left transition-colors flex items-center gap-1.5"
                      >
                        {c.name}
                        <Icon name="chevron_right" className="text-[10px] opacity-30" />
                      </button>
                      {validSubcategories && validSubcategories.length > 0 && (
                        <div className="flex flex-col gap-1 ml-1 pl-2 border-l-2 border-surface-container-high">
                          {validSubcategories.map(sub => (
                            <button 
                              key={sub}
                              onClick={(e) => { e.stopPropagation(); handleCategoryClick(sub); setHoveredCategory(null); }}
                              className="font-semibold text-[11px] text-secondary hover:text-primary-container text-left transition-colors"
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )})}
              </div>
            </div>
          )}
        </div>
      </div>


        {/* Products Grid Content */}
        <div className="flex-1 min-w-0 space-y-6 z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="font-black text-xl tracking-tight uppercase text-on-surface hidden sm:block">Recent Listings</h2>
              <span className="font-bold text-xs uppercase tracking-wider text-secondary hidden sm:block bg-surface-container-low px-2 py-1 rounded">
                {loading ? '...' : `${products.length} ads`}
              </span>
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 border border-surface-dim rounded font-bold text-xs uppercase bg-surface cursor-pointer"
              >
                <option value="default">Sort By: Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 bg-surface rounded border border-surface-dim ${viewMode === 'grid' ? 'text-primary-container border-primary-container' : 'text-secondary hover:text-on-surface'}`}
                  aria-label="Grid view"
                >
                  <Icon name="grid_view" className="text-lg" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 bg-surface rounded border border-surface-dim ${viewMode === 'list' ? 'text-primary-container border-primary-container' : 'text-secondary hover:text-on-surface'}`}
                  aria-label="List view"
                >
                  <Icon name="view_list" className="text-lg" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-surface border-2 border-on-surface">
              <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
              <p className="mt-4 font-bold text-xs tracking-widest text-secondary uppercase">Loading Catalog...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-surface border-2 border-on-surface">
              <Icon name="info" className="text-4xl text-secondary mb-3" />
              <h4 className="font-extrabold uppercase text-sm">No items found</h4>
              <p className="text-xs text-secondary mt-1 max-w-[280px]">Adjust your filter query or clear searches to reset the collection grid.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-6"}>
              {[...products].sort((a, b) => {
                const aVerified = a.merchantStatus === 'approved' || a.merchantStatus === 'verified';
                const bVerified = b.merchantStatus === 'approved' || b.merchantStatus === 'verified';
                
                if (aVerified && !bVerified) return -1;
                if (!aVerified && bVerified) return 1;

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
                const isVerified = product.merchantStatus === 'approved' || product.merchantStatus === 'verified';
                const sellerAgeTag = formatSellerAge(product.merchantCreatedAt);

                return (
                  <article 
                    key={product.id} 
                    className="product-card bg-surface border border-surface-dim rounded overflow-hidden flex flex-col group relative"
                  >
                    <Link href={`/products/${product.id}`} className={`block relative bg-surface-container-low shrink-0 ${viewMode === 'list' ? 'sm:w-64 border-r border-surface-dim h-full' : 'h-48'}`}>
                      <img 
                        src={product.image_url || 'https://via.placeholder.com/150'} 
                        alt={product.name} 
                        className={`w-full h-full object-cover ${viewMode === 'list' ? 'absolute inset-0' : ''}`}
                        loading={idx > 3 ? 'lazy' : 'eager'}
                      />
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {isVerified && (
                          <span className="bg-primary-container text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max shadow-sm">
                            <Icon name="verified_user" className="text-[12px]" /> Verified ID
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="bg-error text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max shadow-sm">
                            -{discount}% OFF
                          </span>
                        )}
                        {!isVerified && (
                          <span className="bg-surface/90 text-on-surface text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max shadow-sm">
                            <Icon name="person" className="text-[12px]" /> {sellerAgeTag}
                          </span>
                        )}
                      </div>
                    </Link>
                    
                    <div className="p-4 flex-1 flex flex-col relative">
                      <button 
                        onClick={(e) => handleToggleWishlist(e, product.id)}
                        className={`absolute top-4 right-4 z-10 transition-transform hover:scale-110 ${wishlistedIds.has(product.id) ? 'text-error' : 'text-secondary hover:text-error'}`}
                      >
                        <Icon name={wishlistedIds.has(product.id) ? "favorite" : "favorite_border"} className="text-xl" />
                      </button>
                      
                      <p className="text-primary-container font-extrabold text-lg mb-1">
                        Ksh {finalPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>

                      {product.category && (
                        <p className="text-[10px] text-secondary font-medium mb-1 truncate flex items-center gap-1">
                          <span>{product.category}</span>
                          {product.tags && product.tags.length > 0 && (
                            <>
                              <span className="text-[8px]">▶</span>
                              <span className="truncate">{product.tags.join(' > ')}</span>
                            </>
                          )}
                        </p>
                      )}
                      
                      <Link href={`/products/${product.id}`}>
                        <h3 className="font-bold text-sm text-on-surface line-clamp-2 mb-2 pr-8 hover:underline">{product.name}</h3>
                      </Link>
                      
                      <p className="text-xs text-secondary mt-auto line-clamp-2">
                        {product.description || `Premium quality ${product.category?.toLowerCase() || 'item'} for sale.`}
                      </p>

                      {/* Merchant Info */}
                      <Link href={`/store/${product.merchantId || 'admin'}`} className="mt-3 flex items-start gap-2 bg-surface-container-lowest p-2 border border-surface-dim rounded hover:border-primary-container hover:shadow-sm transition-all group">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                          {product.merchantName ? product.merchantName.substring(0,2) : 'JU'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-on-surface truncate flex items-center gap-1">
                            {product.merchantName || 'JUJ4 Official Store'}
                            {product.merchantStatus === 'verified' && (
                              <Icon name="verified" className="text-[14px] text-blue-500" />
                            )}
                          </p>
                          <p className="text-[9px] text-secondary line-clamp-1">
                            {product.merchantInfo || 'Verified premium merchant with 100% positive feedback.'}
                          </p>
                        </div>
                      </Link>
                      
                      <div className="mt-4 pt-4 border-t border-surface-container-low flex items-center justify-between gap-2">
                        <div className="flex-1">
                           <ProductRatingBadge productId={product.id} />
                        </div>
                        {(userRole === 'customer' || userRole === 'guest') && (
                          <button
                            onClick={(e) => handleAddToCart(e, product.id)}
                            disabled={addingToCart[product.id]}
                            className={`shrink-0 px-4 py-2 border border-surface-dim bg-surface text-on-surface font-bold text-[10px] uppercase tracking-wider transition-colors hover:bg-surface-container rounded ${addedToCart[product.id] ? '!bg-green-600 !text-white !border-green-600' : ''}`}
                          >
                            {addingToCart[product.id] ? (addedToCart[product.id] ? 'Added ✓' : 'Adding...') : 'Add to Cart'}
                          </button>
                        )}
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
