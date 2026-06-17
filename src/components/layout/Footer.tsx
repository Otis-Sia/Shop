'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/Icon';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-[#111313] text-white mt-auto">

      {/* Top Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-primary-container via-amber-400 to-primary-container" />

      {/* Main Footer Content */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <Image src="/Logo.svg" alt="Logo" width={44} height={44} className="w-auto h-11 invert hue-rotate-180" style={{ width: 'auto' }} />
              <Image src="/name.svg" alt="JUJ4" width={100} height={40} className="w-auto h-7 invert hue-rotate-180" />
            </div>
            <p className="text-sm font-medium text-white/60 leading-relaxed max-w-xs">
              Your premium marketplace for quality products and expert services. Built for the modern shopper who demands the best.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              {[
                { icon: 'language', label: 'Website', href: '/' },
                { icon: 'mail', label: 'Email', href: '/contact' },
                { icon: 'phone', label: 'Phone', href: '/contact' },
              ].map(social => (
                <Link
                  key={social.label}
                  href={social.href}
                  title={social.label}
                  className="w-10 h-10 border-2 border-white/20 flex items-center justify-center hover:bg-primary-container hover:border-primary-container hover:text-[#111313] transition-all duration-300 group"
                >
                  <Icon name={social.icon} className="text-lg group-hover:scale-110 transition-transform" />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="font-headline-md text-xs font-black uppercase tracking-[0.2em] text-primary-container mb-5 pb-3 border-b border-white/10">
              Shop
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'All Products', href: '/products' },
                { label: 'New Arrivals', href: '/products?filter=new-arrivals' },
                { label: 'Services', href: '/services' },
                { label: 'My Wishlist', href: '/wishlist' },
                { label: 'My Cart', href: '/cart' },
              ].map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/60 text-sm font-medium hover:text-primary-container hover:translate-x-1.5 transition-all duration-200 inline-flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-primary-container transition-all duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="lg:col-span-2">
            <h4 className="font-headline-md text-xs font-black uppercase tracking-[0.2em] text-primary-container mb-5 pb-3 border-b border-white/10">
              Support
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Contact Us', href: '/contact' },
                { label: 'Returns & Refunds', href: '/returns' },
                { label: 'Order Tracking', href: '/orders' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
              ].map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/60 text-sm font-medium hover:text-primary-container hover:translate-x-1.5 transition-all duration-200 inline-flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-primary-container transition-all duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-4">
            <h4 className="font-headline-md text-xs font-black uppercase tracking-[0.2em] text-primary-container mb-5 pb-3 border-b border-white/10">
              Stay Updated
            </h4>
            <p className="text-sm text-white/60 font-medium mb-5 leading-relaxed">
              Get exclusive deals, new arrivals, and insider access delivered to your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="flex-1 px-4 py-3 bg-white/5 border-2 border-white/20 text-white text-sm font-semibold placeholder:text-white/30 focus:border-primary-container focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-primary-container text-[#111313] font-black uppercase text-xs tracking-wider border-2 border-primary-container hover:bg-amber-400 active:scale-95 transition-all shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] whitespace-nowrap"
              >
                {subscribed ? '✓ Subscribed' : 'Subscribe'}
              </button>
            </form>
            {subscribed && (
              <p className="mt-3 text-xs font-bold text-green-400 uppercase tracking-widest animate-pulse">
                Welcome to the JUJ4 community!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} JUJ4 E-Commerce Inc. &mdash; All Rights Reserved.
          </p>

          {/* Payment Methods / Trust Badges */}
          <div className="flex items-center gap-4">
            {['M-Pesa', 'Visa', 'PayPal'].map(method => (
              <span
                key={method}
                className="text-[10px] font-black uppercase tracking-wider text-white/25 border border-white/10 px-3 py-1"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
