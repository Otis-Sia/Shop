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
    currency VARCHAR(10) NOT NULL DEFAULT 'XAF',
    track_inventory BOOLEAN DEFAULT FALSE,
    stock INTEGER DEFAULT 0,
    low_stock_alert BOOLEAN DEFAULT FALSE,
    allow_backorders BOOLEAN DEFAULT FALSE,
    group_category VARCHAR(100),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    subcategories TEXT[] DEFAULT '{}'::text[],
    image_urls TEXT[] DEFAULT '{}'::text[],
    image_alt_texts JSONB DEFAULT '{}'::jsonb,
    allow_multiple_purchases BOOLEAN DEFAULT TRUE,
    video_url VARCHAR(255),
    tags TEXT[] DEFAULT '{}'::text[],
    labels TEXT[] DEFAULT '{}'::text[],
    colors TEXT[] DEFAULT '{}'::text[],
    sizes TEXT[] DEFAULT '{}'::text[],
    has_variants BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- ============================================================================
-- PERFORMANCE INDEXES (Idempotent creation)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_user_cart_items_user ON user_cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlist_items_user ON user_wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_merchant ON drafts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_product_templates_merchant ON product_templates(merchant_id);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
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
END $$;

-- Note: All authenticated mutations (checkout, order updates, merchant product creation, user profile updates)
-- are executed server-side via Next.js Route Handlers using the Supabase Service Role Key after verifying the
-- client's Firebase ID token. Service Role calls bypass RLS automatically.

