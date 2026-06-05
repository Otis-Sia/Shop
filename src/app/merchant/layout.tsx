"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { Package, ShoppingCart, LayoutDashboard } from "lucide-react";

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
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar Navigation for Merchant */}
      <aside className="w-64 bg-on-surface text-surface flex flex-col border-r-4 border-black">
        <div className="p-6 border-b-4 border-black border-dashed">
          <h2 className="font-headline-md font-black text-2xl tracking-tight text-primary-container">
            MERCHANT HUB
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-4 font-body-lg font-bold">
          <Link href="/merchant" className="flex items-center gap-3 p-3 hover:bg-surface hover:text-on-surface border-2 border-transparent hover:border-black transition-colors rounded-none">
            <LayoutDashboard size={24} />
            Dashboard
          </Link>
          <Link href="/merchant/products" className="flex items-center gap-3 p-3 hover:bg-surface hover:text-on-surface border-2 border-transparent hover:border-black transition-colors rounded-none">
            <Package size={24} />
            My Products
          </Link>
          <Link href="/merchant/orders" className="flex items-center gap-3 p-3 hover:bg-surface hover:text-on-surface border-2 border-transparent hover:border-black transition-colors rounded-none">
            <ShoppingCart size={24} />
            My Orders
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
