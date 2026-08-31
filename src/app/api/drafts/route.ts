import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ draft: null });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch {
      return NextResponse.json({ draft: null });
    }

    const uid = decoded.sub;
    const supabase = getServiceSupabase();

    const { data: draft, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('merchant_id', uid)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      draft: draft ? {
        id: draft.id,
        merchantId: draft.merchant_id,
        editForm: typeof draft.edit_form === 'string' ? JSON.parse(draft.edit_form) : draft.edit_form,
        isAdding: draft.is_adding,
        editingId: draft.editing_id,
        isQuickAdd: draft.is_quick_add,
        updatedAt: draft.updated_at
      } : null
    });
  } catch (error: any) {
    console.error('Error in GET /api/drafts:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch draft' }, { status: 500 });
  }
}

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

    const draftId = `draft_${uid}`;
    const { data, error } = await supabase
      .from('drafts')
      .upsert({
        id: draftId,
        merchant_id: uid,
        edit_form: body.editForm || {},
        is_adding: body.isAdding || false,
        editing_id: body.editingId || null,
        is_quick_add: body.isQuickAdd || false,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, draft: data });
  } catch (error: any) {
    console.error('Error in POST /api/drafts:', error);
    return NextResponse.json({ error: error.message || 'Failed to save draft' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
    const supabase = getServiceSupabase();

    const { error } = await supabase.from('drafts').delete().eq('merchant_id', uid);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Draft cleared' });
  } catch (error: any) {
    console.error('Error in DELETE /api/drafts:', error);
    return NextResponse.json({ error: error.message || 'Failed to clear draft' }, { status: 500 });
  }
}
