"use client";
import { useToast } from '@/components/providers/ToastProvider';
import { CURRENCY_CONFIG } from '@/lib/utils/currency';
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
  const { showToast } = useToast();
  const router = useRouter();
  const [total, setTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formCountry, setFormCountry] = useState('Kenya');
  const [formZip, setFormZip] = useState('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (addressQuery.length > 2) {
        setIsSearchingAddress(true);
        fetch(`/api/location/search?query=${encodeURIComponent(addressQuery)}&limit=5`)
          .then(res => res.json())
          .then(data => {
            setAddressSuggestions(data.results || []);
            setIsSearchingAddress(false);
          })
          .catch(err => {
            console.error("Address search error:", err);
            setIsSearchingAddress(false);
          });
      } else {
        setAddressSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [addressQuery]);

  const handleSelectAddress = (suggestion: any) => {
    setFormAddress(suggestion.street || suggestion.displayName.split(',')[0]);
    setFormCity(suggestion.city || '');
    setFormState(suggestion.state || '');
    setFormCountry(suggestion.country || 'Kenya');
    setFormZip(suggestion.postalCode || '');
    setAddressQuery('');
    setAddressSuggestions([]);
  };

  useEffect(() => {
    if (userProfile) {
      if (userProfile.location) setFormAddress(userProfile.location);
    }
  }, [userProfile]);


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
            let price = parseFloat(String(item.Product.price));
            if (item.selectedVariantIndex !== undefined && item.selectedVariantIndex !== null && item.Product.variants && item.Product.variants[item.selectedVariantIndex]) {
              price = parseFloat(String(item.Product.variants[item.selectedVariantIndex].price));
            }
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

  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'demo_card'>('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [stkModalOpen, setStkModalOpen] = useState(false);
  const [stkStatus, setStkStatus] = useState<'initiating' | 'waiting' | 'success' | 'failed'>('initiating');
  const [stkMessage, setStkMessage] = useState('');
  const [currentCheckoutId, setCurrentCheckoutId] = useState('');

  // Pre-fill phone if available in profile
  useEffect(() => {
    if (userProfile?.phone && !mpesaPhone) {
      setMpesaPhone(userProfile.phone);
    }
  }, [userProfile, mpesaPhone]);

  const pollMpesaStatus = (checkoutId: string, checkoutRequestId?: string) => {
    let attempts = 0;
    const maxAttempts = 24; // Poll for 2 minutes (every 5 seconds)

    const interval = setInterval(async () => {
      attempts++;
      try {
        const queryParam = checkoutRequestId
          ? `checkoutRequestId=${encodeURIComponent(checkoutRequestId)}`
          : `checkoutId=${encodeURIComponent(checkoutId)}`;
        const res = await fetch(`/api/mpesa/query?${queryParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed') {
            clearInterval(interval);
            setStkStatus('success');
            setStkMessage('Payment received! Redirecting to confirmation...');
            setTimeout(() => {
              router.push(`/order-confirmation?id=${checkoutId}`);
            }, 1800);
            return;
          } else if (data.status === 'failed') {
            clearInterval(interval);
            setStkStatus('failed');
            setStkMessage(data.resultDesc || 'Payment was cancelled or failed. Please try again.');
            return;
          }
        }
      } catch (pollErr) {
        console.warn('Polling error:', pollErr);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setStkStatus('failed');
        setStkMessage('Payment timeout. If you entered your PIN, please check your order status shortly.');
      }
    }, 5000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const phone = (paymentMethod === 'mpesa' ? mpesaPhone : (formData.get('phone') as string)) || '';

    if (paymentMethod === 'mpesa' && !phone.trim()) {
      showToast('Please enter your M-Pesa phone number.', 'error');
      return;
    }

    if (!confirm('Confirm order placement?')) return;

    const orderData = {
      totalAmount: total,
      paymentMethod,
      contactInformation: {
        fullName: formData.get('fullName') as string,
        email: formData.get('email') as string,
        phone: phone,
      },
      shippingAddress: {
        street: (formData.get('address') as string) || formAddress,
        city: (formData.get('city') as string) || formCity,
        zipCode: (formData.get('zipCode') as string) || formZip,
        country: (formData.get('country') as string) || formCountry || 'Kenya',
      },
      shippingInformation: {
        method: 'Standard Delivery',
        cost: 0,
      },
      items: cartItems.map(item => {
        let basePrice = item.Product?.price ? parseFloat(String(item.Product.price)) : 0;
        let variantName;
        let imageUrl = item.Product?.image_url || null;
        let matchingVariant: any = null;
        
        if (item.Product?.variants) {
          if (item.selectedVariantIndex !== undefined && item.selectedVariantIndex !== null) {
            matchingVariant = item.Product.variants[item.selectedVariantIndex];
          } else {
            matchingVariant = item.Product.variants.find((v: any) => {
              const matchSize = v.size ? v.size === item.selectedSize : true;
              const matchColor = v.color ? v.color === item.selectedColor : true;
              return matchSize && matchColor;
            });
          }

          if (matchingVariant) {
            basePrice = parseFloat(String(matchingVariant.price));
            variantName = matchingVariant.name;
            if (matchingVariant.imageUrl) {
              imageUrl = matchingVariant.imageUrl;
            }
          }
        }
        
        const discount = item.Product?.discount || 0;
        const finalPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
        const sku = matchingVariant?.sku || item.Product?.sku || null;
        const supplierName = (item.Product as any)?.supplierName || (item.Product as any)?.supplier_name || null;

        return {
          productId: item.product_id.toString(),
          name: item.Product?.name || 'Unknown',
          price: finalPrice,
          quantity: item.quantity,
          adminId: item.Product?.adminId || 'admin',
          variantName: variantName || null,
          color: item.selectedColor || null,
          size: item.selectedSize || null,
          imageUrl: imageUrl || null,
          sku: sku,
          supplierName: supplierName,
        };
      })
    };

    setSubmitting(true);
    try {
      const order = await createOrder(orderData);
      if (order) {
        const orderCheckoutId = order.checkoutId || order.id || '';

        // If M-Pesa is selected, trigger STK Push
        if (paymentMethod === 'mpesa') {
          setCurrentCheckoutId(orderCheckoutId);
          setStkModalOpen(true);
          setStkStatus('initiating');
          setStkMessage('Sending M-Pesa prompt to your phone...');

          try {
            const user = auth.currentUser;
            const token = user ? await user.getIdToken() : '';
            const stkRes = await fetch('/api/mpesa/stkpush', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                checkoutId: orderCheckoutId,
                phoneNumber: phone,
                amount: total,
              }),
            });

            const stkData = await stkRes.json();
            if (!stkRes.ok) {
              setStkStatus('failed');
              setStkMessage(stkData.error || 'Failed to trigger STK prompt.');
              return;
            }

            setStkStatus('waiting');
            setStkMessage(stkData.customerMessage || 'Please enter your M-Pesa PIN on your phone to complete payment.');
            pollMpesaStatus(orderCheckoutId, stkData.checkoutRequestId);
          } catch (stkErr: any) {
            console.error('STK push trigger error:', stkErr);
            setStkStatus('failed');
            setStkMessage(stkErr.message || 'Failed to trigger M-Pesa prompt.');
          }
          return;
        }

        if (order.redirectUrl) {
          window.location.href = order.redirectUrl;
          return;
        }
        router.push(`/order-confirmation?id=${orderCheckoutId}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to place order. Please try again.', 'error');
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
                  required
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>

              {/* Location Autocomplete Search */}
              <div className="space-y-1 col-span-1 md:col-span-2 relative">
                <label htmlFor="addressSearch" className="font-bold text-xs uppercase tracking-wider text-on-surface flex items-center justify-between">
                  <span>Quick Address &amp; Location Search</span>
                  {isSearchingAddress && (
                    <span className="text-[10px] text-primary-container font-semibold animate-pulse flex items-center gap-1">
                      <Icon name="sync" className="text-xs animate-spin" /> Searching...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="addressSearch"
                    placeholder="Type city, street, or landmark to search..."
                    value={addressQuery}
                    onChange={(e) => setAddressQuery(e.target.value)}
                    className="w-full h-14 pl-11 pr-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                  />
                  <Icon name="search" className="absolute left-4 top-4 text-secondary text-lg" />
                </div>

                {/* Suggestions Dropdown */}
                {addressSuggestions.length > 0 && (
                  <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] divide-y divide-surface-container max-h-60 overflow-y-auto">
                    {addressSuggestions.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectAddress(item)}
                          className="w-full text-left p-3 hover:bg-surface-container transition-colors flex items-start gap-2.5 text-xs text-on-surface"
                        >
                          <Icon name="location_on" className="text-primary-container text-base shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-on-surface">{item.street || item.city || item.displayName.split(',')[0]}</p>
                            <p className="text-[11px] text-secondary line-clamp-1">{item.displayName}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Detailed Street Address */}
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label htmlFor="address" className="font-bold text-xs uppercase tracking-wider text-on-surface block">
                  Street / Detailed Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. 123 Kimathi Street, Suite 4"
                  required
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>

              {/* City */}
              <div className="space-y-1">
                <label htmlFor="city" className="font-bold text-xs uppercase tracking-wider text-on-surface block">
                  City / Town
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="e.g. Nairobi"
                  required
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>

              {/* State / County */}
              <div className="space-y-1">
                <label htmlFor="state" className="font-bold text-xs uppercase tracking-wider text-on-surface block">
                  State / County / Province
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  placeholder="e.g. Nairobi County"
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>

              {/* Country */}
              <div className="space-y-1">
                <label htmlFor="country" className="font-bold text-xs uppercase tracking-wider text-on-surface block">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  placeholder="e.g. Kenya"
                  required
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>

              {/* Postal / Zip Code */}
              <div className="space-y-1">
                <label htmlFor="zipCode" className="font-bold text-xs uppercase tracking-wider text-on-surface block">
                  Postal / Zip Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formZip}
                  onChange={(e) => setFormZip(e.target.value)}
                  placeholder="e.g. 00100"
                  className="w-full h-14 px-4 border-2 border-on-surface rounded-none font-medium bg-surface text-on-surface transition-all focus:border-primary-container focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Payment Information Card - Safaricom Daraja Sandbox */}
          <div className="border-2 border-on-surface bg-surface p-8">
            <div className="flex items-center justify-between pb-3 border-b-2 border-on-surface mb-6">
              <h3 className="font-headline-md text-xl font-bold uppercase tracking-wider text-on-surface">
                Payment Information
              </h3>
              <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-700">
                Daraja Sandbox
              </span>
            </div>
            
            <div className="space-y-5">
              {/* M-Pesa Method Header */}
              <div className="p-4 border-2 border-emerald-600 bg-emerald-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-none bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                      M
                    </div>
                    <div>
                      <span className="font-headline-md font-extrabold text-sm uppercase tracking-wider text-emerald-950 block">
                        Lipa Na M-Pesa Online (STK Push)
                      </span>
                      <span className="text-[11px] text-emerald-800 font-semibold">
                        Safaricom Daraja API • Shortcode 174379
                      </span>
                    </div>
                  </div>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-700 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  </span>
                </div>

                <p className="text-xs text-emerald-900 leading-relaxed font-medium pt-1 border-t border-emerald-200">
                  When you submit the order, an automated STK Push prompt will be sent directly to your Safaricom phone. Enter your M-Pesa PIN on the screen to authorize the sandbox payment.
                </p>
              </div>

              {/* M-Pesa Phone Input */}
              <div className="space-y-2">
                <label htmlFor="mpesaPhone" className="font-bold text-xs uppercase tracking-wider text-on-surface flex justify-between">
                  <span>M-Pesa Phone Number (Safaricom)</span>
                  <span className="text-secondary font-medium lowercase text-[11px]">e.g. 0712345678 or 254712345678</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="mpesaPhone"
                    name="mpesaPhone"
                    placeholder="07XXXXXXXX or 2547XXXXXXXX"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    required
                    className="w-full h-14 pl-12 pr-4 border-2 border-on-surface bg-surface text-on-surface font-medium rounded-none focus:border-primary-container focus:ring-0"
                  />
                  <Icon name="smartphone" className="absolute left-4 top-4 text-emerald-700 text-xl" />
                </div>
                <div className="flex items-center justify-between text-xs text-secondary pt-1">
                  <span>Payment Amount:</span>
                  <strong className="font-extrabold text-emerald-700">{CURRENCY_CONFIG.symbol} {total.toFixed(2)}</strong>
                </div>
              </div>

              {/* Sandbox Notice Box */}
              <div className="border border-dashed border-emerald-700/60 p-3.5 bg-emerald-50/40 text-[11px] text-emerald-900 flex items-start gap-2.5">
                <Icon name="verified_user" className="text-emerald-700 text-base shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-0.5">Daraja Sandbox Environment Active</p>
                  <p className="opacity-90">
                    Live Safaricom Sandbox endpoint is active. You will receive real test STK prompts on registered sandbox developer test SIMs.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Order Summary & Info */}
        <div className="w-full lg:max-w-md space-y-6">
          
          {/* Daraja Sandbox Mode Alert Banner */}
          <div className="border-2 border-on-surface p-6 bg-emerald-50 text-emerald-950 relative overflow-hidden">
            <div className="flex gap-3 items-start relative z-10">
              <Icon name="verified" className="text-2xl text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Daraja Sandbox Mode</h4>
                <p className="text-xs leading-relaxed text-emerald-900/90 font-medium">
                  Payments are processed via Safaricom Lipa Na M-Pesa Online STK Push in sandbox mode.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-emerald-200 opacity-20 rounded-full"></div>
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

              {/* Product List */}
              {cartItems.length > 0 && (
                <div className="space-y-4 max-h-60 overflow-y-auto border-b border-surface-container pb-3 pt-3">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface truncate">{item.Product?.name || 'Unknown Item'}</p>
                        <p className="text-xs text-secondary">
                          Qty: {item.quantity}
                          {item.selectedVariantIndex !== undefined && item.selectedVariantIndex !== null && item.Product?.variants?.[item.selectedVariantIndex] ? ` • ${item.Product.variants[item.selectedVariantIndex].name}` : ''}
                          {item.selectedColor ? ` • ${item.selectedColor}` : ''}
                          {item.selectedSize ? ` • ${item.selectedSize}` : ''}
                        </p>
                      </div>
                      <span className="font-bold text-on-surface whitespace-nowrap">
                        {CURRENCY_CONFIG.symbol} {(() => {
                          let basePrice = item.Product?.price ? parseFloat(String(item.Product.price)) : 0;
                          if (item.selectedVariantIndex !== undefined && item.selectedVariantIndex !== null && item.Product?.variants?.[item.selectedVariantIndex]) {
                            basePrice = parseFloat(String(item.Product.variants[item.selectedVariantIndex].price));
                          }
                          const discount = item.Product?.discount || 0;
                          const finalPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
                          return (finalPrice * item.quantity).toFixed(2);
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-3 pb-1 font-black text-lg border-t-2 border-on-surface border-dashed">
                <span className="uppercase tracking-widest text-on-surface">Total to Pay</span>
                <span className="text-primary-container text-xl md:text-2xl font-black">{CURRENCY_CONFIG.symbol} {total.toFixed(2)}</span>
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

            <p className="mt-3 text-[11px] text-center text-secondary leading-normal">
              By placing an order, you agree to our{' '}
              <Link href="/terms" className="underline font-bold text-on-surface hover:text-primary-container">
                Terms
              </Link>
              ,{' '}
              <Link href="/privacy" className="underline font-bold text-on-surface hover:text-primary-container">
                Privacy
              </Link>
              , and{' '}
              <Link href="/returns" className="underline font-bold text-on-surface hover:text-primary-container">
                Return &amp; Refund Policy
              </Link>
              .
            </p>

            <Link
              href="/cart"
              className="mt-4 w-full h-12 border-2 border-on-surface font-bold uppercase tracking-wider text-xs flex items-center justify-center hover:bg-surface-container-low transition-colors"
            >
              Back to Cart
            </Link>
          </div>

        </div>
      </form>

      {/* M-Pesa STK Prompt Modal */}
      {stkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-surface shadow-[8px_8px_0px_0px_var(--color-on-surface)] max-w-md w-full p-8 text-center relative animate-in fade-in zoom-in-95 duration-200">
            {stkStatus === 'initiating' || stkStatus === 'waiting' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center mx-auto mb-5">
                  <Icon name="sync" className="text-3xl text-emerald-700 animate-spin" />
                </div>
                <h3 className="font-headline-md text-xl font-black uppercase tracking-tight text-on-surface mb-2">
                  M-Pesa STK Prompt Sent
                </h3>
                <p className="text-sm font-medium text-secondary mb-6 leading-relaxed">
                  {stkMessage}
                </p>
                <div className="p-4 bg-surface-container border-2 border-on-surface text-left space-y-1 mb-6 text-xs">
                  <div className="flex justify-between">
                    <span className="text-secondary font-bold">Recipient:</span>
                    <span className="font-extrabold text-on-surface">Lipa na M-Pesa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary font-bold">Amount:</span>
                    <span className="font-black text-emerald-600 text-sm">{CURRENCY_CONFIG.symbol} {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary font-bold">Phone:</span>
                    <span className="font-bold text-on-surface">{mpesaPhone}</span>
                  </div>
                </div>
                <p className="text-[11px] text-secondary font-medium animate-pulse mb-6">
                  Checking transaction confirmation from Safaricom...
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStkModalOpen(false);
                    if (currentCheckoutId) {
                      router.push(`/order-confirmation?id=${currentCheckoutId}`);
                    }
                  }}
                  className="w-full py-3 border-2 border-on-surface bg-surface font-bold text-xs uppercase tracking-wider hover:bg-surface-container active:scale-95 transition-all"
                >
                  I have already entered my PIN
                </button>
              </>
            ) : stkStatus === 'success' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-600 flex items-center justify-center mx-auto mb-5">
                  <Icon name="check_circle" className="text-3xl text-green-700" />
                </div>
                <h3 className="font-headline-md text-xl font-black uppercase tracking-tight text-on-surface mb-2">
                  Payment Successful!
                </h3>
                <p className="text-sm font-medium text-secondary mb-4">
                  {stkMessage}
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-600 flex items-center justify-center mx-auto mb-5">
                  <Icon name="error" className="text-3xl text-red-600" />
                </div>
                <h3 className="font-headline-md text-xl font-black uppercase tracking-tight text-on-surface mb-2">
                  Payment Failed
                </h3>
                <p className="text-sm font-medium text-red-600 mb-6 leading-relaxed">
                  {stkMessage}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStkModalOpen(false)}
                    className="flex-1 py-3 border-2 border-on-surface bg-primary-container text-on-primary-container font-extrabold text-xs uppercase tracking-wider active:scale-95 hover:bg-amber-500 transition-all"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStkModalOpen(false);
                      if (currentCheckoutId) {
                        router.push(`/order-confirmation?id=${currentCheckoutId}`);
                      }
                    }}
                    className="flex-1 py-3 border-2 border-on-surface bg-surface font-bold text-xs uppercase tracking-wider active:scale-95 hover:bg-surface-container transition-all"
                  >
                    View Order
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
