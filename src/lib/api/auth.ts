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
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface User {
  uid: string;
  email: string | null;
  first_name?: string;
  last_name?: string;
  username?: string;
  location?: string;
  phone?: string;
  role?: "customer" | "admin" | "merchant";
  merchantStatus?: "pending" | "approved" | "rejected" | "verified";
  storeName?: string;
  businessCategory?: string;
  businessType?: string;
}

export const register = async (userData: { email: string; password: string; first_name: string; last_name: string; role?: 'customer' | 'merchant' }) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const user = userCredential.user;

    const role = userData.role || 'customer';
    const profileData: any = {
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      role: role,
      createdAt: new Date().toISOString()
    };

    if (role === 'merchant') {
      profileData.merchantStatus = 'pending';
    }

    // Store additional profile info in Firestore
    await setDoc(doc(db, 'users', user.uid), profileData);

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
    
    // Fetch profile data
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    let profileData = {};
    if (docSnap.exists()) {
      profileData = docSnap.data();
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

    // Check if user document exists, if not create one
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    let profileData: any = {};
    if (!docSnap.exists()) {
      // Create user profile
      const [firstName = '', lastName = ''] = (user.displayName || '').split(' ');
      profileData = {
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        createdAt: new Date().toISOString()
      };
      await setDoc(docRef, profileData);
    } else {
      profileData = docSnap.data();
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

export const getUserProfile = async (uid: string) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid, ...docSnap.data() } as User;
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    throw new Error('Failed to fetch user profile');
  }
};

export const updateProfile = async (uid: string, data: Partial<User>) => {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, data, { merge: true });
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

export const applyForMerchantRole = async (uid: string, details: { storeName: string; location: string; businessCategory: string; businessType: string }) => {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, { 
      merchantStatus: 'pending',
      ...details
    }, { merge: true });
    return true;
  } catch (error: any) {
    console.error('Error applying for merchant role:', error);
    throw new Error(error.message || 'Failed to apply for merchant role');
  }
};

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error: any) {
    console.error('Error checking email existence:', error);
    throw new Error('Failed to check email');
  }
};
