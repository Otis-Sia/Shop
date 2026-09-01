import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch (err: any) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    
    // First, verify admin or merchant role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('uid', decoded.sub)
      .single();

    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'merchant')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, whatsapp_number, location } = body;

    // Check if supplier exists to get old name
    const { data: oldSupplier } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', id)
      .single();

    const { data: updated, error } = await supabase
        .from('suppliers')
        .update({
            name,
            whatsapp_number: whatsapp_number || '',
            location: location || '',
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    // If name changed, update products that had the old name
    if (oldSupplier && name && oldSupplier.name !== name) {
        await supabase
            .from('products')
            .update({ supplier_name: name })
            .eq('supplier_name', oldSupplier.name);
    }

    return NextResponse.json({ success: true, supplier: updated });
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: error.message || 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await context.params;
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
      }
  
      const token = authHeader.split('Bearer ')[1];
      let decoded;
      try {
        decoded = await verifyIdToken(token);
      } catch (err: any) {
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
      }
  
      const supabase = getServiceSupabase();
      
      // First, verify admin or merchant role
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('uid', decoded.sub)
        .single();
  
      if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'merchant')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
  
      const { error } = await supabase
          .from('suppliers')
          .delete()
          .eq('id', id);
  
      if (error) {
          throw error;
      }
  
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      return NextResponse.json({ error: error.message || 'Failed to delete supplier' }, { status: 500 });
    }
  }
