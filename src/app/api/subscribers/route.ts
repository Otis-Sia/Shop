import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    // Insert into contact_messages or subscribers table
    await supabase.from('contact_messages').insert({
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Newsletter Subscriber',
      email: email,
      message: 'Subscribed to newsletter',
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error: any) {
    console.error('Error in /api/subscribers:', error);
    return NextResponse.json({ error: error.message || 'Subscription failed' }, { status: 500 });
  }
}
