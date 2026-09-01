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

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
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
    if (productId.length > 255) {
      return NextResponse.json(
        { error: 'Product ID exceeds maximum length of 255 characters' },
        { status: 400 }
      );
    }

    const eventType = normalizeTrackingEventType(rawEvent);

    if (!eventType) {
      return NextResponse.json(
        {
          error: `Invalid event type: '${rawEvent}'. Supported events: 'view', 'cart_add', 'wishlist_add', 'purchase'`
        },
        { status: 400 }
      );
    }

    const parsedQty = parseInt(String(rawQuantity), 10);
    const quantity = Math.min(100000, Math.max(1, Number.isFinite(parsedQty) ? parsedQty : 1));
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
      } else if (rpcError) {
        const errorMsg = String(rpcError.message || '');
        if (errorMsg.includes('does not exist') || errorMsg.includes('not found')) {
          return NextResponse.json({ error: errorMsg }, { status: 404 });
        }
        // If other RPC error (e.g. function doesn't exist yet in Supabase), fallback to table queries below
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('does not exist') || msg.includes('not found')) {
        return NextResponse.json({ error: msg }, { status: 404 });
      }
      // RPC not available, fallback to table query execution below
    }

    // Strategy 2: Direct Supabase table operations (with automatic upsert and score calculation)
    // Check if product exists in products table
    const { data: productExists, error: productCheckError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle();

    if (!productCheckError && !productExists) {
      return NextResponse.json(
        { error: `Product with ID '${productId}' does not exist` },
        { status: 404 }
      );
    }

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
        if (insertError.code === '23503') {
          // Foreign key violation: product not in products table
          return NextResponse.json(
            { error: `Product with ID '${productId}' does not exist` },
            { status: 404 }
          );
        }
        if (insertError.code === '23505') {
          // Unique key violation: concurrent insertion, fetch latest row and re-calculate
          const { data: freshRow } = await supabase
            .from('product_analytics')
            .select('*')
            .eq('product_id', productId)
            .maybeSingle();

          if (freshRow) {
            let retryViews = Number(freshRow.views || 0);
            let retryCart = Number(freshRow.cart_additions || 0);
            let retryWishlist = Number(freshRow.wishlist_additions || 0);
            let retryPurchases = Number(freshRow.purchases || 0);

            switch (eventType) {
              case 'view': retryViews += quantity; break;
              case 'cart_add': retryCart += quantity; break;
              case 'wishlist_add': retryWishlist += quantity; break;
              case 'purchase': retryPurchases += quantity; break;
            }

            const retryScore = calculatePopularityScore({
              views: retryViews,
              cartAdditions: retryCart,
              wishlistAdditions: retryWishlist,
              purchases: retryPurchases
            });

            const { data: retryUpdated, error: retryError } = await supabase
              .from('product_analytics')
              .update({
                views: retryViews,
                cart_additions: retryCart,
                wishlist_additions: retryWishlist,
                purchases: retryPurchases,
                popularity_score: retryScore,
                updated_at: now
              })
              .eq('product_id', productId)
              .select()
              .single();

            if (!retryError && retryUpdated) {
              return NextResponse.json({
                success: true,
                message: 'Event tracked successfully',
                data: {
                  productId,
                  event: eventType,
                  views: Number(retryUpdated.views),
                  cartAdditions: Number(retryUpdated.cart_additions),
                  wishlistAdditions: Number(retryUpdated.wishlist_additions),
                  purchases: Number(retryUpdated.purchases),
                  popularityScore: Number(retryUpdated.popularity_score),
                  updatedAt: retryUpdated.updated_at || now
                }
              });
            }
          }
        }
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
    const rawProductId = searchParams.get('productId') || searchParams.get('product_id');
    const productId = (rawProductId && rawProductId.trim().length > 0) ? rawProductId.trim() : null;
    
    if (productId && productId.length > 255) {
      return NextResponse.json(
        { error: 'Product ID exceeds maximum length of 255 characters' },
        { status: 400 }
      );
    }

    const rawLimit = searchParams.get('limit');
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 20;
    const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 20;

    const rawSort = (searchParams.get('sortBy') || searchParams.get('sort_by') || 'popularity_score').trim().toLowerCase();
    const validSortFields: Record<string, string> = {
      popularity_score: 'popularity_score',
      popularity: 'popularity_score',
      score: 'popularity_score',
      views: 'views',
      view: 'views',
      cart_additions: 'cart_additions',
      cart: 'cart_additions',
      wishlist_additions: 'wishlist_additions',
      wishlist: 'wishlist_additions',
      purchases: 'purchases',
      purchase: 'purchases'
    };
    const sortColumn = validSortFields[rawSort] || 'popularity_score';

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

    // Return list of products sorted by requested column descending
    const { data: topProducts, error } = await supabase
      .from('product_analytics')
      .select('*')
      .order(sortColumn, { ascending: false })
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
