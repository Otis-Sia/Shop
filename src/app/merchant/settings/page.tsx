"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserDocument } from "@/types/schema";

export default function MerchantSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<UserDocument>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserDocument);
        }
      } catch (error) {
        console.error("Error fetching merchant profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchProfile();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchProfile();
      });
      return () => unsubscribe();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        storeName: profile.storeName || "",
        businessCategory: profile.businessCategory || "",
        businessType: profile.businessType || "",
        location: profile.location || "",
        phone: profile.phone || "",
        displayName: profile.displayName || "",
        industry: profile.industry || "",
      });
      alert("Business profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-headline-lg font-black text-4xl mb-8 uppercase border-b-4 border-on-surface inline-block pb-2">
        Business Settings
      </h1>

      <div className="bg-surface border-4 border-on-surface p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Store Name</label>
              <input 
                type="text" 
                name="storeName"
                value={profile.storeName || ""} 
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium"
                placeholder="e.g. Acme Corporation"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Display Name</label>
              <input 
                type="text" 
                name="displayName"
                value={profile.displayName || ""} 
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Business Category</label>
              <input 
                type="text" 
                name="businessCategory"
                value={profile.businessCategory || ""} 
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium"
                placeholder="e.g. Electronics, Fashion"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Business Type</label>
              <input 
                type="text"
                list="business-type-list"
                name="businessType"
                value={profile.businessType || ""} 
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium bg-white"
                placeholder="Select or type a business type"
              />
              <datalist id="business-type-list">
                <option value="Sole Proprietorship" />
                <option value="General Partnership" />
                <option value="Limited Partnership (LP)" />
                <option value="Limited Liability Partnership (LLP)" />
                <option value="Limited Liability Company (LLC)" />
                <option value="C Corporation" />
                <option value="S Corporation" />
                <option value="B Corporation (Benefit Corporation)" />
                <option value="Nonprofit Corporation" />
                <option value="Cooperative (Co-op)" />
                <option value="Joint Venture" />
                <option value="Franchise" />
                <option value="Trust" />
                <option value="Professional Corporation" />
                <option value="Close Corporation" />
                <option value="Series LLC" />
                <option value="Low-Profit Limited Liability Company (L3C)" />
                <option value="Unlimited Company" />
                <option value="Public Limited Company (PLC)" />
                <option value="Private Limited Company (Ltd)" />
                <option value="State-Owned Enterprise (SOE)" />
                <option value="Holding Company" />
                <option value="Subsidiary Company" />
                <option value="Shell Company" />
                <option value="Micro-enterprise" />
                <option value="Small Business" />
                <option value="Startup" />
                <option value="Scale-up" />
                <option value="Family Business" />
                <option value="Home-based Business" />
                <option value="Online Business / E-commerce Business" />
                <option value="Brick-and-Mortar Business" />
                <option value="Dropshipping Business" />
                <option value="Freelancing / Sole Trader" />
                <option value="Gig Economy Business" />
                {profile.businessType && <option value={profile.businessType} />}
              </datalist>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Business Location</label>
              <input 
                type="text" 
                name="location"
                value={profile.location || ""} 
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium"
                placeholder="e.g. 123 Main St, New York"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Contact Phone</label>
              <input 
                type="tel" 
                name="phone"
                value={profile.phone || ""} 
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium"
                placeholder="e.g. +1 (555) 000-0000"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Industry</label>
              <input 
                type="text"
                list="industry-list"
                name="industry"
                value={profile.industry || ""} 
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium bg-white"
                placeholder="Select or type an industry"
              />
              <datalist id="industry-list">
                <option value="Advertising & Marketing" />
                <option value="Aerospace & Defense" />
                <option value="Agriculture & AgTech" />
                <option value="Apparel, Textiles & Luxury Goods" />
                <option value="Automobiles & Components" />
                <option value="Banking" />
                <option value="Biotechnology" />
                <option value="Blockchain & Cryptocurrency" />
                <option value="Broadline Retail" />
                <option value="Capital Markets" />
                <option value="Chemicals" />
                <option value="Commercial & Professional Services" />
                <option value="Communication Services" />
                <option value="Construction & Engineering" />
                <option value="Construction Materials" />
                <option value="Consumer Discretionary" />
                <option value="Consumer Durables" />
                <option value="Consumer Finance & Mortgage REITs" />
                <option value="Consumer Staples" />
                <option value="Education Services" />
                <option value="Electric Utilities" />
                <option value="Electrical Equipment" />
                <option value="Energy" />
                <option value="Environmental & Green Technology" />
                <option value="Financial Technology (FinTech)" />
                <option value="Financials" />
                <option value="Food & Beverage" />
                <option value="Gaming & eSports" />
                <option value="Gas Utilities" />
                <option value="Glass, Packaging & Containers" />
                <option value="Hardware & Equipment" />
                <option value="Health Care" />
                <option value="Health Care Providers & Services" />
                <option value="Health Care Technology" />
                <option value="Hotels, Restaurants & Leisure" />
                <option value="Household & Personal Products" />
                <option value="Industrials" />
                <option value="Insurance" />
                <option value="Interactive Media & Services" />
                <option value="Internet Services" />
                <option value="IT Services" />
                <option value="Legal & Consulting Services" />
                <option value="Life Sciences Tools & Services" />
                <option value="Machinery" />
                <option value="Materials" />
                <option value="Media & Entertainment" />
                <option value="Medical Devices & Equipment" />
                <option value="Metals & Mining" />
                <option value="Oil & Gas Equipment & Services" />
                <option value="Oil & Gas Exploration & Production" />
                <option value="Paper & Forest Products" />
                <option value="Pharmaceuticals" />
                <option value="Real Estate" />
                <option value="Real Estate Investment Trusts (REITs)" />
                <option value="Real Estate Management & Development" />
                <option value="Refining & Marketing" />
                <option value="Renewable & Independent Power Producers" />
                <option value="Renewable Energy Equipment & Generation" />
                <option value="Retail – Food & Drug" />
                <option value="Semiconductors" />
                <option value="Software & Services" />
                <option value="Space & Satellite Industry" />
                <option value="Specialty Retail" />
                <option value="Technology" />
                <option value="Telecommunications" />
                <option value="Transportation & Logistics" />
                <option value="Transportation & Mobility" />
                <option value="Utilities" />
                <option value="Water Utilities" />
                {profile.industry && <option value={profile.industry} />}
              </datalist>
            </div>

          </div>

          <div className="pt-6 border-t-2 border-on-surface mt-8">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-primary-container text-on-surface border-4 border-on-surface px-8 py-3 font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Business Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
