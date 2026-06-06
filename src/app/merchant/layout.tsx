"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { Package, ShoppingCart, LayoutDashboard, Settings } from "lucide-react";

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in -> redirect to auth screen
        router.push("/login?redirect=/merchant");
      } else {
        // Check if the user has the 'merchant' role in Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data()?.role === "merchant") {
            setIsMerchant(true);
          } else {
            // Logged in, but NOT a merchant -> redirect to home
            router.push("/");
          }
        } catch (error) {
          console.error("Error checking merchant access:", error);
          router.push("/");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-on-surface border-t-primary-container rounded-full animate-spin mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
          <h2 className="font-headline-md font-black uppercase text-on-surface tracking-widest text-xl">
            Verifying Merchant Access...
          </h2>
        </div>
      </div>
    );
  }

  if (!isMerchant) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-surface">
      {/* Sidebar Navigation for Merchant */}
      <aside className="w-full md:w-64 bg-on-surface text-surface flex flex-col border-b-4 md:border-b-0 md:border-r-4 border-black shrink-0">
        <div className="p-4 md:p-6 border-b-4 border-black border-dashed">
          <h2 className="font-headline-md font-black text-xl md:text-2xl tracking-tight text-primary-container">
            MERCHANT HUB
          </h2>
        </div>
        <nav className="p-2 md:p-4 flex flex-row md:flex-col overflow-x-auto md:space-y-4 font-body-lg font-bold hide-scrollbar">
          <Link href="/merchant" className="flex items-center gap-2 md:gap-3 p-3 hover:bg-surface hover:text-on-surface border-2 border-transparent hover:border-black transition-colors rounded-none shrink-0">
            <LayoutDashboard size={20} className="md:w-6 md:h-6" />
            <span className="text-sm md:text-base">Dashboard</span>
          </Link>
          <Link href="/merchant/products" className="flex items-center gap-2 md:gap-3 p-3 hover:bg-surface hover:text-on-surface border-2 border-transparent hover:border-black transition-colors rounded-none shrink-0">
            <Package size={20} className="md:w-6 md:h-6" />
            <span className="text-sm md:text-base">My Products</span>
          </Link>
          <Link href="/merchant/orders" className="flex items-center gap-2 md:gap-3 p-3 hover:bg-surface hover:text-on-surface border-2 border-transparent hover:border-black transition-colors rounded-none shrink-0">
            <ShoppingCart size={20} className="md:w-6 md:h-6" />
            <span className="text-sm md:text-base">My Orders</span>
          </Link>
          <Link href="/merchant/settings" className="flex items-center gap-2 md:gap-3 p-3 hover:bg-surface hover:text-on-surface border-2 border-transparent hover:border-black transition-colors rounded-none shrink-0">
            <Settings size={20} className="md:w-6 md:h-6" />
            <span className="text-sm md:text-base">Settings</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
