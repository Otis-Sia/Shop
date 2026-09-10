import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const stkCallback = body?.Body?.stkCallback;

    if (!stkCallback) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Missing stkCallback body' }, { status: 400 });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    const supabase = getServiceSupabase();

    // Parse metadata items if payment was successful (ResultCode === 0)
    let amount: number | null = null;
    let mpesaReceiptNumber: string | null = null;
    let transactionDate: string | null = null;
    let phoneNumber: string | null = null;

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'Amount') amount = Number(item.Value);
        if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = String(item.Value);
        if (item.Name === 'TransactionDate') transactionDate = String(item.Value);
        if (item.Name === 'PhoneNumber') phoneNumber = String(item.Value);
      }
    }

    // 1. Log incoming Daraja notification
    const logId = `mpesa_log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await supabase.from('mpesa_transaction_logs').insert({
      id: logId,
      merchant_request_id: MerchantRequestID,
      checkout_request_id: CheckoutRequestID,
      result_code: ResultCode,
      result_desc: ResultDesc,
      mpesa_receipt_number: mpesaReceiptNumber,
      amount: amount,
      phone_number: phoneNumber,
      payload: body,
      created_at: new Date().toISOString(),
    });

    const isSuccess = ResultCode === 0;
    const paymentStatus = isSuccess ? 'completed' : 'failed';
    const orderStatus = isSuccess ? 'paid' : 'cancelled';
    const timestamp = new Date().toISOString();

    // 2. Update Checkout row
    await supabase
      .from('checkouts')
      .update({
        payment_status: paymentStatus,
        status: isSuccess ? 'completed' : 'failed',
        mpesa_receipt_number: mpesaReceiptNumber,
        updated_at: timestamp,
      })
      .or(`mpesa_request_id.eq.${CheckoutRequestID},payment_reference.eq.${CheckoutRequestID}`);

    // 3. Update Orders rows
    await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        status: orderStatus,
        mpesa_receipt_number: mpesaReceiptNumber,
        updated_at: timestamp,
      })
      .or(`mpesa_request_id.eq.${CheckoutRequestID},payment_reference.eq.${CheckoutRequestID}`);

    // Safaricom Daraja expects standard acknowledgment
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully',
    });
  } catch (error: any) {
    console.error('Error handling Daraja callback:', error);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
