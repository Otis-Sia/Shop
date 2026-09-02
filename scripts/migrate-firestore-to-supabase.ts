import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const getServiceAccountAccessToken = async () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) must be set in .env.local');
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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get Google access token: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
};

const convertFirestoreValue = (val: any): any => {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(convertFirestoreValue);
  }
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    for (const k in val.mapValue.fields || {}) {
      res[k] = convertFirestoreValue(val.mapValue.fields[k]);
    }
    return res;
  }
  return val;
};

const parseFirestoreDocument = (doc: any) => {
  const fields = doc.fields || {};
  const data: Record<string, any> = {};
  for (const k in fields) {
    data[k] = convertFirestoreValue(fields[k]);
  }
  const id = doc.name.split('/').pop();
  return { id, ...data };
};

const fetchFirestoreCollection = async (accessToken: string, collectionId: string) => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}`;
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    if (res.status === 404) return [];
    const text = await res.text();
    console.warn(`Warning fetching collection ${collectionId}: ${res.status} - ${text}`);
    return [];
  }

  const data = await res.json();
  const docs = data.documents || [];
  return docs.map(parseFirestoreDocument);
};

const fetchFirestoreSubcollection = async (accessToken: string, parentPath: string, subcollectionId: string) => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${parentPath}/${subcollectionId}`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || []).map(parseFirestoreDocument);
};

const normalizeRole = (role: any): 'customer' | 'admin' | 'merchant' => {
  const clean = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (clean === 'admin') return 'admin';
  if (clean === 'merchant') return 'merchant';
  return 'customer';
};

const normalizeMerchantStatus = (status: any): 'pending' | 'approved' | 'rejected' | 'verified' | null => {
  const clean = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (['pending', 'approved', 'rejected', 'verified'].includes(clean)) {
    return clean as any;
  }
  return null;
};

const normalizeOrderStatus = (status: any): 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' => {
  const clean = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (clean === 'processing') return 'paid';
  if (['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(clean)) {
    return clean as any;
  }
  return 'pending';
};

const knownUserUids = new Set<string>();
const knownCartIds = new Set<string>();
const knownCheckoutIds = new Set<string>();

const ensureUserExists = async (uid: string, fallbackEmail = `${uid}@placeholder.com`, role: 'customer' | 'admin' | 'merchant' = 'customer') => {
  if (!uid || knownUserUids.has(uid)) return;
  knownUserUids.add(uid);

  const { data } = await supabase.from('users').select('uid').eq('uid', uid).maybeSingle();
  if (!data) {
    await supabase.from('users').upsert({
      uid,
      email: fallbackEmail,
      display_name: uid === 'admin' ? 'Store Admin' : 'Customer',
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
};

const ensureCartExists = async (cartId: string, userId: string) => {
  if (!cartId || knownCartIds.has(cartId)) return;
  knownCartIds.add(cartId);

  const { data } = await supabase.from('carts').select('id').eq('id', cartId).maybeSingle();
  if (!data) {
    await supabase.from('carts').upsert({
      id: cartId,
      user_id: userId,
      total_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
};

const ensureCheckoutExists = async (checkoutId: string, userId: string, totalAmount: number = 0) => {
  if (!checkoutId || knownCheckoutIds.has(checkoutId)) return;
  knownCheckoutIds.add(checkoutId);

  const { data } = await supabase.from('checkouts').select('id').eq('id', checkoutId).maybeSingle();
  if (!data) {
    await supabase.from('checkouts').upsert({
      id: checkoutId,
      user_id: userId,
      status: 'completed',
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
};

async function runMigration() {
  console.log('=== Starting Firestore to Supabase Migration ===');
  const accessToken = await getServiceAccountAccessToken();
  console.log('Successfully authenticated with Google Cloud Firestore.');

  // Pre-seed default system user stubs
  await ensureUserExists('admin', 'admin@store.com', 'admin');
  await ensureUserExists('guest', 'guest@store.com', 'customer');

  // 1. Migrate Users
  console.log('\n1. Migrating Users...');
  const users = await fetchFirestoreCollection(accessToken, 'users');
  console.log(`Found ${users.length} users in Firestore.`);
  
  for (const u of users) {
    knownUserUids.add(u.id);
    const userRow = {
      uid: u.id,
      email: u.email || `${u.id}@placeholder.com`,
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      display_name: u.displayName || u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User',
      username: u.username || null,
      location: u.location || null,
      phone: u.phone || null,
      store_name: u.storeName || null,
      store_description: u.storeDescription || null,
      business_categories: u.businessCategories || null,
      business_type: u.businessType || null,
      offering_type: u.offeringType ? u.offeringType.trim().toLowerCase() : 'goods',
      industry: u.industry || null,
      store_contact_email: u.storeContactEmail || null,
      store_contact_phone: u.storeContactPhone || null,
      social_media_links: u.socialMediaLinks || {},
      logo_url: u.logoUrl || null,
      banner_url: u.bannerUrl || null,
      onboarding_complete: u.onboardingComplete || false,
      role: normalizeRole(u.role),
      merchant_status: normalizeMerchantStatus(u.merchantStatus),
      created_at: u.createdAt || new Date().toISOString(),
      updated_at: u.updatedAt || new Date().toISOString()
    };

    const { error } = await supabase.from('users').upsert(userRow);
    if (error) console.error(`Error inserting user ${u.id}:`, error.message);
  }
  console.log('Users migration finished.');

  // 2. Migrate Products & Variants & Reviews
  console.log('\n2. Migrating Products, Variants, and Reviews...');
  const products = await fetchFirestoreCollection(accessToken, 'products');
  console.log(`Found ${products.length} products in Firestore.`);
  
  for (const p of products) {
    const merchantId = p.adminId || p.merchantId || p.merchant_id || 'admin';
    await ensureUserExists(merchantId, `${merchantId}@placeholder.com`, 'merchant');

    const imageUrls = p.imageUrls || (p.image_url ? [p.image_url] : []);

    const productRow = {
      id: p.id.toString(),
      merchant_id: merchantId,
      item_type: p.itemType || p.item_type || 'goods',
      name: p.name || 'Untitled Product',
      short_description: p.shortDescription || p.short_description || null,
      description: p.description || '',
      sku: p.sku || null,
      price: Number(p.price || 0),
      sale_price: p.salePrice ? Number(p.salePrice) : null,
      sale_start_date: p.saleStartDate || null,
      sale_end_date: p.saleEndDate || null,
      discount: p.discount ? Number(p.discount) : null,
      brand: p.brand || null,
      currency: p.currency || 'KES',
      track_inventory: p.trackInventory !== false,
      stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0,
      low_stock_alert: p.lowStockAlert || false,
      allow_backorders: p.allowBackorders || false,
      group_category: p.groupCategory || null,
      category: p.category || 'General',
      subcategories: p.subcategories || [],
      image_urls: imageUrls,
      image_alt_texts: p.imageAltTexts || {},
      allow_multiple_purchases: p.allowMultiplePurchases !== false,
      video_url: p.videoUrl || null,
      tags: p.tags || [],
      labels: p.labels || [],
      colors: p.colors || [],
      sizes: p.sizes || [],
      has_variants: p.hasVariants || false,
      duration: p.duration ? Number(p.duration) : null,
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: p.updatedAt || new Date().toISOString()
    };

    const { error: pError } = await supabase.from('products').upsert(productRow);
    if (pError) console.error(`Error inserting product ${p.id}:`, pError.message);

    // Subcollection: variants
    const variants = await fetchFirestoreSubcollection(accessToken, `products/${p.id}`, 'variants');
    for (const v of variants) {
      const vRow = {
        id: v.id,
        product_id: p.id.toString(),
        size: v.size || null,
        color: v.color || null,
        price: Number(v.price || productRow.price),
        stock: v.stock !== undefined ? Number(v.stock) : productRow.stock,
        image_url: v.imageUrl || v.image_url || null,
        created_at: v.createdAt || new Date().toISOString(),
        updated_at: v.updatedAt || new Date().toISOString()
      };
      const { error: vError } = await supabase.from('product_variants').upsert(vRow);
      if (vError) console.error(`Error inserting variant ${v.id}:`, vError.message);
    }

    // Subcollection: reviews
    const reviews = await fetchFirestoreSubcollection(accessToken, `products/${p.id}`, 'reviews');
    for (const r of reviews) {
      const reviewerUid = r.userId || r.user_id || merchantId;
      await ensureUserExists(reviewerUid);
      const rRow = {
        id: r.id,
        product_id: p.id.toString(),
        user_id: reviewerUid,
        rating: Number(r.rating || 5),
        comment: r.comment || '',
        created_at: r.createdAt || new Date().toISOString()
      };
      const { error: rError } = await supabase.from('product_reviews').upsert(rRow);
      if (rError) console.error(`Error inserting review ${r.id}:`, rError.message);
    }
  }
  console.log('Products, variants, and reviews migration finished.');

  // 3. Migrate Categories
  console.log('\n3. Migrating Categories...');
  const categories = await fetchFirestoreCollection(accessToken, 'categories');
  for (const c of categories) {
    const catRow = {
      id: c.id,
      name: c.name || 'Category',
      type: c.type || 'goods',
      categories: c.categories || [],
      created_at: c.createdAt || new Date().toISOString(),
      updated_at: c.updatedAt || new Date().toISOString()
    };
    const { error } = await supabase.from('system_categories').upsert(catRow);
    if (error) console.error(`Error inserting category ${c.id}:`, error.message);
  }
  console.log('Categories migration finished.');

  // 4. Migrate Checkouts
  console.log('\n4. Migrating Checkouts...');
  const checkouts = await fetchFirestoreCollection(accessToken, 'checkouts');
  for (const ch of checkouts) {
    const chUserId = ch.userId || ch.user_id || 'guest';
    await ensureUserExists(chUserId);
    
    if (ch.cartId) {
      await ensureCartExists(ch.cartId, chUserId);
    }

    knownCheckoutIds.add(ch.id);

    const chRow = {
      id: ch.id,
      user_id: chUserId,
      cart_id: ch.cartId || null,
      contact_information: ch.contactInformation || {},
      shipping_address: ch.shippingAddress || {},
      shipping_information: ch.shippingInformation || {},
      status: ch.status || 'pending',
      total_amount: Number(ch.totalAmount || 0),
      created_at: ch.createdAt || new Date().toISOString(),
      updated_at: ch.updatedAt || new Date().toISOString()
    };
    const { error } = await supabase.from('checkouts').upsert(chRow);
    if (error) console.error(`Error inserting checkout ${ch.id}:`, error.message);
  }

  // 5. Migrate Orders
  console.log('\n5. Migrating Orders...');
  const orders = await fetchFirestoreCollection(accessToken, 'orders');
  for (const o of orders) {
    const orderUserId = o.userId || o.user_id || 'guest';
    const orderMerchantId = o.merchantId || o.adminId || 'admin';
    await ensureUserExists(orderUserId, `${orderUserId}@placeholder.com`, 'customer');
    await ensureUserExists(orderMerchantId, `${orderMerchantId}@placeholder.com`, 'merchant');

    if (o.cartId) {
      await ensureCartExists(o.cartId, orderUserId);
    }

    if (o.checkoutId) {
      await ensureCheckoutExists(o.checkoutId, orderUserId, Number(o.totalAmount || 0));
    }

    const orderRow = {
      id: o.id,
      user_id: orderUserId,
      merchant_id: orderMerchantId,
      cart_id: o.cartId || null,
      checkout_id: o.checkoutId || null,
      status: normalizeOrderStatus(o.status),
      total_amount: Number(o.totalAmount || 0),
      contact_information: o.contactInformation || {},
      shipping_address: o.shippingAddress || {},
      shipping_information: o.shippingInformation || {},
      items: o.items || [],
      created_at: o.createdAt || new Date().toISOString(),
      updated_at: o.updatedAt || new Date().toISOString()
    };
    const { error } = await supabase.from('orders').upsert(orderRow);
    if (error) console.error(`Error inserting order ${o.id}:`, error.message);
  }
  console.log('Orders migration finished.');

  // 6. Migrate Templates & Drafts
  console.log('\n6. Migrating Templates & Drafts...');
  const templates = await fetchFirestoreCollection(accessToken, 'templates');
  for (const t of templates) {
    const tMerchantId = t.adminId || t.merchantId || 'admin';
    await ensureUserExists(tMerchantId, `${tMerchantId}@placeholder.com`, 'merchant');
    const tRow = {
      id: t.id,
      merchant_id: tMerchantId,
      name: t.name || 'Template',
      data: t.data || {},
      created_at: t.createdAt || new Date().toISOString(),
      updated_at: t.updatedAt || new Date().toISOString()
    };
    const { error } = await supabase.from('product_templates').upsert(tRow);
    if (error) console.error(`Error inserting template ${t.id}:`, error.message);
  }

  const drafts = await fetchFirestoreCollection(accessToken, 'drafts');
  for (const d of drafts) {
    const dMerchantId = d.adminId || d.merchantId || d.id;
    await ensureUserExists(dMerchantId, `${dMerchantId}@placeholder.com`, 'merchant');
    const dRow = {
      id: d.id,
      merchant_id: dMerchantId,
      edit_form: d.editForm || {},
      is_adding: d.isAdding || false,
      editing_id: d.editingId || null,
      is_quick_add: d.isQuickAdd || false,
      updated_at: d.updatedAt || new Date().toISOString()
    };
    const { error } = await supabase.from('drafts').upsert(dRow);
    if (error) console.error(`Error inserting draft ${d.id}:`, error.message);
  }

  console.log('\n=== Migration completed successfully! ===');
}

runMigration().catch((err) => {
  console.error('Migration failed with exception:', err);
  process.exit(1);
});
