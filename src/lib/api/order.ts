import { clearCart } from './cart';
import { auth } from '@/lib/firebase';
import { Order } from '@/types/schema';

export const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be logged in to create an order");

  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: user.uid,
        items: orderData.items,
        contactInformation: orderData.contactInformation,
        shippingAddress: orderData.shippingAddress,
        shippingInformation: orderData.shippingInformation,
        totalAmount: orderData.totalAmount
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to checkout');
    }

    await clearCart();

    if (data.createdOrders && data.createdOrders.length > 0) {
      return data.createdOrders[0] as Order;
    }

    throw new Error("Order created but no order data returned");
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const getMyOrders = async (): Promise<Order[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/orders?filter=user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return (data.orders || []) as Order[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }
};

export const getMerchantOrders = async (): Promise<Order[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/orders?filter=merchant', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return (data.orders || []) as Order[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching merchant orders:', error);
    return [];
  }
};

export const getAllOrders = async (): Promise<Order[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/orders?filter=all', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return (data.orders || []) as Order[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return [];
  }
};
