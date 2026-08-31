import { getProduct } from './products';
import { getUserProfile } from './auth';
import { Product } from '@/lib/data/products-data';
import { auth } from '@/lib/firebase';
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
    const token = await user.getIdToken();
    const res = await fetch('/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return { CartItems: data.CartItems || [] };
    }
    return { CartItems: [] };
  } catch (error) {
    console.error('Error fetching cart from backend:', error);
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
    const token = await user.getIdToken();
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId,
        quantity,
        selectedColor,
        selectedSize,
        selectedVariantIndex
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to add item to cart');
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
    const token = await user.getIdToken();
    const res = await fetch(`/api/cart?id=${encodeURIComponent(cartItemId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to remove item');
    }

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
    const token = await user.getIdToken();
    const res = await fetch('/api/cart', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: cartItemId,
        quantity
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to update item');
    }

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
    const token = await user.getIdToken();
    await fetch('/api/cart?clear=true', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    dispatchCartUpdate();
  } catch (error) {
    console.error('Error clearing cloud cart:', error);
  }
};

export const syncLocalCartToFirestore = async (userId: string) => {
  return syncLocalCartToBackend(userId);
};

export const syncLocalCartToBackend = async (userId: string) => {
  const localItems = getLocalCart();
  if (localItems.length === 0) return;

  try {
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    const syncItems = localItems.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
      selectedVariantIndex: item.selectedVariantIndex
    }));

    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ syncItems })
    });

    if (res.ok) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CART_STORAGE_KEY);
        dispatchCartUpdate();
      }
    }
  } catch (error) {
    console.error("Error syncing local cart to backend:", error);
  }
};
