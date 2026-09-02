import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { escape } from 'querystring';

export const dynamic = 'force-dynamic';

function escapeXml(unsafe: string) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function GET(req: Request) {
  try {
    const supabase = getServiceSupabase();
    
    // Fetch products
    const { data: products, error } = await supabase
      .from('products')
      .select('*');

    if (error) {
      console.error('Error fetching products for GMC feed:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    // Get base URL
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Shop Products</title>
    <link>${baseUrl}</link>
    <description>Product feed for Google Merchant Center</description>
`;

    if (products && products.length > 0) {
      for (const product of products) {
        // Calculate price and sale price
        const price = Number(product.price || 0).toFixed(2);
        const salePrice = product.sale_price ? Number(product.sale_price).toFixed(2) : null;
        const currency = product.currency || 'KES'; 

        const link = `${baseUrl}/products/${product.id}`;
        const imageUrls = product.image_urls || [];
        const mainImage = imageUrls.length > 0 ? imageUrls[0] : (product.image_url || '');

        const availability = (product.track_inventory && product.stock <= 0) ? 'out of stock' : 'in stock';

        // Basic fields
        xml += `    <item>
      <g:id>${escapeXml(String(product.id))}</g:id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${escapeXml(product.description || product.short_description || '')}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price} ${currency}</g:price>
`;

        if (salePrice) {
          xml += `      <g:sale_price>${salePrice} ${currency}</g:sale_price>\n`;
        }
        
        if (product.brand && product.brand.toLowerCase() !== 'generic') {
          xml += `      <g:brand>${escapeXml(product.brand)}</g:brand>\n`;
        }

        if (product.sku) {
           xml += `      <g:mpn>${escapeXml(product.sku)}</g:mpn>\n`;
        }

        xml += `    </item>\n`;
      }
    }

    xml += `  </channel>\n</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Failed to generate Google Merchant Feed:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
