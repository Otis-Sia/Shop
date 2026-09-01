export type TrackingEventType = 'view' | 'cart_add' | 'wishlist_add' | 'purchase';

export interface ProductAnalytics {
  productId: string;
  views: number;
  cartAdditions: number;
  wishlistAdditions: number;
  purchases: number;
  popularityScore: number;
  createdAt?: string;
  updatedAt?: string;
}

export const POPULARITY_WEIGHTS = {
  VIEW: 1.0,
  WISHLIST_ADD: 3.0,
  CART_ADD: 5.0,
  PURCHASE: 10.0,
} as const;

/**
 * Calculates popularity score from event metrics.
 * Formula: (views * 1) + (wishlist_additions * 3) + (cart_additions * 5) + (purchases * 10)
 */
export function calculatePopularityScore(metrics: {
  views?: number | null;
  wishlistAdditions?: number | null;
  cartAdditions?: number | null;
  purchases?: number | null;
}): number {
  const views = Math.max(0, Number(metrics.views) || 0);
  const wishlist = Math.max(0, Number(metrics.wishlistAdditions) || 0);
  const cart = Math.max(0, Number(metrics.cartAdditions) || 0);
  const purchases = Math.max(0, Number(metrics.purchases) || 0);

  const score = (
    views * POPULARITY_WEIGHTS.VIEW +
    wishlist * POPULARITY_WEIGHTS.WISHLIST_ADD +
    cart * POPULARITY_WEIGHTS.CART_ADD +
    purchases * POPULARITY_WEIGHTS.PURCHASE
  );

  return Number(score.toFixed(2));
}

/**
 * Normalizes user-provided event strings into standard TrackingEventType.
 * Accepts common event naming variants ('view', 'cart_add', 'add_to_cart', etc.).
 */
export function normalizeTrackingEventType(event: unknown): TrackingEventType | null {
  if (typeof event !== 'string') return null;
  const lower = event.trim().toLowerCase();

  if (['view', 'views', 'product_view'].includes(lower)) return 'view';
  if (['cart_add', 'cart_addition', 'cart', 'add_to_cart', 'cart_adds'].includes(lower)) return 'cart_add';
  if (['wishlist_add', 'wishlist_addition', 'wishlist', 'add_to_wishlist', 'wishlist_adds'].includes(lower)) return 'wishlist_add';
  if (['purchase', 'purchases', 'order', 'buy', 'purchased'].includes(lower)) return 'purchase';

  return null;
}
