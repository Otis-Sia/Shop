"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { applyForMerchantRole } from "@/lib/api/auth";

export default function ApplyMerchant() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      router.push("/login?redirect=/apply-merchant");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const storeName = formData.get("storeName") as string;
    const location = formData.get("location") as string;
    const businessCategory = formData.get("businessCategory") as string;
    const businessType = formData.get("businessType") as string;

    if (!storeName || !location || !businessCategory || !businessType) {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await applyForMerchantRole(user.uid, {
        storeName,
        location,
        businessCategory,
        businessType
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to apply.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface p-8 border-4 border-on-surface shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <h1 className="font-headline-md font-black text-3xl uppercase mb-4 text-primary-container">
            Application Submitted
          </h1>
          <p className="font-body-lg mb-8">
            Your application to become a merchant is pending admin approval. You will be notified once it is reviewed.
          </p>
          <button 
            onClick={() => router.push("/")}
            className="bg-on-surface text-surface w-full py-4 font-bold uppercase hover:bg-primary-container hover:text-on-surface hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-surface p-8 border-4 border-on-surface shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="font-headline-md font-black text-3xl uppercase mb-4 text-center">
          Become a Merchant
        </h1>
        <p className="font-body-lg mb-8 text-center">
          Join our multi-vendor marketplace! Start selling your own products, manage your inventory, and keep 100% of your sales.
        </p>
        
        {error && (
          <div className="bg-error text-onError p-3 mb-6 font-bold border-2 border-on-surface">
            {error}
          </div>
        )}

        <form onSubmit={handleApply} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="storeName" className="font-bold text-xs uppercase tracking-wider block text-on-surface">Store Name</label>
            <input type="text" id="storeName" name="storeName" required className="w-full h-12 px-4 border-2 border-on-surface font-medium" placeholder="e.g., Tech Haven" />
          </div>

          <div className="space-y-2">
            <label htmlFor="location" className="font-bold text-xs uppercase tracking-wider block text-on-surface">Location / Address</label>
            <input type="text" id="location" name="location" required className="w-full h-12 px-4 border-2 border-on-surface font-medium" placeholder="e.g., Nairobi, Kenya" />
          </div>

          <div className="space-y-2">
            <label htmlFor="businessCategory" className="font-bold text-xs uppercase tracking-wider block text-on-surface">Business Category</label>
            <select id="businessCategory" name="businessCategory" required className="w-full h-12 px-4 border-2 border-on-surface font-medium">
              <option value="">Select Category...</option>
              <option value="Electronics">Electronics</option>
              <option value="Apparel">Apparel</option>
              <option value="Home & Garden">Home & Garden</option>
              <option value="Sports">Sports</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="businessType" className="font-bold text-xs uppercase tracking-wider block text-on-surface">Business Type</label>
            <select id="businessType" name="businessType" required className="w-full h-12 px-4 border-2 border-on-surface font-medium">
              <option value="">Select Type...</option>
              <option value="Individual">Individual / Sole Proprietor</option>
              <option value="Company">Registered Company</option>
            </select>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="bg-primary-container text-on-surface w-full py-4 font-bold uppercase border-4 border-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 mt-4"
          >
            {loading ? "Applying..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
