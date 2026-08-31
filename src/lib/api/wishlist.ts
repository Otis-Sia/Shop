import { auth } from '@/lib/firebase';
import { getProduct } from './products';
import { Product } from '@/lib/data/products-data';

const WISHLIST_STORAGE_KEY = 'shop_wishlist_local';

// LOCAL STORAGE HELPERS
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
        // Skip deleted product
      }
    }
    return products;
  }

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/wishlist', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return (data.items || []).map((i: any) => i.product).filter(Boolean) as Product[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return [];
  }
};

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
    const token = await user.getIdToken();
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId: id })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add to wishlist');
    }

    dispatchWishlistUpdate();
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
};

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
    const token = await user.getIdToken();
    const res = await fetch(`/api/wishlist?productId=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to remove from wishlist');
    }

    dispatchWishlistUpdate();
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error;
  }
};

export const isInWishlist = async (productId: number | string): Promise<boolean> => {
  const id = productId.toString();
  const user = auth.currentUser;

  if (!user) {
    return getLocalWishlist().includes(id);
  }

  try {
    const wishlist = await getWishlist();
    return wishlist.some(p => p.id.toString() === id);
  } catch (error) {
    console.error('Error checking wishlist:', error);
    return false;
  }
};

export const getWishlistCount = async (): Promise<number> => {
  const user = auth.currentUser;

  if (!user) {
    return getLocalWishlist().length;
  }

  try {
    const wishlist = await getWishlist();
    return wishlist.length;
  } catch (error) {
    console.error('Error getting wishlist count:', error);
    return 0;
  }
};

export const syncLocalWishlistToFirestore = async (userId: string): Promise<void> => {
  return syncLocalWishlistToBackend(userId);
};

export const syncLocalWishlistToBackend = async (userId: string): Promise<void> => {
  const localIds = getLocalWishlist();
  if (localIds.length === 0) return;

  try {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();

    const syncItems = localIds.map(id => ({ productId: id }));
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ syncItems })
    });

    if (res.ok) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(WISHLIST_STORAGE_KEY);
        dispatchWishlistUpdate();
      }
    }
  } catch (error) {
    console.error('Error syncing local wishlist to backend:', error);
  }
};
