import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, contactInformation, shippingAddress, shippingInformation } = body;

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

    const secureUserId = decodedToken.sub;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required checkout information' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    let calculatedTotal = 0;
    const itemsByMerchant: Record<string, any[]> = {};
    const stockUpdates: { id: string; newStock: number }[] = [];

    // 1. Fetch all requested products and verify prices/stock
    for (const item of items) {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', item.productId.toString())
        .maybeSingle();

      if (error || !product) {
        throw new Error(`Product ${item.productId} not found.`);
      }

      const price = Number(product.price || 0);
      const stock = product.stock !== null && product.stock !== undefined ? Number(product.stock) : null;
      const name = product.name || 'Product';
      const merchantId = product.merchant_id || 'admin';

      if (product.track_inventory && stock !== null) {
        if (stock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for product ${name}. Available: ${stock}` },
            { status: 409 }
          );
        }
        stockUpdates.push({
          id: product.id,
          newStock: stock - item.quantity
        });
      }

      calculatedTotal += price * item.quantity;

      if (!itemsByMerchant[merchantId]) {
        itemsByMerchant[merchantId] = [];
      }

      itemsByMerchant[merchantId].push({
        productId: item.productId.toString(),
        quantity: item.quantity,
        price: price,
        name: name,
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null,
        selectedVariantIndex: item.selectedVariantIndex !== undefined ? item.selectedVariantIndex : null
      });
    }

    // 2. Decrement stocks
    for (const update of stockUpdates) {
      await supabase
        .from('products')
        .update({ stock: update.newStock, updated_at: new Date().toISOString() })
        .eq('id', update.id);
    }

    const timestamp = new Date().toISOString();

    // 3. Create Cart record in Supabase
    const cartId = `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const { error: cartError } = await supabase.from('carts').insert({
      id: cartId,
      user_id: secureUserId,
      total_amount: calculatedTotal,
      created_at: timestamp,
      updated_at: timestamp
    });
    if (cartError) console.error('Error recording cart:', cartError);

    // 4. Create Checkout record in Supabase
    const checkoutId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const { error: chkError } = await supabase.from('checkouts').insert({
      id: checkoutId,
      user_id: secureUserId,
      cart_id: cartId,
      contact_information: contactInformation || {},
      shipping_address: shippingAddress || {},
      shipping_information: shippingInformation || {},
      status: 'completed',
      total_amount: calculatedTotal,
      created_at: timestamp,
      updated_at: timestamp
    });
    if (chkError) console.error('Error recording checkout:', chkError);

    // 5. Create Orders for each merchant
    let firstOrderId = '';
    const createdOrders: { id: string }[] = [];

    for (const mId in itemsByMerchant) {
      const mItems = itemsByMerchant[mId];
      const mTotal = mItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const { error: orderError } = await supabase.from('orders').insert({
        id: orderId,
        user_id: secureUserId,
        merchant_id: mId,
        cart_id: cartId,
        checkout_id: checkoutId,
        status: 'pending',
        total_amount: mTotal,
        contact_information: contactInformation || {},
        shipping_address: shippingAddress || {},
        shipping_information: shippingInformation || {},
        items: mItems,
        created_at: timestamp,
        updated_at: timestamp
      });

      if (orderError) {
        console.error('Error creating order row:', orderError);
        throw orderError;
      }

      if (!firstOrderId) {
        firstOrderId = orderId;
      }
      createdOrders.push({ id: orderId });
    }

    // 6. Clear user cart items in Supabase
    await supabase.from('user_cart_items').delete().eq('user_id', secureUserId);

    // 7. Track analytics purchase events for purchased products
    for (const item of items) {
      try {
        await supabase.rpc('track_product_event', {
          p_product_id: item.productId.toString(),
          p_event_type: 'purchase',
          p_quantity: Math.max(1, Number(item.quantity) || 1)
        });
      } catch (analyticsErr) {
        console.warn('Analytics purchase tracking warning:', analyticsErr);
      }
    }

    return NextResponse.json({
      success: true,
      firstOrderId,
      createdOrders
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    if (error.message && error.message.includes('Insufficient stock')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
