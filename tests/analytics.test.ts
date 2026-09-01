import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePopularityScore,
  normalizeTrackingEventType,
  POPULARITY_WEIGHTS
} from '../src/lib/analytics/popularity';
import { POST, GET } from '../src/app/api/analytics/track/route';

describe('Popularity Score Algorithm', () => {
  it('should verify defined weights', () => {
    assert.equal(POPULARITY_WEIGHTS.VIEW, 1.0);
    assert.equal(POPULARITY_WEIGHTS.WISHLIST_ADD, 3.0);
    assert.equal(POPULARITY_WEIGHTS.CART_ADD, 5.0);
    assert.equal(POPULARITY_WEIGHTS.PURCHASE, 10.0);
  });

  it('should return 0 when all metrics are 0 or empty', () => {
    assert.equal(calculatePopularityScore({}), 0);
    assert.equal(calculatePopularityScore({ views: 0, wishlistAdditions: 0, cartAdditions: 0, purchases: 0 }), 0);
    assert.equal(calculatePopularityScore({ views: null, wishlistAdditions: null, cartAdditions: null, purchases: null }), 0);
  });

  it('should calculate popularity score correctly for single metric increments', () => {
    // 10 views = 10 * 1 = 10
    assert.equal(calculatePopularityScore({ views: 10 }), 10);
    // 5 wishlist additions = 5 * 3 = 15
    assert.equal(calculatePopularityScore({ wishlistAdditions: 5 }), 15);
    // 4 cart additions = 4 * 5 = 20
    assert.equal(calculatePopularityScore({ cartAdditions: 4 }), 20);
    // 3 purchases = 3 * 10 = 30
    assert.equal(calculatePopularityScore({ purchases: 3 }), 30);
  });

  it('should calculate combined weighted popularity score accurately', () => {
    // 100 views (100) + 20 wishlists (60) + 10 cart adds (50) + 5 purchases (50) = 260.00
    const score = calculatePopularityScore({
      views: 100,
      wishlistAdditions: 20,
      cartAdditions: 10,
      purchases: 5
    });
    assert.equal(score, 260);
  });

  it('should handle negative numbers safely by clamping to 0', () => {
    const score = calculatePopularityScore({
      views: -10,
      wishlistAdditions: -5,
      cartAdditions: 10,
      purchases: 2
    });
    // 0 + 0 + (10*5) + (2*10) = 70
    assert.equal(score, 70);
  });
});

describe('Event Type Normalization', () => {
  it('should normalize view events', () => {
    assert.equal(normalizeTrackingEventType('view'), 'view');
    assert.equal(normalizeTrackingEventType('views'), 'view');
    assert.equal(normalizeTrackingEventType('product_view'), 'view');
    assert.equal(normalizeTrackingEventType('VIEW'), 'view');
    assert.equal(normalizeTrackingEventType('  view  '), 'view');
  });

  it('should normalize cart_add events', () => {
    assert.equal(normalizeTrackingEventType('cart_add'), 'cart_add');
    assert.equal(normalizeTrackingEventType('cart_addition'), 'cart_add');
    assert.equal(normalizeTrackingEventType('cart'), 'cart_add');
    assert.equal(normalizeTrackingEventType('add_to_cart'), 'cart_add');
    assert.equal(normalizeTrackingEventType('cart_adds'), 'cart_add');
    assert.equal(normalizeTrackingEventType('CART_ADD'), 'cart_add');
  });

  it('should normalize wishlist_add events', () => {
    assert.equal(normalizeTrackingEventType('wishlist_add'), 'wishlist_add');
    assert.equal(normalizeTrackingEventType('wishlist_addition'), 'wishlist_add');
    assert.equal(normalizeTrackingEventType('wishlist'), 'wishlist_add');
    assert.equal(normalizeTrackingEventType('add_to_wishlist'), 'wishlist_add');
    assert.equal(normalizeTrackingEventType('wishlist_adds'), 'wishlist_add');
  });

  it('should normalize purchase events', () => {
    assert.equal(normalizeTrackingEventType('purchase'), 'purchase');
    assert.equal(normalizeTrackingEventType('purchases'), 'purchase');
    assert.equal(normalizeTrackingEventType('order'), 'purchase');
    assert.equal(normalizeTrackingEventType('buy'), 'purchase');
    assert.equal(normalizeTrackingEventType('purchased'), 'purchase');
  });

  it('should reject unsupported or invalid events', () => {
    assert.equal(normalizeTrackingEventType('unknown_event'), null);
    assert.equal(normalizeTrackingEventType(''), null);
    assert.equal(normalizeTrackingEventType(null), null);
    assert.equal(normalizeTrackingEventType(undefined), null);
    assert.equal(normalizeTrackingEventType(123), null);
    assert.equal(normalizeTrackingEventType({}), null);
  });
});

describe('Tracking API Route Handlers (POST /api/analytics/track)', () => {
  it('should reject invalid JSON body with 400', async () => {
    const fakeRequest = new Request('http://localhost/api/analytics/track', {
      method: 'POST',
      body: 'invalid-json-string'
    });

    const response = await POST(fakeRequest);
    assert.equal(response.status, 400);
    const data = await response.json();
    assert.match(data.error, /Invalid JSON/i);
  });

  it('should reject missing productId with 400', async () => {
    const fakeRequest = new Request('http://localhost/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'view' })
    });

    const response = await POST(fakeRequest);
    assert.equal(response.status, 400);
    const data = await response.json();
    assert.match(data.error, /productId is required/i);
  });

  it('should reject invalid event type with 400', async () => {
    const fakeRequest = new Request('http://localhost/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'prod_123', event: 'random_bad_event' })
    });

    const response = await POST(fakeRequest);
    assert.equal(response.status, 400);
    const data = await response.json();
    assert.match(data.error, /Invalid event type/i);
  });
});
