import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Edge runtime does not support the fs module.
  return NextResponse.json(
    { success: false, error: 'Not implemented on edge runtime' },
    { status: 501 }
  );
}
