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
  const seenUrls = new Set<string>();

  const addResult = (item: ProductImageSearchResult) => {
    if (!item.url || seenUrls.has(item.url)) return;
    seenUrls.add(item.url);
    results.push(item);
  };

  // 1. Primary: Tavily Search
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  if (tavilyApiKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tavilyApiKey}`,
        },
        body: JSON.stringify({
          query: cleanQuery,
          include_images: true,
          include_image_descriptions: true,
          max_results: Math.max(count, 5),
        }),
      });

      if (res.ok) {
        const data: any = await res.json();
        const tavilyImages: any[] = [];

        if (Array.isArray(data.images)) {
          tavilyImages.push(...data.images);
        }

        if (Array.isArray(data.results)) {
          for (const r of data.results) {
            if (Array.isArray(r.images)) {
              tavilyImages.push(...r.images);
            }
          }
        }

        for (const img of tavilyImages) {
          const imgUrl = typeof img === 'string' ? img : img?.url;
          if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
            const description = typeof img === 'object' ? (img.description || cleanQuery) : cleanQuery;
            addResult({
              url: imgUrl,
              thumbnail: imgUrl,
              title: description,
              source: 'Tavily',
            });
          }
        }

        // If Tavily returned valid images, return them immediately without calling Serper
        if (results.length > 0) {
          return results.slice(0, count);
        }
      } else {
        console.warn(`Tavily search returned status ${res.status}, failing over to Serper.`);
      }
    } catch (err) {
      console.warn('Tavily search error, failing over to Serper:', err);
    }
  }

  // 2. Failover: Serper.dev Google Images (called ONLY if Tavily failed or returned 0 images)
  const serperApiKey = process.env.SERPER_API_KEY;
  if (serperApiKey) {
    try {
      const res = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: cleanQuery, num: count }),
      });

      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.images) && data.images.length > 0) {
          for (const item of data.images) {
            if (item.imageUrl) {
              addResult({
                url: item.imageUrl,
                thumbnail: item.thumbnailUrl || item.imageUrl,
                title: item.title || cleanQuery,
                source: 'Serper',
              });
            }
          }

          if (results.length > 0) {
            return results.slice(0, count);
          }
        }
      } else {
        console.warn(`Serper search returned status ${res.status}, failing over to secondary providers.`);
      }
    } catch (err) {
      console.warn('Serper search error, failing over to secondary providers:', err);
    }
  }

  // 3. Secondary Failover: Google Custom Search Engine
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
              addResult({
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

  // 4. Secondary Failover: Brave Search
  const braveApiKey = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY;
  if (braveApiKey) {
    try {
      const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(cleanQuery)}&count=${Math.min(count, 20)}&safesearch=strict`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveApiKey,
        },
      });

      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.results)) {
          for (const item of data.results) {
            const directUrl = item.properties?.url || item.url;
            const thumbUrl = item.thumbnail?.src || directUrl;
            if (directUrl) {
              addResult({
                url: directUrl,
                thumbnail: thumbUrl,
                title: item.title || cleanQuery,
                source: 'Brave',
              });
            }
          }
          if (results.length > 0) return results.slice(0, count);
        }
      }
    } catch (err) {
      console.warn('Brave Search error:', err);
    }
  }

  // 5. Secondary Failover: SerpApi
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
              addResult({
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

  // 6. Secondary Failover: Unsplash
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
              addResult({
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

  if (results.length > 0) {
    return results.slice(0, count);
  }

  // 7. Last-Resort: Open Wikimedia Commons
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
            addResult({
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
