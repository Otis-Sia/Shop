/**
 * Centralized error message mapping for user-facing error display.
 * Translates raw Firebase auth codes, Supabase/Postgres error codes,
 * and other technical error strings into clear, human-readable messages.
 */

// Firebase Auth error codes to friendly messages
const FIREBASE_AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
  'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  'auth/requires-recent-login': 'For security, please sign in again before making this change.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
  'auth/credential-already-in-use': 'This credential is already associated with another account.',
  'auth/expired-action-code': 'This link has expired. Please request a new one.',
  'auth/invalid-action-code': 'This link is invalid or has already been used.',
  'auth/missing-email': 'Please provide an email address.',
};

// Supabase / PostgreSQL error codes to friendly messages
const DATABASE_ERRORS: Record<string, string> = {
  '23505': 'This record already exists.',
  '23503': 'This action references data that no longer exists.',
  '23502': 'A required field is missing. Please fill in all required fields.',
  '42501': 'You do not have permission to perform this action.',
  'PGRST116': 'The requested item was not found.',
  'PGRST301': 'Connection error. Please try again.',
};

// Common technical error message patterns to friendly alternatives
const MESSAGE_PATTERNS: [RegExp, string][] = [
  [/Firebase: Error \((.+)\)\.?/i, '$1'], // Strip Firebase wrapper, will be caught by code lookup
  [/insufficient stock/i, 'Some items in your order are no longer available in the requested quantity.'],
  [/network\s*(request)?\s*(failed|error)/i, 'Network error. Please check your connection and try again.'],
  [/failed to fetch/i, 'Could not connect to the server. Please check your connection and try again.'],
  [/timeout|timed?\s*out/i, 'The request timed out. Please try again.'],
  [/unauthorized|not authenticated/i, 'Please sign in to continue.'],
  [/forbidden|not authorized/i, 'You do not have permission to perform this action.'],
  [/internal server error|500/i, 'Something went wrong on our end. Please try again later.'],
  [/bad gateway|502/i, 'Our servers are temporarily unavailable. Please try again shortly.'],
  [/service unavailable|503/i, 'The service is temporarily unavailable. Please try again shortly.'],
  [/Server returned HTML\/Text instead of JSON/i, 'Something went wrong. Please try again later.'],
];

/**
 * Extracts a Firebase auth error code from an error object or message string.
 */
function extractFirebaseCode(error: any): string | null {
  // Direct code property (e.g., error.code = 'auth/wrong-password')
  if (error?.code && typeof error.code === 'string' && error.code.startsWith('auth/')) {
    return error.code;
  }

  // Firebase wraps errors as "Firebase: Error (auth/xxx)."
  const msg = typeof error === 'string' ? error : error?.message || '';
  const match = msg.match(/\(auth\/[^)]+\)/);
  if (match) {
    return match[0].slice(1, -1); // Remove parentheses
  }

  return null;
}

/**
 * Extracts a database error code from an error object.
 */
function extractDatabaseCode(error: any): string | null {
  if (error?.code && typeof error.code === 'string') {
    if (DATABASE_ERRORS[error.code]) return error.code;
  }

  const msg = typeof error === 'string' ? error : error?.message || '';
  for (const code of Object.keys(DATABASE_ERRORS)) {
    if (msg.includes(code)) return code;
  }

  return null;
}

/**
 * Convert any error (Error object, string, Firebase error, Supabase error, etc.)
 * into a clean, user-friendly message suitable for display in the UI.
 *
 * @param error - The error to translate
 * @param fallback - Optional fallback message if no translation is found
 * @returns A user-friendly error message string
 */
export function getUserFriendlyError(error: any, fallback?: string): string {
  const defaultFallback = fallback || 'Something went wrong. Please try again.';

  if (!error) return defaultFallback;

  // 1. Check for Firebase auth code
  const firebaseCode = extractFirebaseCode(error);
  if (firebaseCode && FIREBASE_AUTH_ERRORS[firebaseCode]) {
    return FIREBASE_AUTH_ERRORS[firebaseCode];
  }

  // 2. Check for database error code
  const dbCode = extractDatabaseCode(error);
  if (dbCode && DATABASE_ERRORS[dbCode]) {
    return DATABASE_ERRORS[dbCode];
  }

  // 3. Check message against known patterns
  const msg = typeof error === 'string' ? error : error?.message || '';
  if (msg) {
    for (const [pattern, replacement] of MESSAGE_PATTERNS) {
      if (pattern.test(msg)) {
        // If the replacement contains $1, use regex replace for extraction
        if (replacement.includes('$1')) {
          const extracted = msg.replace(pattern, replacement);
          // The extracted value might be a Firebase code, try to look it up
          if (FIREBASE_AUTH_ERRORS[extracted]) {
            return FIREBASE_AUTH_ERRORS[extracted];
          }
          // Otherwise return the fallback since the raw code isn't helpful
          return defaultFallback;
        }
        return replacement;
      }
    }
  }

  // 4. If the message looks like a readable sentence (starts with uppercase, has spaces),
  //    it might already be user-friendly. Return it unless it contains suspicious patterns.
  if (msg && !looksLikeTechnicalError(msg)) {
    return msg;
  }

  return defaultFallback;
}

/**
 * Heuristic to detect if a message looks like a technical/internal error
 * rather than a user-friendly message.
 */
function looksLikeTechnicalError(msg: string): boolean {
  // Contains error codes, stack traces, or technical identifiers
  if (/\b(PGRST|auth\/|Error \(|at\s+\w+\.\w+|\.js:|\.ts:)\b/.test(msg)) return true;
  // Contains HTTP status codes in raw form
  if (/\b(status:\s*\d{3}|HTTP\s+\d{3})\b/i.test(msg)) return true;
  // Contains JSON-like structures
  if (/\{.*"error".*\}/.test(msg)) return true;
  // Overly long (likely a stack trace or raw response body)
  if (msg.length > 200) return true;
  return false;
}
