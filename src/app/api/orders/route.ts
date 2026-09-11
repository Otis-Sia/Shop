import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ orders: [] });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch {
      return NextResponse.json({ orders: [] });
    }

    const uid = decoded.sub;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'user' | 'merchant' | 'all'

    const supabase = getServiceSupabase();

    // Check user profile for role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('uid', uid)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin';
    const isMerchant = profile?.role === 'merchant';

    let query = supabase.from('orders').select('*');

    if (filter === 'merchant' && (isMerchant || isAdmin)) {
      query = query.eq('merchant_id', uid);
    } else if (filter === 'all' && isAdmin) {
      // Admin gets all orders
    } else {
      // Default: customer sees their own orders
      query = query.eq('user_id', uid);
    }

    // Only show orders where payment has been approved/completed, unless explicitly querying by payment_status
    const paymentStatusParam = searchParams.get('payment_status') || searchParams.get('paymentStatus');
    if (paymentStatusParam) {
      query = query.eq('payment_status', paymentStatusParam);
    } else {
      query = query.or('payment_status.eq.completed,status.eq.paid');
    }

    query = query.order('created_at', { ascending: false });

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rawOrders = (orders || []).map((o: any) => ({
      id: o.id,
      userId: o.user_id,
      adminId: o.merchant_id,
      merchant_id: o.merchant_id,
      cartId: o.cart_id,
      checkoutId: o.checkout_id,
      status: o.status,
      totalAmount: Number(o.total_amount || 0),
      contactInformation: typeof o.contact_information === 'string' ? JSON.parse(o.contact_information) : o.contact_information,
      shippingAddress: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address,
      shippingInformation: typeof o.shipping_information === 'string' ? JSON.parse(o.shipping_information) : o.shipping_information,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
      createdAt: o.created_at,
      updatedAt: o.updated_at
    }));

    // Collect product IDs for items missing imageUrl, sku, or supplierName
    const productIdsToFetch = new Set<string>();
    rawOrders.forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item?.productId && (!item.imageUrl || !item.sku || !item.supplierName)) {
            productIdsToFetch.add(item.productId.toString());
          }
        });
      }
    });

    let productMap: Record<string, any> = {};
    if (productIdsToFetch.size > 0) {
      const { data: fetchedProducts, error: prodErr } = await supabase
        .from('products')
        .select('id, name, sku, supplier_name, image_urls, product_variants(*)')
        .in('id', Array.from(productIdsToFetch));

      if (prodErr) {
        console.error('Error backfilling products for orders:', prodErr);
      }

      if (fetchedProducts) {
        fetchedProducts.forEach((p: any) => {
          productMap[p.id.toString()] = p;
        });
      }
    }

    // Enrich order items
    const formattedOrders = rawOrders.map(order => {
      const enrichedItems = (order.items || []).map((item: any) => {
        const prod = item?.productId ? productMap[item.productId.toString()] : null;
        if (!prod) return item;

        let matchingVariant: any = null;
        if (prod.product_variants && prod.product_variants.length > 0) {
          if (item.selectedVariantIndex !== undefined && item.selectedVariantIndex !== null && prod.product_variants[item.selectedVariantIndex]) {
            matchingVariant = prod.product_variants[item.selectedVariantIndex];
          } else {
            matchingVariant = prod.product_variants.find((v: any) => {
              const matchSize = (item.size || item.selectedSize) ? v.size === (item.size || item.selectedSize) : true;
              const matchColor = (item.color || item.selectedColor) ? v.color === (item.color || item.selectedColor) : true;
              return matchSize && matchColor;
            });
          }
        }

        const fallbackImg = (prod.image_urls && prod.image_urls.length > 0) ? prod.image_urls[0] : null;
        const resolvedImage = item.imageUrl || matchingVariant?.image_url || fallbackImg;
        const resolvedSku = item.sku || matchingVariant?.sku || prod.sku || null;
        const resolvedSupplier = item.supplierName || prod.supplier_name || null;

        return {
          ...item,
          imageUrl: resolvedImage,
          sku: resolvedSku,
          supplierName: resolvedSupplier
        };
      });

      return {
        ...order,
        items: enrichedItems
      };
    });

    return NextResponse.json({ orders: formattedOrders });
  } catch (error: any) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const uid = decoded.sub;
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID and status are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('uid', uid)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin';

    // Verify merchant owns this order or is admin
    const { data: order } = await supabase
      .from('orders')
      .select('merchant_id')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.merchant_id !== uid && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Order status updated' });
  } catch (error: any) {
    console.error('Error in PUT /api/orders:', error);
    return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 500 });
  }
}
