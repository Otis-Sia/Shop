'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';
import Countdown from '@/components/Countdown';
import { STORE_CONFIG } from '@/lib/config/store';
import { db } from '@/lib/firebase';
import { collection, addDoc, getCountFromServer } from 'firebase/firestore';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [stats, setStats] = useState({ products: '500+', customers: '200+', reviews: '4.9★', countries: '30+' });

  useEffect(() => {
    async function fetchStats() {
      try {
        const prodCount = await getCountFromServer(collection(db, 'products'));
        const roundToNext100 = (num: number) => Math.ceil(num / 100) * 100;
        
        setStats(prev => ({
          ...prev,
          products: `${roundToNext100(prodCount.data().count || 0)}+`,
        }));
      } catch (err) {
        // Ignore stats fetch failure silently
      }
    }
    fetchStats();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      try {
        await addDoc(collection(db, 'subscribers'), {
          email,
          createdAt: new Date()
        });
        setSubscribed(true);
        setEmail('');
        setTimeout(() => setSubscribed(false), 3000);
      } catch (err) {
        console.error("Failed to subscribe", err);
      }
    }
  };

  return (
    <div className="bg-background text-on-surface">

      {/* ═══════════════════════════════════════════════════════════
          1. FULL-SCREEN HERO
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-[#1a1c1c] text-white overflow-hidden border-b-4 border-primary-container">
        {/* Animated geometric background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[10%] left-[5%] w-32 h-32 border-2 border-primary-container/30 rotate-45 animate-pulse" />
          <div className="absolute top-[60%] right-[8%] w-48 h-48 border-2 border-primary-container/20 rotate-12 animate-bounce" style={{ animationDuration: '6s' }} />
          <div className="absolute bottom-[15%] left-[15%] w-24 h-24 bg-primary-container/10 rotate-45 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[30%] right-[25%] w-16 h-16 border border-white/10 rotate-[30deg] animate-bounce" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[40%] left-[50%] w-40 h-40 border border-primary-container/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[5%] right-[40%] w-20 h-20 bg-surface/5 rotate-12 animate-bounce" style={{ animationDuration: '10s' }} />
        </div>

        {/* Store watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="font-headline-md text-[180px] md:text-[300px] font-black text-white/[0.03] tracking-tighter">
            {STORE_CONFIG.name}
          </span>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-[900px] mx-auto px-6 md:px-16 text-center flex flex-col items-center">
          <div className="inline-block bg-primary-container text-on-primary-container font-extrabold text-[10px] uppercase tracking-[0.25em] px-5 py-2 border-2 border-white mb-8 shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
            Welcome to the Future
          </div>

          <h1 className="font-headline-md text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
            THE FUTURE<br />
            <span className="text-primary-container">OF SHOPPING</span>
          </h1>

          <p className="font-body-md text-base md:text-lg text-white/70 max-w-xl mb-10 leading-relaxed font-medium">
            {STORE_CONFIG.name} redefines the online shopping experience. Premium products, seamless checkout, and unmatched quality — all in one place.
          </p>

          <div className="mb-10 w-full max-w-3xl">
            <h3 className="font-extrabold text-xs text-primary-container uppercase tracking-[0.25em] mb-[-10px]">Grand Opening In</h3>
            <Countdown />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/products"
              className="px-10 py-4 bg-primary-container text-on-primary-container border-2 border-white font-headline-md font-bold uppercase tracking-wider text-sm transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] hover:bg-amber-500"
            >
              Enter The Store
            </Link>
            <a
              href="#brand-story"
              className="px-10 py-4 border-2 border-white bg-transparent text-white font-bold uppercase tracking-wider text-sm transition-colors hover:bg-surface/10 active:scale-95"
            >
              About Us
            </a>
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 animate-bounce">
            <Icon name="expand_more" className="text-3xl text-white/40" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          2. BRAND STORY
         ═══════════════════════════════════════════════════════════ */}
      <section id="brand-story" className="py-20 md:py-28 bg-surface border-b-2 border-on-surface">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text side */}
            <div>
              <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-2">
                Our Story
              </p>
              <h2 className="font-headline-md text-3xl md:text-5xl font-black uppercase tracking-tighter text-on-surface mb-6 leading-[0.95]">
                BUILT FOR<br />
                THE MODERN<br />
                <span className="text-primary-container">SHOPPER</span>
              </h2>
              <p className="font-body-md text-sm text-secondary leading-relaxed font-medium mb-6 max-w-lg">
                {STORE_CONFIG.name} was born from a simple idea: shopping should be effortless, enjoyable, and accessible to everyone. We curate only the finest products from trusted brands worldwide, ensuring every purchase meets our rigorous quality standards.
              </p>
              <p className="font-body-md text-sm text-secondary leading-relaxed font-medium mb-8 max-w-lg">
                From cutting-edge electronics to timeless fashion, our catalog spans every category imaginable. With lightning-fast delivery, secure payments, and a dedicated support team, we&apos;re redefining what it means to shop online.
              </p>
              <Link
                href="/products"
                className="inline-block px-8 py-3 bg-on-surface text-surface border-2 border-on-surface font-headline-md font-bold uppercase tracking-wider text-xs transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(255,140,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(255,140,0,1)] hover:-translate-y-0.5"
              >
                Explore Our Catalog
              </Link>
            </div>

            {/* Visual side — neobrutalist card stack */}
            <div className="relative">
              <div className="bg-surface border-2 border-on-surface p-8 shadow-[8px_8px_0px_0px_var(--color-on-surface)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-primary-container border-2 border-on-surface flex items-center justify-center">
                    <Icon name="storefront" className="text-on-primary-container text-3xl font-bold" />
                  </div>
                  <div>
                    <h3 className="font-headline-md text-lg font-black uppercase text-on-surface">{STORE_CONFIG.name} Marketplace</h3>
                    <p className="text-xs text-secondary font-semibold uppercase tracking-wider">Est. {STORE_CONFIG.founded}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Categories', value: '50+' },
                    { label: 'Brands', value: '200+' },
                    { label: 'Countries', value: stats.countries },
                    { label: 'Reviews', value: stats.reviews },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface border-2 border-on-surface p-4 text-center">
                      <p className="font-headline-md text-2xl font-black text-primary-container">{stat.value}</p>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Decorative offset card behind */}
              <div className="absolute -bottom-4 -right-4 w-full h-full bg-primary-container/20 border-2 border-on-surface -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          3. STATISTICS / SOCIAL PROOF BAR
         ═══════════════════════════════════════════════════════════ */}
      <section className="bg-primary-container border-y-2 border-on-surface py-12 md:py-16">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: stats.products, label: 'Products', icon: 'inventory_2' },
              { value: stats.customers, label: 'Happy Customers', icon: 'group' },
              { value: '99.9%', label: 'Uptime', icon: 'speed' },
              { value: '24/7', label: 'Support', icon: 'headset_mic' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="w-12 h-12 bg-[#1a1c1c] text-white rounded-none flex items-center justify-center mx-auto mb-3 border-2 border-[#1a1c1c]">
                  <Icon name={stat.icon} className="text-xl font-bold" />
                </div>
                <p className="font-headline-md text-3xl md:text-4xl font-black text-on-primary-container tracking-tighter">
                  {stat.value}
                </p>
                <p className="text-[10px] font-bold text-on-primary-container/70 uppercase tracking-widest mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4. CATEGORY SHOWCASE
         ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16">
          <div className="text-center mb-16">
            <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">
              Browse By Category
            </p>
            <h2 className="font-headline-md text-3xl md:text-4xl font-black uppercase tracking-tight text-on-surface">
              Shop What You Love
            </h2>
            <p className="font-body-md text-sm text-secondary uppercase font-semibold mt-2">
              Discover curated collections across every major category.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {[
              { name: 'Electronics', icon: 'devices' },
              { name: 'Fashion', icon: 'checkroom' },
              { name: 'Home & Living', icon: 'chair' },
              { name: 'Sports', icon: 'sports_soccer' },
              { name: 'Beauty', icon: 'spa' },
              { name: 'Books', icon: 'menu_book' },
            ].map((cat) => (
              <Link
                key={cat.name}
                href={`/products?category=${cat.name}`}
                className="bg-surface border-2 border-on-surface p-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] hover:border-primary-container transition-all flex flex-col items-center text-center group"
              >
                <div className="w-14 h-14 bg-surface-container border-2 border-on-surface flex items-center justify-center mb-4 group-hover:bg-primary-container transition-colors">
                  <Icon name={cat.icon} className="text-2xl text-on-surface group-hover:text-on-primary-container transition-colors font-bold" />
                </div>
                <h3 className="font-headline-md text-xs font-black uppercase text-on-surface tracking-wider">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5. NEWSLETTER SIGNUP
         ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-surface border-y-2 border-on-surface">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16">
          <div className="max-w-2xl mx-auto text-center">
            <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">
              Stay Connected
            </p>
            <h2 className="font-headline-md text-3xl md:text-4xl font-black uppercase tracking-tight text-on-surface mb-3">
              Join The {STORE_CONFIG.name} List
            </h2>
            <p className="font-body-md text-sm text-secondary font-semibold mb-10">
              Subscribe for exclusive deals, new arrivals, and insider access. No spam — just the good stuff.
            </p>

            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="YOUR EMAIL ADDRESS"
                required
                className="flex-1 px-5 py-4 border-2 border-on-surface bg-surface text-on-surface font-body-md font-semibold text-sm uppercase tracking-wider placeholder:text-secondary/60 focus:border-primary-container outline-none transition-colors"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-primary-container text-on-primary-container border-2 border-on-surface font-headline-md font-bold uppercase tracking-wider text-sm transition-all active:scale-95 shadow-[4px_4px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--color-on-surface)] hover:bg-amber-500 whitespace-nowrap"
              >
                {subscribed ? 'Subscribed ✓' : 'Subscribe'}
              </button>
            </form>

            {subscribed && (
              <p className="mt-4 text-xs font-bold text-green-700 uppercase tracking-widest animate-pulse">
                Welcome to the {STORE_CONFIG.name} community!
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6. CALL TO ACTION BANNER
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 bg-[#1a1c1c] text-white overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-40 h-40 border border-primary-container/20 rotate-45" />
          <div className="absolute bottom-[20%] right-[10%] w-32 h-32 border border-white/10 rotate-12" />
          <div className="absolute top-[50%] left-[60%] w-24 h-24 bg-primary-container/10 rotate-45" />
        </div>

        <div className="relative z-10 max-w-[900px] mx-auto px-6 md:px-16 text-center">
          <p className="font-extrabold text-xs text-primary-container uppercase tracking-[0.3em] mb-4">
            Ready to Start?
          </p>
          <h2 className="font-headline-md text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
            START SHOPPING<br />
            <span className="text-primary-container">TODAY</span>
          </h2>
          <p className="font-body-md text-base text-white/60 max-w-md mx-auto mb-10 font-medium">
            Thousands of premium products are waiting. Join the {STORE_CONFIG.name} revolution.
          </p>
          <Link
            href="/products"
            className="inline-block px-12 py-5 bg-primary-container text-on-primary-container border-2 border-white font-headline-md font-black uppercase tracking-wider text-base transition-all active:scale-95 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-amber-500"
          >
            Browse Full Catalog
          </Link>
        </div>
      </section>

    </div>
  );
}
