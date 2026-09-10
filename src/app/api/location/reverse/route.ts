import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'JUJ4-Shop-Platform/1.0 (https://juj4.cepine.com; contact@juj4.cepine.com)',
      },
      next: { revalidate: 86400 } // Cache reverse lookup for 24h
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to reverse geocode location' }, { status: 502 });
    }

    const item = await response.json();
    const addr = item.address || {};
    const road = addr.road || addr.pedestrian || addr.street || addr.neighbourhood || addr.suburb || '';
    const houseNumber = addr.house_number || '';
    const street = road ? `${houseNumber} ${road}`.trim() : (item.display_name || '').split(',')[0].trim();
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
    const state = addr.state || addr.region || addr.province || '';
    const country = addr.country || '';
    const countryCode = (addr.country_code || '').toUpperCase();
    const postalCode = addr.postcode || '';

    return NextResponse.json({
      location: {
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
      }
    });
  } catch (error: any) {
    console.error('Location reverse API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
