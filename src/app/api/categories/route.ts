import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';
import { CATEGORIES_DATA } from '@/lib/data/categories';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data: categories, error } = await supabase
      .from('system_categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!categories || categories.length === 0) {
      // Return default initial seeded data if table is empty
      const defaultCategories = [
        ...CATEGORIES_DATA.goods.map((g, idx) => ({ id: `goods_${idx}`, name: g.name, type: 'goods', categories: g.categories }))
      ];
      return NextResponse.json({ categories: defaultCategories });
    }

    const formatted = categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      categories: typeof c.categories === 'string' ? JSON.parse(c.categories) : c.categories,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return NextResponse.json({ categories: formatted });
  } catch (error: any) {
    console.error('Error in GET /api/categories:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 });
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
    const supabase = getServiceSupabase();

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('uid', uid)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const id = body.id || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const { data: newCat, error } = await supabase
      .from('system_categories')
      .upsert({
        id,
        name: body.name,
        type: body.type,
        categories: body.categories,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, category: newCat });
  } catch (error: any) {
    console.error('Error in POST /api/categories:', error);
    return NextResponse.json({ error: error.message || 'Failed to save category' }, { status: 500 });
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

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('uid', uid)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('system_categories').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    console.error('Error in DELETE /api/categories:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 });
  }
}
