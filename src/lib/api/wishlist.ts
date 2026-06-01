import { auth, db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { getProduct } from './products';
import { Product } from '@/lib/data/products-data';

const WISHLIST_STORAGE_KEY = 'shop_wishlist_local';

// ── LOCAL STORAGE HELPERS ──────────────────────────────────────────

const getLocalWishlist = (): string[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(WISHLIST_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalWishlist = (ids: string[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
    dispatchWishlistUpdate();
  }
};

const dispatchWishlistUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('wishlistUpdated'));
  }
};

// ── PUBLIC API ─────────────────────────────────────────────────────

/**
 * Get all wishlisted products, resolved with full Product data.
 */
export const getWishlist = async (): Promise<Product[]> => {
  const user = auth.currentUser;

  if (!user) {
    const ids = getLocalWishlist();
    const products: Product[] = [];
    for (const id of ids) {
      try {
        const product = await getProduct(id);
        if (product) products.push(product);
      } catch {
        // Product may have been deleted — skip silently
      }
    }
    return products;
  }

  try {
    const wishlistRef = collection(db, 'users', user.uid, 'wishlist');
    const snapshot = await getDocs(wishlistRef);
    const products: Product[] = [];

    for (const docSnap of snapshot.docs) {
      try {
        const data = docSnap.data();
        const product = await getProduct(data.productId);
        if (product) products.push(product);
      } catch {
        // Product may have been deleted — skip silently
      }
    }
    return products;
  } catch (error) {
    console.error('Error fetching wishlist from Firestore:', error);
    return [];
  }
};

/**
 * Add a product to the wishlist.
 */
export const addToWishlist = async (productId: number | string): Promise<void> => {
  const id = productId.toString();
  const user = auth.currentUser;

  if (!user) {
    const ids = getLocalWishlist();
    if (!ids.includes(id)) {
      ids.push(id);
      saveLocalWishlist(ids);
    }
    return;
  }

  try {
    const wishlistDocRef = doc(db, 'users', user.uid, 'wishlist', id);
    await setDoc(wishlistDocRef, {
      productId: id,
      addedAt: Timestamp.now(),
    });
    dispatchWishlistUpdate();
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
};

/**
 * Remove a product from the wishlist.
 */
export const removeFromWishlist = async (productId: number | string): Promise<void> => {
  const id = productId.toString();
  const user = auth.currentUser;

  if (!user) {
    let ids = getLocalWishlist();
    ids = ids.filter(i => i !== id);
    saveLocalWishlist(ids);
    return;
  }

  try {
    await deleteDoc(doc(db, 'users', user.uid, 'wishlist', id));
    dispatchWishlistUpdate();
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error;
  }
};

/**
 * Check whether a product is currently in the wishlist.
 */
export const isInWishlist = async (productId: number | string): Promise<boolean> => {
  const id = productId.toString();
  const user = auth.currentUser;

  if (!user) {
    return getLocalWishlist().includes(id);
  }

  try {
    const wishlistDocRef = doc(db, 'users', user.uid, 'wishlist', id);
    const docSnap = await getDoc(wishlistDocRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking wishlist:', error);
    return false;
  }
};

/**
 * Get total count of wishlisted items.
 */
export const getWishlistCount = async (): Promise<number> => {
  const user = auth.currentUser;

  if (!user) {
    return getLocalWishlist().length;
  }

  try {
    const wishlistRef = collection(db, 'users', user.uid, 'wishlist');
    const snapshot = await getDocs(wishlistRef);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting wishlist count:', error);
    return 0;
  }
};

/**
 * Sync local wishlist to Firestore after login.
 */
export const syncLocalWishlistToFirestore = async (userId: string): Promise<void> => {
  const localIds = getLocalWishlist();
  if (localIds.length === 0) return;

  try {
    for (const id of localIds) {
      const wishlistDocRef = doc(db, 'users', userId, 'wishlist', id);
      const docSnap = await getDoc(wishlistDocRef);

      if (!docSnap.exists()) {
        await setDoc(wishlistDocRef, {
          productId: id,
          addedAt: Timestamp.now(),
        });
      }
    }
    // Clear local storage after successful sync
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
      dispatchWishlistUpdate();
    }
    console.log('Local wishlist synced to Firestore successfully.');
  } catch (error) {
    console.error('Error syncing local wishlist to Firestore:', error);
  }
};
