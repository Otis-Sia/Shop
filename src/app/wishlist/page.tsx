'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWishlist, removeFromWishlist } from '@/lib/api/wishlist';
import { addToCart } from '@/lib/api/cart';
import { Product } from '@/lib/data/products-data';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from '@/lib/api/auth';
import { canAddToCartRole } from '@/lib/access';
import Icon from '@/components/Icon';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info';
}

export default function WishlistPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [addingToCart, setAddingToCart] = useState<Record<number, boolean>>({});
  const [addedToCart, setAddedToCart] = useState<Record<number, boolean>>({});
  const [userRole, setUserRole] = useState<'customer' | 'admin' | 'merchant' | 'guest'>('guest');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const data = await getWishlist();
      setProducts(data);
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile && profile.role) {
            setUserRole(profile.role);
          } else {
            setUserRole('customer');
          }
          fetchWishlist();
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setUserRole('customer');
        }
      } else {
        setUserRole('guest');
        setProducts([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for external wishlist changes
  useEffect(() => {
    const handleUpdate = () => fetchWishlist();
    window.addEventListener('wishlistUpdated', handleUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = async (productId: number) => {
    setRemovingId(productId);
    try {
      await removeFromWishlist(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      showToast('Item removed from wishlist', 'info');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    if (!canAddToCartRole(userRole)) return;
    setAddingToCart(prev => ({ ...prev, [productId]: true }));
    try {
      await addToCart(productId, 1);
      setAddedToCart(prev => ({ ...prev, [productId]: true }));
      showToast('Item added to cart!', 'success');
      setTimeout(() => {
        setAddedToCart(prev => ({ ...prev, [productId]: false }));
        setAddingToCart(prev => ({ ...prev, [productId]: false }));
      }, 2000);
    } catch (err) {
      console.error(err);
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 flex-grow">

      {/* Page Header */}
      <header className="mb-12">
        <p className="font-extrabold text-xs text-primary-container uppercase tracking-widest mb-1.5">Favorites</p>
        <h1 className="font-headline-md text-3xl md:text-5xl font-black uppercase tracking-tighter text-on-surface">
          My Wishlist
        </h1>
        <p className="font-body-md text-sm text-secondary uppercase font-semibold mt-2">
          Products you&apos;ve saved for later. Your curated collection of must-haves.
        </p>
      </header>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
          <p className="mt-4 font-bold text-xs tracking-widest text-secondary uppercase">Loading Wishlist...</p>
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <div className="w-20 h-20 flex items-center justify-center bg-surface-container border-2 border-on-surface mb-6">
            <Icon name="favorite" className="text-4xl text-secondary" />
          </div>
          <h2 className="font-headline-md text-lg font-black uppercase tracking-wider text-on-surface mb-2">
            Your wishlist is empty
          </h2>
          <p className="font-body-md text-sm text-secondary max-w-md text-center mb-8">
            You haven&apos;t saved any items yet. Browse our collection and tap the heart icon to add products you love.
          </p>
          <Link
            href="/products"
            className="px-8 py-3 bg-primary-container text-on-primary-container font-headline-md font-bold text-xs uppercase tracking-wider border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] active:scale-95 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--color-on-surface)] transition-all"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        /* Wishlist Grid */
        <>
          <div className="flex items-center border-b-2 border-surface-container pb-4 mb-8">
            <div className="font-bold text-xs uppercase tracking-wider text-secondary">
              {products.length} item{products.length !== 1 ? 's' : ''} saved
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const discount = product.discount || 0;
              const originalPrice = parseFloat(String(product.price));
              const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;

              return (
                <article
                  key={product.id}
                  className="bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col group hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] transition-all"
                >
                  {/* Product Image */}
                  <Link
                    href={`/products/${product.id}`}
                    className="block relative overflow-hidden bg-surface-container-low border-b-2 border-on-surface aspect-[4/3]"
                  >
                    <img
                      src={product.image_url || 'https://via.placeholder.com/150'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {discount > 0 && (
                      <span className="absolute top-3 right-3 bg-error-container text-on-error-container border border-error text-[10px] font-black uppercase px-2.5 py-1">
                        -{discount}%
                      </span>
                    )}

                    {/* Remove Button (top-left) */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemove(product.id);
                      }}
                      disabled={removingId === product.id}
                      className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center bg-surface border-2 border-on-surface shadow-[2px_2px_0px_0px_var(--color-on-surface)] hover:bg-red-50 hover:text-error active:scale-95 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_var(--color-on-surface)] transition-all disabled:opacity-50"
                      aria-label="Remove from wishlist"
                    >
                      <Icon
                        name={removingId === product.id ? 'sync' : 'delete'}
                        className={`text-base ${removingId === product.id ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </Link>

                  {/* Product Info */}
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="font-headline-md text-sm font-black uppercase text-on-surface mb-1 truncate">
                      {product.name}
                    </h3>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-4">
                      Category: {product.category || 'Apparel'}
                    </p>

                    {/* Price & Actions */}
                    <div className="mt-auto space-y-3">
                      <div className="flex flex-col">
                        <span className="font-headline-md text-base font-black text-on-surface">
                          Ksh {finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {discount > 0 && (
                          <span className="text-[10px] text-secondary line-through font-bold">
                            Ksh {originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>

                      {canAddToCartRole(userRole) && !(product.hasVariants || (product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0)) && (
                        <button
                          onClick={(e) => handleAddToCart(e, product.id)}
                          disabled={addingToCart[product.id]}
                          className={`w-full py-2.5 border-2 border-on-surface bg-primary-container text-on-primary-container font-headline-md font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-[3px_3px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--color-on-surface)] hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-2 ${addedToCart[product.id] ? '!bg-green-600 !text-white' : ''}`}
                        >
                          <Icon name={addedToCart[product.id] ? 'check_circle' : 'shopping_cart'} className="text-sm" />
                          {addingToCart[product.id] ? (addedToCart[product.id] ? 'Added ✓' : 'Adding...') : 'Add to Cart'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-5 py-3 border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] font-bold text-xs uppercase tracking-wider flex items-center gap-2 animate-[slideInRight_0.3s_ease-out] ${
              toast.type === 'success'
                ? 'bg-surface-container text-green-500 dark:text-green-400'
                : 'bg-surface-container text-on-surface'
            }`}
          >
            <Icon
              name={toast.type === 'success' ? 'check_circle' : 'info'}
              className="text-base"
            />
            {toast.message}
          </div>
        ))}
      </div>

      {/* Inline animation keyframes */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </main>
  );
}
