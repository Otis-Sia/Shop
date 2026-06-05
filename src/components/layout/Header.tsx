'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { subscribeToAuthChanges, logout } from '@/lib/api/auth';
import { getCart } from '@/lib/api/cart';
import { getWishlistCount } from '@/lib/api/wishlist';
import Icon from '@/components/Icon';
import ProfileModal from '@/components/auth/ProfileModal';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ first_name: string; email: string; uid: string } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (user) {
        setUser({ first_name: user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User', email: user.email || '', uid: user.uid });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const cart = await getCart();
        const totalItems = cart.CartItems.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(totalItems);
        
        const wCount = await getWishlistCount();
        setWishlistCount(wCount);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    if (mounted) {
      fetchCounts();
    }

    const handleUpdate = () => {
      fetchCounts();
    };

    window.addEventListener('cartUpdated', handleUpdate);
    window.addEventListener('wishlistUpdated', handleUpdate);
    return () => {
      window.removeEventListener('cartUpdated', handleUpdate);
      window.removeEventListener('wishlistUpdated', handleUpdate);
    };
  }, [mounted, user]);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.href = '/';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
    }
  };

  if (!mounted) {
    return (
      <header className="bg-surface sticky top-0 z-50 border-b-2 border-on-surface">
        <nav className="flex justify-between items-center w-full px-6 md:px-16 py-4 max-w-[1440px] mx-auto">
          <Link href="/" className="font-headline-md text-3xl font-black tracking-tighter text-on-surface">
            JUJ4
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <header className="bg-surface sticky top-0 z-50 border-b-2 border-on-surface">
      {/* Top Search Bar (Expandable) */}
      {isSearchOpen && (
        <div className="w-full bg-white border-b-2 border-on-surface px-6 md:px-16 py-4 flex items-center justify-center animate-in slide-in-from-top-4">
          <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl relative flex items-center">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, categories, or brands..." 
              className="w-full h-12 pl-4 pr-12 border-2 border-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container"
              autoFocus
            />
            <button type="submit" className="absolute right-3 text-secondary hover:text-on-surface">
              <Icon name="search" />
            </button>
          </form>
          <button onClick={() => setIsSearchOpen(false)} className="ml-4 text-secondary hover:text-on-surface">
            <Icon name="close" />
          </button>
        </div>
      )}

      <nav className="flex justify-between items-center w-full px-6 md:px-16 py-4 max-w-[1440px] mx-auto relative z-20">
        
        {/* Mobile Hamburger */}
        <button 
          className="lg:hidden text-on-surface hover:text-primary-container"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Icon name={isMobileMenuOpen ? "close" : "menu"} className="text-3xl" />
        </button>

        {/* Logo */}
        <Link href="/" className="font-headline-md text-3xl font-black tracking-tighter text-on-surface hover:text-primary-container transition-colors">
          JUJ4
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
          <Link href="/products" className="text-on-surface font-semibold hover:text-primary-container transition-colors duration-200">
            Shop All
          </Link>
          <Link href="/products?category=Fashion" className="text-on-surface font-semibold hover:text-primary-container transition-colors duration-200">
            New Arrivals
          </Link>
          {user?.email === 'admin@juj4.com' && (
            <Link href="/admin" className="text-primary-container font-extrabold hover:underline transition-all duration-200">
              Admin Panel
            </Link>
          )}
        </div>

        {/* Action icons & buttons */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hidden sm:block text-on-surface hover:text-primary-container transition-colors">
            <Icon name="search" className="text-2xl" />
          </button>

          <Link href="/wishlist" className="relative scale-95 active:scale-90 transition-transform flex items-center" title="Wishlist">
            <Icon name="favorite_border" className="text-2xl text-on-surface hover:text-primary-container" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-error text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-surface">
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </Link>

          <Link href="/cart" className="relative scale-95 active:scale-90 transition-transform flex items-center" title="Shopping Cart">
            <Icon name="shopping_cart" className="text-2xl text-on-surface hover:text-primary-container" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-error text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-surface">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden md:flex items-center gap-4">
              <span className="font-semibold text-sm text-secondary truncate max-w-[100px]">
                Hi, {user.first_name}
              </span>
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-primary-container text-sm font-bold">
                  Account <Icon name="expand_more" className="text-lg" />
                </button>
                <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                  <div className="bg-white border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(26,28,28,1)] flex flex-col py-2">
                    <button onClick={() => setIsProfileModalOpen(true)} className="px-4 py-2 text-left font-bold text-xs uppercase tracking-wider hover:bg-surface-container">Profile</button>
                    <Link href="/orders" className="px-4 py-2 text-left font-bold text-xs uppercase tracking-wider hover:bg-surface-container">My Orders</Link>
                    <button onClick={handleLogout} className="px-4 py-2 text-left font-bold text-xs uppercase tracking-wider hover:bg-error-container text-error">Logout</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-1.5 border-2 border-on-surface bg-surface hover:bg-surface-container font-bold text-xs uppercase tracking-wider transition-transform active:scale-95"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu Slide-out */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-surface border-b-2 border-on-surface shadow-lg z-10 p-6 flex flex-col gap-6 animate-in slide-in-from-top-2">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..." 
              className="w-full h-12 pl-4 pr-12 border-2 border-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
            <button type="submit" className="absolute right-3 text-secondary">
              <Icon name="search" />
            </button>
          </form>
          
          <Link href="/products" onClick={() => setIsMobileMenuOpen(false)} className="font-bold text-lg border-b-2 border-surface-container pb-2">
            Shop All
          </Link>
          <Link href="/products?category=Fashion" onClick={() => setIsMobileMenuOpen(false)} className="font-bold text-lg border-b-2 border-surface-container pb-2">
            New Arrivals
          </Link>
          
          {user ? (
            <>
              <button onClick={() => { setIsProfileModalOpen(true); setIsMobileMenuOpen(false); }} className="text-left font-bold text-lg border-b-2 border-surface-container pb-2">Profile</button>
              <Link href="/orders" onClick={() => setIsMobileMenuOpen(false)} className="font-bold text-lg border-b-2 border-surface-container pb-2">My Orders</Link>
              {user.email === 'admin@juj4.com' && (
                <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="font-bold text-lg text-primary-container border-b-2 border-surface-container pb-2">Admin Panel</Link>
              )}
              <button onClick={handleLogout} className="text-left font-bold text-lg text-error pt-2">Logout</button>
            </>
          ) : (
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="font-bold text-lg pt-2 text-primary-container">
              Sign In / Register
            </Link>
          )}
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        userAuth={user ? { uid: user.uid } : null} 
      />
    </header>
  );
}
