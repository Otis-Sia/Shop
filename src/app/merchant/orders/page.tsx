"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Order } from "@/types/schema";

export default function MerchantOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const ordersQuery = query(
          collection(db, "orders"), 
          where("merchantId", "==", user.uid)
        );
        const snapshot = await getDocs(ordersQuery);
        const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        // Sort client-side to avoid requiring a composite index in Firestore
        ordersList.sort((a, b) => {
          const timeA = a.createdAt ? (a.createdAt as { seconds?: number }).seconds || 0 : 0;
          const timeB = b.createdAt ? (b.createdAt as { seconds?: number }).seconds || 0 : 0;
          return timeB - timeA;
        });
        setOrders(ordersList);
      } catch (error) {
        console.error("Error fetching merchant orders:", error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchOrders();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchOrders();
      });
      return () => unsubscribe();
    }
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status.');
    }
  };

  const toggleDetails = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };

  if (loading) {
    return <div className="p-8">Loading orders...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="font-headline-lg font-black text-4xl mb-8 uppercase border-b-4 border-on-surface inline-block pb-2">
        My Orders
      </h1>

      <div className="bg-surface border-4 border-on-surface overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-on-surface text-surface uppercase font-bold text-sm">
              <th className="p-4 border-b-4 border-on-surface">Order ID</th>
              <th className="p-4 border-b-4 border-on-surface">Date</th>
              <th className="p-4 border-b-4 border-on-surface">Status</th>
              <th className="p-4 border-b-4 border-on-surface">Total</th>
              <th className="p-4 border-b-4 border-on-surface text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center font-bold">No orders found.</td>
              </tr>
            ) : (
              orders.map((order) => {
                const date = order.createdAt ? new Date((order.createdAt as { seconds?: number }).seconds! * 1000).toLocaleDateString() : 'N/A';
                const isExpanded = expandedOrderId === order.id;

                return (
                  <React.Fragment key={order.id}>
                    <tr className="border-b border-on-surface hover:bg-surface-dim transition-colors">
                      <td className="p-4 font-mono text-sm">{order.id}</td>
                      <td className="p-4">{date}</td>
                      <td className="p-4">
                        <select 
                          value={order.status}
                          onChange={(e) => order.id && handleUpdateOrderStatus(order.id, e.target.value)}
                          className="text-[10px] px-2 py-1 font-black uppercase border-2 border-on-surface cursor-pointer outline-none bg-secondary-container text-on-surface"
                        >
                          <option value="pending">PENDING</option>
                          <option value="processing">PROCESSING</option>
                          <option value="shipped">SHIPPED</option>
                          <option value="delivered">DELIVERED</option>
                          <option value="cancelled">CANCELLED</option>
                        </select>
                      </td>
                      <td className="p-4 font-bold">${order.totalAmount.toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => order.id && toggleDetails(order.id)}
                          className="text-sm border-2 border-on-surface px-3 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors"
                        >
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-surface-dim border-b-4 border-on-surface">
                        <td colSpan={5} className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                              <h4 className="font-bold uppercase text-sm border-b-2 border-on-surface pb-1 mb-4">Customer Info</h4>
                              <p className="text-sm mb-1"><span className="font-bold">Name:</span> {order.contactInformation?.fullName || 'N/A'}</p>
                              <p className="text-sm mb-1"><span className="font-bold">Email:</span> {order.contactInformation?.email || 'N/A'}</p>
                              <p className="text-sm mb-4"><span className="font-bold">Phone:</span> {order.contactInformation?.phone || 'N/A'}</p>
                              
                              <h4 className="font-bold uppercase text-sm border-b-2 border-on-surface pb-1 mb-4">Shipping Address</h4>
                              <p className="text-sm mb-1">{order.shippingAddress?.street}</p>
                              <p className="text-sm mb-1">{order.shippingAddress?.city}, {order.shippingAddress?.zipCode}</p>
                              <p className="text-sm">{order.shippingAddress?.country}</p>
                            </div>
                            <div>
                              <h4 className="font-bold uppercase text-sm border-b-2 border-on-surface pb-1 mb-4">Order Items</h4>
                              <div className="space-y-4">
                                {order.items.map((item: { name: string; quantity: number; price: number }, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center border-b border-on-surface pb-2">
                                    <div>
                                      <p className="font-bold text-sm">{item.name}</p>
                                      <p className="text-xs text-secondary">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                                  </div>
                                ))}
                                <div className="flex justify-between items-center pt-2">
                                  <p className="font-black uppercase text-sm">Order Total</p>
                                  <p className="font-black text-lg">${order.totalAmount.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
