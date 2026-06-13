"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function OnboardingPopup() {
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.role === "merchant" && !data.onboardingComplete) {
            setNeedsOnboarding(true);
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      checkOnboarding();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) checkOnboarding();
        else setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  if (loading || !needsOnboarding) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-surface border-4 border-on-surface shadow-[8px_8px_0px_0px_var(--color-on-surface)] p-8 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <svg className="w-8 h-8 text-on-surface" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="font-headline-md font-black text-2xl uppercase tracking-tight mb-4 text-on-surface">
          Action Required
        </h2>
        <p className="font-body-md text-on-surface/80 mb-8 font-medium">
          Welcome to your Merchant Dashboard! Before you can start adding products and accepting orders, you need to complete your store profile.
        </p>
        <Link 
          href="/apply-merchant"
          className="inline-block w-full bg-primary-container text-on-surface py-4 font-black uppercase tracking-widest border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all"
        >
          Complete Profile
        </Link>
      </div>
    </div>
  );
}
