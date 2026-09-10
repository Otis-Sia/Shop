import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Location, City, and Country API Routes', () => {
  it('should return empty results when search query is empty or too short', async () => {
    const { GET } = await import('../src/app/api/location/search/route');
    
    const req1 = new Request('http://localhost:3000/api/location/search?q=');
    const res1 = await GET(req1);
    const data1 = await res1.json();
    assert.deepEqual(data1.results, []);

    const req2 = new Request('http://localhost:3000/api/location/search?query=a');
    const res2 = await GET(req2);
    const data2 = await res2.json();
    assert.deepEqual(data2.results, []);
  });

  it('should format location results cleanly when query matches', async () => {
    const { GET } = await import('../src/app/api/location/search/route');
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (url: string) => {
      return {
        ok: true,
        json: async () => [
          {
            place_id: 12345,
            display_name: 'Kimathi Street, Nairobi, Kenya',
            lat: '-1.2833',
            lon: '36.8219',
            address: {
              road: 'Kimathi Street',
              city: 'Nairobi',
              state: 'Nairobi County',
              country: 'Kenya',
              country_code: 'ke',
              postcode: '00100'
            }
          }
        ]
      };
    }) as any;

    try {
      const req = new Request('http://localhost:3000/api/location/search?query=Kimathi');
      const res = await GET(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.results.length, 1);
      assert.equal(data.results[0].street, 'Kimathi Street');
      assert.equal(data.results[0].city, 'Nairobi');
      assert.equal(data.results[0].state, 'Nairobi County');
      assert.equal(data.results[0].country, 'Kenya');
      assert.equal(data.results[0].countryCode, 'KE');
      assert.equal(data.results[0].postalCode, '00100');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should require lat and lon for reverse geocoding', async () => {
    const { GET } = await import('../src/app/api/location/reverse/route');
    
    const req = new Request('http://localhost:3000/api/location/reverse');
    const res = await GET(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'lat and lon are required');
  });

  it('should parse reverse geocoding location correctly', async () => {
    const { GET } = await import('../src/app/api/location/reverse/route');
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({
          place_id: 99999,
          display_name: 'Moi Avenue, Mombasa, Coast Province, Kenya',
          lat: '-4.0435',
          lon: '39.6682',
          address: {
            road: 'Moi Avenue',
            city: 'Mombasa',
            state: 'Coast Province',
            country: 'Kenya',
            country_code: 'ke',
            postcode: '80100'
          }
        })
      };
    }) as any;

    try {
      const req = new Request('http://localhost:3000/api/location/reverse?lat=-4.0435&lon=39.6682');
      const res = await GET(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.location.city, 'Mombasa');
      assert.equal(data.location.country, 'Kenya');
      assert.equal(data.location.countryCode, 'KE');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
