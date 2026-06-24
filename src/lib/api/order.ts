import { clearCart } from './cart';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { Order, OrderStatus, Cart, Checkout } from '@/types/schema';

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
        totalAmount: orderData.totalAmount // Though calculated client side, server recalculates
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to checkout');
    }

    await clearCart();

    // Return the first created order for backward compatibility or the full response
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
    const { getDocs, query, where } = await import('firebase/firestore');
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Order[];
    
    // Sort client-side to avoid composite index requirement
    orders.sort((a, b) => {
      const timeA = a.createdAt ? (a.createdAt as any).seconds || 0 : 0;
      const timeB = b.createdAt ? (b.createdAt as any).seconds || 0 : 0;
      return timeB - timeA;
    });
    
    return orders;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }
};

export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const { getDocs, query, orderBy } = await import('firebase/firestore');
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return [];
  }
};
