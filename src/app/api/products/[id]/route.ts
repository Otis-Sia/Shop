import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

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
      attributes: product.attributes || [],
      weight: product.weight,
      weightUnit: product.weight_unit || 'kg',
      labels: product.labels || [],
      colors: product.colors || [],
      sizes: product.sizes || [],
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
      variants: (product.product_variants || []).map((v: any) => ({
        id: v.id,
        productId: v.product_id,
        size: v.size || '',
        color: v.color || '',
        price: Number(v.price || 0),
        stock: v.stock !== null && v.stock !== undefined ? Number(v.stock) : 0,
        imageUrl: v.image_url || ''
      })),
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

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete product' }, { status: 500 });
  }
}
