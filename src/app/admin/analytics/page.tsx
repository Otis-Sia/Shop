"use client";

import { useEffect, useState, useMemo } from "react";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/api/auth";
import { getProducts, Product } from "@/lib/api/products";
import { POPULARITY_WEIGHTS } from "@/lib/analytics/popularity";
import Link from "next/link";
import { 
  Eye, 
  Heart, 
  ShoppingCart, 
  ShoppingBag, 
  TrendingUp, 
  Award, 
  Package, 
  Layers, 
  Search, 
  RefreshCw 
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);

    try {
      const userProfile = await getUserProfile(user.uid);
      const role = userProfile?.role || "customer";

      const productsList = await getProducts({
        adminId: role === "admin" ? undefined : user.uid,
        includeUnapproved: true,
      });

      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Aggregated Summary
  const stats = useMemo(() => {
    let totalViews = 0;
    let totalWishlists = 0;
    let totalCarts = 0;
    let totalPurchases = 0;
    let totalScore = 0;

    for (const p of products) {
      const a = p.analytics || { views: 0, wishlistAdditions: 0, cartAdditions: 0, purchases: 0, popularityScore: 0 };
      totalViews += Number(a.views || 0);
      totalWishlists += Number(a.wishlistAdditions || 0);
      totalCarts += Number(a.cartAdditions || 0);
      totalPurchases += Number(a.purchases || 0);
      totalScore += Number(a.popularityScore || 0);
    }

    const viewToCartRate = totalViews > 0 ? ((totalCarts / totalViews) * 100).toFixed(1) : "0.0";
    const cartToPurchaseRate = totalCarts > 0 ? ((totalPurchases / totalCarts) * 100).toFixed(1) : "0.0";
    const overallConversionRate = totalViews > 0 ? ((totalPurchases / totalViews) * 100).toFixed(1) : "0.0";

    return {
      totalViews,
      totalWishlists,
      totalCarts,
      totalPurchases,
      totalScore,
      viewToCartRate,
      cartToPurchaseRate,
      overallConversionRate,
    };
  }, [products]);

  // Categories list
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();
  }, [products]);

  // Filtered and Sorted list for Leaderboard
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(p => 
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      list = list.filter(p => p.category === categoryFilter);
    }

    // Sort by popularity score descending
    list.sort((a, b) => (b.analytics?.popularityScore ?? 0) - (a.analytics?.popularityScore ?? 0));
    return list;
  }, [products, searchTerm, categoryFilter]);

  // Top performers
  const topViewed = useMemo(() => {
    return [...products].sort((a, b) => (b.analytics?.views ?? 0) - (a.analytics?.views ?? 0)).slice(0, 5);
  }, [products]);

  const topCarted = useMemo(() => {
    return [...products].sort((a, b) => (b.analytics?.cartAdditions ?? 0) - (a.analytics?.cartAdditions ?? 0)).slice(0, 5);
  }, [products]);

  const topWishlisted = useMemo(() => {
    return [...products].sort((a, b) => (b.analytics?.wishlistAdditions ?? 0) - (a.analytics?.wishlistAdditions ?? 0)).slice(0, 5);
  }, [products]);

  const topPurchased = useMemo(() => {
    return [...products].sort((a, b) => (b.analytics?.purchases ?? 0) - (a.analytics?.purchases ?? 0)).slice(0, 5);
  }, [products]);

  if (loading) {
    return (
      <div className="p-8 font-headline-md font-bold animate-pulse flex items-center justify-center min-h-[400px]">
        Loading Product Engagement Analytics...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-surface">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border-4 border-on-surface p-6 shadow-[6px_6px_0px_0px_var(--color-on-surface)]">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary-container shrink-0" />
            <h1 className="font-headline-md font-black text-2xl sm:text-3xl tracking-tight uppercase">
              Product Engagement & Popularity
            </h1>
          </div>
          <p className="font-body-md text-secondary mt-1 font-semibold text-xs sm:text-sm">
            Live tracking of product views, wishlist additions, cart additions, and verified purchases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center gap-2 bg-surface text-on-surface border-2 border-on-surface px-3 py-1.5 text-xs font-bold uppercase shadow-[2px_2px_0px_0px_var(--color-on-surface)] hover:translate-y-[1px] hover:translate-x-[1px] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link
            href="/admin/products"
            className="flex items-center gap-2 bg-primary-container text-on-surface border-2 border-on-surface px-4 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_var(--color-on-surface)] hover:translate-y-[1px] hover:translate-x-[1px] transition-all"
          >
            <Package className="w-4 h-4" />
            Manage Products
          </Link>
        </div>
      </div>

      {/* Popularity Formula Banner */}
      <div className="bg-primary-container/20 border-4 border-on-surface p-5 shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="inline-block text-[10px] font-black uppercase bg-on-surface text-surface px-2 py-0.5 mb-1">
              Active Weighting Model
            </span>
            <h3 className="font-headline-sm font-black text-base sm:text-lg">
              Popularity Score Calculation
            </h3>
            <p className="text-xs font-semibold text-secondary mt-0.5">
              Every click and conversion action increments the product score automatically.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto text-center font-mono">
            <div className="bg-surface border-2 border-on-surface p-2 shadow-sm">
              <span className="block text-[10px] uppercase font-bold text-secondary">View</span>
              <strong className="text-base text-on-surface">+{POPULARITY_WEIGHTS.VIEW} pt</strong>
            </div>
            <div className="bg-surface border-2 border-on-surface p-2 shadow-sm">
              <span className="block text-[10px] uppercase font-bold text-secondary">Wishlist</span>
              <strong className="text-base text-on-surface">+{POPULARITY_WEIGHTS.WISHLIST_ADD} pts</strong>
            </div>
            <div className="bg-surface border-2 border-on-surface p-2 shadow-sm">
              <span className="block text-[10px] uppercase font-bold text-secondary">Cart Add</span>
              <strong className="text-base text-on-surface">+{POPULARITY_WEIGHTS.CART_ADD} pts</strong>
            </div>
            <div className="bg-surface border-2 border-on-surface p-2 shadow-sm">
              <span className="block text-[10px] uppercase font-bold text-secondary">Purchase</span>
              <strong className="text-base text-green-700">+{POPULARITY_WEIGHTS.PURCHASE} pts</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Product Views */}
        <div className="bg-surface border-4 border-on-surface p-5 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-black uppercase tracking-wider">Total Product Views</span>
            <Eye className="w-5 h-5 text-on-surface" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black">{stats.totalViews.toLocaleString()}</div>
            <span className="text-[11px] font-bold text-secondary mt-1 block">
              1 point per click/view
            </span>
          </div>
        </div>

        {/* Wishlist Additions */}
        <div className="bg-surface border-4 border-on-surface p-5 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-black uppercase tracking-wider">Wishlist Additions</span>
            <Heart className="w-5 h-5 text-rose-600" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black">{stats.totalWishlists.toLocaleString()}</div>
            <span className="text-[11px] font-bold text-secondary mt-1 block">
              2 points per wishlist add
            </span>
          </div>
        </div>

        {/* Cart Additions */}
        <div className="bg-surface border-4 border-on-surface p-5 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-black uppercase tracking-wider">Cart Additions</span>
            <ShoppingCart className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black">{stats.totalCarts.toLocaleString()}</div>
            <span className="text-[11px] font-bold text-secondary mt-1 block">
              4 points per cart addition
            </span>
          </div>
        </div>

        {/* Purchases / Orders */}
        <div className="bg-surface border-4 border-on-surface p-5 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-black uppercase tracking-wider">Completed Purchases</span>
            <ShoppingBag className="w-5 h-5 text-green-700" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-green-700">{stats.totalPurchases.toLocaleString()}</div>
            <span className="text-[11px] font-bold text-secondary mt-1 block">
              7 points per verified buy
            </span>
          </div>
        </div>
      </div>

      {/* Funnel Overview */}
      <div className="bg-surface border-4 border-on-surface p-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        <h2 className="font-headline-sm font-black text-lg uppercase tracking-tight mb-4 flex items-center gap-2 border-b-2 border-on-surface/20 pb-2">
          <Layers className="w-5 h-5" />
          Purchase & Conversion Funnel
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-dim border-2 border-on-surface p-4 text-center">
            <span className="text-xs font-black uppercase text-secondary">View to Cart Rate</span>
            <div className="text-2xl font-black mt-2">{stats.viewToCartRate}%</div>
            <p className="text-[11px] text-secondary font-medium mt-1">
              {stats.totalCarts} cart adds from {stats.totalViews} views
            </p>
          </div>

          <div className="bg-surface-dim border-2 border-on-surface p-4 text-center">
            <span className="text-xs font-black uppercase text-secondary">Cart to Purchase Rate</span>
            <div className="text-2xl font-black mt-2 text-primary-container">{stats.cartToPurchaseRate}%</div>
            <p className="text-[11px] text-secondary font-medium mt-1">
              {stats.totalPurchases} purchases from {stats.totalCarts} cart adds
            </p>
          </div>

          <div className="bg-surface-dim border-2 border-on-surface p-4 text-center">
            <span className="text-xs font-black uppercase text-secondary">Overall Visitor Conversion</span>
            <div className="text-2xl font-black mt-2 text-green-700">{stats.overallConversionRate}%</div>
            <p className="text-[11px] text-secondary font-medium mt-1">
              {stats.totalPurchases} purchases from {stats.totalViews} total views
            </p>
          </div>
        </div>
      </div>

      {/* Top 4 Categorized Leaderboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Most Viewed */}
        <div className="bg-surface border-4 border-on-surface p-4 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col">
          <div className="flex items-center gap-2 border-b-2 border-on-surface pb-2 mb-3">
            <Eye className="w-4 h-4 text-on-surface" />
            <h3 className="font-bold text-xs uppercase tracking-wide">Top Viewed (1pt)</h3>
          </div>
          <div className="space-y-3 flex-1">
            {topViewed.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs border-b border-on-surface/10 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-secondary text-[11px]">#{idx + 1}</span>
                  <p className="font-semibold truncate max-w-[120px]" title={p.name}>{p.name}</p>
                </div>
                <span className="font-mono font-bold shrink-0">{p.analytics?.views ?? 0} views</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Wishlisted */}
        <div className="bg-surface border-4 border-on-surface p-4 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col">
          <div className="flex items-center gap-2 border-b-2 border-on-surface pb-2 mb-3">
            <Heart className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-xs uppercase tracking-wide">Most Wishlisted (2pts)</h3>
          </div>
          <div className="space-y-3 flex-1">
            {topWishlisted.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs border-b border-on-surface/10 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-secondary text-[11px]">#{idx + 1}</span>
                  <p className="font-semibold truncate max-w-[120px]" title={p.name}>{p.name}</p>
                </div>
                <span className="font-mono font-bold shrink-0">{p.analytics?.wishlistAdditions ?? 0} saved</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Added to Cart */}
        <div className="bg-surface border-4 border-on-surface p-4 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col">
          <div className="flex items-center gap-2 border-b-2 border-on-surface pb-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-xs uppercase tracking-wide">Most Carted (4pts)</h3>
          </div>
          <div className="space-y-3 flex-1">
            {topCarted.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs border-b border-on-surface/10 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-secondary text-[11px]">#{idx + 1}</span>
                  <p className="font-semibold truncate max-w-[120px]" title={p.name}>{p.name}</p>
                </div>
                <span className="font-mono font-bold shrink-0">{p.analytics?.cartAdditions ?? 0} carts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Purchased */}
        <div className="bg-surface border-4 border-on-surface p-4 shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col">
          <div className="flex items-center gap-2 border-b-2 border-on-surface pb-2 mb-3">
            <ShoppingBag className="w-4 h-4 text-green-700" />
            <h3 className="font-bold text-xs uppercase tracking-wide">Top Bought (7pts)</h3>
          </div>
          <div className="space-y-3 flex-1">
            {topPurchased.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs border-b border-on-surface/10 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-secondary text-[11px]">#{idx + 1}</span>
                  <p className="font-semibold truncate max-w-[120px]" title={p.name}>{p.name}</p>
                </div>
                <span className="font-mono font-bold text-green-700 shrink-0">{p.analytics?.purchases ?? 0} sold</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comprehensive Product Leaderboard Table */}
      <div className="bg-surface border-4 border-on-surface p-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b-2 border-on-surface/20 pb-4">
          <div>
            <h2 className="font-headline-sm font-black text-xl uppercase flex items-center gap-2">
              <Award className="w-6 h-6 text-primary-container" />
              Full Product Engagement Ranking
            </h2>
            <p className="text-xs text-secondary font-semibold mt-1">
              Ordered by overall popularity score: (Views x 1) + (Wishlist x 2) + (Cart x 4) + (Bought x 7)
            </p>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-secondary" />
              <input
                type="text"
                placeholder="Search product or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border-2 border-on-surface text-xs font-bold outline-none bg-surface"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border-2 border-on-surface px-3 py-1.5 text-xs font-bold uppercase outline-none bg-surface"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-on-surface text-surface uppercase font-bold text-xs tracking-wider">
                <th className="p-3 w-12 text-center">Rank</th>
                <th className="p-3">Product</th>
                <th className="p-3 text-center">Views (1pt)</th>
                <th className="p-3 text-center">Wishlist (2pt)</th>
                <th className="p-3 text-center">Cart (4pt)</th>
                <th className="p-3 text-center">Bought (7pt)</th>
                <th className="p-3 text-right">Popularity Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center font-bold text-secondary">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, index) => {
                  const a = p.analytics || { views: 0, wishlistAdditions: 0, cartAdditions: 0, purchases: 0, popularityScore: 0 };
                  return (
                    <tr key={p.id} className="border-b border-on-surface hover:bg-surface-dim transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-xs">
                        #{index + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrls?.[0] || p.image_url ? (
                            <img src={p.imageUrls?.[0] || p.image_url} alt={p.name} className="w-10 h-10 object-cover border border-on-surface shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-surface-dim border border-on-surface flex items-center justify-center text-[9px] font-bold shrink-0">No Img</div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate max-w-[200px]" title={p.name}>{p.name}</p>
                            <span className="text-[10px] text-secondary font-mono">SKU: {p.sku || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono text-xs font-semibold">
                        {a.views}
                      </td>
                      <td className="p-3 text-center font-mono text-xs font-semibold">
                        {a.wishlistAdditions}
                      </td>
                      <td className="p-3 text-center font-mono text-xs font-semibold">
                        {a.cartAdditions}
                      </td>
                      <td className="p-3 text-center font-mono text-xs font-bold text-green-700">
                        {a.purchases}
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-mono font-black text-xs bg-primary-container text-on-surface px-2 py-1 border border-on-surface inline-block">
                          {Number(a.popularityScore).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
