import * as jose from 'jose';

// Fetch Google's public keys
const getGooglePublicKeys = async () => {
  const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if (!response.ok) {
    throw new Error('Failed to fetch Google public keys');
  }
  const keys = await response.json();
  return keys;
};

// Convert x509 cert to CryptoKey
const importPublicKey = async (pem: string) => {
  return await jose.importX509(pem, 'RS256');
};

export const verifyIdToken = async (token: string) => {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Firebase Project ID is not configured.');
  }

  // Get token header to find the kid
  const decodedHeader = jose.decodeProtectedHeader(token);
  const kid = decodedHeader.kid;
  if (!kid) {
    throw new Error('No kid found in token header.');
  }

  // Fetch public keys
  const publicKeys = await getGooglePublicKeys();
  const publicKeyPem = publicKeys[kid];

  if (!publicKeyPem) {
    throw new Error('Public key not found for the given kid.');
  }

  // Import public key
  const publicKey = await importPublicKey(publicKeyPem);

  // Verify the token
  const { payload } = await jose.jwtVerify(token, publicKey, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256'],
  });

  return payload;
};
