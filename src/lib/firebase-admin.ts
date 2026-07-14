import * as admin from 'firebase-admin';
import { getApps, cert, initializeApp as initAdminApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const initializeApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Ensure these are set in your .env.local without the NEXT_PUBLIC_ prefix
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Replace actual literal \n with newline characters for the private key, and strip extra quotes
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase Admin credentials are not fully set in environment variables.');
  }

  return initAdminApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
};

export const adminApp = initializeApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
