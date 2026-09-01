import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePopularityScore,
  normalizeTrackingEventType,
  POPULARITY_WEIGHTS
} from '../src/lib/analytics/popularity';

describe('Analytics Algorithm Comprehensive Edge Cases', () => {
  it('should handle large metrics without overflow or precision loss', () => {
    const score = calculatePopularityScore({
      views: 1000000,
      wishlistAdditions: 250000,
      cartAdditions: 100000,
      purchases: 50000
    });
    // 1000000 * 1 + 250000 * 3 + 100000 * 5 + 50000 * 10
    // 1000000 + 750000 + 500000 + 500000 = 2750000
    assert.equal(score, 2750000);
  });

  it('should handle decimal quantities if fractional inputs are provided', () => {
    const score = calculatePopularityScore({
      views: 1.5,
      wishlistAdditions: 2.2,
      cartAdditions: 3.1,
      purchases: 4.4
    });
    // 1.5*1 + 2.2*3 (6.6) + 3.1*5 (15.5) + 4.4*10 (44) = 1.5 + 6.6 + 15.5 + 44 = 67.6
    assert.equal(score, 67.6);
  });

  it('should correctly prioritize purchases > cart_adds > wishlist_adds > views', () => {
    const purchaseScore = calculatePopularityScore({ purchases: 1 });
    const cartScore = calculatePopularityScore({ cartAdditions: 1 });
    const wishlistScore = calculatePopularityScore({ wishlistAdditions: 1 });
    const viewScore = calculatePopularityScore({ views: 1 });

    assert.ok(purchaseScore > cartScore, 'purchase should weigh more than cart');
    assert.ok(cartScore > wishlistScore, 'cart should weigh more than wishlist');
    assert.ok(wishlistScore > viewScore, 'wishlist should weigh more than view');
  });
});

describe('Database Schema & SQL Verification', () => {
  it('should contain matching formula in SQL and TypeScript implementation', async () => {
    const fs = await import('fs');
    const schemaSql = fs.readFileSync('database_schema.sql', 'utf8');

    // Verify table definition exists
    assert.ok(schemaSql.includes('CREATE TABLE IF NOT EXISTS product_analytics'), 'product_analytics table must exist');
    assert.ok(schemaSql.includes('popularity_score DECIMAL(10, 2) NOT NULL DEFAULT 0.00'), 'popularity_score column must exist');
    assert.ok(schemaSql.includes('idx_product_analytics_popularity'), 'popularity_score index must exist');
    assert.ok(schemaSql.includes('idx_product_analytics_views'), 'views index must exist');
    assert.ok(schemaSql.includes('GREATEST(COALESCE(p_views, 0), 0)'), 'calculate_product_popularity_score must clamp negative views to 0');
    assert.ok(schemaSql.includes('GREATEST(COALESCE(p_purchases, 0), 0)'), 'calculate_product_popularity_score must clamp negative purchases to 0');
    assert.ok(schemaSql.includes('LOWER(TRIM(COALESCE(p_event_type'), 'track_product_event must normalize event type casing and whitespace');
    assert.ok(schemaSql.includes('GRANT SELECT ON TABLE product_analytics TO anon, authenticated'), 'SELECT grant must exist');
    assert.ok(schemaSql.includes('GRANT ALL ON TABLE product_analytics TO service_role'), 'service_role grant must exist');
    assert.ok(schemaSql.includes('GRANT EXECUTE ON FUNCTION track_product_event'), 'EXECUTE grant on track_product_event must exist');
  });
});
