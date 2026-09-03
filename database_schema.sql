-- ============================================================================
-- SUPABASE POSTGRESQL DATABASE SCHEMA
-- Compatible with Next.js + Supabase + Firebase Auth Architecture
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES (Idempotent creation)
-- ============================================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('customer', 'admin', 'merchant');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_status') THEN
        CREATE TYPE merchant_status AS ENUM ('pending', 'approved', 'rejected', 'verified');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checkout_status') THEN
        CREATE TYPE checkout_status AS ENUM ('pending', 'processing', 'completed', 'failed');
    END IF;
END $$;

-- ============================================================================
-- TABLES DEFINITION
-- ============================================================================

-- 1. Users Table (Stores Firebase Auth user profiles & merchant metadata)
CREATE TABLE IF NOT EXISTS users (
    uid VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    username VARCHAR(255),
    location VARCHAR(255),
    phone VARCHAR(50),
    store_name VARCHAR(255),
    store_description TEXT,
    business_categories TEXT[],
    business_type VARCHAR(100),

    industry VARCHAR(100),
    store_contact_email VARCHAR(255),
    store_contact_phone VARCHAR(50),
    social_media_links JSONB DEFAULT '{}'::jsonb,
    logo_url VARCHAR(255),
    banner_url VARCHAR(255),
    onboarding_complete BOOLEAN DEFAULT FALSE,
    role user_role NOT NULL DEFAULT 'customer',
    merchant_status merchant_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY,
    merchant_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    short_description VARCHAR(500),
    description TEXT NOT NULL,
    sku VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    sale_price DECIMAL(10, 2),
    sale_start_date TIMESTAMP WITH TIME ZONE,
    sale_end_date TIMESTAMP WITH TIME ZONE,
    discount DECIMAL(10, 2),
    brand VARCHAR(100),
    country_of_origin VARCHAR(100),
    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
    track_inventory BOOLEAN DEFAULT FALSE,
    stock INTEGER DEFAULT 0,
    low_stock_alert BOOLEAN DEFAULT FALSE,
    allow_backorders BOOLEAN DEFAULT FALSE,
    group_category VARCHAR(100),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    category_ids TEXT[] DEFAULT '{}'::text[],
    subcategories TEXT[] DEFAULT '{}'::text[],
    image_urls TEXT[] DEFAULT '{}'::text[],
    image_alt_texts JSONB DEFAULT '{}'::jsonb,
    allow_multiple_purchases BOOLEAN DEFAULT TRUE,
    video_url VARCHAR(255),
    tags TEXT[] DEFAULT '{}'::text[],
    labels TEXT[] DEFAULT '{}'::text[],
    colors TEXT[] DEFAULT '{}'::text[],
    sizes TEXT[] DEFAULT '{}'::text[],
    grades TEXT[] DEFAULT '{}'::text[],
    capacity VARCHAR(100),
    power VARCHAR(100),
    weight DECIMAL(10, 2),
    weight_unit VARCHAR(10) DEFAULT 'kg',
    attributes JSONB DEFAULT '{}'::jsonb,
    has_variants BOOLEAN DEFAULT FALSE,
    supplier_name VARCHAR(255),
    cost_price DECIMAL(10, 2),
    features TEXT[] DEFAULT '{}'::text[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ADD CONSTRAINT unique_sku UNIQUE (sku);

-- 3. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR(100),
    color VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER DEFAULT 0,
    image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Product Reviews Table
CREATE TABLE IF NOT EXISTS product_reviews (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. User Cart Items Table (Synced authenticated cart)
CREATE TABLE IF NOT EXISTS user_cart_items (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    selected_color VARCHAR(100),
    selected_size VARCHAR(100),
    selected_variant_index INTEGER,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. User Wishlist Items Table
CREATE TABLE IF NOT EXISTS user_wishlist_items (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Carts Table (Legacy / Session based carts)
CREATE TABLE IF NOT EXISTS carts (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Checkouts Table
CREATE TABLE IF NOT EXISTS checkouts (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    cart_id VARCHAR(255) REFERENCES carts(id) ON DELETE SET NULL,
    contact_information JSONB DEFAULT '{}'::jsonb,
    shipping_address JSONB DEFAULT '{}'::jsonb,
    shipping_information JSONB DEFAULT '{}'::jsonb,
    status checkout_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    merchant_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    cart_id VARCHAR(255),
    checkout_id VARCHAR(255),
    status order_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    contact_information JSONB DEFAULT '{}'::jsonb,
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    shipping_information JSONB DEFAULT '{}'::jsonb,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Contact Messages Table (Public contact & inquiry submissions)
CREATE TABLE IF NOT EXISTS contact_messages (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. System Categories Table (Taxonomy & Navigation structure)
CREATE TABLE IF NOT EXISTS system_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,

    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Merchant Drafts Table
CREATE TABLE IF NOT EXISTS drafts (
    id VARCHAR(255) PRIMARY KEY,
    merchant_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    edit_form JSONB DEFAULT '{}'::jsonb,
    is_adding BOOLEAN DEFAULT FALSE,
    editing_id BIGINT,
    is_quick_add BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Merchant Product Templates Table
CREATE TABLE IF NOT EXISTS product_templates (
    id VARCHAR(255) PRIMARY KEY,
    merchant_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Product Analytics Table
CREATE TABLE IF NOT EXISTS product_analytics (
    product_id VARCHAR(255) PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    views INTEGER NOT NULL DEFAULT 0,
    cart_additions INTEGER NOT NULL DEFAULT 0,
    wishlist_additions INTEGER NOT NULL DEFAULT 0,
    purchases INTEGER NOT NULL DEFAULT 0,
    popularity_score DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 15. AI Auto-Fill Table
CREATE TABLE IF NOT EXISTS ai_fills (
    id VARCHAR(255) PRIMARY KEY,
    merchant_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    product_id VARCHAR(255) REFERENCES products(id) ON DELETE SET NULL,
    raw_details TEXT NOT NULL,
    generated_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_fills_merchant ON ai_fills(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ai_fills_product ON ai_fills(product_id);

-- 16. Suppliers Table (Dropship / Wholesale Suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    whatsapp_number VARCHAR(50),
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES (Idempotent creation)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_name);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_user_cart_items_user ON user_cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlist_items_user ON user_wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_merchant ON drafts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_product_templates_merchant ON product_templates(merchant_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_popularity ON product_analytics(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_analytics_views ON product_analytics(views DESC);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS & POPULARITY SCORE TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Popularity score calculation helper function:
-- Formula: (views * 1) + (wishlist_additions * 3) + (cart_additions * 5) + (purchases * 10)
CREATE OR REPLACE FUNCTION calculate_product_popularity_score(
    p_views INTEGER,
    p_wishlist_additions INTEGER,
    p_cart_additions INTEGER,
    p_purchases INTEGER
)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
    RETURN (
        (GREATEST(COALESCE(p_views, 0), 0) * 1.0) +
        (GREATEST(COALESCE(p_wishlist_additions, 0), 0) * 3.0) +
        (GREATEST(COALESCE(p_cart_additions, 0), 0) * 5.0) +
        (GREATEST(COALESCE(p_purchases, 0), 0) * 10.0)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to update product analytics popularity score
CREATE OR REPLACE FUNCTION update_product_analytics_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.popularity_score = calculate_product_popularity_score(
        NEW.views,
        NEW.wishlist_additions,
        NEW.cart_additions,
        NEW.purchases
    );
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_users_modtime ON users;
    CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    DROP TRIGGER IF EXISTS update_products_modtime ON products;
    CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    DROP TRIGGER IF EXISTS update_product_variants_modtime ON product_variants;
    CREATE TRIGGER update_product_variants_modtime BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    DROP TRIGGER IF EXISTS update_carts_modtime ON carts;
    CREATE TRIGGER update_carts_modtime BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    DROP TRIGGER IF EXISTS update_checkouts_modtime ON checkouts;
    CREATE TRIGGER update_checkouts_modtime BEFORE UPDATE ON checkouts FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    DROP TRIGGER IF EXISTS update_orders_modtime ON orders;
    CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    DROP TRIGGER IF EXISTS update_system_categories_modtime ON system_categories;
    CREATE TRIGGER update_system_categories_modtime BEFORE UPDATE ON system_categories FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    DROP TRIGGER IF EXISTS update_drafts_modtime ON drafts;
    CREATE TRIGGER update_drafts_modtime BEFORE UPDATE ON drafts FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    DROP TRIGGER IF EXISTS update_product_templates_modtime ON product_templates;
    CREATE TRIGGER update_product_templates_modtime BEFORE UPDATE ON product_templates FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    DROP TRIGGER IF EXISTS update_product_analytics_score_trigger ON product_analytics;
    CREATE TRIGGER update_product_analytics_score_trigger
    BEFORE INSERT OR UPDATE ON product_analytics
    FOR EACH ROW EXECUTE FUNCTION update_product_analytics_score();

    DROP TRIGGER IF EXISTS update_product_analytics_modtime ON product_analytics;
    CREATE TRIGGER update_product_analytics_modtime BEFORE UPDATE ON product_analytics FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    DROP TRIGGER IF EXISTS update_suppliers_modtime ON suppliers;
    CREATE TRIGGER update_suppliers_modtime BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_modified_column();
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) & PUBLIC READ POLICIES
-- ============================================================================

-- Enable RLS across tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Public Read Policies (Allow frontend public anon clients to read catalog & categories)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read access for products" ON products;
    CREATE POLICY "Public read access for products" ON products FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read access for product variants" ON product_variants;
    CREATE POLICY "Public read access for product variants" ON product_variants FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read access for product reviews" ON product_reviews;
    CREATE POLICY "Public read access for product reviews" ON product_reviews FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read access for system categories" ON system_categories;
    CREATE POLICY "Public read access for system categories" ON system_categories FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public insert access for contact messages" ON contact_messages;
    CREATE POLICY "Public insert access for contact messages" ON contact_messages FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read access for product analytics" ON product_analytics;
    CREATE POLICY "Public read access for product analytics" ON product_analytics FOR SELECT USING (true);
END $$;

-- ============================================================================
-- PRODUCT ANALYTICS RPC FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION track_product_event(
    p_product_id VARCHAR(255),
    p_event_type VARCHAR(50),
    p_quantity INTEGER DEFAULT 1
)
RETURNS product_analytics AS $$
DECLARE
    v_event VARCHAR(50) := LOWER(TRIM(COALESCE(p_event_type, '')));
    v_qty INTEGER := GREATEST(COALESCE(p_quantity, 1), 1);
    v_result product_analytics;
BEGIN
    -- Ensure product exists
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product with ID % does not exist', p_product_id;
    END IF;

    -- Validate event type
    IF v_event NOT IN (
        'view', 'views', 'product_view', 'product-view', 'product_views', 'product-views',
        'cart_add', 'cart_addition', 'cart_additions', 'cart', 'add_to_cart', 'add-to-cart', 'cart_adds', 'cart-add', 'cart-adds', 'cart-addition', 'cart-additions',
        'wishlist_add', 'wishlist_addition', 'wishlist_additions', 'wishlist', 'add_to_wishlist', 'add-to-wishlist', 'wishlist_adds', 'wishlist-add', 'wishlist-adds', 'wishlist-addition', 'wishlist-additions',
        'purchase', 'purchases', 'order', 'orders', 'buy', 'purchased', 'checkout', 'buy_now', 'buy-now'
    ) THEN
        RAISE EXCEPTION 'Invalid event type: %', p_event_type;
    END IF;

    -- Upsert analytics row
    INSERT INTO product_analytics (
        product_id,
        views,
        cart_additions,
        wishlist_additions,
        purchases,
        popularity_score,
        updated_at
    )
    VALUES (
        p_product_id,
        CASE WHEN v_event IN ('view', 'views', 'product_view', 'product-view', 'product_views', 'product-views') THEN v_qty ELSE 0 END,
        CASE WHEN v_event IN ('cart_add', 'cart_addition', 'cart_additions', 'cart', 'add_to_cart', 'add-to-cart', 'cart_adds', 'cart-add', 'cart-adds', 'cart-addition', 'cart-additions') THEN v_qty ELSE 0 END,
        CASE WHEN v_event IN ('wishlist_add', 'wishlist_addition', 'wishlist_additions', 'wishlist', 'add_to_wishlist', 'add-to-wishlist', 'wishlist_adds', 'wishlist-add', 'wishlist-adds', 'wishlist-addition', 'wishlist-additions') THEN v_qty ELSE 0 END,
        CASE WHEN v_event IN ('purchase', 'purchases', 'order', 'orders', 'buy', 'purchased', 'checkout', 'buy_now', 'buy-now') THEN v_qty ELSE 0 END,
        0.00,
        NOW()
    )
    ON CONFLICT (product_id) DO UPDATE SET
        views = product_analytics.views + (CASE WHEN v_event IN ('view', 'views', 'product_view', 'product-view', 'product_views', 'product-views') THEN v_qty ELSE 0 END),
        cart_additions = product_analytics.cart_additions + (CASE WHEN v_event IN ('cart_add', 'cart_addition', 'cart_additions', 'cart', 'add_to_cart', 'add-to-cart', 'cart_adds', 'cart-add', 'cart-adds', 'cart-addition', 'cart-additions') THEN v_qty ELSE 0 END),
        wishlist_additions = product_analytics.wishlist_additions + (CASE WHEN v_event IN ('wishlist_add', 'wishlist_addition', 'wishlist_additions', 'wishlist', 'add_to_wishlist', 'add-to-wishlist', 'wishlist_adds', 'wishlist-add', 'wishlist-adds', 'wishlist-addition', 'wishlist-additions') THEN v_qty ELSE 0 END),
        purchases = product_analytics.purchases + (CASE WHEN v_event IN ('purchase', 'purchases', 'order', 'orders', 'buy', 'purchased', 'checkout', 'buy_now', 'buy-now') THEN v_qty ELSE 0 END),
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Explicit Permissions
GRANT SELECT ON TABLE product_analytics TO anon, authenticated;
GRANT ALL ON TABLE product_analytics TO service_role;
GRANT EXECUTE ON FUNCTION calculate_product_popularity_score(INTEGER, INTEGER, INTEGER, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION track_product_event(VARCHAR, VARCHAR, INTEGER) TO anon, authenticated, service_role;

-- Note: All authenticated mutations (checkout, order updates, merchant product creation, user profile updates)
-- are executed server-side via Next.js Route Handlers using the Supabase Service Role Key after verifying the
-- client's Firebase ID token. Service Role calls bypass RLS automatically.


-- ============================================================================
-- ADDITIONS FOR NEW PRODUCT SERVICE INTEGRATION (v2)
-- ============================================================================

-- Alter existing products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'physical';
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids TEXT[] DEFAULT '{}'::text[];
ALTER TABLE products ALTER COLUMN category_ids TYPE TEXT[] USING category_ids::text[];
ALTER TABLE products ALTER COLUMN category_ids SET DEFAULT '{}'::text[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing JSONB; 
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'kg';
ALTER TABLE products ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ALTER COLUMN currency SET DEFAULT 'KES';

-- Alter existing product_variants table
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(10,2);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS weight JSONB;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS dimensions JSONB;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
