import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { trackProductView, trackAddToCart, trackAddToWishlist, trackPurchase, getProductAnalytics } from '../src/lib/api/analytics';

describe('Client-Side Analytics Helpers', () => {
  it('should return null when productId is empty or missing or whitespace', async () => {
    assert.equal(await trackProductView(''), null);
    assert.equal(await trackProductView('   '), null);
    assert.equal(await trackProductView(null as any), null);
    assert.equal(await trackProductView(undefined as any), null);

    assert.equal(await trackAddToCart(''), null);
    assert.equal(await trackAddToCart('   '), null);

    assert.equal(await trackAddToWishlist(''), null);
    assert.equal(await trackAddToWishlist('   '), null);

    assert.equal(await trackPurchase(''), null);
    assert.equal(await trackPurchase('   '), null);
  });

  it('should format fetch request correctly when calling trackProductView', async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = '';
    let requestedOptions: any = null;

    globalThis.fetch = (async (url: string, options: any) => {
      requestedUrl = url;
      requestedOptions = options;
      return {
        ok: true,
        json: async () => ({
          success: true,
          message: 'Event tracked successfully',
          data: {
            productId: 'prod_999',
            event: 'view',
            views: 1,
            cartAdditions: 0,
            wishlistAdditions: 0,
            purchases: 0,
            popularityScore: 1.0
          }
        })
      };
    }) as any;

    try {
      const result = await trackProductView('prod_999');
      assert.equal(requestedUrl, '/api/analytics/track');
      assert.equal(requestedOptions.method, 'POST');
      assert.equal(requestedOptions.headers['Content-Type'], 'application/json');
      const body = JSON.parse(requestedOptions.body);
      assert.equal(body.productId, 'prod_999');
      assert.equal(body.event, 'view');
      assert.equal(body.quantity, 1);
      assert.equal(result?.success, true);
      assert.equal(result?.data?.popularityScore, 1.0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should format fetch request correctly when calling trackAddToCart', async () => {
    const originalFetch = globalThis.fetch;
    let requestedOptions: any = null;

    globalThis.fetch = (async (url: string, options: any) => {
      requestedOptions = options;
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { productId: 'prod_100', event: 'cart_add', popularityScore: 5.0 }
        })
      };
    }) as any;

    try {
      const result = await trackAddToCart('prod_100', 3);
      const body = JSON.parse(requestedOptions.body);
      assert.equal(body.productId, 'prod_100');
      assert.equal(body.event, 'cart_add');
      assert.equal(body.quantity, 3);
      assert.equal(result?.success, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should format fetch request correctly when calling trackAddToWishlist', async () => {
    const originalFetch = globalThis.fetch;
    let requestedOptions: any = null;

    globalThis.fetch = (async (url: string, options: any) => {
      requestedOptions = options;
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { productId: 'prod_wish', event: 'wishlist_add', popularityScore: 3.0 }
        })
      };
    }) as any;

    try {
      const result = await trackAddToWishlist('prod_wish');
      const body = JSON.parse(requestedOptions.body);
      assert.equal(body.productId, 'prod_wish');
      assert.equal(body.event, 'wishlist_add');
      assert.equal(body.quantity, 1);
      assert.equal(result?.success, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should format fetch request correctly when calling trackPurchase with numeric ID', async () => {
    const originalFetch = globalThis.fetch;
    let requestedOptions: any = null;

    globalThis.fetch = (async (url: string, options: any) => {
      requestedOptions = options;
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { productId: '555', event: 'purchase', popularityScore: 20.0 }
        })
      };
    }) as any;

    try {
      const result = await trackPurchase(555, 2);
      const body = JSON.parse(requestedOptions.body);
      assert.equal(body.productId, '555');
      assert.equal(body.event, 'purchase');
      assert.equal(body.quantity, 2);
      assert.equal(result?.success, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should handle non-200 HTTP responses gracefully', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Product not found' })
      };
    }) as any;

    try {
      const result = await trackProductView('non_existent_prod');
      assert.equal(result, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should handle fetch errors gracefully without throwing', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Network offline');
    }) as any;

    try {
      const result = await trackProductView('prod_test');
      assert.equal(result, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should get product analytics via getProductAnalytics', async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = '';

    globalThis.fetch = (async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({
          analytics: {
            productId: 'prod_42',
            views: 50,
            cartAdditions: 10,
            wishlistAdditions: 5,
            purchases: 2,
            popularityScore: 135.0
          }
        })
      };
    }) as any;

    try {
      const analytics = await getProductAnalytics('prod_42');
      assert.equal(requestedUrl, '/api/analytics/track?productId=prod_42');
      assert.equal(analytics?.productId, 'prod_42');
      assert.equal(analytics?.views, 50);
      assert.equal(analytics?.popularityScore, 135.0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
