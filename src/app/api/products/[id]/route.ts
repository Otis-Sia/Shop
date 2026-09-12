import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';
import { syncSingleProduct, deleteProducts } from '@/lib/api/meta';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_variants (*),
        product_reviews (*),
        users:merchant_id (uid, first_name, last_name, store_name, merchant_status, business_type)
      `)
      .eq('id', id)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const imageUrls = product.image_urls || [];
    const merchantProfile = product.users;
    const merchantName = merchantProfile?.store_name || (merchantProfile?.first_name ? `${merchantProfile.first_name} ${merchantProfile.last_name || ''}`.trim() : undefined);

    const rawVariants = product.product_variants || [];
    const mappedVariants = rawVariants.map((v: any) => {
      const color = v.color || (Array.isArray(v.attributes) ? v.attributes.find((a: any) => a.name?.toLowerCase() === 'color')?.value : '') || '';
      const size = v.size || (Array.isArray(v.attributes) ? v.attributes.find((a: any) => a.name?.toLowerCase() === 'size')?.value : '') || '';
      const attrValues = Array.isArray(v.attributes) ? v.attributes.map((a: any) => a.value).filter(Boolean) : [];
      const fallbackName = attrValues.length > 0 ? attrValues.join(' / ') : [color, size].filter(Boolean).join(' / ');
      const name = (v.name && !v.name.toLowerCase().startsWith('option ')) ? v.name : (fallbackName || 'Variant');

      return {
        id: v.id,
        productId: v.product_id,
        name: name,
        sku: v.sku || '',
        size: size,
        color: color,
        attributes: v.attributes || [],
        price: Number(v.price || 0),
        compareAtPrice: v.compare_at_price !== null && v.compare_at_price !== undefined ? Number(v.compare_at_price) : undefined,
        costPrice: v.cost_price !== null && v.cost_price !== undefined ? Number(v.cost_price) : undefined,
        stock: v.stock !== null && v.stock !== undefined ? Number(v.stock) : 0,
        imageUrl: v.image_url || (Array.isArray(v.images) ? v.images[0] : '') || ''
      };
    });

    const derivedColors = (product.colors && product.colors.length > 0)
      ? product.colors
      : Array.from(new Set(mappedVariants.map((v: any) => v.color).filter(Boolean)));
    const derivedSizes = (product.sizes && product.sizes.length > 0)
      ? product.sizes
      : Array.from(new Set(mappedVariants.map((v: any) => v.size).filter(Boolean)));

    const formattedProduct = {
      id: isNaN(Number(product.id)) ? product.id : Number(product.id),
      dbId: product.id,
      name: product.name || '',
      price: Number(product.price || 0),
      salePrice: product.sale_price ? Number(product.sale_price) : undefined,
      saleStartDate: product.sale_start_date,
      saleEndDate: product.sale_end_date,
      description: product.description || '',
      shortDescription: product.short_description || '',
      category: product.category || '',
      groupCategory: product.group_category || '',
      subcategories: product.subcategories || [],
      stock: product.stock !== null && product.stock !== undefined ? Number(product.stock) : 0,
      tags: product.tags || [],
      features: product.features || [],
      attributes: product.attributes || {},
      weight: product.weight !== null && product.weight !== undefined ? Number(product.weight) : undefined,
      weightUnit: product.weight_unit || 'kg',
      labels: product.labels || [],
      colors: derivedColors,
      sizes: derivedSizes,
      grades: product.grades || [],
      sku: product.sku || '',
      capacity: product.capacity || '',
      power: product.power || '',
      discount: product.discount ? Number(product.discount) : 0,
      brand: product.brand || '',
      countryOfOrigin: product.country_of_origin || '',
      supplierName: product.supplier_name || '',
      costPrice: product.cost_price !== null && product.cost_price !== undefined ? Number(product.cost_price) : undefined,
      currency: product.currency || 'KES',

      image_url: imageUrls.length > 0 ? imageUrls[0] : (product.image_url || ''),
      imageUrls: imageUrls,
      imageAltTexts: product.image_alt_texts || {},
      additional_images: imageUrls.length > 1 ? imageUrls.slice(1) : [],
      adminId: product.merchant_id || 'admin',
      merchant_id: product.merchant_id || 'admin',
      merchantName,
      merchantStatus: merchantProfile?.merchant_status,
      allowMultiplePurchases: product.allow_multiple_purchases !== false,
      hasVariants: product.has_variants || false,
      variants: mappedVariants,
      reviews: product.product_reviews || [],
      
      trackInventory: product.track_inventory !== false,
      lowStockAlert: product.low_stock_alert || false,
      allowBackorders: product.allow_backorders || false,
      videoUrl: product.video_url || '',
      createdAt: product.created_at,
      updatedAt: product.updated_at
    };

    return NextResponse.json({ product: formattedProduct });
  } catch (error: any) {
    console.error('Error fetching single product:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch product' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const uid = decoded.sub;
    const supabase = getServiceSupabase();

    // Verify ownership or admin role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('uid', uid)
      .maybeSingle();

    const { data: product } = await supabase
      .from('products')
      .select('merchant_id')
      .eq('id', id)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.merchant_id !== uid && userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: You do not own this product' }, { status: 403 });
    }

    // Delete variants & reviews first
    await supabase.from('product_variants').delete().eq('product_id', id);
    await supabase.from('product_reviews').delete().eq('product_id', id);
    const { error: delError } = await supabase.from('products').delete().eq('id', id);

    if (delError) {
      throw delError;
    }

    // Delta sync: delete product from Meta Catalog in the background
    try {
      deleteProducts([String(id)]).catch((metaErr: any) => {
        console.warn("Background Meta delete warning for product", id, metaErr.message);
      });
    } catch (_) {}

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete product' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const uid = decoded.sub;
    const supabase = getServiceSupabase();

    // Verify ownership or admin role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('uid', uid)
      .maybeSingle();

    const { data: product } = await supabase
      .from('products')
      .select('merchant_id, price, cost_price')
      .eq('id', id)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.merchant_id !== uid && userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: You do not own this product' }, { status: 403 });
    }

    const body = await request.json();
    const allowedUpdates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (body.supplierName !== undefined || body.supplier_name !== undefined) {
      const sup = (body.supplierName ?? body.supplier_name ?? '').trim();
      if (!sup) {
        return NextResponse.json({ error: 'Supplier name cannot be empty' }, { status: 400 });
      }
      allowedUpdates.supplier_name = sup;
    }
    if (body.sku !== undefined) {
      allowedUpdates.sku = body.sku;
    }
    if (body.costPrice !== undefined || body.cost_price !== undefined) {
      const cp = body.costPrice !== undefined ? (body.costPrice === '' ? null : Number(body.costPrice)) : (body.cost_price === '' ? null : Number(body.cost_price));
      if (cp !== null && (isNaN(cp) || cp <= 0)) {
        return NextResponse.json({ error: 'Cost price must be greater than 0' }, { status: 400 });
      }
      allowedUpdates.cost_price = cp;
    }
    if (body.price !== undefined) {
      const p = Number(body.price);
      if (isNaN(p) || p <= 0) {
        return NextResponse.json({ error: 'Regular price must be greater than 0' }, { status: 400 });
      }
      allowedUpdates.price = p;
    }

    // Relational check: price must be > cost_price
    const finalPrice = allowedUpdates.price !== undefined ? allowedUpdates.price : Number(product.price);
    const finalCost = allowedUpdates.cost_price !== undefined ? allowedUpdates.cost_price : (product.cost_price ? Number(product.cost_price) : null);
    if (finalPrice !== undefined && finalCost !== null && finalPrice <= finalCost) {
      return NextResponse.json({ error: `Regular price (${finalPrice}) must be strictly greater than cost price (${finalCost})` }, { status: 400 });
    }

    if (body.salePrice !== undefined || body.sale_price !== undefined) {
      const sp = body.salePrice ?? body.sale_price;
      const parsedSp = sp === '' || sp === null ? null : Number(sp);
      if (parsedSp !== null) {
        if (isNaN(parsedSp) || parsedSp <= 0) {
          return NextResponse.json({ error: 'Sale price must be greater than 0' }, { status: 400 });
        }
        if (finalPrice && parsedSp >= finalPrice) {
          return NextResponse.json({ error: `Sale price (${parsedSp}) must be lower than regular price (${finalPrice})` }, { status: 400 });
        }
        if (finalCost && parsedSp < finalCost) {
          return NextResponse.json({ error: `Sale price (${parsedSp}) cannot be lower than cost price (${finalCost})` }, { status: 400 });
        }
      }
      allowedUpdates.sale_price = parsedSp;
    }
    if (body.stock !== undefined) {
      allowedUpdates.stock = body.stock === '' || body.stock === null ? null : Number(body.stock);
    }

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(allowedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Delta sync: sync updated fields to Meta Catalog in the background
    try {
      syncSingleProduct(updatedProduct).catch((syncErr: any) => {
        console.warn("Background delta sync warning for product", id, syncErr.message);
      });
    } catch (_) {}

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error('Error patching product:', error);
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 500 });
  }
}
