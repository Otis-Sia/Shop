import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';
import { productsData } from '@/lib/data/products-data';

export const dynamic = 'force-dynamic';

const getAuthenticatedUid = async (request: Request): Promise<string | null> => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await verifyIdToken(token);
    return decoded.sub || null;
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  try {
    const uid = await getAuthenticatedUid(request);
    if (!uid) {
      return NextResponse.json({ items: [] });
    }

    const supabase = getServiceSupabase();
    const { data: rows, error } = await supabase
      .from('user_wishlist_items')
      .select(`
        id,
        user_id,
        product_id,
        added_at,
        products:product_id (
          id,
          name,
          price,
          sale_price,
          description,
          category,
          stock,
          image_urls,
          image_url,
          tags,
          colors,
          sizes,
          discount,
          brand,

          merchant_id,
          allow_multiple_purchases,
          has_variants
        )
      `)
      .eq('user_id', uid)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching wishlist from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (rows || []).map((row: any) => {
      let product = row.products;
      if (!product) {
        product = productsData.find(p => p.id.toString() === row.product_id.toString());
      } else {
        const imageUrls = product.image_urls || [];
        product = {
          id: isNaN(Number(product.id)) ? product.id : Number(product.id),
          name: product.name,
          price: Number(product.price || 0),
          salePrice: product.sale_price ? Number(product.sale_price) : undefined,
          description: product.description,
          category: product.category,
          stock: product.stock !== null ? Number(product.stock) : 0,
          image_url: imageUrls.length > 0 ? imageUrls[0] : (product.image_url || ''),
          imageUrls: imageUrls,
          tags: product.tags || [],
          colors: product.colors || [],
          sizes: product.sizes || [],
          discount: product.discount || 0,
          brand: product.brand || '',

          adminId: product.merchant_id || 'admin',
          allowMultiplePurchases: product.allow_multiple_purchases !== false,
          hasVariants: product.has_variants || false
        };
      }

      return {
        id: row.id,
        productId: row.product_id,
        addedAt: row.added_at,
        product
      };
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Error in GET /api/wishlist:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch wishlist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await getAuthenticatedUid(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if syncing multiple items
    const supabase = getServiceSupabase();
    if (body.syncItems && Array.isArray(body.syncItems)) {
      for (const item of body.syncItems) {
        const pId = (item.productId || item.product_id || item.id).toString();
        const wishId = `${uid}_${pId}`;
        await supabase
          .from('user_wishlist_items')
          .upsert({
            id: wishId,
            user_id: uid,
            product_id: pId,
            added_at: new Date().toISOString()
          });
      }
      return NextResponse.json({ success: true, message: 'Wishlist synced' });
    }

    const { productId } = body;
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const wishId = `${uid}_${productId}`;
    const { error } = await supabase
      .from('user_wishlist_items')
      .upsert({
        id: wishId,
        user_id: uid,
        product_id: productId.toString(),
        added_at: new Date().toISOString()
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Item added to wishlist' });
  } catch (error: any) {
    console.error('Error in POST /api/wishlist:', error);
    return NextResponse.json({ error: error.message || 'Failed to add item to wishlist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const uid = await getAuthenticatedUid(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const id = searchParams.get('id');

    const supabase = getServiceSupabase();
    let query = supabase.from('user_wishlist_items').delete().eq('user_id', uid);

    if (productId) {
      query = query.eq('product_id', productId.toString());
    } else if (id) {
      query = query.eq('id', id);
    } else {
      return NextResponse.json({ error: 'Product ID or Wishlist ID is required' }, { status: 400 });
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Item removed from wishlist' });
  } catch (error: any) {
    console.error('Error in DELETE /api/wishlist:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove from wishlist' }, { status: 500 });
  }
}
