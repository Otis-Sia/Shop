import { clearCart } from './cart';
import { auth } from '@/lib/firebase';
import { Order } from '@/types/schema';

export interface CreateOrderResult extends Order {
  redirectUrl?: string | null;
  checkoutId?: string;
}

export const createOrder = async (
  orderData: Partial<Order> & { paymentMethod?: string }
): Promise<CreateOrderResult> => {
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
        totalAmount: orderData.totalAmount,
        paymentMethod: orderData.paymentMethod || 'pesapal'
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to checkout');
    }

    if (data.createdOrders && data.createdOrders.length > 0) {
      const order = data.createdOrders[0] as CreateOrderResult;
      order.redirectUrl = data.redirectUrl || null;
      order.checkoutId = data.checkoutId;
      return order;
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
