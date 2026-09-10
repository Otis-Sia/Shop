import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';
import { initiateSTKPush, formatMpesaPhoneNumber } from '@/lib/api/daraja';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(token);
    } catch (authError) {
      console.error('Invalid token in stkpush:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { checkoutId, phoneNumber, amount } = body;

    if (!checkoutId || !phoneNumber) {
      return NextResponse.json(
        { error: 'checkoutId and phoneNumber are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 1. Fetch checkout details to verify amount and ownership
    const { data: checkout, error: chkError } = await supabase
      .from('checkouts')
      .select('*')
      .eq('id', checkoutId)
      .maybeSingle();

    if (chkError || !checkout) {
      return NextResponse.json({ error: 'Checkout record not found' }, { status: 404 });
    }

    if (checkout.user_id !== decodedToken.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const finalAmount = amount ? Number(amount) : Number(checkout.total_amount || 1);
    const formattedPhone = formatMpesaPhoneNumber(phoneNumber);

    // 2. Trigger Daraja STK Push
    const stkResponse = await initiateSTKPush({
      phoneNumber: formattedPhone,
      amount: finalAmount,
      accountReference: checkoutId.substring(0, 12),
      transactionDesc: 'Shop Order',
    });

    const checkoutRequestId = stkResponse.CheckoutRequestID;
    const merchantRequestId = stkResponse.MerchantRequestID;

    // 3. Update checkout and associated orders with mpesa request identifiers
    await supabase
      .from('checkouts')
      .update({
        payment_method: 'mpesa',
        mpesa_request_id: checkoutRequestId,
        payment_reference: checkoutRequestId,
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', checkoutId);

    await supabase
      .from('orders')
      .update({
        payment_method: 'mpesa',
        mpesa_request_id: checkoutRequestId,
        payment_reference: checkoutRequestId,
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('checkout_id', checkoutId);

    return NextResponse.json({
      success: true,
      checkoutRequestId,
      merchantRequestId,
      customerMessage: stkResponse.CustomerMessage,
      checkoutId,
    });
  } catch (error: any) {
    console.error('STK Push initiation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate M-Pesa payment' },
      { status: 500 }
    );
  }
}
