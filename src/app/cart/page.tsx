'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCart, removeFromCart, updateCartItem, CartItem } from '@/lib/api/cart';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from '@/lib/api/auth';
import Icon from '@/components/Icon';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [userRole, setUserRole] = useState<'customer' | 'admin' | 'merchant' | 'guest'>('guest');

  const loadCart = async () => {
    try {
      const cart = await getCart();
      const cartItems = cart.CartItems || [];
      setItems(cartItems);
      calculateTotal(cartItems);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (cartItems: CartItem[]) => {
    const t = cartItems.reduce((sum, item) => {
      if (!item.Product) return sum;
      const price = parseFloat(String(item.Product.price));
      const discount = item.Product.discount || 0;
      const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;
      return sum + finalPrice * item.quantity;
    }, 0);
    setTotal(t);
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
          if (!profile || !['admin', 'merchant'].includes(profile.role as string)) {
            loadCart();
          } else {
            setLoading(false);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setUserRole('customer');
          loadCart();
        }
      } else {
        setUserRole('guest');
        loadCart();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleQuantityChange = async (productId: number | string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty < 1) return;
    
    // Optimistic state update
    const updatedItems = items.map(item => {
      if (item.product_id == productId) {
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setItems(updatedItems);
    calculateTotal(updatedItems);

    try {
      await updateCartItem(productId, newQty);
    } catch (err) {
      console.error('Error updating quantity:', err);
      // Revert if error
      loadCart();
    }
  };

  const handleRemove = async (productId: number | string) => {
    if (confirm('Remove this item from your cart?')) {
      // Optimistic state update
      const filtered = items.filter(item => item.product_id != productId);
      setItems(filtered);
      calculateTotal(filtered);

      try {
        await removeFromCart(productId);
      } catch (err) {
        console.error('Error removing item:', err);
        loadCart();
      }
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16 flex-grow">
      <h1 className="font-headline-md text-3xl md:text-5xl font-black mb-10 uppercase tracking-tighter text-on-surface">
        Your Cart
      </h1>

      {userRole === 'admin' || userRole === 'merchant' ? (
        <div className="border-2 border-error p-12 bg-red-50 text-center flex flex-col items-center justify-center max-w-[600px] mx-auto">
          <Icon name="block" className="text-5xl mb-4 text-error" />
          <h3 className="font-headline-md text-xl font-bold uppercase mb-2 text-error">Access Denied</h3>
          <p className="text-sm text-error mb-6 max-w-[300px]">Admins and Merchants cannot purchase items.</p>
          <Link 
            href={userRole === 'admin' ? "/admin" : "/merchant"} 
            className="px-6 py-3 bg-error text-white font-bold text-xs uppercase tracking-wider border-2 border-error shadow-sm active:scale-95 transition-transform"
          >
            Return to Dashboard
          </Link>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
          <p className="mt-4 font-bold text-sm tracking-widest text-secondary uppercase">Loading your cart...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-on-surface p-12 bg-white text-center flex flex-col items-center justify-center max-w-[600px] mx-auto">
          <Icon name="shopping_bag" className="text-5xl mb-4 text-secondary" />
          <h3 className="font-headline-md text-xl font-bold uppercase mb-2">Your cart is empty</h3>
          <p className="text-sm text-secondary mb-6 max-w-[300px]">Add some great items to get started!</p>
          <Link 
            href="/products" 
            className="px-6 py-3 bg-primary-container text-on-primary-container font-bold text-xs uppercase tracking-wider border-2 border-on-surface shadow-sm active:scale-95 transition-transform"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Items Section */}
          <div className="flex-grow w-full space-y-6">
            {/* Table Header (Desktop Only) */}
            <div className="hidden md:grid grid-cols-12 pb-2 border-b-2 border-on-surface font-bold text-xs uppercase tracking-wider text-secondary">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Cart Items List */}
            <div className="divide-y-2 divide-surface-container-highest">
              {items.map(item => {
                const product = item.Product;
                if (!product) return null;
                const originalPrice = parseFloat(String(product.price));
                const discount = product.discount || 0;
                const unitPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
                const itemTotal = unitPrice * item.quantity;

                return (
                  <div 
                    key={item.id} 
                    className="grid grid-cols-1 md:grid-cols-12 items-center py-6 gap-6 hover:border-on-surface transition-all duration-300"
                  >
                    {/* Item Details */}
                    <div className="col-span-1 md:col-span-6 flex gap-4">
                      <div className="w-20 md:w-24 bg-surface-container-high overflow-hidden border border-on-surface flex-shrink-0">
                        <img 
                          alt={product.name} 
                          className="w-full h-auto object-contain" 
                          src={product.image_url || 'https://via.placeholder.com/150'}
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="font-headline-md text-sm md:text-base font-extrabold uppercase text-on-surface">
                          {product.name}
                        </h3>
                        <p className="text-xs text-secondary uppercase font-semibold mt-1">
                          Category: {product.category || 'Apparel'}
                        </p>
                        <button 
                          onClick={() => handleRemove(product.id)}
                          className="text-left text-xs font-bold text-error underline mt-3 uppercase tracking-wider hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="hidden md:block col-span-1 md:col-span-2 text-center font-headline-md text-sm md:text-base font-extrabold">
                      Kes. {unitPrice.toFixed(2)}
                      {discount > 0 && (
                        <div className="text-xs text-secondary line-through font-normal">Kes. {originalPrice.toFixed(2)}</div>
                      )}
                    </div>

                    {/* Quantity Selectors */}
                    <div className="col-span-1 md:col-span-2 flex justify-start md:justify-center">
                      <div className="flex border-2 border-on-surface bg-white">
                        <button 
                          onClick={() => handleQuantityChange(product.id, item.quantity, -1)}
                          className="px-3 py-1 font-bold hover:bg-surface-container active:bg-surface-dim transition-colors border-r-2 border-on-surface text-sm"
                        >
                          -
                        </button>
                        <span className="px-4 py-1 font-extrabold flex items-center justify-center text-sm min-w-[40px]">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => handleQuantityChange(product.id, item.quantity, 1)}
                          className="px-3 py-1 font-bold hover:bg-surface-container active:bg-surface-dim transition-colors border-l-2 border-on-surface text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="col-span-1 md:col-span-2 text-right font-headline-md text-base md:text-lg font-black text-primary-container">
                      Kes. {itemTotal.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkout Column */}
          <div className="w-full lg:max-w-md bg-white border-2 border-on-surface p-8">
            <h3 className="font-headline-md text-lg font-extrabold mb-6 uppercase tracking-wider text-on-surface">
              Order Summary
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between border-b border-surface-container pb-3 font-semibold text-sm">
                <span className="text-secondary uppercase tracking-wider">Subtotal</span>
                <span className="font-extrabold">Kes. {total.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between border-b border-surface-container pb-3 font-semibold text-sm">
                <span className="text-secondary uppercase tracking-wider">Shipping</span>
                <span className="font-extrabold text-primary-container">FREE</span>
              </div>

              <div className="flex justify-between pb-3 pt-2 font-black text-lg">
                <span className="uppercase tracking-widest text-on-surface">Total</span>
                <span className="text-on-surface">Kes. {total.toFixed(2)}</span>
              </div>
            </div>

            <Link 
              href="/checkout" 
              className="mt-8 w-full h-14 bg-primary-container text-on-primary-container font-headline-md font-bold uppercase tracking-wider text-sm border-b-4 border-on-surface flex items-center justify-center transition-all active:scale-[0.98] hover:bg-amber-500"
            >
              Proceed to Checkout
            </Link>
            
            <Link 
              href="/products" 
              className="mt-4 w-full h-12 border-2 border-on-surface font-bold uppercase tracking-wider text-xs flex items-center justify-center hover:bg-surface-container-low transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
