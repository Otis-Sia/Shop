'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Order } from '@/types/schema';
import Icon from '@/components/Icon';
import { CURRENCY_CONFIG } from '@/lib/utils/currency';

function formatDate(date: any): string {
  if (!date) return '—';
  if (typeof date === 'object' && 'seconds' in date) {
    return new Date(date.seconds * 1000).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  const d = new Date(date);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-KE', {
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
  const orderId = searchParams.get('id') || searchParams.get('checkoutId');

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
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.order) {
            setOrder(data.order);
          } else {
            setError(true);
          }
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

  const shortId = order.id.slice(-8).toUpperCase();
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const shippingMethod = order.shippingInformation?.method || 'Standard Delivery';
  const shippingCost = Number(order.shippingInformation?.cost || 0);
  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 md:px-16 py-12 flex-grow flex items-center justify-center min-h-[600px]">
      <div className="relative w-full max-w-[760px]">
        {/* Confetti decorations (hidden during print) */}
        <div className="print:hidden">
          <ConfettiDecor />
        </div>

        {/* Main Confirmation & Receipt Container */}
        <div className="relative z-10 border-2 border-on-surface bg-surface p-6 md:p-10 shadow-[6px_6px_0px_0px_var(--color-on-surface)] print:shadow-none print:border-none print:p-0">
          
          {/* Top Header - Screen Only */}
          <div className="text-center mb-8 print:hidden">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-200 border-2 border-on-surface rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_var(--color-on-surface)] animate-[scaleIn_0.5s_ease-out]">
              <Icon name="check" className="text-3xl text-green-800" />
            </div>
            <h1 className="font-headline-md text-3xl md:text-4xl font-black uppercase tracking-tighter text-on-surface mb-1">
              Order Confirmed!
            </h1>
            <p className="text-xs md:text-sm text-secondary font-semibold uppercase tracking-wider">
              Thank you for your purchase. Here is your official order receipt.
            </p>
          </div>

          {/* Printable Receipt Card */}
          <div className="border-2 border-on-surface bg-surface-container-low p-6 md:p-8 space-y-6 print:border-2 print:border-black print:bg-white print:p-6">
            
            {/* Receipt Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b-2 border-on-surface">
              <div>
                <span className="font-extrabold text-[10px] tracking-widest text-primary-container uppercase block mb-1">
                  Official Customer Receipt
                </span>
                <h2 className="font-headline-md text-xl md:text-2xl font-black text-on-surface uppercase tracking-tight">
                  Receipt #{shortId}
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  Placed on {formatDate(order.createdAt)}
                </p>
              </div>

              {/* Status Badge & Print CTA */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 border border-on-surface text-xs font-black uppercase tracking-wider ${
                  order.status === 'paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {order.status === 'paid' ? 'Paid ✓' : 'Payment Pending'}
                </span>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="print:hidden px-3.5 py-2 border-2 border-on-surface bg-surface hover:bg-surface-container text-on-surface font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-none transition-all"
                  title="Print or save PDF receipt"
                >
                  <Icon name="print" className="text-base" />
                  Print Receipt
                </button>
              </div>
            </div>

            {/* Customer & Shipping Summary Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2 text-xs">
              {/* Customer Info */}
              <div className="space-y-1.5">
                <span className="font-black text-[10px] uppercase tracking-widest text-secondary block">
                  Billed To / Customer
                </span>
                <p className="font-bold text-sm text-on-surface">
                  {order.contactInformation?.fullName || 'Valued Customer'}
                </p>
                {order.contactInformation?.email && (
                  <p className="text-secondary">{order.contactInformation.email}</p>
                )}
                {order.contactInformation?.phone && (
                  <p className="text-secondary">{order.contactInformation.phone}</p>
                )}
                {order.paymentMethod && (
                  <p className="text-secondary font-medium mt-1">
                    Payment Method: <strong className="text-on-surface uppercase">{order.paymentMethod === 'mpesa' ? 'M-Pesa STK Push' : order.paymentMethod}</strong>
                  </p>
                )}
                {order.mpesaReceiptNumber && (
                  <p className="text-emerald-700 font-bold mt-0.5">
                    M-Pesa Receipt: <span className="font-mono">{order.mpesaReceiptNumber}</span>
                  </p>
                )}
              </div>

              {/* Shipping Address */}
              <div className="space-y-1.5">
                <span className="font-black text-[10px] uppercase tracking-widest text-secondary block">
                  Shipping Details
                </span>
                <p className="font-bold text-on-surface">
                  {order.shippingAddress?.street || 'Local Address'}
                </p>
                <p className="text-secondary">
                  {[order.shippingAddress?.city, order.shippingAddress?.country || 'Kenya'].filter(Boolean).join(', ')}
                  {order.shippingAddress?.zipCode ? ` • ${order.shippingAddress.zipCode}` : ''}
                </p>
                <p className="text-secondary font-medium">
                  Method: <strong className="text-on-surface uppercase">{shippingMethod}</strong>
                </p>
              </div>
            </div>

            {/* Items Purchased Table */}
            <div className="border-2 border-on-surface bg-surface overflow-hidden">
              <div className="bg-surface-container px-4 py-2.5 border-b-2 border-on-surface flex justify-between font-extrabold text-[10px] uppercase tracking-wider text-secondary">
                <span>Item Description</span>
                <span>Amount</span>
              </div>

              <div className="divide-y divide-surface-container">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-4 flex justify-between items-center gap-4 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">{item.name}</p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-secondary mt-0.5">
                        <span>Qty: <strong>{item.quantity}</strong></span>
                        <span>Unit: <strong>{CURRENCY_CONFIG.symbol} {item.price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong></span>
                        {item.variantName && <span>• {item.variantName}</span>}
                        {item.color && <span>• Color: {item.color}</span>}
                        {item.size && <span>• Size: {item.size}</span>}
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap font-black text-sm text-on-surface">
                      {CURRENCY_CONFIG.symbol} {(item.price * item.quantity).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt Totals Breakdown */}
            <div className="bg-surface border-2 border-on-surface p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-secondary font-medium">
                <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'}):</span>
                <span className="font-bold text-on-surface">{CURRENCY_CONFIG.symbol} {subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-secondary font-medium">
                <span>Shipping &amp; Handling:</span>
                <span className="font-bold text-on-surface">
                  {shippingCost > 0 ? `${CURRENCY_CONFIG.symbol} ${shippingCost.toFixed(2)}` : 'FREE'}
                </span>
              </div>
              <div className="flex justify-between text-base font-black border-t-2 border-on-surface pt-2.5 text-on-surface">
                <span className="uppercase tracking-wider">Total Paid / Due:</span>
                <span className="text-primary-container text-lg font-black">
                  {CURRENCY_CONFIG.symbol} {order.totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center pt-2 text-[11px] text-secondary">
              <p>Questions about this receipt? Contact support at <strong>support@juj4.cepine.com</strong></p>
            </div>
          </div>

          {/* Action Navigation Buttons (Screen Only) */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 print:hidden">
            <Link
              href="/products"
              className="flex-1 h-13 bg-primary-container text-on-primary-container font-headline-md font-extrabold uppercase tracking-wider text-xs border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex items-center justify-center transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] active:scale-95 active:translate-y-0.5"
            >
              Continue Shopping
            </Link>
            <Link
              href="/orders"
              className="flex-1 h-13 bg-surface text-on-surface font-headline-md font-extrabold uppercase tracking-wider text-xs border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex items-center justify-center transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] active:scale-95 active:translate-y-0.5"
            >
              View All Orders
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
