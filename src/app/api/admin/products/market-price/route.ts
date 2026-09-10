import { NextResponse } from 'next/server';
import { researchKenyanMarketPrice } from '@/lib/pricing/market-research';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { productName, brand, costPrice } = await req.json();

    if (!productName || !productName.trim()) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }

    const research = await researchKenyanMarketPrice(productName, brand, costPrice ? Number(costPrice) : undefined);
    return NextResponse.json({ success: true, data: research });
  } catch (error: any) {
    console.error('Market Price Research Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to research market price' }, { status: 500 });
  }
}
