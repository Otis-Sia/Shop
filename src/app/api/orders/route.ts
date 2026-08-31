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

    query = query.order('created_at', { ascending: false });

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedOrders = (orders || []).map((o: any) => ({
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
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      createdAt: o.created_at,
      updatedAt: o.updated_at
    }));

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
