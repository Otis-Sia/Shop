'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createOrder } from '@/lib/api/order';
import { getCart, CartItem } from '@/lib/api/cart';
import { getUserProfile, User } from '@/lib/api/auth';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Icon from '@/components/Icon';

export default function CheckoutPage() {
  const router = useRouter();
  const [total, setTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login?redirect=/checkout');
        return;
      }
      
      const loadCartSummary = async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (profile) setUserProfile(profile);

        if (profile && ['admin', 'merchant'].includes(profile.role as string)) {
          setLoading(false);
          return;
        }
        
        const cart = await getCart();
        if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
          router.push('/cart');
          return;
        }
        setItemCount(cart.CartItems.length);
        setCartItems(cart.CartItems);
        const t = cart.CartItems.reduce(
          (sum: number, item: CartItem) => {
            if (!item.Product) return sum;
            const price = parseFloat(String(item.Product.price));
            const discount = item.Product.discount || 0;
            const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;
            return sum + finalPrice * item.quantity;
          },
          0
        );
        setTotal(t);
      } catch (err) {
        console.error('Failed to load cart summary', err);
      } finally {
        setLoading(false);
      }
    };
    loadCartSummary();
    });
    
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirm('Confirm order placement?')) return;

    const formData = new FormData(e.currentTarget);
    const orderData = {
      totalAmount: total,
      contactInformation: {
        fullName: formData.get('fullName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
      },
      shippingAddress: {
        street: formData.get('address') as string,
        city: formData.get('city') as string,
        zipCode: '',
        country: '',
      },
      shippingInformation: {
        method: 'FREE EXPRESS',
        cost: 0,
      },
      items: cartItems.map(item => ({
        productId: item.product_id.toString(),
        name: item.Product?.name || 'Unknown',
        price: item.Product?.price ? parseFloat(String(item.Product.price)) : 0,
        quantity: item.quantity,
        merchantId: item.Product?.merchantId || 'admin',
      }))
    };

    setSubmitting(true);
    try {
      const order = await createOrder(orderData);
      if (order) {
        router.push(`/order-confirmation?id=${order.id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16 flex-grow flex flex-col items-center justify-center min-h-[400px]">
        <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
        <p className="mt-4 font-bold text-sm tracking-widest text-secondary uppercase">Loading checkout information...</p>
      </main>
    );
  }

  if (userProfile && ['admin', 'merchant'].includes(userProfile.role as string)) {
    return (
      <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16 flex-grow">
        <h1 className="font-headline-md text-3xl md:text-5xl font-black mb-10 uppercase tracking-tighter text-on-surface">
          Checkout
        </h1>
        <div className="border-2 border-error p-12 bg-red-50 text-center flex flex-col items-center justify-center max-w-[600px] mx-auto">
          <Icon name="block" className="text-5xl mb-4 text-error" />
          <h3 className="font-headline-md text-xl font-bold uppercase mb-2 text-error">Access Denied</h3>
          <p className="text-sm text-error mb-6 max-w-[300px]">Admins and Merchants cannot purchase items.</p>
          <Link 
            href={userProfile.role === 'admin' ? "/admin" : "/merchant"} 
            className="px-6 py-3 bg-error text-white font-bold text-xs uppercase tracking-wider border-2 border-error shadow-sm active:scale-95 transition-transform"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16 flex-grow">
      <h1 className="font-headline-md text-3xl md:text-5xl font-black mb-10 uppercase tracking-tighter text-on-surface">
        Checkout
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Left Column: Shipping & Payment forms */}
        <div className="flex-grow w-full space-y-8">
          
          {/* Shipping Information Card */}
          <div className="border-2 border-on-surface bg-surface p-8">
            <h3 className="font-headline-md text-xl font-bold uppercase tracking-wider text-on-surface pb-3 border-b-2 border-on-surface mb-6">
              Shipping Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label htmlFor="fullName" className="font-bold text-xs uppercase tracking-wider text-on-surface block">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  defaultValue={userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : ''}
                  required
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>

              <div className="space-y-1 col-span-1 md:col-span-2">
                <label htmlFor="email" className="font-bold text-xs uppercase tracking-wider text-on-surface block">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  defaultValue={userProfile?.email || ''}
                  required
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>
              
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label htmlFor="phone" className="font-bold text-xs uppercase tracking-wider text-on-surface block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  defaultValue={userProfile?.phone || ''}
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>

              <div className="space-y-1 col-span-1 md:col-span-2">
                <label htmlFor="address" className="font-bold text-xs uppercase tracking-wider text-on-surface block">
                  Shipping Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  defaultValue={userProfile?.location || ''}
                  required
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>

              <div className="space-y-1 col-span-1 md:col-span-2">
                <label htmlFor="city" className="font-bold text-xs uppercase tracking-wider text-on-surface block">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  defaultValue="New York"
                  required
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Payment Information Card */}
          <div className="border-2 border-on-surface bg-surface p-8">
            <h3 className="font-headline-md text-xl font-bold uppercase tracking-wider text-on-surface pb-3 border-b-2 border-on-surface mb-6">
              Payment Information
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="cardNumber" className="font-bold text-xs uppercase tracking-wider text-secondary block">
                  Card Number (Demo Mode Only)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="cardNumber"
                    defaultValue="4242 4242 4242 4242"
                    disabled
                    style={{ background: '#f3f4f6' }}
                    className="w-full h-14 pl-4 pr-12 border-2 border-surface-container-highest rounded-none font-medium text-secondary cursor-not-allowed"
                  />
                  <Icon name="lock" className="absolute right-4 top-4 text-secondary" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Order Summary & Info */}
        <div className="w-full lg:max-w-md space-y-6">
          
          {/* Demo Mode Alert Banner */}
          <div className="border-2 border-on-surface p-6 bg-primary-fixed text-on-primary-fixed-variant relative overflow-hidden">
            <div className="flex gap-3 items-start relative z-10">
              <Icon name="info" className="text-2xl text-on-primary-fixed-variant" />
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Demo Environment</h4>
                <p className="text-xs leading-relaxed opacity-90 font-medium">
                  This checkout is in demo mode. No payment will be processed, and no real credit card numbers will be verified.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-primary-container opacity-10 rounded-full"></div>
          </div>

          {/* Summary Details */}
          <div className="border-2 border-on-surface p-8 bg-surface">
            <h3 className="font-headline-md text-lg font-extrabold mb-6 uppercase tracking-wider text-on-surface border-b-2 border-on-surface pb-2">
              Order Summary
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between border-b border-surface-container pb-3 text-sm">
                <span className="text-secondary font-bold uppercase tracking-wider">Items in Cart</span>
                <span className="font-extrabold text-on-surface">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
              </div>

              <div className="flex justify-between border-b border-surface-container pb-3 text-sm">
                <span className="text-secondary font-bold uppercase tracking-wider">Shipping</span>
                <span className="font-black text-primary-container uppercase tracking-wider">FREE EXPRESS</span>
              </div>

              <div className="flex justify-between pt-3 pb-1 font-black text-lg border-t-2 border-on-surface border-dashed">
                <span className="uppercase tracking-widest text-on-surface">Total to Pay</span>
                <span className="text-primary-container text-xl md:text-2xl font-black">Ksh {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Heavy Neobrutalist Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-8 w-full h-14 bg-primary-container text-on-primary-container font-headline-md font-extrabold uppercase tracking-wider text-sm border-b-4 border-on-surface flex items-center justify-center transition-all active:scale-[0.98] hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>

            <Link
              href="/cart"
              className="mt-4 w-full h-12 border-2 border-on-surface font-bold uppercase tracking-wider text-xs flex items-center justify-center hover:bg-surface-container-low transition-colors"
            >
              Back to Cart
            </Link>
          </div>

        </div>
      </form>
    </main>
  );
}
