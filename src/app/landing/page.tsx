'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProducts } from '@/lib/api/products';
import { addToCart } from '@/lib/api/cart';
import { Product } from '@/lib/data/products-data';
import Icon from '@/components/Icon';

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<Record<number, boolean>>({});
  const [addedToCart, setAddedToCart] = useState<Record<number, boolean>>({});
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getProducts({ limit: 8 });
        setProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const handleAddToCart = async (productId: number) => {
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

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <div className="bg-background text-on-surface">

      {/* ═══════════════════════════════════════════════════════════
          1. HERO SECTION
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#1a1c1c] text-white py-24 md:py-36 overflow-hidden border-b-4 border-primary-container">
        {/* JUJ4 watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="font-headline-md text-[150px] md:text-[250px] lg:text-[350px] font-black text-white/[0.03] tracking-tighter">
            JUJ4
          </span>
        </div>

        {/* Floating geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] left-[8%] w-24 h-24 border-2 border-primary-container/20 rotate-45 animate-pulse" />
          <div className="absolute top-[60%] right-[12%] w-36 h-36 border border-white/10 rotate-12 animate-bounce" style={{ animationDuration: '7s' }} />
          <div className="absolute bottom-[20%] left-[20%] w-16 h-16 bg-primary-container/10 rotate-[60deg] animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-[25%] right-[30%] w-20 h-20 border border-primary-container/15 rotate-[20deg] animate-bounce" style={{ animationDuration: '9s' }} />
          <div className="absolute bottom-[35%] right-[45%] w-28 h-28 border border-white/5 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-16 flex flex-col items-center text-center">
          <div className="inline-block bg-primary-container text-on-primary-container font-extrabold text-[10px] uppercase tracking-[0.25em] px-5 py-2 border-2 border-white mb-8 shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
            Your Universal Marketplace
          </div>

          <h1 className="font-headline-md text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] max-w-5xl">
            DISCOVER.<br />
            SHOP.<br />
            <span className="text-primary-container">REPEAT.</span>
          </h1>

          <p className="font-body-md text-base md:text-lg text-white/60 max-w-2xl mt-6 mb-10 leading-relaxed font-medium">
            Your premium shopping destination. Explore thousands of curated products across every category — from cutting-edge tech to timeless fashion.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/products"
              className="px-10 py-4 bg-primary-container text-on-primary-container border-2 border-white font-headline-md font-bold uppercase tracking-wider text-sm transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] hover:bg-amber-500"
            >
              Shop Now
            </Link>
            <a
              href="#collections"
              className="px-10 py-4 border-2 border-white bg-transparent text-white font-bold uppercase tracking-wider text-sm transition-colors hover:bg-surface/10 active:scale-95"
            >
              Explore Collections
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          2. MARQUEE / SCROLLING BANNER
         ═══════════════════════════════════════════════════════════ */}
      <section className="bg-primary-container border-y-2 border-on-surface py-4 overflow-hidden">
        <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite]">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="font-headline-md text-sm font-black text-on-primary-container uppercase tracking-[0.2em] mx-0">
              FREE SHIPPING &nbsp;•&nbsp; SECURE CHECKOUT &nbsp;•&nbsp; PREMIUM QUALITY &nbsp;•&nbsp; 24/7 SUPPORT &nbsp;•&nbsp; EASY RETURNS &nbsp;•&nbsp; 50K+ PRODUCTS &nbsp;•&nbsp;&nbsp;
            </span>
          ))}
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-33.33%); }
          }
        `}</style>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          3. FEATURED COLLECTIONS
         ═══════════════════════════════════════════════════════════ */}
      <section id="collections" className="py-20 md:py-28 bg-surface border-b-2 border-on-surface">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16">
          <div className="text-center mb-16">
            <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">
              Curated For You
            </p>
            <h2 className="font-headline-md text-3xl md:text-4xl font-black uppercase tracking-tight text-on-surface">
              Featured Collections
            </h2>
            <p className="font-body-md text-sm text-secondary uppercase font-semibold mt-2">
              Handpicked selections across the most popular categories.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Large feature card — New Arrivals */}
            <Link
              href="/products"
              className="group bg-[#1a1c1c] text-white border-2 border-[#1a1c1c] p-10 flex flex-col justify-between min-h-[350px] shadow-[6px_6px_0px_0px_rgba(255,140,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,140,0,1)] transition-all relative overflow-hidden"
            >
              {/* Background decoration */}
              <div className="absolute top-4 right-4 w-32 h-32 border border-white/10 rotate-45 group-hover:rotate-[50deg] transition-transform duration-500" />
              <div className="absolute bottom-8 right-8 w-20 h-20 bg-primary-container/20 rotate-12 group-hover:rotate-[18deg] transition-transform duration-500" />

              <div className="relative z-10">
                <div className="inline-block bg-primary-container text-on-primary-container text-[10px] font-black uppercase px-3 py-1 border border-white mb-4">
                  New Season
                </div>
                <h3 className="font-headline-md text-3xl md:text-4xl font-black uppercase tracking-tighter leading-[0.95]">
                  NEW<br />ARRIVALS
                </h3>
              </div>
              <div className="relative z-10 flex items-center gap-2 mt-6">
                <span className="font-headline-md font-bold text-sm uppercase tracking-wider">Shop Collection</span>
                <Icon name="arrow_forward" className="text-xl group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 2x2 grid of smaller cards */}
            <div className="grid grid-cols-2 gap-5">
              {[
              { name: 'Electronics', icon: 'devices', color: 'bg-surface-container' },
                { name: 'Fashion', icon: 'checkroom', color: 'bg-surface-container' },
                { name: 'Home & Living', icon: 'chair', color: 'bg-surface-container' },
                { name: 'Sports', icon: 'sports_soccer', color: 'bg-surface-container' },
              ].map((cat) => (
                <Link
                  key={cat.name}
                  href="/products"
                  className="bg-surface border-2 border-on-surface p-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] hover:border-primary-container transition-all flex flex-col items-center justify-center text-center group"
                >
                  <div className={`w-14 h-14 ${cat.color} border-2 border-on-surface flex items-center justify-center mb-4 group-hover:bg-primary-container transition-colors`}>
                    <Icon name={cat.icon} className="text-2xl text-on-surface group-hover:text-on-primary-container transition-colors font-bold" />
                  </div>
                  <h3 className="font-headline-md text-xs font-black uppercase text-on-surface tracking-wider">
                    {cat.name}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4. FEATURED PRODUCTS
         ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-14">
            <div>
              <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">Hot Drops</p>
              <h2 className="font-headline-md text-3xl md:text-4xl font-black uppercase tracking-tight text-on-surface">Featured Catalog</h2>
            </div>
            <Link
              href="/products"
              className="px-6 py-3 border-2 border-on-surface bg-surface font-extrabold uppercase tracking-wider text-xs hover:bg-surface-container active:scale-95 transition-all shadow-[3px_3px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--color-on-surface)]"
            >
              Browse Full Catalog
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
              <p className="mt-4 font-bold text-xs tracking-widest text-secondary uppercase">Loading Catalog...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product, idx) => {
                const discount = product.discount || 0;
                const originalPrice = parseFloat(String(product.price));
                const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;

                return (
                  <article
                    key={product.id}
                    className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col group hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] transition-all"
                  >
                    <Link href={`/products/${product.id}`} className="block relative overflow-hidden bg-surface-container-low border-b-2 border-on-surface">
                      <img
                        src={product.image_url || 'https://via.placeholder.com/150'}
                        alt={product.name}
                        className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                        loading={idx > 3 ? 'lazy' : 'eager'}
                      />
                      {idx < 2 && (
                        <span className="absolute top-3 left-3 bg-primary-container text-on-primary-container text-[10px] font-black uppercase px-2 py-0.5 border border-on-surface">
                          New
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="absolute top-3 right-3 bg-error-container text-on-error-container border border-error text-[10px] font-black uppercase px-2 py-0.5">
                          -{discount}%
                        </span>
                      )}
                    </Link>

                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="font-headline-md text-sm font-black uppercase text-on-surface mb-1 truncate">
                        {product.name}
                      </h3>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-4">
                        Category: {product.category || 'Apparel'}
                      </p>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-headline-md text-base font-black text-on-surface">
                            Ksh {finalPrice.toFixed(2)}
                          </span>
                          {discount > 0 && (
                            <span className="text-[10px] text-secondary line-through font-bold">
                              Ksh {originalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={addingToCart[product.id]}
                          className={`px-4 py-2 border-2 border-on-surface bg-primary-container text-on-primary-container font-headline-md font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-[2px_2px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_var(--color-on-surface)] hover:bg-amber-500 disabled:opacity-50 ${addedToCart[product.id] ? '!bg-green-600 !text-white' : ''}`}
                        >
                          {addingToCart[product.id] ? (addedToCart[product.id] ? 'Added ✓' : 'Adding...') : 'Add To Cart'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-center font-bold text-sm tracking-wide text-secondary uppercase">No Catalog Products Available.</p>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5. TRUST BADGES
         ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 bg-surface border-y-2 border-on-surface">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: 'local_shipping', title: 'Free Shipping', desc: 'On all orders over Ksh 150' },
              { icon: 'shield_lock', title: 'Secure Payment', desc: 'Encrypted checkout pipeline' },
              { icon: 'swap_horiz', title: 'Easy Returns', desc: '30-day hassle-free returns' },
              { icon: 'workspace_premium', title: 'Premium Quality', desc: 'Carefully curated items' },
            ].map((badge) => (
              <div
                key={badge.title}
                className="bg-surface border-2 border-on-surface p-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:-translate-y-1 transition-all text-center flex flex-col items-center"
              >
                <div className="w-12 h-12 bg-primary-container border-2 border-on-surface flex items-center justify-center mb-4">
                  <Icon name={badge.icon} className="text-on-primary-container text-2xl font-bold" />
                </div>
                <h3 className="font-headline-md text-xs font-black uppercase text-on-surface mb-1">{badge.title}</h3>
                <p className="font-body-md text-[11px] text-secondary leading-relaxed font-semibold">{badge.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6. NEWSLETTER / CTA
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-28 bg-[#1a1c1c] text-white overflow-hidden">
        {/* Background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] left-[5%] w-32 h-32 border border-primary-container/20 rotate-45" />
          <div className="absolute bottom-[20%] right-[8%] w-24 h-24 border border-white/10 rotate-12" />
          <div className="absolute top-[50%] left-[55%] w-20 h-20 bg-primary-container/10 rotate-[30deg]" />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — Text */}
            <div>
              <p className="font-extrabold text-xs text-primary-container uppercase tracking-[0.3em] mb-3">
                Stay In The Loop
              </p>
              <h2 className="font-headline-md text-3xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-4">
                JOIN THE<br />
                <span className="text-primary-container">JUJ4 COMMUNITY</span>
              </h2>
              <p className="font-body-md text-sm text-white/60 font-medium leading-relaxed max-w-md">
                Be the first to know about exclusive deals, new arrivals, and insider access. No spam — just premium content delivered to your inbox.
              </p>
            </div>

            {/* Right — Email form */}
            <div className="bg-surface/5 border-2 border-white/20 p-8 backdrop-blur-sm">
              <form onSubmit={handleSubscribe} className="flex flex-col gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="YOUR EMAIL ADDRESS"
                  required
                  className="w-full px-5 py-4 border-2 border-white/30 bg-surface/5 text-white font-body-md font-semibold text-sm uppercase tracking-wider placeholder:text-white/40 focus:border-primary-container outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-primary-container text-on-primary-container border-2 border-white font-headline-md font-bold uppercase tracking-wider text-sm transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] hover:bg-amber-500"
                >
                  {subscribed ? 'Subscribed ✓' : 'Subscribe Now'}
                </button>
              </form>
              {subscribed && (
                <p className="mt-3 text-xs font-bold text-green-400 uppercase tracking-widest animate-pulse text-center">
                  Welcome to the JUJ4 community!
                </p>
              )}
              <p className="text-[10px] text-white/40 font-medium mt-4 text-center uppercase tracking-wider">
                We respect your privacy. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
