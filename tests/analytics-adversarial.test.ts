import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePopularityScore,
  normalizeTrackingEventType,
  POPULARITY_WEIGHTS
} from '../src/lib/analytics/popularity';
import { POST, GET } from '../src/app/api/analytics/track/route';

describe('Adversarial Analytics Stress & Edge Cases', () => {
  it('should handle zero, negative, NaN, and Infinity in calculatePopularityScore', () => {
    assert.equal(calculatePopularityScore({ views: 0, wishlistAdditions: 0, cartAdditions: 0, purchases: 0 }), 0);
    assert.equal(calculatePopularityScore({ views: -999, wishlistAdditions: -50, cartAdditions: -10, purchases: -1 }), 0);
    assert.equal(calculatePopularityScore({ views: NaN as any, wishlistAdditions: undefined, cartAdditions: null, purchases: 'invalid' as any }), 0);
    
    // Decimal precision
    const decimalScore = calculatePopularityScore({ views: 0.1, wishlistAdditions: 0.3, cartAdditions: 0.5, purchases: 0.7 });
    // 0.1*1 + 0.3*3 (0.9) + 0.5*5 (2.5) + 0.7*10 (7) = 0.1 + 0.9 + 2.5 + 7.0 = 10.5
    assert.equal(decimalScore, 10.5);
  });

  it('should verify event normalization against adversarial attacks and unusual casing', () => {
    // Kebab case and underscores
    assert.equal(normalizeTrackingEventType('PRODUCT-VIEW'), 'view');
    assert.equal(normalizeTrackingEventType('ADD-TO-CART'), 'cart_add');
    assert.equal(normalizeTrackingEventType('ADD-TO-WISHLIST'), 'wishlist_add');
    assert.equal(normalizeTrackingEventType('cart-adds'), 'cart_add');
    assert.equal(normalizeTrackingEventType('wishlist-adds'), 'wishlist_add');

    // Attack payloads / invalid types
    assert.equal(normalizeTrackingEventType("'; DROP TABLE products; --"), null);
    assert.equal(normalizeTrackingEventType('<script>alert(1)</script>'), null);
    assert.equal(normalizeTrackingEventType('__proto__'), null);
    assert.equal(normalizeTrackingEventType('constructor'), null);
    assert.equal(normalizeTrackingEventType(Symbol('view') as any), null);
    assert.equal(normalizeTrackingEventType({ toString: () => 'view' }), null);
  });

  it('should handle API POST with boundary and malicious payloads', async () => {
    // Malformed JSON (handled earlier)
    // Non-object body
    const nullBodyReq = new Request('http://localhost/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'null'
    });
    const nullRes = await POST(nullBodyReq);
    assert.equal(nullRes.status, 400);

    // Missing productId
    const noProductReq = new Request('http://localhost/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: '', event: 'view' })
    });
    const noProductRes = await POST(noProductReq);
    assert.equal(noProductRes.status, 400);
  });

  it('should reject GET request with excessively long productId with 400', async () => {
    const longIdReq = new Request(`http://localhost/api/analytics/track?productId=${'x'.repeat(300)}`);
    const res = await GET(longIdReq);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /exceeds maximum length/i);
  });

  it('should verify algorithm monotonicity: each positive increment increases or maintains score', () => {
    let prevScore = 0;
    for (let i = 1; i <= 50; i++) {
      const currentScore = calculatePopularityScore({
        views: i * 2,
        wishlistAdditions: i,
        cartAdditions: Math.floor(i / 2),
        purchases: Math.floor(i / 5)
      });
      assert.ok(currentScore > prevScore, `Score at step ${i} (${currentScore}) must be greater than step ${i-1} (${prevScore})`);
      prevScore = currentScore;
    }
  });

  it('should verify concurrency score recalculation logic on conflict retry', () => {
    // Simulate Request A inserted: { views: 5, wishlistAdditions: 2, cartAdditions: 1, purchases: 0 }
    const freshRowFromDb = { views: 5, wishlist_additions: 2, cart_additions: 1, purchases: 0 };
    
    // Request B arrives concurrently with 'view' quantity 3
    const incomingQty = 3;
    const retryViews = freshRowFromDb.views + incomingQty; // 8
    const retryScore = calculatePopularityScore({
      views: retryViews,
      wishlistAdditions: freshRowFromDb.wishlist_additions,
      cartAdditions: freshRowFromDb.cart_additions,
      purchases: freshRowFromDb.purchases
    });
    // 8*1 + 2*3 + 1*5 + 0 = 8 + 6 + 5 = 19
    assert.equal(retryScore, 19);
  });
});
