"use client";
import { useToast } from '@/components/providers/ToastProvider';
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { getUserProfile, updateProfile } from "@/lib/api/auth";
import { StoreSettings } from "@/types/schema";
import S3Uploader from "@/components/S3Uploader";

export default function AdminSettings() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<StoreSettings>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setProfile({
            storeName: userProfile.storeName || '',
            storeDescription: userProfile.storeDescription || '',
            contactEmail: userProfile.storeContactEmail || userProfile.email || '',
            contactPhone: userProfile.storeContactPhone || userProfile.phone || '',
            logoUrl: userProfile.logoUrl || '',
            bannerUrl: userProfile.bannerUrl || '',
            socialMediaLinks: userProfile.socialMediaLinks || {}
          });
        }
      } catch (error) {
        console.error("Error fetching store settings:", error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchSettings();
    } else {
      const unsubscribe = auth.onAuthStateChanged((u) => {
        if (u) fetchSettings();
        else setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (['instagram', 'twitter', 'facebook', 'website'].includes(name)) {
      setProfile(prev => ({ 
        ...prev, 
        socialMediaLinks: { ...prev.socialMediaLinks, [name]: value } 
      }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      showToast("You must be logged in.", 'error');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(user.uid, {
        storeName: profile.storeName || "",
        storeDescription: profile.storeDescription || "",
        storeContactEmail: profile.contactEmail || "",
        storeContactPhone: profile.contactPhone || "",
        logoUrl: profile.logoUrl || "",
        bannerUrl: profile.bannerUrl || "",
        socialMediaLinks: profile.socialMediaLinks || {}
      });
      showToast("Business profile updated successfully!", 'success');
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Failed to update profile.", 'error');
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

      <div className="bg-surface border-4 border-on-surface p-8 shadow-[8px_8px_0px_0px_var(--color-on-surface)]">
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

            <div className="space-y-2 md:col-span-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Store Description</label>
              <textarea 
                name="storeDescription"
                value={profile.storeDescription || ""} 
                onChange={handleChange}
                rows={4}
                className="w-full p-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium"
                placeholder="Describe your store..."
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Contact Email</label>
              <input 
                type="email" 
                name="contactEmail"
                value={profile.contactEmail || ""} 
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium"
                placeholder="e.g. hello@store.com"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Contact Phone</label>
              <input 
                type="tel" 
                name="contactPhone"
                value={profile.contactPhone || ""} 
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium"
                placeholder="e.g. +1 (555) 000-0000"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Website URL</label>
              <input type="url" name="website" value={profile.socialMediaLinks?.website || ""} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium" placeholder="https://www.mystore.com" />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Instagram Profile</label>
              <input type="text" name="instagram" value={profile.socialMediaLinks?.instagram || ""} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium" placeholder="@mystore" />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Twitter Profile</label>
              <input type="text" name="twitter" value={profile.socialMediaLinks?.twitter || ""} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium" placeholder="@mystore" />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider block">Facebook Page</label>
              <input type="text" name="facebook" value={profile.socialMediaLinks?.facebook || ""} onChange={handleChange} className="w-full h-12 px-4 border-2 border-on-surface focus:outline-none focus:ring-0 focus:border-primary-container font-medium" placeholder="facebook.com/mystore" />
            </div>

            <div className="md:col-span-2 grid md:grid-cols-2 gap-8 mt-4">
              <div>
                <S3Uploader label="Upload Logo" onUploadSuccess={(url) => setProfile(prev => ({ ...prev, logoUrl: url }))} />
                {profile.logoUrl && (
                  <div className="mt-2">
                    <p className="text-sm font-bold text-primary-container">Logo Uploaded ✓</p>
                    <img src={profile.logoUrl} alt="Store Logo" className="w-16 h-16 object-cover border-2 border-on-surface mt-2" />
                  </div>
                )}
              </div>
              <div>
                <S3Uploader label="Upload Banner" onUploadSuccess={(url) => setProfile(prev => ({ ...prev, bannerUrl: url }))} />
                {profile.bannerUrl && (
                  <div className="mt-2">
                    <p className="text-sm font-bold text-primary-container">Banner Uploaded ✓</p>
                    <img src={profile.bannerUrl} alt="Store Banner" className="w-full h-24 object-cover border-2 border-on-surface mt-2" />
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="pt-6 border-t-2 border-on-surface mt-8">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-primary-container text-on-surface border-4 border-on-surface px-8 py-3 font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Business Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
