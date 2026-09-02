import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
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

    // Get all suppliers
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    // Get all distinct supplier names from products for people who haven't been added to the suppliers table yet
    const { data: productsData } = await supabase
        .from('products')
        .select('supplier_name');

    const existingNames = new Set((suppliers || []).map(s => s.name.toUpperCase()));
    
    // Extract unique supplier names from products that aren't in the suppliers table yet
    const newSupplierNames = new Set<string>();
    if (productsData) {
        productsData.forEach(p => {
            if (p.supplier_name && p.supplier_name.trim() !== '') {
                if (!existingNames.has(p.supplier_name.toUpperCase())) {
                    newSupplierNames.add(p.supplier_name.trim());
                }
            }
        });
    }

    // Auto-create these suppliers
    const insertedSuppliers = [];
    if (newSupplierNames.size > 0) {
        const toInsert = Array.from(newSupplierNames).map(name => ({
            id: uuidv4(),
            name: name,
            whatsapp_number: '',
            location: '',
        }));

        const { data: inserted, error: insertError } = await supabase
            .from('suppliers')
            .insert(toInsert)
            .select('*');
            
        if (!insertError && inserted) {
            insertedSuppliers.push(...inserted);
        }
    }

    const allSuppliers = [...(suppliers || []), ...insertedSuppliers].sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ suppliers: allSuppliers });
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: inserted, error } = await supabase
        .from('suppliers')
        .insert({
            id: uuidv4(),
            name,
            whatsapp_number: whatsapp_number || '',
            location: location || ''
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return NextResponse.json({ success: true, supplier: inserted });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: error.message || 'Failed to create supplier' }, { status: 500 });
  }
}
