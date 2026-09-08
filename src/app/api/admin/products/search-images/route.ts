import { NextResponse } from 'next/server';
import { searchProductImages } from '@/lib/images/search';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { query, count = 6 } = await req.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Search query is required.' }, { status: 400 });
    }

    const images = await searchProductImages(query, count);
    return NextResponse.json({ success: true, images });
  } catch (error: any) {
    console.error('Image Search API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to search images' }, { status: 500 });
  }
}
