import { TrackingEventType, ProductAnalytics } from '@/lib/analytics/popularity';

export type { TrackingEventType, ProductAnalytics };

export interface TrackEventResponse {
  success: boolean;
  message?: string;
  data?: {
    productId: string;
    event: TrackingEventType;
    views: number;
    cartAdditions: number;
    wishlistAdditions: number;
    purchases: number;
    popularityScore: number;
    updatedAt?: string;
  };
  error?: string;
}

/**
 * Sends a tracking event to the tracking API endpoint (/api/analytics/track).
 * Non-blocking by design for smooth UI interactions.
 */
export const trackProductEvent = async (
  productId: string | number,
  event: TrackingEventType,
  quantity: number = 1
): Promise<TrackEventResponse | null> => {
  if (
    productId === undefined ||
    productId === null ||
    typeof productId === 'object' ||
    typeof productId === 'symbol' ||
    String(productId).trim() === ''
  ) {
    return null;
  }

  const cleanProductId = String(productId).trim();
  const parsedQty = parseInt(String(quantity), 10);
  const cleanQuantity = Math.max(1, Math.min(100000, Number.isFinite(parsedQty) ? parsedQty : 1));

  try {
    const res = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: cleanProductId,
        event,
        quantity: cleanQuantity
      })
    });

    if (res.ok) {
      return (await res.json()) as TrackEventResponse;
    }
    return null;
  } catch (error) {
    // Non-critical tracking call; log warning but don't disrupt user experience
    console.warn(`[Analytics] Failed to track ${event} for product ${cleanProductId}:`, error);
    return null;
  }
};

/**
 * Convenient wrapper to fire a product view event.
 */
export const trackProductView = (productId: string | number): Promise<TrackEventResponse | null> => {
  return trackProductEvent(productId, 'view', 1);
};

/**
 * Convenient wrapper to fire an add-to-cart tracking event.
 */
export const trackAddToCart = (productId: string | number, quantity: number = 1): Promise<TrackEventResponse | null> => {
  return trackProductEvent(productId, 'cart_add', quantity);
};

/**
 * Convenient wrapper to fire a wishlist-add tracking event.
 */
export const trackAddToWishlist = (productId: string | number): Promise<TrackEventResponse | null> => {
  return trackProductEvent(productId, 'wishlist_add', 1);
};

/**
 * Convenient wrapper to fire a purchase tracking event.
 */
export const trackPurchase = (productId: string | number, quantity: number = 1): Promise<TrackEventResponse | null> => {
  return trackProductEvent(productId, 'purchase', quantity);
};

/**
 * Fetches analytics data for a specific product.
 */
export const getProductAnalytics = async (productId: string | number): Promise<ProductAnalytics | null> => {
  if (
    productId === undefined ||
    productId === null ||
    typeof productId === 'object' ||
    typeof productId === 'symbol' ||
    String(productId).trim() === ''
  ) {
    return null;
  }

  try {
    const res = await fetch(`/api/analytics/track?productId=${encodeURIComponent(String(productId).trim())}`);
    if (res.ok) {
      const data = await res.json();
      return data.analytics || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    return null;
  }
};

/**
 * Fetches top products ranked by popularity score or another metric.
 */
export const getTopProductAnalytics = async (
  limit: number = 10,
  sortBy: 'popularity_score' | 'views' | 'cart_additions' | 'wishlist_additions' | 'purchases' = 'popularity_score'
): Promise<ProductAnalytics[]> => {
  try {
    const cleanLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? Math.floor(limit) : 10));
    const res = await fetch(`/api/analytics/track?limit=${cleanLimit}&sortBy=${encodeURIComponent(sortBy)}`);
    if (res.ok) {
      const data = await res.json();
      return (data.analytics || []) as ProductAnalytics[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching top product analytics:', error);
    return [];
  }
};
