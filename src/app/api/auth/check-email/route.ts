import { NextResponse } from 'next/server';
import { firestoreQuery } from '@/lib/firestore-rest';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Query Firestore users collection securely on the server
    const results = await firestoreQuery('users', {
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'email' },
                op: 'EQUAL',
                value: { stringValue: email.toLowerCase().trim() }
              }
            }
          ]
        }
      },
      limit: 1
    });

    // Run query returns an array. If no document is found, it returns [{ readTime: ... }]
    const exists = results.length > 0 && results[0].document !== undefined;

    return NextResponse.json({ exists });
  } catch (error: any) {
    console.error('Error checking email existence on server:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message || String(error) }, 
      { status: 500 }
    );
  }
}
