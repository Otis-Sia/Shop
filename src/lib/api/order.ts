import { clearCart } from './cart';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { Order, OrderStatus, Cart, Checkout } from '@/types/schema';

export const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be logged in to create an order");

  try {
    // 1. Create Cart document
    const cartItems = orderData.items?.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      addedAt: Timestamp.now()
    })) || [];

    const newCart: Cart = {
      userId: user.uid,
      items: cartItems,
      totalAmount: orderData.totalAmount || 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const cartDocRef = await addDoc(collection(db, 'carts'), newCart);

    // 2. Create Checkout document
    const newCheckout: Checkout = {
      userId: user.uid,
      cartId: cartDocRef.id,
      contactInformation: orderData.contactInformation,
      shippingAddress: orderData.shippingAddress,
      shippingInformation: orderData.shippingInformation,
      status: 'completed',
      totalAmount: orderData.totalAmount || 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const checkoutDocRef = await addDoc(collection(db, 'checkouts'), newCheckout);

    // Group items by merchantId
    const itemsByMerchant: Record<string, any[]> = {};
    for (const item of orderData.items || []) {
      const mId = (item as any).merchantId || 'admin';
      if (!itemsByMerchant[mId]) itemsByMerchant[mId] = [];
      itemsByMerchant[mId].push(item);
    }

    // 3. Create Order documents for each merchant
    let firstOrder: Order | null = null;
    let firstOrderId = '';

    for (const merchantId in itemsByMerchant) {
      const mItems = itemsByMerchant[merchantId];
      const mTotal = mItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const newOrder: Order = {
        userId: user.uid,
        merchantId: merchantId,
        cartId: cartDocRef.id,
        checkoutId: checkoutDocRef.id,
        status: 'pending' as OrderStatus,
        totalAmount: mTotal,
        contactInformation: orderData.contactInformation,
        shippingAddress: orderData.shippingAddress || {
          street: '', city: '', zipCode: '', country: ''
        },
        shippingInformation: orderData.shippingInformation,
        items: mItems,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const orderDocRef = await addDoc(collection(db, 'orders'), newOrder);
      if (!firstOrder) {
        firstOrder = newOrder;
        firstOrderId = orderDocRef.id;
      }
    }
    
    // 4. Update Product Stock
    if (orderData.items && orderData.items.length > 0) {
      await Promise.all(orderData.items.map(async (item) => {
        if (item.productId) {
          const productRef = doc(db, 'products', item.productId);
          await updateDoc(productRef, {
            stock: increment(-item.quantity)
          }).catch(err => {
            console.error(`Failed to update stock for product ${item.productId}:`, err);
          });
        }
      }));
    }

    await clearCart();

    if (!firstOrder) throw new Error("Failed to create order");

    return {
      ...firstOrder,
      id: firstOrderId,
    };
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
