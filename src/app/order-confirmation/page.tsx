'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/types/schema';
import Icon from '@/components/Icon';
import { Timestamp } from 'firebase/firestore';

function formatDate(date: Timestamp | Date | undefined): string {
  if (!date) return '—';
  const d = date instanceof Timestamp ? date.toDate() : new Date(date as unknown as string);
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ── Confetti-like decorative shapes ── */
function ConfettiDecor() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Top-left */}
      <div className="absolute -top-4 -left-4 w-16 h-16 bg-primary-container opacity-20 rotate-12 border-2 border-on-surface animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
      {/* Top-right */}
      <div className="absolute -top-6 right-8 w-10 h-10 bg-green-300 opacity-25 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }} />
      {/* Bottom-left */}
      <div className="absolute bottom-6 -left-6 w-12 h-12 bg-amber-300 opacity-20 rotate-45 animate-bounce" style={{ animationDelay: '1s', animationDuration: '3.5s' }} />
      {/* Bottom-right */}
      <div className="absolute -bottom-3 right-12 w-8 h-8 bg-blue-300 opacity-20 rounded-full animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '2.8s' }} />
      {/* Mid-left */}
      <div className="absolute top-1/2 -left-8 w-6 h-6 bg-pink-300 opacity-25 rotate-[30deg] animate-bounce" style={{ animationDelay: '1.2s', animationDuration: '4s' }} />
      {/* Mid-right */}
      <div className="absolute top-1/3 -right-4 w-14 h-14 bg-primary-container opacity-10 rounded-full animate-bounce" style={{ animationDelay: '0.7s', animationDuration: '3.2s' }} />
    </div>
  );
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState<(Order & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError(true);
      return;
    }

    const fetchOrder = async () => {
      try {
        const docRef = doc(db, 'orders', orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrder({ ...(docSnap.data() as Order), id: docSnap.id });
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  /* Loading State */
  if (loading) {
    return (
      <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16 flex-grow flex flex-col items-center justify-center min-h-[500px]">
        <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
        <p className="mt-4 font-bold text-sm tracking-widest text-secondary uppercase">
          Loading your order...
        </p>
      </main>
    );
  }

  /* Error / Not Found State */
  if (error || !order) {
    return (
      <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16 flex-grow flex items-center justify-center min-h-[500px]">
        <div className="border-2 border-on-surface bg-surface p-12 max-w-[500px] text-center shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <Icon name="error" className="text-5xl text-error mb-4" />
          <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight text-on-surface mb-2">
            Order Not Found
          </h2>
          <p className="text-sm text-secondary mb-8">
            We couldn&apos;t find the order you&apos;re looking for. It may have been removed or the link is invalid.
          </p>
          <Link
            href="/products"
            className="inline-block px-8 py-3 bg-primary-container text-on-primary-container font-bold text-xs uppercase tracking-wider border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] active:scale-95 active:translate-y-0.5 transition-all"
          >
            Browse Products
          </Link>
        </div>
      </main>
    );
  }

  const shortId = order.id.slice(-6).toUpperCase();
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const shippingMethod = order.shippingInformation?.method || 'Standard';

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16 flex-grow flex items-center justify-center min-h-[600px]">
      <div className="relative w-full max-w-[640px]">
        {/* Confetti decorations */}
        <ConfettiDecor />

        {/* Main Confirmation Card */}
        <div className="relative z-10 border-2 border-on-surface bg-surface p-8 md:p-12 shadow-[4px_4px_0px_0px_var(--color-on-surface)] text-center">
          {/* Success Checkmark */}
          <div className="mx-auto mb-6 w-20 h-20 bg-green-200 border-2 border-on-surface rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_var(--color-on-surface)] animate-[scaleIn_0.5s_ease-out]">
            <Icon name="check" className="text-4xl text-green-800" />
          </div>

          {/* Heading */}
          <h1 className="font-headline-md text-3xl md:text-4xl font-black uppercase tracking-tighter text-on-surface mb-2">
            Order Confirmed!
          </h1>
          <p className="text-sm text-secondary font-semibold uppercase tracking-wider mb-8">
            Thank you for your purchase
          </p>

          {/* Order Number */}
          <div className="inline-block border-2 border-on-surface bg-surface px-6 py-3 mb-8 shadow-[2px_2px_0px_0px_var(--color-on-surface)]">
            <span className="font-extrabold text-xs uppercase tracking-widest text-secondary block mb-1">
              Order Number
            </span>
            <span className="font-headline-md text-xl md:text-2xl font-black text-on-surface tracking-wider">
              #{shortId}
            </span>
          </div>

          {/* Summary Grid */}
          <div className="border-2 border-on-surface divide-y-2 divide-on-surface mb-8">
            {/* Total Amount */}
            <div className="flex justify-between items-center p-4">
              <span className="font-extrabold text-xs uppercase tracking-wider text-secondary">
                Total Amount
              </span>
              <span className="font-headline-md text-lg font-black text-on-surface">
                Ksh {order.totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Number of Items */}
            <div className="flex justify-between items-center p-4">
              <span className="font-extrabold text-xs uppercase tracking-wider text-secondary">
                Items
              </span>
              <span className="font-bold text-sm text-on-surface">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Items List */}
            {order.items && order.items.length > 0 && (
              <div className="p-4 space-y-4 border-t-2 border-on-surface border-dashed">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm gap-2">
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-on-surface truncate">{item.name}</p>
                      <p className="text-xs text-secondary">
                        Qty: {item.quantity}
                        {item.variantName ? ` • ${item.variantName}` : ''}
                        {item.color ? ` • ${item.color}` : ''}
                        {item.size ? ` • ${item.size}` : ''}
                      </p>
                    </div>
                    <span className="font-bold text-on-surface whitespace-nowrap">
                      Ksh {(item.price * item.quantity).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Shipping Method */}
            <div className="flex justify-between items-center p-4">
              <span className="font-extrabold text-xs uppercase tracking-wider text-secondary">
                Shipping
              </span>
              <span className="font-bold text-sm text-on-surface uppercase tracking-wider">
                {shippingMethod}
              </span>
            </div>

            {/* Estimated Delivery */}
            <div className="flex justify-between items-center p-4 bg-green-50">
              <span className="font-extrabold text-xs uppercase tracking-wider text-secondary">
                Est. Delivery
              </span>
              <span className="font-bold text-sm text-green-800 flex items-center gap-1">
                <Icon name="local_shipping" className="text-base" />
                3–5 business days
              </span>
            </div>
          </div>

          {/* Date */}
          <p className="text-xs text-secondary font-semibold uppercase tracking-wider mb-8">
            Placed on {formatDate(order.createdAt)}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/products"
              className="flex-1 h-14 bg-primary-container text-on-primary-container font-headline-md font-extrabold uppercase tracking-wider text-sm border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex items-center justify-center transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] active:scale-95 active:translate-y-0.5"
            >
              Continue Shopping
            </Link>
            <Link
              href="/orders"
              className="flex-1 h-14 bg-surface text-on-surface font-headline-md font-extrabold uppercase tracking-wider text-sm border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex items-center justify-center transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] active:scale-95 active:translate-y-0.5"
            >
              View My Orders
            </Link>
          </div>
        </div>
      </div>

      {/* Inline keyframes for scale-in animation */}
      <style jsx>{`
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16 flex-grow flex flex-col items-center justify-center min-h-[500px]">
          <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
          <p className="mt-4 font-bold text-sm tracking-widest text-secondary uppercase">
            Loading...
          </p>
        </main>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
