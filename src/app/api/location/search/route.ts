import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface LocationSearchResult {
  id: string;
  displayName: string;
  street: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  postalCode: string;
  latitude: string;
  longitude: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 5, 1), 10);
    const countryCodes = searchParams.get('countrycodes') || '';

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&addressdetails=1&limit=${limit}`;

    if (countryCodes) {
      url += `&countrycodes=${encodeURIComponent(countryCodes)}`;
    }

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'JUJ4-Shop-Platform/1.0 (https://juj4.cepine.com; contact@juj4.cepine.com)',
      },
      next: { revalidate: 3600 } // Cache results for 1 hour
    });

    if (!response.ok) {
      console.error('Nominatim search failed:', response.status, response.statusText);
      return NextResponse.json({ results: [], error: 'Failed to query location provider' }, { status: 502 });
    }

    const data = await response.json();

    const results: LocationSearchResult[] = (Array.isArray(data) ? data : []).map((item: any) => {
      const addr = item.address || {};
      const road = addr.road || addr.pedestrian || addr.street || addr.neighbourhood || addr.suburb || '';
      const houseNumber = addr.house_number || '';
      const street = road ? `${houseNumber} ${road}`.trim() : (item.display_name || '').split(',')[0].trim();
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
      const state = addr.state || addr.region || addr.province || '';
      const country = addr.country || '';
      const countryCode = (addr.country_code || '').toUpperCase();
      const postalCode = addr.postcode || '';

      return {
        id: String(item.place_id || item.osm_id || Math.random()),
        displayName: item.display_name,
        street,
        city,
        state,
        country,
        countryCode,
        postalCode,
        latitude: item.lat,
        longitude: item.lon,
      };
    });

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Location search API error:', error);
    return NextResponse.json({ results: [], error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
