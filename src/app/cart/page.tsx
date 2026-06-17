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
      let price = parseFloat(String(item.Product.price));
      if (item.selectedVariantIndex !== undefined && item.selectedVariantIndex !== null && item.Product.variants && item.Product.variants[item.selectedVariantIndex]) {
        price = parseFloat(String(item.Product.variants[item.selectedVariantIndex].price));
      }
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

  const handleQuantityChange = async (cartItemId: number | string, newQty: number) => {
    if (newQty < 1) return;
    
    // Optimistic state update
    const updatedItems = items.map(item => 
      item.id == cartItemId ? { ...item, quantity: newQty } : item
    );
    setItems(updatedItems);
    calculateTotal(updatedItems);

    try {
      await updateCartItem(cartItemId, newQty);
    } catch (err) {
      console.error('Error updating quantity:', err);
      // Revert if error
      loadCart();
    }
  };

  const handleRemove = async (cartItemId: number | string) => {
    if (confirm('Remove this item from your cart?')) {
      // Optimistic state update
      const filtered = items.filter(item => item.id != cartItemId);
      setItems(filtered);
      calculateTotal(filtered);

      try {
        await removeFromCart(cartItemId);
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
        <div className="border-2 border-error p-12 bg-error-container text-center flex flex-col items-center justify-center max-w-[600px] mx-auto">
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
        <div className="border-2 border-on-surface p-12 bg-surface text-center flex flex-col items-center justify-center max-w-[600px] mx-auto">
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
                let basePrice = parseFloat(String(product.price));
                let variantImageUrl = '';
                if (product.hasVariants && product.variants) {
                  let matchingVariant;
                  if (item.selectedVariantIndex !== undefined && item.selectedVariantIndex !== null) {
                    matchingVariant = product.variants[item.selectedVariantIndex];
                  } else {
                    matchingVariant = product.variants.find((v: any) => {
                      const matchSize = v.size ? v.size === item.selectedSize : true;
                      const matchColor = v.color ? v.color === item.selectedColor : true;
                      return matchSize && matchColor;
                    });
                  }
                  
                  if (matchingVariant) {
                    basePrice = matchingVariant.price;
                    variantImageUrl = matchingVariant.imageUrl || '';
                  }
                }
                const discount = product.discount || 0;
                const unitPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
                const itemTotal = unitPrice * item.quantity;

                return (
                  <div 
                    key={item.id} 
                    className="grid grid-cols-1 md:grid-cols-12 items-center py-6 gap-6 hover:border-on-surface transition-all duration-300"
                  >
                    {/* Item Details */}
                    <div className="flex flex-col sm:flex-row items-start gap-4 flex-grow col-span-1 md:col-span-6">
                      <div className="w-24 h-24 bg-surface-container-low border-2 border-on-surface flex-shrink-0 flex items-center justify-center p-2 relative overflow-hidden">
                        <img 
                          src={variantImageUrl || product.image_url || '/placeholder.png'} 
                          alt={product.name || 'Product'} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col gap-1 w-full max-w-xs">
                        <span className="bg-surface-container text-on-surface border border-on-surface text-[9px] font-black uppercase px-2 py-0.5 self-start">
                          {product.category || 'Apparel'}
                        </span>
                        <Link href={`/products/${item.product_id}`} className="font-headline-md font-bold text-lg hover:text-primary-container transition-colors truncate">
                          {product.name || 'Unknown Product'}
                        </Link>
                        {item.selectedColor && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Color:</span>
                            <span className="text-xs font-bold px-2 py-0.5 border border-on-surface bg-surface-container-low">{item.selectedColor}</span>
                          </div>
                        )}
                        {item.selectedSize && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Size:</span>
                            <span className="text-xs font-bold px-2 py-0.5 border border-on-surface bg-surface-container-low">{item.selectedSize}</span>
                          </div>
                        )}
                        {!item.selectedColor && !item.selectedSize && item.selectedVariantIndex !== undefined && item.selectedVariantIndex !== null && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Variant:</span>
                            <span className="text-xs font-bold px-2 py-0.5 border border-on-surface bg-surface-container-low">Custom</span>
                          </div>
                        )}
                        <button 
                          onClick={() => handleRemove(item.id)}
                          className="text-xs font-bold text-error uppercase tracking-wider flex items-center gap-1 mt-2 hover:opacity-80 self-start"
                        >
                          <Icon name="delete" className="text-sm" /> Remove
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="hidden md:block col-span-1 md:col-span-2 text-center font-headline-md text-sm md:text-base font-extrabold">
                      Ksh {unitPrice.toFixed(2)}
                      {discount > 0 && (
                        <div className="text-xs text-secondary line-through font-normal">Ksh {basePrice.toFixed(2)}</div>
                      )}
                    </div>

                    {/* Quantity Selectors */}
                    <div className="col-span-1 md:col-span-2 flex justify-start md:justify-center">
                      <div className="flex border-2 border-on-surface bg-surface">
                        <button 
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center border-r-2 border-on-surface hover:bg-surface-container active:scale-95"
                        >
                          -
                        </button>
                        <span className="px-4 py-1 font-extrabold flex items-center justify-center text-sm min-w-[40px]">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center border-l-2 border-on-surface hover:bg-surface-container active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="col-span-1 md:col-span-2 text-right font-headline-md text-base md:text-lg font-black text-primary-container">
                      Ksh {itemTotal.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkout Column */}
          <div className="w-full lg:max-w-md bg-surface border-2 border-on-surface p-8">
            <h3 className="font-headline-md text-lg font-extrabold mb-6 uppercase tracking-wider text-on-surface">
              Order Summary
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between border-b border-surface-container pb-3 font-semibold text-sm">
                <span className="text-secondary uppercase tracking-wider">Subtotal</span>
                <span className="font-extrabold">Ksh {total.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between border-b border-surface-container pb-3 font-semibold text-sm">
                <span className="text-secondary uppercase tracking-wider">Shipping</span>
                <span className="font-extrabold text-primary-container">FREE</span>
              </div>

              <div className="flex justify-between pb-3 pt-2 font-black text-lg">
                <span className="uppercase tracking-widest text-on-surface">Total</span>
                <span className="text-on-surface">Ksh {total.toFixed(2)}</span>
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
