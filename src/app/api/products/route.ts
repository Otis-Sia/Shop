import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const mapDbProductToProduct = (p: any, variants: any[] = [], merchantProfile: any = null) => {
  const imageUrls = p.image_urls || [];
  const primaryImage = imageUrls.length > 0 ? imageUrls[0] : (p.image_url || '');
  const additionalImages = imageUrls.length > 1 ? imageUrls.slice(1) : [];

  let merchantName = undefined;
  let merchantStatus = undefined;
  let merchantInfo = undefined;

  if (merchantProfile) {
    merchantName = merchantProfile.store_name || (merchantProfile.first_name ? `${merchantProfile.first_name} ${merchantProfile.last_name || ''}`.trim() : undefined);
    merchantStatus = merchantProfile.merchant_status;
    merchantInfo = merchantProfile.business_category ? `${merchantProfile.business_category} seller` : undefined;
  }

  return {
    id: isNaN(Number(p.id)) ? p.id : Number(p.id),
    dbId: p.id,
    name: p.name || '',
    price: Number(p.price || 0),
    salePrice: p.sale_price ? Number(p.sale_price) : undefined,
    saleStartDate: p.sale_start_date,
    saleEndDate: p.sale_end_date,
    description: p.description || '',
    shortDescription: p.short_description || '',
    category: p.category || '',
    groupCategory: p.group_category || '',
    subcategories: p.subcategories || [],
    stock: p.stock !== null && p.stock !== undefined ? Number(p.stock) : 0,
    tags: p.tags || [],
    features: p.features || [],
    labels: p.labels || [],
    colors: p.colors || [],
    sizes: p.sizes || [],
    grades: p.grades || [],
    discount: p.discount ? Number(p.discount) : 0,
    brand: p.brand || '',
    countryOfOrigin: p.country_of_origin || '',
    supplierName: p.supplier_name || '',
    costPrice: p.cost_price !== null && p.cost_price !== undefined ? Number(p.cost_price) : undefined,
    currency: p.currency || 'XAF',

    image_url: primaryImage,
    imageUrls: imageUrls,
    imageAltTexts: p.image_alt_texts || {},
    additional_images: additionalImages,
    adminId: p.merchant_id || 'admin',
    merchant_id: p.merchant_id || 'admin',
    merchantName,
    merchantStatus,
    merchantInfo,
    allowMultiplePurchases: p.allow_multiple_purchases !== false,
    hasVariants: p.has_variants || false,
    variants: variants.map((v: any) => ({
      id: v.id,
      productId: v.product_id,
      size: v.size || '',
      color: v.color || '',
      price: Number(v.price || 0),
      stock: v.stock !== null && v.stock !== undefined ? Number(v.stock) : 0,
      imageUrl: v.image_url || ''
    })),
    
    trackInventory: p.track_inventory !== false,
    lowStockAlert: p.low_stock_alert || false,
    allowBackorders: p.allow_backorders || false,
    videoUrl: p.video_url || '',
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const category = searchParams.get('category');
    const supplier = searchParams.get('supplier');
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
    const adminId = searchParams.get('adminId');
    
    const newArrivals = searchParams.get('newArrivals') === 'true';
    const includeUnapproved = searchParams.get('includeUnapproved') === 'true';
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : null;

    const supabase = getServiceSupabase();

    let query = supabase.from('products').select(`
      *,
      product_variants (*),
      users:merchant_id (uid, first_name, last_name, store_name, merchant_status, business_type)
    `);

    if (category) {
      query = query.eq('category', category);
    }
    if (supplier) {
      query = query.eq('supplier_name', supplier);
    }
    if (adminId) {
      query = query.eq('merchant_id', adminId);
    }

    if (maxPrice !== null && !isNaN(maxPrice)) {
      query = query.lte('price', maxPrice);
    }

    query = query.order('created_at', { ascending: false });

    const { data: dbProducts, error } = await query;

    if (error) {
      console.error('Error fetching products from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let products: any[] = (dbProducts || []).map((p: any) =>
      mapDbProductToProduct(p, p.product_variants || [], p.users)
    );

    // Filter unapproved merchants if requested
    if (!includeUnapproved) {
      products = products.filter(p =>
        p.adminId === 'admin' ||
        p.merchantStatus === 'approved' ||
        p.merchantStatus === 'verified' ||
        !p.merchantStatus
      );
    }

    // Keyword filtering
    if (keyword) {
      const searchTerms = keyword.toLowerCase().split(/\s+/).filter(Boolean);
      products = products.filter(p => {
        const searchableText = [
          p.name,
          p.description,
          p.category || '',
          p.brand || '',
          ...(p.tags || [])
        ].join(' ').toLowerCase();
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // New arrivals filter (within past 7 days)
    if (newArrivals) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      products = products.filter(p => {
        if (!p.createdAt) return false;
        return new Date(p.createdAt).getTime() >= oneWeekAgo.getTime();
      });
    }

    if (limit && limit > 0) {
      products = products.slice(0, limit);
    }

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const uid = decoded.sub;
    const body = await request.json();

    const supabase = getServiceSupabase();

    // Verify user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, merchant_status')
      .eq('uid', uid)
      .maybeSingle();

    const isMerchantOrAdmin = userProfile?.role === 'merchant' || userProfile?.role === 'admin' || userProfile?.merchant_status === 'approved' || userProfile?.merchant_status === 'verified';
    if (!isMerchantOrAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only merchants or admins can create products' }, { status: 403 });
    }

    // Validation for mandatory fields
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const price = Number(body.price);
    if (body.price === undefined || body.price === null || isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'A valid product price is required' }, { status: 400 });
    }

    const category = typeof body.category === 'string' ? body.category.trim() : '';
    if (!category) {
      return NextResponse.json({ error: 'Product category is required' }, { status: 400 });
    }

    const rawImages = body.imageUrls || (body.image_url ? [body.image_url] : []);
    const validImages = Array.isArray(rawImages) ? rawImages.filter((u: any) => typeof u === 'string' && u.trim() !== '') : [];
    if (validImages.length === 0) {
      return NextResponse.json({ error: 'At least one product image is required' }, { status: 400 });
    }

    

    if (body.trackInventory !== false) {
      const stock = Number(body.stock);
      if (body.stock === undefined || body.stock === null || isNaN(stock) || stock < 0) {
        return NextResponse.json({ error: 'Stock quantity is required when inventory tracking is enabled' }, { status: 400 });
      }
    }

    if (body.hasVariants) {
      if (!Array.isArray(body.variants) || body.variants.length === 0) {
        return NextResponse.json({ error: 'At least one variant must be configured when variants are enabled' }, { status: 400 });
      }
      for (let i = 0; i < body.variants.length; i++) {
        const v = body.variants[i];
        const vPrice = Number(v.price);
        const vStock = Number(v.stock);
        if (isNaN(vPrice) || vPrice < 0) {
          return NextResponse.json({ error: `Variant #${i + 1} must have a valid price` }, { status: 400 });
        }
        if (body.trackInventory !== false && (isNaN(vStock) || vStock < 0)) {
          return NextResponse.json({ error: `Variant #${i + 1} must have a valid stock quantity` }, { status: 400 });
        }
      }
    }

    const productId = body.id ? body.id.toString() : Date.now().toString();

    // Check if existing product exists to preserve merchant_id or verify ownership
    const { data: existingProd } = await supabase
      .from('products')
      .select('merchant_id')
      .eq('id', productId)
      .maybeSingle();

    if (existingProd && existingProd.merchant_id !== uid && userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: You do not own this product' }, { status: 403 });
    }

    const merchantIdToUse = existingProd ? existingProd.merchant_id : uid;

    const productPayload = {
      id: productId,
      merchant_id: merchantIdToUse,

      name: body.name || '',
      short_description: body.shortDescription || '',
      description: body.description || '',
      sku: body.sku || '',
      supplier_name: body.supplierName || body.supplier_name || '',
      cost_price: body.costPrice !== undefined && body.costPrice !== null && body.costPrice !== '' ? Number(body.costPrice) : null,
      price: Number(body.price || 0),
      sale_price: body.salePrice ? Number(body.salePrice) : null,
      sale_start_date: body.saleStartDate || null,
      sale_end_date: body.saleEndDate || null,
      discount: body.discount ? Number(body.discount) : null,
      brand: body.brand || '',
      country_of_origin: body.countryOfOrigin || '',
      currency: body.currency || 'XAF',
      track_inventory: body.trackInventory !== false,
      stock: body.stock !== undefined && body.stock !== null && body.stock !== '' ? Number(body.stock) : 0,
      low_stock_alert: body.lowStockAlert || false,
      allow_backorders: body.allowBackorders || false,
      group_category: body.groupCategory || '',
      category: body.category || '',
      subcategories: body.subcategories || [],
      image_urls: body.imageUrls || (body.image_url ? [body.image_url] : []),
      image_alt_texts: body.imageAltTexts || {},
      allow_multiple_purchases: body.allowMultiplePurchases !== false,
      video_url: body.videoUrl || '',
      tags: body.tags || [],
      features: body.features || [],
      labels: body.labels || [],
      colors: body.colors || [],
      sizes: body.sizes || [],
      grades: body.grades || [],
      has_variants: body.hasVariants || (body.variants && body.variants.length > 0) || false,
      
      created_at: existingProd ? undefined : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedProduct, error: prodError } = await supabase
      .from('products')
      .upsert(productPayload)
      .select()
      .single();

    if (prodError) {
      console.error('Error inserting product:', prodError);
      return NextResponse.json({ error: prodError.message }, { status: 500 });
    }

    // Always clear old variants first to ensure accurate state
    await supabase.from('product_variants').delete().eq('product_id', productId);

    // Insert new variants if present and hasVariants is enabled
    if (body.hasVariants && body.variants && Array.isArray(body.variants) && body.variants.length > 0) {
      const variantRows = body.variants.map((v: any, index: number) => ({
        id: v.id || `${productId}_v${index}_${Date.now()}`,
        product_id: productId,
        size: v.size || '',
        color: v.color || '',
        price: Number(v.price || productPayload.price),
        stock: v.stock !== undefined && v.stock !== null && v.stock !== '' ? Number(v.stock) : productPayload.stock,
        image_url: v.imageUrl || v.image_url || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantRows);

      if (variantError) {
        console.error('Error inserting variants:', variantError);
      }
    }

    return NextResponse.json({ success: true, product: mapDbProductToProduct(insertedProduct, (body.hasVariants && body.variants) ? body.variants : [], userProfile) });
  } catch (error: any) {
    console.error('Error in POST /api/products:', error);
    return NextResponse.json({ error: error.message || 'Failed to save product' }, { status: 500 });
  }
}
