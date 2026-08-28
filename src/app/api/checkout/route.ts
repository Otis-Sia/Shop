import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { firestoreCommit, firestoreRest } from '@/lib/firestore-rest';

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
      decodedToken = await verifyIdToken(token);
    } catch (authError) {
      console.error('Invalid token:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Override the provided userId with the securely decoded UID
    const secureUserId = decodedToken.sub; // For Firebase, sub is the uid

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required checkout information' }, { status: 400 });
    }

    // We can't do a full cross-collection transaction easily with REST without complex logic.
    // We'll read all documents, verify stock, and then use a commit batch for atomicity.
    
    // 1. Fetch all requested products and verify prices/stock
    // In REST, we have to fetch them individually or use a batchGet.
    // For simplicity, we fetch them individually since there are usually few items.
    
    let calculatedTotal = 0;
    const itemsByMerchant: Record<string, any[]> = {};
    const writes = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Fetch product document
      let productDoc;
      try {
        productDoc = await firestoreRest('GET', `/products/${item.productId}`);
      } catch (err) {
        throw new Error(`Product ${item.productId} not found.`);
      }

      if (!productDoc.fields) {
         throw new Error(`Product ${item.productId} is empty or invalid.`);
      }

      // Convert REST document to normal JS object roughly
      // We know price is number, stock is integer, name is string
      const price = Number(productDoc.fields.price?.doubleValue || productDoc.fields.price?.integerValue || 0);
      const stockField = productDoc.fields.stock;
      const stock = stockField ? Number(stockField.integerValue || 0) : undefined;
      const name = productDoc.fields.name?.stringValue || 'Unknown';
      const merchantId = productDoc.fields.merchantId?.stringValue || 'admin';
      
      if (stock !== undefined && stock !== null) {
        if (stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${name}. Available: ${stock}`);
        }
        // Decrement stock in batch write
        // Using transform for increment
        writes.push({
          transform: {
            document: productDoc.name,
            fieldTransforms: [
              {
                fieldPath: 'stock',
                increment: { integerValue: (-item.quantity).toString() }
              }
            ]
          }
        });
      }

      calculatedTotal += price * item.quantity;

      // Populate items by merchant
      if (!itemsByMerchant[merchantId]) itemsByMerchant[merchantId] = [];
      
      itemsByMerchant[merchantId].push({
        ...item,
        price: price, // override client price
        name: name, // optionally store name
      });
    }
    
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    // 3. Create Cart
    const cartId = `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const cartData = {
      userId: { stringValue: secureUserId },
      totalAmount: { doubleValue: calculatedTotal },
      items: {
         arrayValue: {
            values: items.map(i => ({
               mapValue: {
                  fields: {
                     productId: { stringValue: i.productId },
                     quantity: { integerValue: i.quantity.toString() },
                     addedAt: { timestampValue: new Date().toISOString() }
                  }
               }
            }))
         }
      },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
    };
    
    writes.push({
       update: {
          name: `projects/${projectId}/databases/(default)/documents/carts/${cartId}`,
          fields: cartData
       }
    });

    // 4. Create Checkout
    const checkoutId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const checkoutData = {
      userId: { stringValue: secureUserId },
      cartId: { stringValue: cartId },
      contactInformation: { stringValue: JSON.stringify(contactInformation || null) }, // Simple serialization
      shippingAddress: { stringValue: JSON.stringify(shippingAddress || null) },
      shippingInformation: { stringValue: JSON.stringify(shippingInformation || null) },
      status: { stringValue: 'completed' },
      totalAmount: { doubleValue: calculatedTotal },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
    };
    
    writes.push({
       update: {
          name: `projects/${projectId}/databases/(default)/documents/checkouts/${checkoutId}`,
          fields: checkoutData
       }
    });

    // 5. Create Orders for each merchant
    let firstOrderId = '';
    const createdOrders = [];

    for (const mId in itemsByMerchant) {
      const mItems = itemsByMerchant[mId];
      const mTotal = mItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const orderData = {
        userId: { stringValue: secureUserId },
        merchantId: { stringValue: mId },
        cartId: { stringValue: cartId },
        checkoutId: { stringValue: checkoutId },
        status: { stringValue: 'pending' },
        totalAmount: { doubleValue: mTotal },
        contactInformation: { stringValue: JSON.stringify(contactInformation || null) },
        shippingAddress: { stringValue: JSON.stringify(shippingAddress || { street: '', city: '', zipCode: '', country: '' }) },
        shippingInformation: { stringValue: JSON.stringify(shippingInformation || null) },
        items: {
           arrayValue: {
              values: mItems.map(i => ({
                 mapValue: {
                    fields: {
                       productId: { stringValue: i.productId },
                       quantity: { integerValue: i.quantity.toString() },
                       price: { doubleValue: i.price },
                       name: { stringValue: i.name }
                    }
                 }
              }))
           }
        },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
      };
      
      writes.push({
         update: {
            name: `projects/${projectId}/databases/(default)/documents/orders/${orderId}`,
            fields: orderData
         }
      });
      
      if (!firstOrderId) {
        firstOrderId = orderId;
      }
      
      // We don't have the fully normalized objects here easily without a complex map, 
      // but returning the IDs is usually enough for the client to proceed to a success page.
      createdOrders.push({ id: orderId });
    }

    // Execute the commit batch
    await firestoreCommit(writes);

    return NextResponse.json({
      success: true,
      firstOrderId,
      createdOrders
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    // Return appropriate error based on message
    if (error.message && error.message.includes('Insufficient stock')) {
      return NextResponse.json({ error: error.message }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
