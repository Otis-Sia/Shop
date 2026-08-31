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
      return NextResponse.json({ CartItems: [] });
    }

    const supabase = getServiceSupabase();
    const { data: cartRows, error } = await supabase
      .from('user_cart_items')
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        selected_color,
        selected_size,
        selected_variant_index,
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
      console.error('Error fetching cart from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (cartRows || []).map((row: any) => {
      let product = row.products;
      if (!product) {
        // Fallback for hardcoded products
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
        product_id: row.product_id,
        quantity: row.quantity,
        selectedColor: row.selected_color || undefined,
        selectedSize: row.selected_size || undefined,
        selectedVariantIndex: row.selected_variant_index !== null ? row.selected_variant_index : undefined,
        Product: product
      };
    });

    return NextResponse.json({ CartItems: items });
  } catch (error: any) {
    console.error('Error in GET /api/cart:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch cart' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await getAuthenticatedUid(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getServiceSupabase();

    // Check if body is batch sync
    if (body.syncItems && Array.isArray(body.syncItems)) {
      for (const item of body.syncItems) {
        const colorPart = item.selectedColor ? `_${item.selectedColor.replace(/[^a-zA-Z0-9]/g, '')}` : '';
        const sizePart = item.selectedSize ? `_${item.selectedSize.replace(/[^a-zA-Z0-9]/g, '')}` : '';
        const variantPart = item.selectedVariantIndex !== undefined && item.selectedVariantIndex !== null ? `_v${item.selectedVariantIndex}` : '';
        const cartItemId = `${uid}_${item.product_id}${colorPart}${sizePart}${variantPart}`;

        const { data: existing } = await supabase
          .from('user_cart_items')
          .select('id, quantity')
          .eq('id', cartItemId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_cart_items')
            .update({
              quantity: existing.quantity + item.quantity
            })
            .eq('id', cartItemId);
        } else {
          await supabase
            .from('user_cart_items')
            .insert({
              id: cartItemId,
              user_id: uid,
              product_id: item.product_id.toString(),
              quantity: item.quantity,
              selected_color: item.selectedColor || null,
              selected_size: item.selectedSize || null,
              selected_variant_index: item.selectedVariantIndex !== undefined ? item.selectedVariantIndex : null,
              added_at: new Date().toISOString()
            });
        }
      }
      return NextResponse.json({ success: true, message: 'Cart synced successfully' });
    }

    const { productId, quantity = 1, selectedColor, selectedSize, selectedVariantIndex } = body;
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const colorPart = selectedColor ? `_${selectedColor.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    const sizePart = selectedSize ? `_${selectedSize.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    const variantPart = selectedVariantIndex !== undefined && selectedVariantIndex !== null ? `_v${selectedVariantIndex}` : '';
    const cartItemId = `${uid}_${productId}${colorPart}${sizePart}${variantPart}`;

    const { data: existing } = await supabase
      .from('user_cart_items')
      .select('id, quantity')
      .eq('id', cartItemId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('user_cart_items')
        .update({
          quantity: existing.quantity + Number(quantity)
        })
        .eq('id', cartItemId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_cart_items')
        .insert({
          id: cartItemId,
          user_id: uid,
          product_id: productId.toString(),
          quantity: Number(quantity),
          selected_color: selectedColor || null,
          selected_size: selectedSize || null,
          selected_variant_index: selectedVariantIndex !== undefined ? selectedVariantIndex : null,
          added_at: new Date().toISOString()
        });
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Item added to cart' });
  } catch (error: any) {
    console.error('Error in POST /api/cart:', error);
    return NextResponse.json({ error: error.message || 'Failed to add item to cart' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const uid = await getAuthenticatedUid(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, quantity } = await request.json();
    if (!id || quantity === undefined) {
      return NextResponse.json({ error: 'Cart item ID and quantity are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    if (quantity <= 0) {
      await supabase.from('user_cart_items').delete().eq('id', id).eq('user_id', uid);
    } else {
      const { error } = await supabase
        .from('user_cart_items')
        .update({ quantity: Number(quantity) })
        .eq('id', id)
        .eq('user_id', uid);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Cart item updated' });
  } catch (error: any) {
    console.error('Error in PUT /api/cart:', error);
    return NextResponse.json({ error: error.message || 'Failed to update cart item' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const uid = await getAuthenticatedUid(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clear') === 'true';

    const supabase = getServiceSupabase();

    if (clearAll) {
      const { error } = await supabase
        .from('user_cart_items')
        .delete()
        .eq('user_id', uid);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Cart cleared' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_cart_items')
      .delete()
      .eq('id', id)
      .eq('user_id', uid);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Cart item removed' });
  } catch (error: any) {
    console.error('Error in DELETE /api/cart:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove cart item' }, { status: 500 });
  }
}
