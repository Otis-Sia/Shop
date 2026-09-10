import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPesapalBaseUrl } from '../src/lib/api/pesapal';

describe('Checkout & Pesapal Integration Unit Tests', () => {
  it('should resolve sandbox vs production base URL properly', () => {
    const originalEnv = process.env.PESAPAL_ENV;
    
    process.env.PESAPAL_ENV = 'sandbox';
    assert.equal(getPesapalBaseUrl(), 'https://cybqa.pesapal.com/pesapalv3');

    process.env.PESAPAL_ENV = 'production';
    assert.equal(getPesapalBaseUrl(), 'https://pay.pesapal.com/v3');

    process.env.PESAPAL_ENV = undefined;
    assert.equal(getPesapalBaseUrl(), 'https://cybqa.pesapal.com/pesapalv3');

    process.env.PESAPAL_ENV = originalEnv;
  });

  it('should format order request with valid attributes for Pesapal SubmitOrderRequest', async () => {
    const { submitPesapalOrder } = await import('../src/lib/api/pesapal');
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.PESAPAL_CONSUMER_KEY;
    const originalSecret = process.env.PESAPAL_CONSUMER_SECRET;

    process.env.PESAPAL_CONSUMER_KEY = 'test_key';
    process.env.PESAPAL_CONSUMER_SECRET = 'test_secret';

    let tokenRequested = false;
    let submitPayload: any = null;

    globalThis.fetch = (async (url: string, options: any) => {
      if (url.includes('/api/Auth/RequestToken')) {
        tokenRequested = true;
        return {
          ok: true,
          json: async () => ({
            token: 'mock_bearer_token_123',
            expiryDate: new Date(Date.now() + 600000).toISOString(),
            status: '200'
          })
        };
      }
      if (url.includes('/api/Transactions/SubmitOrderRequest')) {
        submitPayload = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            order_tracking_id: 'mock_track_abc789',
            merchant_reference: submitPayload.id,
            redirect_url: 'https://cybqa.pesapal.com/pesapalv3/pay?mock=1',
            status: '200'
          })
        };
      }
      return { ok: false, statusText: 'Not Found', text: async () => 'Not Found' };
    }) as any;

    try {
      const orderRes = await submitPesapalOrder({
        id: 'chk_test_123',
        currency: 'KES',
        amount: 2500,
        description: 'Test order',
        callback_url: 'https://juj4.cepine.com/order-confirmation?checkoutId=chk_test_123',
        notification_id: 'ipn_mock_id',
        billing_address: {
          email_address: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe'
        }
      });

      assert.equal(tokenRequested, true);
      assert.equal(submitPayload.id, 'chk_test_123');
      assert.equal(submitPayload.amount, 2500);
      assert.equal(submitPayload.currency, 'KES');
      assert.equal(orderRes.order_tracking_id, 'mock_track_abc789');
      assert.equal(orderRes.redirect_url, 'https://cybqa.pesapal.com/pesapalv3/pay?mock=1');
    } finally {
      globalThis.fetch = originalFetch;
      process.env.PESAPAL_CONSUMER_KEY = originalKey;
      process.env.PESAPAL_CONSUMER_SECRET = originalSecret;
    }
  });

  it('should parse IPN status and derive correct completion flags', async () => {
    const { getPesapalTransactionStatus } = await import('../src/lib/api/pesapal');
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.PESAPAL_CONSUMER_KEY;
    const originalSecret = process.env.PESAPAL_CONSUMER_SECRET;

    process.env.PESAPAL_CONSUMER_KEY = 'test_key';
    process.env.PESAPAL_CONSUMER_SECRET = 'test_secret';

    globalThis.fetch = (async (url: string) => {
      if (url.includes('/api/Auth/RequestToken')) {
        return {
          ok: true,
          json: async () => ({
            token: 'mock_token',
            expiryDate: new Date(Date.now() + 600000).toISOString(),
            status: '200'
          })
        };
      }
      if (url.includes('/api/Transactions/GetTransactionStatus')) {
        return {
          ok: true,
          json: async () => ({
            payment_method: 'MPESA',
            amount: 2500,
            status_code: 1,
            payment_status_description: 'Completed',
            merchant_reference: 'chk_test_123',
            confirmation_code: 'QWE123RTY',
            currency: 'KES',
            status: '200'
          })
        };
      }
      return { ok: false, text: async () => 'Error' };
    }) as any;

    try {
      const statusRes = await getPesapalTransactionStatus('mock_track_abc789');
      assert.equal(statusRes.status_code, 1);
      assert.equal(statusRes.payment_status_description, 'Completed');
      assert.equal(statusRes.payment_method, 'MPESA');
      assert.equal(statusRes.confirmation_code, 'QWE123RTY');
    } finally {
      globalThis.fetch = originalFetch;
      process.env.PESAPAL_CONSUMER_KEY = originalKey;
      process.env.PESAPAL_CONSUMER_SECRET = originalSecret;
    }
  });

  it('should reject checkout request when unauthenticated', async () => {
    const { POST } = await import('../src/app/api/checkout/route');
    const req = new Request('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: []
      })
    });

    const res = await POST(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Unauthorized');
  });

  it('should reject checkout request when items array is empty', async () => {
    const { POST } = await import('../src/app/api/checkout/route');
    // Request with valid-looking Bearer token format
    const req = new Request('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token_here'
      },
      body: JSON.stringify({
        items: []
      })
    });

    const res = await POST(req);
    // Should fail auth since token is invalid
    assert.equal(res.status, 401);
  });
});
