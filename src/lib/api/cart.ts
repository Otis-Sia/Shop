import { getProduct } from './products';
import { getUserProfile } from './auth';
import { Product } from '@/lib/data/products-data';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { canAddToCartRole } from '@/lib/access';

export interface CartItem {
  id: number | string;
  product_id: number | string;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  selectedVariantIndex?: number;
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
          selectedColor: data.selectedColor,
          selectedSize: data.selectedSize,
          selectedVariantIndex: data.selectedVariantIndex,
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

export const addToCart = async (productId: number | string, quantity = 1, selectedColor?: string, selectedSize?: string, selectedVariantIndex?: number) => {
  const user = auth.currentUser;

  if (user) {
    const profile = await getUserProfile(user.uid);
    if (!canAddToCartRole(profile?.role)) {
      throw new Error('Admins and merchants cannot add products to cart.');
    }
  }

  if (!user) {
    const items = getLocalCart();
    const existing = items.find(i => 
      i.product_id == productId && 
      i.selectedColor == selectedColor && 
      i.selectedSize == selectedSize &&
      i.selectedVariantIndex == selectedVariantIndex
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ id: Date.now(), product_id: productId, quantity, selectedColor, selectedSize, selectedVariantIndex });
    }
    saveLocalCart(items);
    return { message: 'Item added to local cart' };
  }

  try {
    const colorPart = selectedColor ? `_${selectedColor.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    const sizePart = selectedSize ? `_${selectedSize.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    const variantPart = selectedVariantIndex !== undefined && selectedVariantIndex !== null ? `_v${selectedVariantIndex}` : '';
    const cartDocId = `${productId}${colorPart}${sizePart}${variantPart}`;
    const cartDocRef = doc(db, 'users', user.uid, 'cart', cartDocId);
    const docSnap = await getDoc(cartDocRef);

    if (docSnap.exists()) {
      const existingData = docSnap.data();
      await setDoc(cartDocRef, {
        productId: productId.toString(),
        quantity: existingData.quantity + quantity,
        selectedColor: selectedColor || null,
        selectedSize: selectedSize || null,
        selectedVariantIndex: selectedVariantIndex !== undefined ? selectedVariantIndex : null,
        addedAt: Timestamp.now()
      }, { merge: true });
    } else {
      await setDoc(cartDocRef, {
        productId: productId.toString(),
        quantity: quantity,
        selectedColor: selectedColor || null,
        selectedSize: selectedSize || null,
        selectedVariantIndex: selectedVariantIndex !== undefined ? selectedVariantIndex : null,
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

export const removeFromCart = async (cartItemId: number | string) => {
  const user = auth.currentUser;
  
  if (!user) {
    let items = getLocalCart();
    items = items.filter(i => i.id != cartItemId);
    saveLocalCart(items);
    return { message: 'Item removed from local cart' };
  }

  try {
    await deleteDoc(doc(db, 'users', user.uid, 'cart', cartItemId.toString()));
    dispatchCartUpdate();
    return { message: 'Item removed from cloud cart' };
  } catch (error) {
    console.error('Error removing from cloud cart:', error);
    throw error;
  }
};

export const updateCartItem = async (cartItemId: number | string, quantity: number) => {
  const user = auth.currentUser;
  
  if (!user) {
    const items = getLocalCart();
    const existing = items.find(i => i.id == cartItemId);
    if (existing) {
      existing.quantity = quantity;
      saveLocalCart(items);
    }
    return { message: 'Local cart updated' };
  }

  try {
    await setDoc(doc(db, 'users', user.uid, 'cart', cartItemId.toString()), {
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
      const colorPart = item.selectedColor ? `_${item.selectedColor.replace(/[^a-zA-Z0-9]/g, '')}` : '';
      const sizePart = item.selectedSize ? `_${item.selectedSize.replace(/[^a-zA-Z0-9]/g, '')}` : '';
      const variantPart = item.selectedVariantIndex !== undefined && item.selectedVariantIndex !== null ? `_v${item.selectedVariantIndex}` : '';
      const cartDocId = `${item.product_id}${colorPart}${sizePart}${variantPart}`;
      const cartDocRef = doc(db, 'users', userId, 'cart', cartDocId);
      const docSnap = await getDoc(cartDocRef);

      if (docSnap.exists()) {
        const existingData = docSnap.data();
        await setDoc(cartDocRef, {
          productId: item.product_id.toString(),
          quantity: existingData.quantity + item.quantity,
          selectedColor: item.selectedColor || null,
          selectedSize: item.selectedSize || null,
          selectedVariantIndex: item.selectedVariantIndex !== undefined ? item.selectedVariantIndex : null,
          updatedAt: Timestamp.now()
        }, { merge: true });
      } else {
        await setDoc(cartDocRef, {
          productId: item.product_id.toString(),
          quantity: item.quantity,
          selectedColor: item.selectedColor || null,
          selectedSize: item.selectedSize || null,
          selectedVariantIndex: item.selectedVariantIndex !== undefined ? item.selectedVariantIndex : null,
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
