export interface ProductImageSearchResult {
  url: string;
  thumbnail?: string;
  title?: string;
  source?: string;
}

export async function searchProductImages(query: string, count: number = 6): Promise<ProductImageSearchResult[]> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  const results: ProductImageSearchResult[] = [];

  // 1. Check Google Custom Search Engine (if configured)
  const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_CSE_KEY;
  const googleCx = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CSE_ID || process.env.GOOGLE_SEARCH_CX;

  if (googleApiKey && googleCx) {
    try {
      const url = `https://customsearch.googleapis.com/customsearch/v1?cx=${googleCx}&q=${encodeURIComponent(cleanQuery)}&searchType=image&key=${googleApiKey}&num=${Math.min(count, 10)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.items)) {
          for (const item of data.items) {
            if (item.link) {
              results.push({
                url: item.link,
                thumbnail: item.image?.thumbnailLink || item.link,
                title: item.title || cleanQuery,
                source: 'Google',
              });
            }
          }
          if (results.length > 0) return results.slice(0, count);
        }
      }
    } catch (err) {
      console.warn('Google Custom Search error:', err);
    }
  }

  // 2. Check SerpApi (if configured)
  const serpApiKey = process.env.SERPAPI_API_KEY;
  if (serpApiKey) {
    try {
      const url = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(cleanQuery)}&api_key=${serpApiKey}&num=${count}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.images_results)) {
          for (const item of data.images_results) {
            if (item.original) {
              results.push({
                url: item.original,
                thumbnail: item.thumbnail || item.original,
                title: item.title || cleanQuery,
                source: 'SerpApi',
              });
            }
          }
          if (results.length > 0) return results.slice(0, count);
        }
      }
    } catch (err) {
      console.warn('SerpApi search error:', err);
    }
  }

  // 3. Check Unsplash (if configured)
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashKey) {
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(cleanQuery)}&per_page=${count}&client_id=${unsplashKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.results)) {
          for (const item of data.results) {
            if (item.urls?.regular) {
              results.push({
                url: item.urls.regular,
                thumbnail: item.urls.small || item.urls.thumb,
                title: item.description || item.alt_description || cleanQuery,
                source: 'Unsplash',
              });
            }
          }
          if (results.length > 0) return results.slice(0, count);
        }
      }
    } catch (err) {
      console.warn('Unsplash search error:', err);
    }
  }

  // 4. Open Wikimedia Commons search (free zero-config fallback)
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrlimit=${count * 2}&prop=imageinfo&iiprop=url|mime&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ShopApp/1.0 (contact@example.com)' },
    });
    if (res.ok) {
      const data: any = await res.json();
      const pages = data.query?.pages || {};
      for (const pId of Object.keys(pages)) {
        const info = pages[pId]?.imageinfo?.[0];
        const mime = info?.mime || '';
        if (info?.url && (mime.includes('image/jpeg') || mime.includes('image/png') || mime.includes('image/webp'))) {
          if (!info.url.endsWith('.svg') && !info.url.includes('Symbol') && !info.url.includes('Icon')) {
            results.push({
              url: info.url,
              thumbnail: info.url,
              title: pages[pId]?.title || cleanQuery,
              source: 'Wikimedia',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Open image search fallback error:', err);
  }

  return results.slice(0, count);
}
