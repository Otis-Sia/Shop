'use client';

import { useState, useEffect } from 'react';
import { getUserProfile, updateProfile, User } from '@/lib/api/auth';
import Icon from '@/components/Icon';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAuth: { uid: string } | null;
}

export default function ProfileModal({ isOpen, onClose, userAuth }: ProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    location: '',
    phone: ''
  });

  useEffect(() => {
    if (isOpen && userAuth) {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const fetchProfile = async () => {
        try {
          const profile = await getUserProfile(userAuth.uid);
          if (profile) {
            setUser(profile);
            setFormData({
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              username: profile.username || '',
              location: profile.location || '',
              phone: profile.phone || ''
            });
          }
        } catch (err) {
          console.error("Failed to load profile", err);
          setError("Failed to load profile data.");
        } finally {
          setLoading(false);
        }
      };
      
      fetchProfile();
    }
  }, [isOpen, userAuth]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile(user.uid, formData);
      setSuccess('Profile updated successfully!');
      setUser(prev => prev ? { ...prev, ...formData } : null);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to update profile.');
      } else {
        setError('Failed to update profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface border-2 border-on-surface/10 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b-2 border-on-surface/10 flex justify-between items-center bg-surface sticky top-0 z-10">
          <h2 className="text-2xl font-black font-headline-md text-on-surface tracking-tight">Edit Profile</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
            aria-label="Close"
          >
            <Icon name="close" className="text-on-surface" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-on-surface/20 border-t-on-surface rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-error/10 border-l-4 border-error text-error text-sm font-semibold flex items-center gap-3">
                  <Icon name="error" />
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-6 p-4 bg-primary-container/10 border-l-4 border-primary-container text-primary-container text-sm font-semibold flex items-center gap-3">
                  <Icon name="check_circle" />
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider" htmlFor="first_name">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="w-full bg-surface border-2 border-on-surface/20 rounded-none px-3 py-2 text-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider" htmlFor="last_name">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="w-full bg-surface border-2 border-on-surface/20 rounded-none px-3 py-2 text-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider" htmlFor="username">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40 font-bold text-sm">@</span>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full bg-surface border-2 border-on-surface/20 rounded-none pl-8 pr-3 py-2 text-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider" htmlFor="location">
                    Location
                  </label>
                  <div className="relative">
                    <Icon name="location_on" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40 text-base" />
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full bg-surface border-2 border-on-surface/20 rounded-none pl-9 pr-3 py-2 text-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider" htmlFor="phone">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Icon name="phone" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40 text-base" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-surface border-2 border-on-surface/20 rounded-none pl-9 pr-3 py-2 text-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 font-bold text-sm text-on-surface border-2 border-transparent hover:border-on-surface/20 transition-colors uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-on-surface text-surface px-6 py-2.5 font-black uppercase tracking-widest text-sm hover:bg-primary-container transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
