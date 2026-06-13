"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import OnboardingPopup from "@/components/merchant/OnboardingPopup";

export default function MerchantDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Fetch Merchant's Products count
        const productsQuery = query(collection(db, "products"), where("merchantId", "==", user.uid));
        const productsSnapshot = await getDocs(productsQuery);
        const productsCount = productsSnapshot.size;

        // Fetch Merchant's Orders count
        const ordersQuery = query(collection(db, "orders"), where("merchantId", "==", user.uid));
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersCount = ordersSnapshot.size;
        
        let totalRevenue = 0;
        ordersSnapshot.forEach((doc) => {
          totalRevenue += doc.data().totalAmount || 0;
        });

        setStats({ products: productsCount, orders: ordersCount, revenue: totalRevenue });
      } catch (error) {
        console.error("Error fetching merchant stats:", error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchDashboardStats();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchDashboardStats();
      });
      return () => unsubscribe();
    }
  }, []);

  if (loading) {
    return <div className="p-8 font-body-md">Loading dashboard...</div>;
  }

  return (
    <div className="p-8">
      <OnboardingPopup />
      <h1 className="font-headline-lg font-black text-4xl mb-8 uppercase border-b-4 border-on-surface inline-block pb-2">
        Dashboard Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary-container text-on-surface p-6 border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <h3 className="font-headline-sm font-bold uppercase mb-2">Total Products</h3>
          <p className="text-4xl font-black">{stats.products}</p>
        </div>

        <div className="bg-secondary-container text-on-surface p-6 border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <h3 className="font-headline-sm font-bold uppercase mb-2">Total Orders</h3>
          <p className="text-4xl font-black">{stats.orders}</p>
        </div>

        <div className="bg-surface text-on-surface p-6 border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <h3 className="font-headline-sm font-bold uppercase mb-2">Total Revenue</h3>
          <p className="text-4xl font-black">Ksh {stats.revenue.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
