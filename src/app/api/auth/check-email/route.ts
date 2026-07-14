import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Query Firestore users collection securely on the server
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection('users')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();

    return NextResponse.json({ exists: !snapshot.empty });
  } catch (error: any) {
    console.error('Error checking email existence on server:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message || String(error) }, 
      { status: 500 }
    );
  }
}
