/**
 * Pesapal v3 API integration helper
 * Documentation: https://developer.pesapal.com/
 */

interface PesapalAuthResponse {
  token: string;
  expiryDate: string;
  error?: string | null;
  status: string;
  message?: string;
}

interface PesapalIPNRegistrationResponse {
  url: string;
  created_date: string;
  ipn_id: string;
  error?: any;
  status: string;
}

export interface PesapalOrderRequest {
  id: string; // Merchant Reference (checkoutId or orderId)
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  notification_id: string;
  billing_address: {
    email_address: string;
    phone_number?: string;
    country_code?: string;
    first_name: string;
    last_name?: string;
    line_1?: string;
    line_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    zip_code?: string;
  };
}

export interface PesapalOrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
  error?: any;
  status: string;
}

export interface PesapalTransactionStatusResponse {
  payment_method: string;
  amount: number;
  created_date: string;
  confirmation_code: string;
  payment_status_description: string;
  description: string;
  message: string;
  payment_account: string;
  call_back_url: string;
  status_code: number; // 0 = INVALID, 1 = COMPLETED, 2 = FAILED, 3 = REVERSED
  merchant_reference: string;
  payment_status_code: string;
  currency: string;
  error?: any;
  status: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export const getPesapalBaseUrl = (): string => {
  const env = process.env.PESAPAL_ENV || 'sandbox';
  return env.toLowerCase() === 'production'
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';
};

/**
 * Obtain or reuse cached Pesapal v3 OAuth Bearer Token
 */
export async function getPesapalAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;

  if (!key || !secret) {
    throw new Error('Pesapal credentials missing. Please set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET.');
  }

  const baseUrl = getPesapalBaseUrl();
  const res = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      consumer_key: key,
      consumer_secret: secret
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Pesapal Auth Request failed:', res.status, errorText);
    throw new Error(`Pesapal authentication failed: ${res.statusText}`);
  }

  const data: PesapalAuthResponse = await res.json();
  if (!data.token) {
    throw new Error(data.message || 'Failed to retrieve Pesapal token');
  }

  cachedToken = data.token;
  const expiryTimestamp = data.expiryDate ? new Date(data.expiryDate).getTime() : now + 5 * 60 * 1000;
  tokenExpiresAt = expiryTimestamp;

  return cachedToken;
}

/**
 * Register IPN URL with Pesapal and return notification_id
 */
export async function registerPesapalIPN(ipnUrl: string): Promise<string> {
  const token = await getPesapalAuthToken();
  const baseUrl = getPesapalBaseUrl();

  const res = await fetch(`${baseUrl}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'POST'
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Pesapal IPN registration failed:', res.status, errorText);
    throw new Error(`Failed to register Pesapal IPN: ${errorText}`);
  }

  const data: PesapalIPNRegistrationResponse = await res.json();
  return data.ipn_id;
}

/**
 * Submit Order Request to Pesapal
 */
export async function submitPesapalOrder(orderRequest: PesapalOrderRequest): Promise<PesapalOrderResponse> {
  const token = await getPesapalAuthToken();
  const baseUrl = getPesapalBaseUrl();

  const res = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(orderRequest)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Pesapal SubmitOrderRequest failed:', res.status, errorText);
    throw new Error(`Failed to submit Pesapal order: ${errorText}`);
  }

  const data: PesapalOrderResponse = await res.json();
  if (!data.order_tracking_id || !data.redirect_url) {
    throw new Error(data.error?.message || 'Pesapal did not return tracking ID or redirect URL');
  }

  return data;
}

/**
 * Check Transaction Status from Pesapal
 */
export async function getPesapalTransactionStatus(orderTrackingId: string): Promise<PesapalTransactionStatusResponse> {
  const token = await getPesapalAuthToken();
  const baseUrl = getPesapalBaseUrl();

  const res = await fetch(`${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Pesapal GetTransactionStatus failed:', res.status, errorText);
    throw new Error(`Failed to get Pesapal transaction status: ${errorText}`);
  }

  const data: PesapalTransactionStatusResponse = await res.json();
  return data;
}
