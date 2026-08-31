import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching order from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const formattedOrder = {
      id: order.id,
      userId: order.user_id,
      adminId: order.merchant_id,
      merchant_id: order.merchant_id,
      cartId: order.cart_id,
      checkoutId: order.checkout_id,
      status: order.status,
      totalAmount: Number(order.total_amount || 0),
      contactInformation: typeof order.contact_information === 'string' ? JSON.parse(order.contact_information) : order.contact_information,
      shippingAddress: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
      shippingInformation: typeof order.shipping_information === 'string' ? JSON.parse(order.shipping_information) : order.shipping_information,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    };

    return NextResponse.json({ order: formattedOrder });
  } catch (error: any) {
    console.error('Error fetching single order:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch order' }, { status: 500 });
  }
}
