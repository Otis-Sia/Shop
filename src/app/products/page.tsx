'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProducts } from '@/lib/api/products';
import { useCategories } from '@/hooks/useCategories';
import { addToCart } from '@/lib/api/cart';
import { addToWishlist, removeFromWishlist, getWishlist } from '@/lib/api/wishlist';
import { trackAddToCart, trackAddToWishlist } from '@/lib/api/analytics';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from '@/lib/api/auth';
import { canAddToCartRole } from '@/lib/access';
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

function ProductsPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const { categories } = useCategories();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<'group' | 'node' | 'sub'>('group');
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());
  const [category, setCategory] = useState('');
  const [newArrivalsOnly, setNewArrivalsOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [addingToCart, setAddingToCart] = useState<Record<number, boolean>>({});
  const [addedToCart, setAddedToCart] = useState<Record<number, boolean>>({});
  const [userRole, setUserRole] = useState<'customer' | 'admin' | 'merchant' | 'guest'>('guest');

  const searchParams = useSearchParams();

  // Compute which groups have products (for sidebar visibility)
  const productCategoryNames = useMemo(() => {
    return new Set(products.map(p => p.category).filter(Boolean));
  }, [products]);

  // Client-side filtering: category hierarchy, keyword, price
  const filteredProducts = useMemo(() => {
    let result = products;

    if (category) {
      if (selectedLevel === 'group') {
        result = result.filter(p => p.category === category);
      } else if (selectedLevel === 'node') {
        const parentGroups = categories
          .filter(g => g.categories.some(c => c.name === category))
          .map(g => g.name);
        result = result.filter(p => parentGroups.includes(p.category));
      } else if (selectedLevel === 'sub') {
        const parentGroups = categories
          .filter(g => g.categories.some(c => c.subcategories?.includes(category)))
          .map(g => g.name);
        result = result.filter(p => parentGroups.includes(p.category));
      }
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        p.description?.toLowerCase().includes(kw) ||
        p.brand?.toLowerCase().includes(kw)
      );
    }

    if (maxPrice) {
      const max = Number(maxPrice);
      result = result.filter(p => {
        const salePrice = p.salePrice ? parseFloat(String(p.salePrice)) : 0;
        const finalPrice = (salePrice > 0 && salePrice < p.price) ? salePrice : p.price;
        return finalPrice <= max;
      });
    }

    return result;
  }, [products, category, selectedLevel, categories, keyword, maxPrice]);

  const fetchProducts = async (filters: { keyword?: string; maxPrice?: number; newArrivals?: boolean } = {}) => {
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
    const searchVal = searchParams.get('search') || '';
    const catVal = searchParams.get('category') || '';
    const newArrivalsVal = searchParams.get('filter') === 'new-arrivals' || searchParams.get('newArrivals') === 'true';

    setKeyword(searchVal);
    setCategory(catVal);
    setNewArrivalsOnly(newArrivalsVal);

    fetchProducts({ 
      keyword: searchVal || undefined, 
      newArrivals: newArrivalsVal || undefined 
    });
  }, [searchParams]);

  useEffect(() => {
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
            setUserRole('customer');
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
      try {
        await addToWishlist(productId);
        trackAddToWishlist(productId);
      } catch(e) { console.error(e); }
    }
  };

  const handleCategoryClick = (name: string, level: 'group' | 'node' | 'sub') => {
    if (category === name) {
      setCategory('');
      setSelectedLevel('group');
      setExpandedGroup(null);
      setMobileExpandedGroup(null);
    } else {
      setCategory(name);
      setSelectedLevel(level);
    }
  };

  const handleApplyFilters = () => {
    fetchProducts({
      keyword: keyword || undefined,
      newArrivals: newArrivalsOnly || undefined,
    });
  };

  const handleClearFilters = () => {
    setKeyword('');
    setMaxPrice('');
    setCategory('');
    setSelectedLevel('group');
    setExpandedGroup(null);
    setMobileExpandedGroup(null);
    setSortBy('default');
    setNewArrivalsOnly(false);
    fetchProducts();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleApplyFilters();
  };

  const handleAddToCart = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    if (!canAddToCartRole(userRole)) return;
    setAddingToCart(prev => ({ ...prev, [productId]: true }));
    try {
      await addToCart(productId, 1);
      trackAddToCart(productId, 1);
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
          {newArrivalsOnly ? 'New Arrivals' : 'Shop All Products'}
        </h1>
        <p className="font-body-md text-sm text-secondary uppercase font-semibold mt-2">
          {newArrivalsOnly ? 'Products added within the last week.' : 'Discover our curated collection of premium high-velocity items.'}
        </p>
      </header>


      {/* Main Flex Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start relative w-full">
        
        {/* Mobile Filters Toggle Button */}
        <div className="lg:hidden w-full mb-2">
          <button 
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className="w-full bg-surface text-on-surface py-3 px-4 flex items-center justify-between font-bold uppercase text-xs border border-outline/20 rounded-xl shadow-sm active:scale-[0.99] transition-all"
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
          className={`${isMobileFiltersOpen ? 'flex' : 'hidden'} lg:flex flex-col lg:sticky lg:top-24 items-start shrink-0 z-30 w-full lg:w-auto`}
        >
          {/* === MOBILE LAYOUT === */}
          <div className="lg:hidden w-full space-y-4">
            {/* Categories as horizontal scrollable chips */}
            <div className="overflow-x-auto hide-scrollbar -mx-1 px-1 pb-2">
              <div className="flex gap-2 w-max">
                <button
                  onClick={() => { handleCategoryClick('', 'group'); setMobileExpandedGroup(null); }}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                    category === ''
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  All
                </button>
                {categories
                  .filter(group => productCategoryNames.has(group.name))
                  .map(group => (
                  <button
                    key={group.name}
                    onClick={() => {
                      handleCategoryClick(group.name, 'group');
                      setMobileExpandedGroup(mobileExpandedGroup === group.name ? null : group.name);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 ${
                      category === group.name || mobileExpandedGroup === group.name
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon name={CATEGORY_ICONS[group.name] || 'label'} className="text-[14px]" />
                    {group.name}
                    {group.categories.length > 0 && (
                      <Icon name={mobileExpandedGroup === group.name ? "expand_less" : "expand_more"} className="text-[14px] ml-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile expanded subcategories */}
            {mobileExpandedGroup && (() => {
              const group = categories.find(g => g.name === mobileExpandedGroup);
              if (!group || group.categories.length === 0) return null;
              return (
                <div className="bg-surface-container rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-secondary px-1">Browse {mobileExpandedGroup}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.categories.map(node => (
                      <button
                        key={node.name}
                        onClick={() => handleCategoryClick(node.name, 'node')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                          category === node.name
                            ? 'bg-primary-container text-on-primary-container'
                            : 'bg-surface text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {node.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Search & Price side by side */}
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Search..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full h-10 px-3 border border-outline/30 rounded-lg font-medium text-sm focus:ring-0 focus:border-primary-container"
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
                  className="w-full h-10 px-3 border border-outline/30 rounded-lg font-medium text-sm focus:ring-0 focus:border-primary-container"
                />
              </div>
            </div>

            {/* New Arrivals Switch */}
            <div className="flex items-center gap-3 py-1.5 px-1">
              <input
                type="checkbox"
                id="mobileNewArrivalsOnly"
                checked={newArrivalsOnly}
                onChange={(e) => setNewArrivalsOnly(e.target.checked)}
                className="w-5 h-5 border border-outline/30 bg-surface text-primary-container focus:ring-0 rounded cursor-pointer"
              />
              <label htmlFor="mobileNewArrivalsOnly" className="font-extrabold text-xs uppercase tracking-wider text-on-surface cursor-pointer select-none">
                New Arrivals Only
              </label>
            </div>

            {/* Action buttons side by side */}
            <div className="flex gap-3">
              <button 
                onClick={handleApplyFilters}
                className="flex-1 bg-primary-container text-on-primary-container py-2.5 font-bold uppercase tracking-wider text-xs rounded-lg shadow-sm hover:bg-amber-500 transition-all active:scale-[0.98]"
              >
                Apply
              </button>
              <button 
                onClick={handleClearFilters}
                className="flex-1 bg-surface text-secondary py-2.5 font-bold uppercase tracking-wider text-xs border border-outline/20 rounded-lg hover:bg-surface-container active:scale-[0.98] transition-all"
              >
                Clear
              </button>
            </div>
          </div>

          {/* === DESKTOP LAYOUT === */}
          <aside className="hidden lg:block w-72 shrink-0 bg-surface border border-outline/20 rounded-xl p-6 shadow-sm space-y-6 z-20 relative">
          
          {/* Categories Menu */}
          <div>
            <h3 className="font-headline-md text-base font-black uppercase tracking-wider text-on-surface flex items-center gap-2 pb-3 border-b border-outline/10">
              <Icon name="category" className="font-black text-sm" />
              <span>Categories</span>
            </h3>
            <ul className="mt-3 flex flex-col gap-0.5 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <li
                onClick={() => { handleCategoryClick('', 'group'); setExpandedGroup(null); }}
                className={`flex items-center gap-3 py-2 px-3 cursor-pointer rounded-lg transition-colors text-xs font-semibold ${
                  category === '' 
                    ? 'bg-primary-container/10 text-primary-container' 
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <Icon name="dashboard" className="text-[18px] opacity-80" />
                All Categories
              </li>
              {categories
                .filter(group => productCategoryNames.has(group.name))
                .map(group => (
                <li key={group.name} className="flex flex-col">
                  <div
                    onClick={() => {
                      handleCategoryClick(group.name, 'group');
                      setExpandedGroup(expandedGroup === group.name ? null : group.name);
                    }}
                    className={`flex items-center justify-between py-2 px-3 cursor-pointer rounded-lg transition-colors ${
                      category === group.name 
                        ? 'bg-primary-container/10 text-primary-container font-bold' 
                        : 'text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon name={CATEGORY_ICONS[group.name] || 'label'} className="text-[18px] opacity-80" />
                      <span className="text-xs font-semibold truncate max-w-[140px]">{group.name}</span>
                    </div>
                    {group.categories.length > 0 && (
                      <Icon 
                        name={expandedGroup === group.name ? "expand_less" : "expand_more"} 
                        className="text-sm opacity-50 shrink-0" 
                      />
                    )}
                  </div>
                  {/* Expanded subcategories tree */}
                  {expandedGroup === group.name && group.categories.length > 0 && (
                    <ul className="ml-6 pl-3 border-l border-outline/10 mt-1 mb-2 space-y-0.5">
                      {group.categories.map(node => (
                        <li key={node.name} className="flex flex-col">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCategoryClick(node.name, 'node'); }}
                            className={`text-left py-1.5 px-2 rounded-md text-xs transition-colors ${
                              category === node.name
                                ? 'text-primary-container font-bold bg-primary-container/5'
                                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                            }`}
                          >
                            {node.name}
                          </button>
                          {node.subcategories && node.subcategories.length > 0 && (
                            <ul className="ml-4 pl-2 border-l border-outline/5 mt-0.5 space-y-0.5">
                              {node.subcategories.map(sub => (
                                <li key={sub}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCategoryClick(sub, 'sub'); }}
                                    className={`text-left py-1 px-2 rounded-md text-[11px] transition-colors ${
                                      category === sub
                                        ? 'text-primary-container font-semibold'
                                        : 'text-secondary hover:text-on-surface'
                                    }`}
                                  >
                                    {sub}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <h3 className="font-headline-md text-base font-black uppercase tracking-wider text-on-surface flex items-center gap-2 pb-3 border-b border-outline/10 pt-4 mt-6">
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
                className="w-full h-12 px-4 border border-outline/30 rounded-lg font-medium text-sm transition-all focus:ring-0 focus:border-primary-container"
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
                className="w-full h-12 px-4 border border-outline/30 rounded-lg font-medium text-sm transition-all focus:ring-0 focus:border-primary-container"
              />
            </div>

            <div className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                id="newArrivalsOnly"
                checked={newArrivalsOnly}
                onChange={(e) => setNewArrivalsOnly(e.target.checked)}
                className="w-5 h-5 border border-outline/30 bg-surface text-primary-container focus:ring-0 rounded cursor-pointer"
              />
              <label htmlFor="newArrivalsOnly" className="font-extrabold text-xs uppercase tracking-wider text-on-surface cursor-pointer select-none">
                New Arrivals Only
              </label>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button 
              onClick={handleApplyFilters}
              className="w-full bg-primary-container text-on-primary-container py-3 font-headline-md font-bold uppercase tracking-wider text-xs rounded-lg shadow-sm hover:bg-amber-500 transition-all active:scale-[0.98]"
            >
              Apply Filters
            </button>
            <button 
              onClick={handleClearFilters}
              className="w-full bg-surface text-secondary py-3.5 font-bold uppercase tracking-wider text-xs border border-outline/20 rounded-lg hover:bg-surface-container active:scale-[0.98] transition-all"
            >
              Clear Filters
            </button>
          </div>
        </aside>
        </div>


        {/* Products Grid Content */}
        <div className="flex-1 min-w-0 space-y-6 z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="font-black text-xl tracking-tight uppercase text-on-surface hidden sm:block">Recent Listings</h2>
              <span className="font-bold text-xs uppercase tracking-wider text-secondary hidden sm:block bg-surface-container-low px-2 py-1 rounded">
                {loading ? '...' : `${filteredProducts.length} ads`}
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
            <div className="flex flex-col items-center justify-center py-24 bg-surface border border-outline/20 rounded-xl">
              <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
              <p className="mt-4 font-bold text-xs tracking-widest text-secondary uppercase">Loading Catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-surface border border-outline/20 rounded-xl">
              <Icon name="info" className="text-4xl text-secondary mb-3" />
              <h4 className="font-extrabold uppercase text-sm">No items found</h4>
              <p className="text-xs text-secondary mt-1 max-w-[280px]">Adjust your filter query or clear searches to reset the collection grid.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-6"}>
              {[...filteredProducts].sort((a, b) => {
                const aVerified = a.merchantStatus === 'approved' || a.merchantStatus === 'verified';
                const bVerified = b.merchantStatus === 'approved' || b.merchantStatus === 'verified';
                
                if (aVerified && !bVerified) return -1;
                if (!aVerified && bVerified) return 1;

                const salePriceA = a.salePrice ? parseFloat(String(a.salePrice)) : 0;
                const priceA = (salePriceA > 0 && salePriceA < a.price) ? salePriceA : a.price;
                const salePriceB = b.salePrice ? parseFloat(String(b.salePrice)) : 0;
                const priceB = (salePriceB > 0 && salePriceB < b.price) ? salePriceB : b.price;
                switch (sortBy) {
                  case 'price-asc': return priceA - priceB;
                  case 'price-desc': return priceB - priceA;
                  case 'name-asc': return a.name.localeCompare(b.name);
                  case 'name-desc': return b.name.localeCompare(a.name);
                  default: return 0;
                }
              }).map((product, idx) => {
                const originalPrice = parseFloat(String(product.price));
                const salePrice = product.salePrice ? parseFloat(String(product.salePrice)) : 0;
                const hasDiscount = salePrice > 0 && salePrice < originalPrice;
                const finalPrice = hasDiscount ? salePrice : originalPrice;
                const exactSavings = hasDiscount ? originalPrice - salePrice : 0;
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
                        {hasDiscount && (
                          <span className="bg-error text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max shadow-sm">
                            Ksh {exactSavings.toFixed(0)} OFF
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
                      
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-primary-container font-extrabold text-lg">
                          Ksh {finalPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        {hasDiscount && (
                          <p className="text-secondary line-through font-bold text-xs mt-1">
                            Ksh {originalPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        )}
                      </div>

                      {product.category && (
                        <p className="text-[10px] text-secondary font-medium mb-1 truncate flex items-center gap-1">
                          <span>{product.category}</span>
                          {product.tags && product.tags.length > 0 && (
                            <>
                              <span className="text-[8px]">&#9654;</span>
                              <span className="truncate">{product.tags.join(' > ')}</span>
                            </>
                          )}
                        </p>
                      )}

                      {product.brand && product.brand.toLowerCase() !== 'generic' && (
                        <p className="text-[10px] text-secondary/80 font-semibold uppercase tracking-wide mb-1 truncate">
                          Brand: {product.brand}
                        </p>
                      )}
                      
                      <Link href={`/products/${product.id}`}>
                        <h3 className="font-bold text-sm text-on-surface line-clamp-2 mb-2 pr-8 hover:underline">{product.name}</h3>
                      </Link>
                      
                      <p className="text-xs text-secondary mt-auto line-clamp-2">
                        {product.description || `Premium quality ${product.category?.toLowerCase() || 'item'} for sale.`}
                      </p>


                      
                      <div className="mt-4 pt-4 border-t border-surface-container-low flex items-center justify-between gap-2">
                        <div className="flex-1">
                           <ProductRatingBadge productId={product.id} />
                        </div>
                        {canAddToCartRole(userRole) && !(product.hasVariants || (product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0)) && (
                          <button
                            onClick={(e) => handleAddToCart(e, product.id)}
                            disabled={addingToCart[product.id]}
                            className={`shrink-0 px-4 py-2 border border-surface-dim bg-surface text-on-surface font-bold text-[10px] uppercase tracking-wider transition-colors hover:bg-surface-container rounded ${addedToCart[product.id] ? '!bg-green-600 !text-white !border-green-600' : ''}`}
                          >
                            {addingToCart[product.id] ? (addedToCart[product.id] ? 'Added' : 'Adding...') : 'Add to Cart'}
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

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16 flex-grow flex flex-col items-center justify-center min-h-[500px]">
        <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
        <p className="mt-4 font-bold text-sm tracking-widest text-secondary uppercase">
          Loading Catalog...
        </p>
      </main>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
