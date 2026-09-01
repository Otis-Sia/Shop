import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ data: null });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch {
      return NextResponse.json({ data: null });
    }

    const uid = decoded.sub;
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('ai_fills')
      .select('*')
      .eq('merchant_id', uid)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ data: data || null });
  } catch (error: any) {
    console.error('Error in GET /api/ai-fills/auto-save:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch auto-fill data' }, { status: 500 });
  }
}
