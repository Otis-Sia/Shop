"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Order } from "@/types/schema";

export default function MerchantOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const ordersQuery = query(
          collection(db, "orders"), 
          where("merchantId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(ordersQuery);
        const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
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

  if (loading) {
    return <div className="p-8">Loading orders...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="font-headline-lg font-black text-4xl mb-8 uppercase border-b-4 border-on-surface inline-block pb-2">
        My Orders
      </h1>

      <div className="bg-surface border-4 border-on-surface overflow-hidden">
        <table className="w-full text-left border-collapse">
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
                const date = order.createdAt ? new Date((order.createdAt as any).seconds * 1000).toLocaleDateString() : 'N/A';
                return (
                  <tr key={order.id} className="border-b border-on-surface hover:bg-surface-dim transition-colors">
                    <td className="p-4 font-mono text-sm">{order.id}</td>
                    <td className="p-4">{date}</td>
                    <td className="p-4">
                      <span className="bg-secondary-container text-on-surface px-2 py-1 text-xs font-bold uppercase border-2 border-on-surface">
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 font-bold">${order.totalAmount.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <button className="text-sm border-2 border-on-surface px-3 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors">
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
