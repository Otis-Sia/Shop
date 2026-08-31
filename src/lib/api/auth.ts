import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../firebase';

export interface User {
  uid: string;
  email: string | null;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  username?: string;
  location?: string;
  phone?: string;
  role?: "customer" | "admin" | "merchant";
  merchantStatus?: "pending" | "approved" | "rejected" | "verified";
  storeName?: string;
  storeDescription?: string;
  businessCategories?: string[];
  businessType?: string;
  offeringType?: 'goods' | 'services' | 'both';
  industry?: string;
  storeContactEmail?: string;
  storeContactPhone?: string;
  socialMediaLinks?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    website?: string;
  };
  logoUrl?: string;
  bannerUrl?: string;
  onboardingComplete?: boolean;
}

export const register = async (userData: { email: string; password: string; first_name: string; last_name: string; role?: 'customer' | 'merchant'; phone?: string }) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const user = userCredential.user;
    const token = await user.getIdToken();

    const role = userData.role || 'customer';
    const profileData: any = {
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      role: role,
      phone: userData.phone || ''
    };

    if (role === 'merchant') {
      profileData.merchantStatus = 'pending';
    }

    // Save profile to Supabase via server API
    await fetch('/api/users/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });

    return {
      uid: user.uid,
      email: user.email,
      ...profileData
    };
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const login = async (credentials: { email: string; password: string }) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    const user = userCredential.user;
    const token = await user.getIdToken();
    
    // Fetch profile data from Supabase
    let profileData: any = {};
    try {
      const res = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        profileData = json.user || {};
      }
    } catch (profileErr) {
      console.warn('Could not fetch Supabase profile upon login:', profileErr);
    }

    return {
      uid: user.uid,
      email: user.email,
      ...profileData
    };
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
};

export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const token = await user.getIdToken();

    // Check / create profile in Supabase
    let profileData: any = {};
    const res = await fetch('/api/users/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const json = await res.json();
      if (json.user) {
        profileData = json.user;
      } else {
        const [firstName = '', lastName = ''] = (user.displayName || '').split(' ');
        const newProfile = {
          first_name: firstName,
          last_name: lastName,
          email: user.email
        };
        const postRes = await fetch('/api/users/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newProfile)
        });
        if (postRes.ok) {
          const postJson = await postRes.json();
          profileData = postJson.user || newProfile;
        }
      }
    }

    return {
      uid: user.uid,
      email: user.email,
      ...profileData
    };
  } catch (error: any) {
    throw new Error(error.message || 'Google login failed');
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    window.location.href = '/';
  } catch (error: any) {
    console.error('Logout error:', error);
  }
};

export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/users/profile?uid=${encodeURIComponent(uid)}`, { headers });
    if (res.ok) {
      const json = await res.json();
      return json.user as User;
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const updateProfile = async (uid: string, data: Partial<User>) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();

    const res = await fetch('/api/users/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || 'Failed to update profile');
    }

    return true;
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    throw new Error(error.message || 'Failed to update profile');
  }
};

export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    const code = error.code;
    let message = 'Failed to send password reset email.';
    if (code === 'auth/user-not-found') {
      message = 'No account found with this email address.';
    } else if (code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    } else if (code === 'auth/too-many-requests') {
      message = 'Too many attempts. Please try again later.';
    }
    throw new Error(message);
  }
};

export const applyForMerchantRole = async (
  uid: string, 
  details: { 
    storeName: string; 
    location: string; 
    businessCategories: string[]; 
    businessType: string;
    storeDescription?: string;
    offeringType?: 'goods' | 'services' | 'both';
    storeContactEmail?: string;
    storeContactPhone?: string;
    socialMediaLinks?: {
      instagram?: string;
      twitter?: string;
      facebook?: string;
      website?: string;
    };
    logoUrl?: string;
    bannerUrl?: string;
  }
) => {
  try {
    return await updateProfile(uid, {
      merchantStatus: 'approved',
      onboardingComplete: true,
      ...details
    });
  } catch (error: any) {
    console.error('Error applying for merchant role:', error);
    throw new Error(error.message || 'Failed to apply for merchant role');
  }
};

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Server returned HTML/Text instead of JSON. Status: ${response.status}. Body: ${text.substring(0, 150)}...`);
    }

    if (!response.ok) {
      throw new Error(data.details || data.error || 'Server error checking email');
    }

    return !!data.exists;
  } catch (error: any) {
    console.error('Error checking email existence:', error);
    throw new Error(error.message || 'Failed to check email');
  }
};
