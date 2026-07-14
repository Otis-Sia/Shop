import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, items, contactInformation, shippingAddress, shippingInformation, totalAmount } = body;
    // Server-Side Session Validation
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      const adminAuth = getAdminAuth();
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (authError) {
      console.error('Invalid token:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Override the provided userId with the securely decoded UID
    const secureUserId = decodedToken.uid;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required checkout information' }, { status: 400 });
    }
    // Reference to the Firestore db
    const db = getAdminDb();

    // Use a Firestore Transaction to ensure stock is only deducted if available
    const result = await db.runTransaction(async (transaction: any) => {
      // 1. Fetch all requested products and verify prices/stock
      const productRefs = items.map(item => db.collection('products').doc(item.productId));
      const productDocs = await transaction.getAll(...productRefs);

      let calculatedTotal = 0;
      const itemsByMerchant: Record<string, any[]> = {};

      // 2. Validate stock and calculate prices
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const productDoc = productDocs[i];

        if (!productDoc.exists) {
          throw new Error(`Product ${item.productId} not found.`);
        }

        const productData = productDoc.data()!;
        
        if (productData.stock !== undefined && productData.stock !== null) {
          if (productData.stock < item.quantity) {
            throw new Error(`Insufficient stock for product ${productData.name}. Available: ${productData.stock}`);
          }
          // Decrement stock
          transaction.update(productDoc.ref, {
            stock: FieldValue.increment(-item.quantity)
          });
        }

        // Calculate real price
        const price = productData.price;
        calculatedTotal += price * item.quantity;

        // Populate items by merchant
        const mId = productData.merchantId || 'admin';
        if (!itemsByMerchant[mId]) itemsByMerchant[mId] = [];
        
        itemsByMerchant[mId].push({
          ...item,
          price: price, // override client price
          name: productData.name, // optionally store name
        });
      }

      // We optionally compare calculatedTotal with the client's totalAmount just for logging, 
      // but we always trust calculatedTotal.
      
      // 3. Create Cart
      const cartRef = db.collection('carts').doc();
      const cartData = {
        userId: secureUserId,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, addedAt: FieldValue.serverTimestamp() })),
        totalAmount: calculatedTotal,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.set(cartRef, cartData);

      // 4. Create Checkout
      const checkoutRef = db.collection('checkouts').doc();
      const checkoutData = {
        userId: secureUserId,
        cartId: cartRef.id,
        contactInformation: contactInformation || null,
        shippingAddress: shippingAddress || null,
        shippingInformation: shippingInformation || null,
        status: 'completed',
        totalAmount: calculatedTotal,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.set(checkoutRef, checkoutData);

      // 5. Create Orders for each merchant
      let firstOrderId = '';
      const createdOrders = [];

      for (const merchantId in itemsByMerchant) {
        const mItems = itemsByMerchant[merchantId];
        const mTotal = mItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const orderRef = db.collection('orders').doc();
        const orderData = {
          userId: secureUserId,
          merchantId,
          cartId: cartRef.id,
          checkoutId: checkoutRef.id,
          status: 'pending',
          totalAmount: mTotal,
          contactInformation: contactInformation || null,
          shippingAddress: shippingAddress || { street: '', city: '', zipCode: '', country: '' },
          shippingInformation: shippingInformation || null,
          items: mItems,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        transaction.set(orderRef, orderData);
        if (!firstOrderId) {
          firstOrderId = orderRef.id;
        }
        createdOrders.push({ id: orderRef.id, ...orderData });
      }

      return {
        success: true,
        firstOrderId,
        createdOrders
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Checkout error:', error);
    // Return appropriate error based on message
    if (error.message && error.message.includes('Insufficient stock')) {
      return NextResponse.json({ error: error.message }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
