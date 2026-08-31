import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-auth-edge';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const mapDbUserToUser = (row: any) => {
  if (!row) return null;
  return {
    uid: row.uid,
    email: row.email,
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    display_name: row.display_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    username: row.username || '',
    location: row.location || '',
    phone: row.phone || '',
    role: row.role || 'customer',
    merchantStatus: row.merchant_status || null,
    storeName: row.store_name || '',
    storeDescription: row.store_description || '',
    businessCategories: row.business_categories || [],
    businessType: row.business_type || '',
    offeringType: row.offering_type || 'goods',
    industry: row.industry || '',
    storeContactEmail: row.store_contact_email || '',
    storeContactPhone: row.store_contact_phone || '',
    socialMediaLinks: row.social_media_links || {},
    logoUrl: row.logo_url || '',
    bannerUrl: row.banner_url || '',
    onboardingComplete: row.onboarding_complete || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryUid = searchParams.get('uid');

    let authenticatedUid: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await verifyIdToken(token);
        authenticatedUid = decoded.sub || null;
      } catch (err) {
        // Token verification failed or expired
      }
    }

    const targetUid = queryUid || authenticatedUid;
    if (!targetUid) {
      return NextResponse.json({ error: 'UID or valid Authorization token is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', targetUid)
      .maybeSingle();

    if (error) {
      console.error('Supabase get user error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user: mapDbUserToUser(data) });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
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

    const uid = decoded.sub;
    const body = await request.json();

    const supabase = getServiceSupabase();

    const dbPayload: any = {
      uid: uid,
      email: body.email || decoded.email || '',
      updated_at: new Date().toISOString()
    };

    if (body.first_name !== undefined) dbPayload.first_name = body.first_name;
    if (body.last_name !== undefined) dbPayload.last_name = body.last_name;
    if (body.display_name !== undefined) {
      dbPayload.display_name = body.display_name;
    } else if (body.first_name || body.last_name) {
      dbPayload.display_name = `${body.first_name || ''} ${body.last_name || ''}`.trim();
    }
    if (body.username !== undefined) dbPayload.username = body.username;
    if (body.location !== undefined) dbPayload.location = body.location;
    if (body.phone !== undefined) dbPayload.phone = body.phone;
    if (body.role !== undefined) dbPayload.role = body.role;
    if (body.merchantStatus !== undefined) dbPayload.merchant_status = body.merchantStatus;
    if (body.storeName !== undefined) dbPayload.store_name = body.storeName;
    if (body.storeDescription !== undefined) dbPayload.store_description = body.storeDescription;
    if (body.businessCategories !== undefined) dbPayload.business_categories = body.businessCategories;
    if (body.businessType !== undefined) dbPayload.business_type = body.businessType;
    if (body.offeringType !== undefined) dbPayload.offering_type = body.offeringType;
    if (body.industry !== undefined) dbPayload.industry = body.industry;
    if (body.storeContactEmail !== undefined) dbPayload.store_contact_email = body.storeContactEmail;
    if (body.storeContactPhone !== undefined) dbPayload.store_contact_phone = body.storeContactPhone;
    if (body.socialMediaLinks !== undefined) dbPayload.social_media_links = body.socialMediaLinks;
    if (body.logoUrl !== undefined) dbPayload.logo_url = body.logoUrl;
    if (body.bannerUrl !== undefined) dbPayload.banner_url = body.bannerUrl;
    if (body.onboardingComplete !== undefined) dbPayload.onboarding_complete = body.onboardingComplete;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('uid, role')
      .eq('uid', uid)
      .maybeSingle();

    let resultData;
    if (!existingUser) {
      dbPayload.created_at = new Date().toISOString();
      if (!dbPayload.role) dbPayload.role = 'customer';
      const { data, error } = await supabase
        .from('users')
        .insert(dbPayload)
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    } else {
      const { data, error } = await supabase
        .from('users')
        .update(dbPayload)
        .eq('uid', uid)
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    }

    return NextResponse.json({ success: true, user: mapDbUserToUser(resultData) });
  } catch (error: any) {
    console.error('Error saving user profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
