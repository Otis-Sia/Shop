"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { applyForMerchantRole } from "@/lib/api/auth";
import S3Uploader from "@/components/S3Uploader";

export default function ApplyMerchant() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [formData, setFormData] = useState({
    storeName: "",
    location: "",
    storeDescription: "",
    logoUrl: "",
    bannerUrl: "",
    businessCategories: [] as string[],
    businessType: "",
    offeringType: "goods",
    storeContactEmail: "",
    storeContactPhone: "",
    instagram: "",
    twitter: "",
    facebook: "",
    website: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login?redirect=/apply-merchant");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.onboardingComplete) {
            router.push("/merchant");
            return;
          }
          setFormData((prev) => ({
            ...prev,
            storeName: data.storeName || "",
            location: data.location || "",
            storeDescription: data.storeDescription || "",
            logoUrl: data.logoUrl || "",
            bannerUrl: data.bannerUrl || "",
            businessCategories: data.businessCategories || (data.businessCategory ? [data.businessCategory] : []),
            businessType: data.businessType || "",
            offeringType: data.offeringType || "goods",
            storeContactEmail: data.storeContactEmail || "",
            storeContactPhone: data.storeContactPhone || "",
            instagram: data.socialMediaLinks?.instagram || "",
            twitter: data.socialMediaLinks?.twitter || "",
            facebook: data.socialMediaLinks?.facebook || "",
            website: data.socialMediaLinks?.website || "",
          }));
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setFetching(false);
      }
    };

    if (auth.currentUser) {
      fetchProfile();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchProfile();
        else router.push("/login?redirect=/apply-merchant");
      });
      return () => unsubscribe();
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    if (!formData.storeName || !formData.location || formData.businessCategories.length === 0 || !formData.businessType) {
      setError("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await applyForMerchantRole(user.uid, {
        storeName: formData.storeName,
        location: formData.location,
        storeDescription: formData.storeDescription,
        businessCategories: formData.businessCategories,
        businessType: formData.businessType,
        offeringType: formData.offeringType as any,
        storeContactEmail: formData.storeContactEmail,
        storeContactPhone: formData.storeContactPhone,
        logoUrl: formData.logoUrl,
        bannerUrl: formData.bannerUrl,
        socialMediaLinks: {
          instagram: formData.instagram,
          twitter: formData.twitter,
          facebook: formData.facebook,
          website: formData.website,
        },
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to apply.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-on-surface border-t-primary-container rounded-full animate-spin"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface p-8 border-4 border-on-surface shadow-[8px_8px_0px_0px_var(--color-on-surface)] text-center">
          <h1 className="font-headline-md font-black text-3xl uppercase mb-4 text-primary-container">
            Profile Completed
          </h1>
          <p className="font-body-lg mb-8 font-medium">
            Your merchant profile has been successfully updated! You can now access your dashboard and start adding products.
          </p>
          <button
            onClick={() => router.push("/merchant")}
            className="bg-on-surface text-surface w-full py-4 font-black tracking-widest uppercase hover:bg-primary-container hover:text-on-surface hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-on-surface)] transition-all"
          >
            Go To Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-12 px-4 flex justify-center items-start">
      <div className="max-w-2xl w-full bg-surface p-8 border-4 border-on-surface shadow-[8px_8px_0px_0px_var(--color-on-surface)]">
        <h1 className="font-headline-lg font-black text-4xl uppercase mb-2 text-center text-on-surface">
          Merchant Onboarding
        </h1>
        <p className="font-body-lg mb-8 text-center text-on-surface/80 font-bold">
          Step {step} of 3
        </p>

        {error && (
          <div className="bg-error-container text-error p-4 mb-6 font-bold border-2 border-error">
            {error}
          </div>
        )}

        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
          {/* STEP 1: STORE BASICS */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="font-headline-md font-black text-2xl uppercase border-b-2 border-on-surface pb-2">1. Store Basics</h2>
              
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Store Name *</label>
                <input type="text" name="storeName" required value={formData.storeName} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="e.g., Tech Haven" />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Location / Address *</label>
                <input type="text" name="location" required value={formData.location} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="e.g., Nairobi, Kenya" />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Store Description</label>
                <textarea name="storeDescription" value={formData.storeDescription} onChange={handleChange} rows={4} className="w-full p-4 border-2 border-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="Tell customers what your store is about..."></textarea>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <S3Uploader label="Upload Logo" onUploadSuccess={(url) => setFormData({ ...formData, logoUrl: url })} />
                  {formData.logoUrl && <p className="text-sm font-bold text-primary-container mt-2">Logo Uploaded ✓</p>}
                </div>
                <div>
                  <S3Uploader label="Upload Banner" onUploadSuccess={(url) => setFormData({ ...formData, bannerUrl: url })} />
                  {formData.bannerUrl && <p className="text-sm font-bold text-primary-container mt-2">Banner Uploaded ✓</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BUSINESS DETAILS */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="font-headline-md font-black text-2xl uppercase border-b-2 border-on-surface pb-2">2. Business Details</h2>
              
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Business Categories (comma separated) *</label>
                <input 
                  type="text"
                  name="businessCategories" 
                  required 
                  value={formData.businessCategories.join(', ')} 
                  onChange={(e) => setFormData({ ...formData, businessCategories: e.target.value.split(',').map(c => c.trim()).filter(Boolean) })} 
                  className="w-full h-12 px-4 border-2 border-on-surface font-medium bg-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                  placeholder="e.g. Electronics, Apparel"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Business Type *</label>
                <select name="businessType" required value={formData.businessType} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface font-medium bg-surface focus:outline-none focus:ring-2 focus:ring-primary-container">
                  <option value="">Select Type...</option>
                  <option value="Individual">Individual / Sole Proprietor</option>
                  <option value="Company">Registered Company</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Offering Type *</label>
                <select name="offeringType" required value={formData.offeringType} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface font-medium bg-surface focus:outline-none focus:ring-2 focus:ring-primary-container">
                  <option value="goods">Goods (Physical Products)</option>
                  <option value="services">Services</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: CONTACT & SOCIALS */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="font-headline-md font-black text-2xl uppercase border-b-2 border-on-surface pb-2">3. Contact & Socials</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Support Email</label>
                  <input type="email" name="storeContactEmail" value={formData.storeContactEmail} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="support@store.com" />
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Support Phone</label>
                  <input type="tel" name="storeContactPhone" value={formData.storeContactPhone} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="+1 234 567 890" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Website URL</label>
                <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="https://www.mystore.com" />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Instagram Profile</label>
                <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="@mystore" />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Twitter Profile</label>
                <input type="text" name="twitter" value={formData.twitter} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="@mystore" />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-on-surface">Facebook Page</label>
                <input type="text" name="facebook" value={formData.facebook} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="facebook.com/mystore" />
              </div>
            </div>
          )}

          {/* NAVIGATION BUTTONS */}
          <div className="flex gap-4 pt-4 border-t-2 border-on-surface/20 mt-8">
            {step > 1 && (
              <button 
                type="button" 
                onClick={prevStep}
                className="flex-1 bg-surface-container text-on-surface py-4 font-black uppercase tracking-widest border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button 
                type="submit"
                className="flex-[2] bg-primary-container text-on-surface py-4 font-black uppercase tracking-widest border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all"
              >
                Next Step
              </button>
            ) : (
              <button 
                type="submit"
                disabled={loading}
                className="flex-[2] bg-on-surface text-surface py-4 font-black uppercase tracking-widest hover:bg-primary-container hover:text-on-surface disabled:opacity-50 transition-all shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
              >
                {loading ? "Saving..." : "Complete Setup"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
