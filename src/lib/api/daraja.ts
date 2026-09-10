/**
 * Safaricom Daraja API Client Helper
 * Supports M-Pesa Express (STK Push), Status Query, and OAuth Bearer Token caching.
 */

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export const getDarajaBaseUrl = (): string => {
  const env = process.env.DARAJA_ENV || 'sandbox';
  return env.toLowerCase() === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
};

/**
 * Format Kenyan phone number to international 2547XXXXXXXX / 2541XXXXXXXX format
 */
export function formatMpesaPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
}

/**
 * Generate formatted timestamp: YYYYMMDDHHmmss
 */
export function getDarajaTimestamp(): string {
  const date = new Date();
  const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Generate base64 password for STK Push: base64.encode(BusinessShortCode + Passkey + Timestamp)
 */
export function generateDarajaPassword(shortCode: string, passkey: string, timestamp: string): string {
  const raw = `${shortCode}${passkey}${timestamp}`;
  return Buffer.from(raw).toString('base64');
}

/**
 * Get OAuth Bearer Token from Daraja API with in-memory caching
 */
export async function getDarajaAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const consumerKey = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('Daraja credentials missing. Please set DARAJA_CONSUMER_KEY and DARAJA_CONSUMER_SECRET.');
  }

  const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const baseUrl = getDarajaBaseUrl();

  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Daraja OAuth failed:', res.status, errorText);
    throw new Error(`Daraja OAuth authentication failed: ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to retrieve Daraja access token.');
  }

  const accessToken: string = data.access_token;
  cachedToken = accessToken;
  const expiresInSec = parseInt(data.expires_in || '3599', 10);
  tokenExpiresAt = now + expiresInSec * 1000;

  return accessToken;
}

export interface STKPushParams {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc?: string;
  callbackUrl?: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

/**
 * Initiate Lipa Na M-Pesa Online (STK Push)
 */
export async function initiateSTKPush({
  phoneNumber,
  amount,
  accountReference,
  transactionDesc = 'Online Payment',
  callbackUrl,
}: STKPushParams): Promise<STKPushResponse> {
  const token = await getDarajaAccessToken();
  const baseUrl = getDarajaBaseUrl();

  const shortCode = process.env.DARAJA_BUSINESS_SHORTCODE || '174379';
  const passkey = process.env.DARAJA_PASSKEY;

  if (!passkey) {
    throw new Error('Daraja Passkey missing. Please set DARAJA_PASSKEY.');
  }

  const timestamp = getDarajaTimestamp();
  const password = generateDarajaPassword(shortCode, passkey, timestamp);
  const formattedPhone = formatMpesaPhoneNumber(phoneNumber);
  const roundAmount = Math.max(1, Math.round(amount));

  const resolvedCallback =
    callbackUrl ||
    process.env.DARAJA_CALLBACK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://juj4.cepine.com'}/api/mpesa/callback`;

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: roundAmount,
    PartyA: formattedPhone,
    PartyB: shortCode,
    PhoneNumber: formattedPhone,
    CallBackURL: resolvedCallback,
    AccountReference: accountReference.substring(0, 12),
    TransactionDesc: transactionDesc.substring(0, 13),
  };

  const res = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.ResponseCode !== '0') {
    const errorMsg = data.errorMessage || data.ResponseDescription || 'STK Push request failed';
    console.error('Daraja STK Push Error:', data);
    throw new Error(errorMsg);
  }

  return data as STKPushResponse;
}

export interface STKQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string; // "0" for success, "1032" for cancelled by user, etc.
  ResultDesc: string;
}

/**
 * Query STK Push transaction status
 */
export async function querySTKStatus(checkoutRequestId: string): Promise<STKQueryResponse> {
  const token = await getDarajaAccessToken();
  const baseUrl = getDarajaBaseUrl();

  const shortCode = process.env.DARAJA_BUSINESS_SHORTCODE || '174379';
  const passkey = process.env.DARAJA_PASSKEY;

  if (!passkey) {
    throw new Error('Daraja Passkey missing. Please set DARAJA_PASSKEY.');
  }

  const timestamp = getDarajaTimestamp();
  const password = generateDarajaPassword(shortCode, passkey, timestamp);

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const res = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return data as STKQueryResponse;
}
