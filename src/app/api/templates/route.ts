import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ templates: [] });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch {
      return NextResponse.json({ templates: [] });
    }

    const uid = decoded.sub;
    const supabase = getServiceSupabase();

    const { data: templates, error } = await supabase
      .from('product_templates')
      .select('*')
      .eq('merchant_id', uid)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (templates || []).map((t: any) => ({
      id: t.id,
      merchantId: t.merchant_id,
      name: t.name,
      data: typeof t.data === 'string' ? JSON.parse(t.data) : t.data,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return NextResponse.json({ templates: formatted });
  } catch (error: any) {
    console.error('Error in GET /api/templates:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
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

    const templateId = body.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { data, error } = await supabase
      .from('product_templates')
      .upsert({
        id: templateId,
        merchant_id: uid,
        name: body.name || 'Untitled Template',
        data: body.data || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, template: data });
  } catch (error: any) {
    console.error('Error in POST /api/templates:', error);
    return NextResponse.json({ error: error.message || 'Failed to save template' }, { status: 500 });
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
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from('product_templates')
      .delete()
      .eq('id', templateId)
      .eq('merchant_id', uid);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Template deleted' });
  } catch (error: any) {
    console.error('Error in DELETE /api/templates:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete template' }, { status: 500 });
  }
}
