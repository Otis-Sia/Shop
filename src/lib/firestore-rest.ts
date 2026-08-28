import * as jose from 'jose';

const getServiceAccountAccessToken = async () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase service account credentials are not fully set in environment variables.');
  }

  privateKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

  const privateKeyImported = await jose.importPKCS8(privateKey, 'RS256');

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new jose.SignJWT({
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/datastore',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKeyImported);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
};

export const firestoreRest = async (method: string, path: string, body?: any) => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const accessToken = await getServiceAccountAccessToken();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST error: ${response.status} - ${errorText}`);
  }

  return await response.json();
};

export const firestoreQuery = async (collection: string, query: any) => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const accessToken = await getServiceAccountAccessToken();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        ...query
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST query error: ${response.status} - ${errorText}`);
  }

  return await response.json();
};

export const firestoreCommit = async (writes: any[]) => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const accessToken = await getServiceAccountAccessToken();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST commit error: ${response.status} - ${errorText}`);
  }

  return await response.json();
};
