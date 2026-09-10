import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getPesapalTransactionStatus } from '@/lib/api/pesapal';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const orderTrackingId = url.searchParams.get('OrderTrackingId');
    const orderMerchantReference = url.searchParams.get('OrderMerchantReference');
    const orderNotificationType = url.searchParams.get('OrderNotificationType');

    let bodyPayload = {};
    try {
      bodyPayload = await request.json();
    } catch {
      // Body may be empty in some Pesapal IPN webhook variants
    }

    const trackingId = orderTrackingId || (bodyPayload as any)?.OrderTrackingId;
    const merchantReference = orderMerchantReference || (bodyPayload as any)?.OrderMerchantReference;

    if (!trackingId) {
      return NextResponse.json({ error: 'OrderTrackingId is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 1. Query Pesapal to verify authentic transaction status
    let transactionStatus;
    try {
      transactionStatus = await getPesapalTransactionStatus(trackingId);
    } catch (statusErr: any) {
      console.error('Error querying Pesapal transaction status:', statusErr);
      return NextResponse.json({ error: 'Failed to verify transaction with Pesapal' }, { status: 502 });
    }

    const isCompleted =
      transactionStatus.status_code === 1 ||
      (transactionStatus.payment_status_description || '').toLowerCase() === 'completed';

    const isFailed =
      transactionStatus.status_code === 2 ||
      (transactionStatus.payment_status_description || '').toLowerCase() === 'failed';

    const paymentStatus = isCompleted ? 'completed' : isFailed ? 'failed' : 'pending';
    const orderStatus = isCompleted ? 'paid' : isFailed ? 'cancelled' : 'pending';

    // 2. Log IPN notification in Supabase
    const logId = `ipn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await supabase.from('pesapal_ipn_logs').insert({
      id: logId,
      order_tracking_id: trackingId,
      order_merchant_reference: merchantReference || transactionStatus.merchant_reference || '',
      ipn_status: transactionStatus.payment_status_description || 'UNKNOWN',
      payload: {
        notificationType: orderNotificationType,
        transactionStatus,
        receivedAt: new Date().toISOString()
      }
    });

    const targetReference = merchantReference || transactionStatus.merchant_reference;

    // 3. Update checkouts record
    if (targetReference) {
      await supabase
        .from('checkouts')
        .update({
          payment_status: paymentStatus,
          status: isCompleted ? 'completed' : isFailed ? 'failed' : 'pending',
          pesapal_tracking_id: trackingId,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${targetReference},payment_reference.eq.${targetReference}`);
    }

    // 4. Update orders records
    if (targetReference) {
      await supabase
        .from('orders')
        .update({
          payment_status: paymentStatus,
          status: orderStatus,
          pesapal_tracking_id: trackingId,
          updated_at: new Date().toISOString()
        })
        .or(`checkout_id.eq.${targetReference},payment_reference.eq.${targetReference}`);
    }

    // Pesapal expects response containing OrderTrackingId, OrderMerchantReference, and status 200
    return NextResponse.json({
      orderNotificationType: orderNotificationType || 'IPNCHANGE',
      orderTrackingId: trackingId,
      orderMerchantReference: targetReference,
      status: 200
    });
  } catch (err: any) {
    console.error('Error handling Pesapal IPN:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
