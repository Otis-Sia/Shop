'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Order, OrderStatus } from '@/types/schema';
import Icon from '@/components/Icon';
import { Timestamp } from 'firebase/firestore';

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-gray-200', text: 'text-gray-800' },
  paid: { label: 'Paid', bg: 'bg-amber-200', text: 'text-amber-900' },
  shipped: { label: 'Shipped', bg: 'bg-gray-800', text: 'text-white' },
  delivered: { label: 'Delivered', bg: 'bg-green-200', text: 'text-green-900' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-200', text: 'text-red-900' },
};

const TIMELINE_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'paid', label: 'Paid' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

function getTimelineIndex(status: OrderStatus): number {
  const idx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

function formatDate(date: Timestamp | Date | undefined): string {
  if (!date) return '—';
  const d = date instanceof Timestamp ? date.toDate() : new Date(date as unknown as string);
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login?redirect=/orders');
        return;
      }
      setCurrentUser(user);

      const fetchOrders = async () => {
        try {
          const q = query(
            collection(db, 'orders'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(q);
          const fetched = snapshot.docs.map((doc) => ({
            ...(doc.data() as Order),
            id: doc.id,
          }));
          setOrders(fetched);
        } catch (err) {
          console.error('Error fetching orders:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchOrders();
    });

    return () => unsubscribe();
  }, [router]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16 flex-grow">
      {/* Page Header */}
      <div className="mb-12">
        <h1 className="font-headline-md text-3xl md:text-5xl font-black uppercase tracking-tighter text-on-surface">
          My Orders
        </h1>
        <p className="mt-2 text-sm text-secondary font-semibold uppercase tracking-wider">
          Track and manage your orders
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
          <p className="mt-4 font-bold text-sm tracking-widest text-secondary uppercase">
            Loading your orders...
          </p>
        </div>
      ) : orders.length === 0 ? (
        /* Empty State */
        <div className="border-2 border-on-surface p-12 bg-white text-center flex flex-col items-center justify-center max-w-[600px] mx-auto shadow-[4px_4px_0px_0px_rgba(26,28,28,1)]">
          <Icon name="shopping_bag" className="text-5xl mb-4 text-secondary" />
          <h3 className="font-headline-md text-xl font-bold uppercase mb-2 text-on-surface">
            No orders yet
          </h3>
          <p className="text-sm text-secondary mb-6 max-w-[300px]">
            Looks like you haven&apos;t placed any orders. Start shopping and your orders will appear here!
          </p>
          <Link
            href="/products"
            className="px-8 py-3 bg-primary-container text-on-primary-container font-bold text-xs uppercase tracking-wider border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(26,28,28,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(26,28,28,1)] active:scale-95 active:translate-y-0.5 transition-all"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        /* Orders List */
        <div className="space-y-6">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const shortId = order.id.slice(-6).toUpperCase();
            const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const isCancelled = order.status === 'cancelled';
            const timelineIdx = getTimelineIndex(order.status);

            return (
              <div
                key={order.id}
                className="border-2 border-on-surface bg-white shadow-[4px_4px_0px_0px_rgba(26,28,28,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(26,28,28,1)]"
              >
                {/* Order Header — always visible */}
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="w-full text-left p-6 md:p-8 focus:outline-none"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Order ID & Date */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-headline-md text-base md:text-lg font-black uppercase text-on-surface tracking-tight">
                          Order #{shortId}
                        </span>
                        <span
                          className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest border border-current ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-secondary font-semibold uppercase tracking-wider">
                        <Icon name="calendar_today" className="text-sm mr-1" />
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    {/* Right: Total & Expand */}
                    <div className="flex items-center gap-4">
                      <span className="font-headline-md text-lg md:text-xl font-black text-on-surface">
                        Kes. {order.totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </span>
                      <div
                        className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <Icon name="expand_more" className="text-2xl text-secondary" />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expandable Section */}
                {isExpanded && (
                  <div className="border-t-2 border-on-surface p-6 md:p-8 space-y-8">
                    {/* Status Timeline */}
                    {!isCancelled && (
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface mb-5">
                          Order Progress
                        </h4>
                        <div className="flex items-center justify-between relative">
                          {/* Connecting Line */}
                          <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200" />
                          <div
                            className="absolute top-3 left-0 h-0.5 bg-primary-container transition-all duration-500"
                            style={{
                              width: `${(timelineIdx / (TIMELINE_STEPS.length - 1)) * 100}%`,
                            }}
                          />

                          {TIMELINE_STEPS.map((step, idx) => {
                            const isCompleted = idx <= timelineIdx;
                            const isCurrent = idx === timelineIdx;
                            return (
                              <div key={step.key} className="flex flex-col items-center z-10">
                                <div
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isCompleted
                                      ? 'bg-primary-container border-on-surface'
                                      : 'bg-white border-gray-300'
                                  } ${isCurrent ? 'ring-2 ring-primary-container ring-offset-2' : ''}`}
                                >
                                  {isCompleted && (
                                    <Icon name="check" className="text-xs text-on-primary-container" />
                                  )}
                                </div>
                                <span
                                  className={`mt-2 text-[10px] font-extrabold uppercase tracking-wider ${
                                    isCompleted ? 'text-on-surface' : 'text-gray-400'
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Cancelled Notice */}
                    {isCancelled && (
                      <div className="bg-red-50 border-2 border-red-300 p-4 flex items-center gap-3">
                        <Icon name="error" className="text-xl text-red-600" />
                        <span className="text-sm font-bold text-red-800 uppercase tracking-wider">
                          This order has been cancelled
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Ordered Items */}
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface mb-4 pb-2 border-b-2 border-on-surface">
                          Items Ordered
                        </h4>
                        <div className="space-y-3">
                          {order.items.map((item, idx) => (
                            <div
                              key={`${item.productId}-${idx}`}
                              className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                            >
                              <div>
                                <p className="text-sm font-bold text-on-surface">{item.name}</p>
                                <p className="text-xs text-secondary font-semibold">
                                  Qty: {item.quantity} × Kes. {item.price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <span className="font-headline-md text-sm font-black text-on-surface">
                                Kes. {(item.quantity * item.price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping & Contact */}
                      <div className="space-y-6">
                        {/* Shipping Address */}
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface mb-3 pb-2 border-b-2 border-on-surface">
                            Shipping Address
                          </h4>
                          {order.shippingAddress ? (
                            <div className="text-sm text-secondary space-y-1">
                              <p className="font-semibold">{order.shippingAddress.street}</p>
                              <p>{order.shippingAddress.city}{order.shippingAddress.zipCode ? `, ${order.shippingAddress.zipCode}` : ''}</p>
                              {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
                            </div>
                          ) : (
                            <p className="text-sm text-secondary italic">No address provided</p>
                          )}
                        </div>

                        {/* Contact Information */}
                        {order.contactInformation && (
                          <div>
                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface mb-3 pb-2 border-b-2 border-on-surface">
                              Contact Information
                            </h4>
                            <div className="text-sm text-secondary space-y-1">
                              <p className="font-semibold">{order.contactInformation.fullName}</p>
                              <p>{order.contactInformation.email}</p>
                              {order.contactInformation.phone && (
                                <p>{order.contactInformation.phone}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Shipping Method */}
                        {order.shippingInformation && (
                          <div>
                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface mb-3 pb-2 border-b-2 border-on-surface">
                              Shipping Method
                            </h4>
                            <div className="text-sm text-secondary space-y-1">
                              <p className="font-semibold">{order.shippingInformation.method}</p>
                              <p>
                                Cost: Kes. {order.shippingInformation.cost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                              </p>
                              {order.shippingInformation.trackingNumber && (
                                <p className="font-bold text-on-surface">
                                  Tracking: {order.shippingInformation.trackingNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Total Bar */}
                    <div className="border-t-2 border-dashed border-on-surface pt-4 flex justify-between items-center">
                      <span className="font-extrabold text-xs uppercase tracking-widest text-secondary">
                        Order Total
                      </span>
                      <span className="font-headline-md text-xl font-black text-on-surface">
                        Kes. {order.totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
