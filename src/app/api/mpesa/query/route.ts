import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { querySTKStatus } from '@/lib/api/daraja';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const checkoutId = url.searchParams.get('checkoutId');
    const checkoutRequestId = url.searchParams.get('checkoutRequestId');

    if (!checkoutId && !checkoutRequestId) {
      return NextResponse.json(
        { error: 'checkoutId or checkoutRequestId is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 1. First check Supabase record
    let query = supabase.from('checkouts').select('*');
    if (checkoutId) {
      query = query.eq('id', checkoutId);
    } else if (checkoutRequestId) {
      query = query.eq('mpesa_request_id', checkoutRequestId);
    }

    const { data: checkout, error } = await query.maybeSingle();

    if (error || !checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 });
    }

    // If already finalized via webhook callback, return immediate state
    if (checkout.payment_status === 'completed' || checkout.payment_status === 'failed') {
      return NextResponse.json({
        status: checkout.payment_status,
        mpesaReceiptNumber: checkout.mpesa_receipt_number || null,
        checkoutId: checkout.id,
      });
    }

    // 2. If still pending and we have a request ID, query Daraja directly
    const targetReqId = checkoutRequestId || checkout.mpesa_request_id;
    if (targetReqId) {
      try {
        const queryRes = await querySTKStatus(targetReqId);

        if (queryRes.ResultCode === '0') {
          // Transaction confirmed successful
          const timestamp = new Date().toISOString();
          await supabase
            .from('checkouts')
            .update({
              payment_status: 'completed',
              status: 'completed',
              updated_at: timestamp,
            })
            .eq('id', checkout.id);

          await supabase
            .from('orders')
            .update({
              payment_status: 'completed',
              status: 'paid',
              updated_at: timestamp,
            })
            .eq('checkout_id', checkout.id);

          return NextResponse.json({
            status: 'completed',
            checkoutId: checkout.id,
            resultDesc: queryRes.ResultDesc,
          });
        } else if (queryRes.ResultCode && queryRes.ResultCode !== '0') {
          // Transaction explicitly failed or was cancelled
          const timestamp = new Date().toISOString();
          await supabase
            .from('checkouts')
            .update({
              payment_status: 'failed',
              status: 'failed',
              updated_at: timestamp,
            })
            .eq('id', checkout.id);

          await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              status: 'cancelled',
              updated_at: timestamp,
            })
            .eq('checkout_id', checkout.id);

          return NextResponse.json({
            status: 'failed',
            checkoutId: checkout.id,
            resultDesc: queryRes.ResultDesc,
          });
        }
      } catch (err: any) {
        // Query might fail if still processing or in sandbox timeout
        console.warn('Daraja query status probe:', err?.message);
      }
    }

    return NextResponse.json({
      status: 'pending',
      checkoutId: checkout.id,
    });
  } catch (error: any) {
    console.error('Error querying M-Pesa status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
