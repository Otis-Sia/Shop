import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ reviews: [] });
    }

    const supabase = getServiceSupabase();
    const { data: reviews, error } = await supabase
      .from('product_reviews')
      .select(`
        id,
        product_id,
        user_id,
        rating,
        comment,
        created_at,
        users:user_id (display_name, first_name, last_name)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (reviews || []).map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      userId: r.user_id,
      userName: r.users?.display_name || `${r.users?.first_name || ''} ${r.users?.last_name || ''}`.trim() || 'Customer',
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at
    }));

    return NextResponse.json({ reviews: formatted });
  } catch (error: any) {
    console.error('Error in GET /api/reviews:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch reviews' }, { status: 500 });
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
    const { productId, rating, comment } = body;

    if (!productId || !rating) {
      return NextResponse.json({ error: 'Product ID and rating are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const { data: newReview, error } = await supabase
      .from('product_reviews')
      .insert({
        id: reviewId,
        product_id: productId.toString(),
        user_id: uid,
        rating: Number(rating),
        comment: comment || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, review: newReview });
  } catch (error: any) {
    console.error('Error in POST /api/reviews:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit review' }, { status: 500 });
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
    const reviewId = searchParams.get('id');

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('uid', uid)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin';

    let deleteQuery = supabase.from('product_reviews').delete().eq('id', reviewId);
    if (!isAdmin) {
      deleteQuery = deleteQuery.eq('user_id', uid);
    }

    const { error } = await deleteQuery;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Review deleted' });
  } catch (error: any) {
    console.error('Error in DELETE /api/reviews:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete review' }, { status: 500 });
  }
}
