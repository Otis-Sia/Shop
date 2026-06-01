'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';

export default function FloatingCart() {
  const pathname = usePathname();

  // Hide on the cart page itself to avoid redundancy
  if (pathname === '/cart') return null;

  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    // Helper to calculate local cart total
    const updateLocalCartCount = () => {
      const cartJson = localStorage.getItem('shop_cart_local');
      if (cartJson) {
        try {
          const items = JSON.parse(cartJson);
          const count = items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
          setItemCount(count);
        } catch {
          setItemCount(0);
        }
      } else {
        setItemCount(0);
      }
    };

    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Authenticated -> use Firestore
        const cartRef = collection(db, 'users', user.uid, 'cart');
        unsubscribeSnapshot = onSnapshot(cartRef, (snapshot) => {
          let count = 0;
          snapshot.forEach((doc) => {
            count += doc.data().quantity || 1;
          });
          setItemCount(count);
        });
      } else {
        // Not authenticated -> use LocalStorage
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        updateLocalCartCount();
      }
    });

    // Listen for custom 'cartUpdated' event dispatched by saveLocalCart
    const handleCartUpdate = () => {
      if (!auth.currentUser) {
        updateLocalCartCount();
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="fixed top-[88px] right-6 z-40 group animate-fadeIn"
      id="floating-cart"
    >
      <div className="relative bg-white/80 backdrop-blur-xl border border-gray-100 shadow-xl rounded-2xl p-4 transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95 group-hover:border-[#ff6b00]/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b00] to-[#ff6b00] flex items-center justify-center text-white shadow-lg shadow-green-500/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          
          <div className="hidden sm:block">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Your Cart</p>
            <p className="text-sm font-bold text-gray-900 leading-none">
              {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
            </p>
          </div>
        </div>

        {itemCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse">
            {itemCount}
          </span>
        )}

        {/* Hover Tip */}
        <div className="absolute top-full mt-2 right-0 bg-gray-900 text-white text-[10px] font-bold py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
          View Cart →
        </div>
      </div>
    </Link>
  );
}
