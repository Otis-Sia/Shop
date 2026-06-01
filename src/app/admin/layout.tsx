"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in -> redirect to auth screen
        router.push("/login?redirect=/admin");
      } else {
        // Check if the user has the 'admin' role in Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data()?.role === "admin") {
            setIsAdmin(true);
          } else {
            // Logged in, but NOT an admin -> redirect to home
            router.push("/");
          }
        } catch (error) {
          console.error("Error checking admin access:", error);
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
            Verifying Access Controls...
          </h2>
        </div>
      </div>
    );
  }

  // If not admin and not loading, we render nothing because the router will handle redirecting.
  if (!isAdmin) {
    return null;
  }

  // If verified as admin, render the admin dashboard.
  return <>{children}</>;
}
