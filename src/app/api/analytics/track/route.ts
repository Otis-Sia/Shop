import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import {
  calculatePopularityScore,
  normalizeTrackingEventType,
  TrackingEventType
} from '@/lib/analytics/popularity';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const rawProductId = body.productId ?? body.product_id;
    const rawEvent = body.event ?? body.eventType ?? body.type;
    const rawQuantity = body.quantity ?? body.count ?? body.increment ?? 1;

    if (rawProductId === undefined || rawProductId === null || String(rawProductId).trim() === '') {
      return NextResponse.json(
        { error: 'Missing required field: productId is required' },
        { status: 400 }
      );
    }

    const productId = String(rawProductId).trim();
    const eventType = normalizeTrackingEventType(rawEvent);

    if (!eventType) {
      return NextResponse.json(
        {
          error: `Invalid event type: '${rawEvent}'. Supported events: 'view', 'cart_add', 'wishlist_add', 'purchase'`
        },
        { status: 400 }
      );
    }

    const quantity = Math.max(1, parseInt(String(rawQuantity), 10) || 1);
    const supabase = getServiceSupabase();

    // Strategy 1: Try database RPC function if installed
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('track_product_event', {
        p_product_id: productId,
        p_event_type: eventType,
        p_quantity: quantity
      });

      if (!rpcError && rpcData) {
        return NextResponse.json({
          success: true,
          message: 'Event tracked successfully via RPC',
          data: {
            productId: rpcData.product_id || productId,
            event: eventType,
            views: Number(rpcData.views || 0),
            cartAdditions: Number(rpcData.cart_additions || 0),
            wishlistAdditions: Number(rpcData.wishlist_additions || 0),
            purchases: Number(rpcData.purchases || 0),
            popularityScore: Number(rpcData.popularity_score || 0),
            updatedAt: rpcData.updated_at
          }
        });
      }
    } catch {
      // RPC not available, fallback to table query execution below
    }

    // Strategy 2: Direct Supabase table operations (with automatic upsert and score calculation)
    const { data: existingRow, error: fetchError } = await supabase
      .from('product_analytics')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching product analytics row:', fetchError);
    }

    let newViews = Number(existingRow?.views || 0);
    let newCartAdditions = Number(existingRow?.cart_additions || 0);
    let newWishlistAdditions = Number(existingRow?.wishlist_additions || 0);
    let newPurchases = Number(existingRow?.purchases || 0);

    switch (eventType) {
      case 'view':
        newViews += quantity;
        break;
      case 'cart_add':
        newCartAdditions += quantity;
        break;
      case 'wishlist_add':
        newWishlistAdditions += quantity;
        break;
      case 'purchase':
        newPurchases += quantity;
        break;
    }

    const calculatedScore = calculatePopularityScore({
      views: newViews,
      cartAdditions: newCartAdditions,
      wishlistAdditions: newWishlistAdditions,
      purchases: newPurchases
    });

    const now = new Date().toISOString();

    if (existingRow) {
      const { data: updated, error: updateError } = await supabase
        .from('product_analytics')
        .update({
          views: newViews,
          cart_additions: newCartAdditions,
          wishlist_additions: newWishlistAdditions,
          purchases: newPurchases,
          popularity_score: calculatedScore,
          updated_at: now
        })
        .eq('product_id', productId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating product analytics:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Event tracked successfully',
        data: {
          productId,
          event: eventType,
          views: Number(updated?.views ?? newViews),
          cartAdditions: Number(updated?.cart_additions ?? newCartAdditions),
          wishlistAdditions: Number(updated?.wishlist_additions ?? newWishlistAdditions),
          purchases: Number(updated?.purchases ?? newPurchases),
          popularityScore: Number(updated?.popularity_score ?? calculatedScore),
          updatedAt: updated?.updated_at || now
        }
      });
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('product_analytics')
        .insert({
          product_id: productId,
          views: newViews,
          cart_additions: newCartAdditions,
          wishlist_additions: newWishlistAdditions,
          purchases: newPurchases,
          popularity_score: calculatedScore,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting product analytics:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Event tracked successfully',
        data: {
          productId,
          event: eventType,
          views: Number(inserted?.views ?? newViews),
          cartAdditions: Number(inserted?.cart_additions ?? newCartAdditions),
          wishlistAdditions: Number(inserted?.wishlist_additions ?? newWishlistAdditions),
          purchases: Number(inserted?.purchases ?? newPurchases),
          popularityScore: Number(inserted?.popularity_score ?? calculatedScore),
          updatedAt: inserted?.updated_at || now
        }
      });
    }
  } catch (error: any) {
    console.error('Unexpected error in POST /api/analytics/track:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process tracking event' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId') || searchParams.get('product_id');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const supabase = getServiceSupabase();

    if (productId) {
      const { data: analytics, error } = await supabase
        .from('product_analytics')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!analytics) {
        return NextResponse.json({
          analytics: {
            productId,
            views: 0,
            cartAdditions: 0,
            wishlistAdditions: 0,
            purchases: 0,
            popularityScore: 0,
            createdAt: null,
            updatedAt: null
          }
        });
      }

      return NextResponse.json({
        analytics: {
          productId: analytics.product_id,
          views: Number(analytics.views || 0),
          cartAdditions: Number(analytics.cart_additions || 0),
          wishlistAdditions: Number(analytics.wishlist_additions || 0),
          purchases: Number(analytics.purchases || 0),
          popularityScore: Number(analytics.popularity_score || 0),
          createdAt: analytics.created_at,
          updatedAt: analytics.updated_at
        }
      });
    }

    // Return list of products sorted by popularity score descending
    const { data: topProducts, error } = await supabase
      .from('product_analytics')
      .select('*')
      .order('popularity_score', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      analytics: (topProducts || []).map((row: any) => ({
        productId: row.product_id,
        views: Number(row.views || 0),
        cartAdditions: Number(row.cart_additions || 0),
        wishlistAdditions: Number(row.wishlist_additions || 0),
        purchases: Number(row.purchases || 0),
        popularityScore: Number(row.popularity_score || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error: any) {
    console.error('Unexpected error in GET /api/analytics/track:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product analytics' },
      { status: 500 }
    );
  }
}
