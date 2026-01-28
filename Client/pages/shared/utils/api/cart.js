import { getProduct } from './products.js';

const CART_STORAGE_KEY = 'shop_cart';

// Helper to get raw cart array
const getLocalCart = () => {
  const cartJson = localStorage.getItem(CART_STORAGE_KEY);
  return cartJson ? JSON.parse(cartJson) : [];
};

// Helper to save raw cart array
const saveLocalCart = (cart) => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
};

export const getCart = async () => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const items = getLocalCart();
    
    // Return structure matching what the frontend expects { CartItems: [...] }
    // simulating a backend response including populated Product objects
    return {
      CartItems: items
    };
  } catch (error) {
    console.error('Error fetching cart:', error);
    return { CartItems: [] };
  }
};

export const addToCart = async (productId, quantity = 1) => {
  try {
    const items = getLocalCart();
    const existingItem = items.find(item => item.product_id == productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      // Fetch product details to store locally since we don't have a backend join
      const product = await getProduct(productId);
      if (!product) throw new Error('Product not found');
      
      items.push({
        id: Date.now(), // Generate a mock cart item ID
        product_id: productId,
        quantity: quantity,
        Product: product // Store full product object for display
      });
    }
    
    saveLocalCart(items);
    
    // Simulate API response
    return { message: 'Item added to cart', cartSize: items.length };
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
};

export const removeFromCart = async (productId) => {
  try {
    let items = getLocalCart();
    items = items.filter(item => item.product_id != productId);
    saveLocalCart(items);
    return { message: 'Item removed from cart' };
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw error;
  }
};

export const updateCartItem = async (productId, quantity) => {
  try {
    const items = getLocalCart();
    const item = items.find(item => item.product_id == productId);
    
    if (item) {
      item.quantity = quantity;
      saveLocalCart(items);
    }
    
    return { message: 'Cart updated' };
  } catch (error) {
    console.error('Error updating cart:', error);
    throw error;
  }
};

export const clearCart = () => {
  localStorage.removeItem(CART_STORAGE_KEY);
};
