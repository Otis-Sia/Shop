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
  if (!productId) return null;

  try {
    const res = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: String(productId),
        event,
        quantity
      })
    });

    if (res.ok) {
      return (await res.json()) as TrackEventResponse;
    }
    return null;
  } catch (error) {
    // Non-critical tracking call; log warning but don't disrupt user experience
    console.warn(`[Analytics] Failed to track ${event} for product ${productId}:`, error);
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
  try {
    const res = await fetch(`/api/analytics/track?productId=${encodeURIComponent(String(productId))}`);
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
