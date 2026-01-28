import { clearCart } from './cart.js';

export const createOrder = async (orderData) => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate a mock order ID
    const orderId = 'ORD-' + Date.now().toString().slice(-6);
    
    // In a real app, we would send orderData to the backend here
    console.log('Order created:', { id: orderId, ...orderData });
    
    // Clear the cart after successful order placement
    clearCart();
    
    return { 
      id: orderId,
      status: 'success',
      message: 'Order placed successfully'
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const getMyOrders = async () => {
  // Return empty list for now as we don't persist orders in this demo
  return [];
};
