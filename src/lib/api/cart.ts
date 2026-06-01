import { getProduct } from './products';
import { Product } from '@/lib/data/products-data';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';

export interface CartItem {
  id: number | string;
  product_id: number | string;
  quantity: number;
  Product?: Product;
}

export interface Cart {
  CartItems: CartItem[];
}

const CART_STORAGE_KEY = 'shop_cart_local';

// LOCAL STORAGE HELPERS
const getLocalCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  const cartJson = localStorage.getItem(CART_STORAGE_KEY);
  return cartJson ? JSON.parse(cartJson) : [];
};

const dispatchCartUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cartUpdated'));
  }
};

const saveLocalCart = (cart: CartItem[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    dispatchCartUpdate(); // trigger UI updates
  }
};

export const getCart = async (): Promise<Cart> => {
  const user = auth.currentUser;
  
  if (!user) {
    const items = getLocalCart();
    // Resolve products for local items to have complete data
    const populatedItems: CartItem[] = [];
    for (const item of items) {
      const product = await getProduct(item.product_id);
      if (product) {
        populatedItems.push({ ...item, Product: product });
      }
    }
    return { CartItems: populatedItems };
  }

  try {
    const cartRef = collection(db, 'users', user.uid, 'cart');
    const snapshot = await getDocs(cartRef);
    const items: CartItem[] = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const product = await getProduct(data.productId);
      if (product) {
        items.push({
          id: docSnap.id,
          product_id: data.productId,
          quantity: data.quantity,
          Product: product
        });
      }
    }
    return { CartItems: items };
  } catch (error) {
    console.error('Error fetching cart from Firestore:', error);
    return { CartItems: [] };
  }
};

export const addToCart = async (productId: number | string, quantity = 1) => {
  const user = auth.currentUser;

  if (!user) {
    const items = getLocalCart();
    const existing = items.find(i => i.product_id == productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ id: Date.now(), product_id: productId, quantity });
    }
    saveLocalCart(items);
    return { message: 'Item added to local cart' };
  }

  try {
    const cartDocRef = doc(db, 'users', user.uid, 'cart', productId.toString());
    const docSnap = await getDoc(cartDocRef);

    if (docSnap.exists()) {
      const existingData = docSnap.data();
      await setDoc(cartDocRef, {
        productId: productId.toString(),
        quantity: existingData.quantity + quantity,
        addedAt: Timestamp.now()
      }, { merge: true });
    } else {
      await setDoc(cartDocRef, {
        productId: productId.toString(),
        quantity: quantity,
        addedAt: Timestamp.now()
      });
    }

    dispatchCartUpdate();
    return { message: 'Item added to cloud cart' };
  } catch (error) {
    console.error('Error adding to cloud cart:', error);
    throw error;
  }
};

export const removeFromCart = async (productId: number | string) => {
  const user = auth.currentUser;
  
  if (!user) {
    let items = getLocalCart();
    items = items.filter(i => i.product_id != productId);
    saveLocalCart(items);
    return { message: 'Item removed from local cart' };
  }

  try {
    await deleteDoc(doc(db, 'users', user.uid, 'cart', productId.toString()));
    dispatchCartUpdate();
    return { message: 'Item removed from cloud cart' };
  } catch (error) {
    console.error('Error removing from cloud cart:', error);
    throw error;
  }
};

export const updateCartItem = async (productId: number | string, quantity: number) => {
  const user = auth.currentUser;
  
  if (!user) {
    const items = getLocalCart();
    const existing = items.find(i => i.product_id == productId);
    if (existing) {
      existing.quantity = quantity;
      saveLocalCart(items);
    }
    return { message: 'Local cart updated' };
  }

  try {
    await setDoc(doc(db, 'users', user.uid, 'cart', productId.toString()), {
      quantity: quantity
    }, { merge: true });
    dispatchCartUpdate();
    return { message: 'Cloud cart updated' };
  } catch (error) {
    console.error('Error updating cloud cart:', error);
    throw error;
  }
};

export const clearCart = async () => {
  const user = auth.currentUser;
  
  if (!user) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CART_STORAGE_KEY);
      window.dispatchEvent(new Event('cartUpdated'));
    }
    return;
  }

  try {
    const cartRef = collection(db, 'users', user.uid, 'cart');
    const snapshot = await getDocs(cartRef);
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
    dispatchCartUpdate();
  } catch (error) {
    console.error('Error clearing cloud cart:', error);
  }
};

export const syncLocalCartToFirestore = async (userId: string) => {
  const localItems = getLocalCart();
  if (localItems.length === 0) return;

  try {
    for (const item of localItems) {
      const cartDocRef = doc(db, 'users', userId, 'cart', item.product_id.toString());
      const docSnap = await getDoc(cartDocRef);

      if (docSnap.exists()) {
        const existingData = docSnap.data();
        await setDoc(cartDocRef, {
          productId: item.product_id.toString(),
          quantity: existingData.quantity + item.quantity,
          updatedAt: Timestamp.now()
        }, { merge: true });
      } else {
        await setDoc(cartDocRef, {
          productId: item.product_id.toString(),
          quantity: item.quantity,
          addedAt: Timestamp.now()
        });
      }
    }
    // Clear local storage after successful sync
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CART_STORAGE_KEY);
      dispatchCartUpdate();
    }
    console.log("Local cart synced to Firestore successfully.");
  } catch (error) {
    console.error("Error syncing local cart to Firestore:", error);
  }
};
