import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const { error } = await supabase.from('contact_messages').insert({
      id,
      name,
      email,
      message,
      created_at: new Date().toISOString()
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Message sent successfully' });
  } catch (error: any) {
    console.error('Error submitting contact message:', error);
    return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 });
  }
}
