import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
    const supabase = getServiceSupabase();

    const { rawDetails, generatedJson, productId } = body;

    if (!rawDetails || !generatedJson) {
      return NextResponse.json({ error: 'rawDetails and generatedJson are required' }, { status: 400 });
    }

    const id = `ai_fill_${uid}`; // Keep the latest auto-fill for the merchant

    const { data, error } = await supabase
      .from('ai_fills')
      .upsert({
        id: id,
        merchant_id: uid,
        product_id: productId || null,
        raw_details: rawDetails,
        generated_json: generatedJson,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in POST /api/ai-fills/auto-save:', error);
    return NextResponse.json({ error: error.message || 'Failed to save auto-fill data' }, { status: 500 });
  }
}
