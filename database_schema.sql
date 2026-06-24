-- PostgreSQL Database Schema representing the current Firebase structure

-- Enum types
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'merchant');
CREATE TYPE merchant_status AS ENUM ('pending', 'approved', 'rejected', 'verified');
CREATE TYPE offering_type AS ENUM ('goods', 'services', 'both');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
CREATE TYPE checkout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Users Collection
CREATE TABLE users (
    uid VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    location VARCHAR(255),
    phone VARCHAR(50),
    store_name VARCHAR(255),
    store_description TEXT,
    business_categories TEXT[],
    business_type VARCHAR(100),
    offering_type offering_type,
    industry VARCHAR(100),
    store_contact_email VARCHAR(255),
    store_contact_phone VARCHAR(50),
    social_media_links JSONB,
    logo_url VARCHAR(255),
    banner_url VARCHAR(255),
    onboarding_complete BOOLEAN DEFAULT FALSE,
    role user_role NOT NULL DEFAULT 'customer',
    merchant_status merchant_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products Collection
CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    merchant_id VARCHAR(255) NOT NULL REFERENCES users(uid),
    item_type VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    short_description VARCHAR(500),
    description TEXT NOT NULL,
    sku VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2),
    sale_start_date TIMESTAMP WITH TIME ZONE,
    sale_end_date TIMESTAMP WITH TIME ZONE,
    discount DECIMAL(10, 2),
    brand VARCHAR(100),
    currency VARCHAR(10) NOT NULL,
    track_inventory BOOLEAN DEFAULT FALSE,
    stock INTEGER,
    low_stock_alert BOOLEAN DEFAULT FALSE,
    allow_backorders BOOLEAN DEFAULT FALSE,
    group_category VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    subcategories TEXT[],
    image_urls TEXT[],
    image_alt_texts JSONB,
    allow_multiple_purchases BOOLEAN DEFAULT TRUE,
    video_url VARCHAR(255),
    tags TEXT[],
    labels TEXT[],
    colors TEXT[],
    sizes TEXT[],
    has_variants BOOLEAN DEFAULT FALSE,
    duration INTEGER, -- For services
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Variants Subcollection (Under Products)
CREATE TABLE product_variants (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    size VARCHAR(100),
    color VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER,
    image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews Subcollection (Under Products)
CREATE TABLE product_reviews (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cart Item Subcollection (Under Users)
CREATE TABLE user_cart_items (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid),
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    selected_color VARCHAR(100),
    selected_size VARCHAR(100),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist Item Subcollection (Under Users)
CREATE TABLE user_wishlist_items (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid),
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Carts Collection
CREATE TABLE carts (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid),
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Checkouts Collection
CREATE TABLE checkouts (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid),
    cart_id VARCHAR(255) REFERENCES carts(id),
    contact_information JSONB,
    shipping_address JSONB,
    shipping_information JSONB,
    status checkout_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders Collection
CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(uid),
    merchant_id VARCHAR(255) NOT NULL REFERENCES users(uid),
    cart_id VARCHAR(255),
    checkout_id VARCHAR(255) REFERENCES checkouts(id),
    status order_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    contact_information JSONB,
    shipping_address JSONB NOT NULL,
    shipping_information JSONB,
    items JSONB NOT NULL, -- Storing array of OrderItem objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contact Messages Collection
CREATE TABLE contact_messages (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Categories Collection
CREATE TABLE system_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('goods', 'services')),
    categories JSONB NOT NULL, -- Array of CategoryNode
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
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

-- Assuming a function auth.uid() exists (e.g., Supabase) returning the current user's UUID/VARCHAR

-- ------------------------------------------
-- 1. Users Collection
-- ------------------------------------------
-- Read: Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile or admins can read all" ON users FOR SELECT
USING (
    auth.uid() = uid OR
    (auth.jwt() ->> 'role') = 'admin'
);

-- Insert: Users can create their own profile, role defaults to customer
CREATE POLICY "Users can insert own profile" ON users FOR INSERT
WITH CHECK (
    auth.uid() = uid AND
    (role = 'customer' OR role IS NULL)
);

-- Update: Users can update their own profile, admins can update
-- Note: Column-level restrictions (e.g., preventing role change) require triggers.
CREATE POLICY "Users can update own profile or admins can update" ON users FOR UPDATE
USING (
    auth.uid() = uid OR
    (auth.jwt() ->> 'role') = 'admin'
);

-- Delete: Users can delete own profile or admins can delete
CREATE POLICY "Users can delete own profile or admins can delete" ON users FOR DELETE
USING (
    auth.uid() = uid OR
    (auth.jwt() ->> 'role') = 'admin'
);

-- ------------------------------------------
-- 2. Products Collection
-- ------------------------------------------
-- Read: Anyone can read
CREATE POLICY "Products are publicly readable" ON products FOR SELECT USING (true);

-- Insert: Merchants can create their own products
CREATE POLICY "Merchants can insert own products" ON products FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    (auth.jwt() ->> 'role') = 'merchant' AND
    merchant_id = auth.uid() AND
    price >= 0 AND
    (stock IS NULL OR stock >= 0)
);

-- Update: Merchants can update own products or admins can update
CREATE POLICY "Merchants can update own products or admins update" ON products FOR UPDATE
USING (
    auth.uid() IS NOT NULL AND (
        ( (auth.jwt() ->> 'role') = 'merchant' AND merchant_id = auth.uid() ) OR
        ( (auth.jwt() ->> 'role') = 'admin' )
    )
);

-- Delete: Merchants can delete own products or admins delete
CREATE POLICY "Merchants can delete own products or admins delete" ON products FOR DELETE
USING (
    auth.uid() IS NOT NULL AND (
        ( (auth.jwt() ->> 'role') = 'merchant' AND merchant_id = auth.uid() ) OR
        ( (auth.jwt() ->> 'role') = 'admin' )
    )
);

-- Product Variants
CREATE OR REPLACE FUNCTION check_product_merchant(p_id VARCHAR)
RETURNS VARCHAR AS $$
  SELECT merchant_id FROM products WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Product variants are publicly readable" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Merchants can insert own product variants" ON product_variants FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    check_product_merchant(product_id) = auth.uid() AND
    price >= 0 AND
    (stock IS NULL OR stock >= 0)
);
CREATE POLICY "Merchants can update own product variants or admins" ON product_variants FOR UPDATE
USING (
    auth.uid() IS NOT NULL AND (
        check_product_merchant(product_id) = auth.uid() OR
        (auth.jwt() ->> 'role') = 'admin'
    )
);
CREATE POLICY "Merchants can delete own product variants or admins" ON product_variants FOR DELETE
USING (
    auth.uid() IS NOT NULL AND (
        check_product_merchant(product_id) = auth.uid() OR
        (auth.jwt() ->> 'role') = 'admin'
    )
);

-- ------------------------------------------
-- 3. Product Reviews Collection
-- ------------------------------------------
-- Read: Anyone can read
CREATE POLICY "Reviews are publicly readable" ON product_reviews FOR SELECT USING (true);

-- Insert: Authenticated users can review
CREATE POLICY "Authenticated users can create reviews" ON product_reviews FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    rating >= 1 AND rating <= 5
);

-- Delete: Users can delete own reviews
CREATE POLICY "Users can delete own reviews" ON product_reviews FOR DELETE
USING (auth.uid() = user_id);

-- ------------------------------------------
-- 4. Cart Items, Wishlist, Carts, Checkouts
-- ------------------------------------------
-- user_cart_items
CREATE POLICY "Users manage own cart items" ON user_cart_items FOR ALL USING (auth.uid() = user_id);

-- user_wishlist_items
CREATE POLICY "Users manage own wishlist items" ON user_wishlist_items FOR ALL USING (auth.uid() = user_id);

-- carts
CREATE POLICY "Users manage own carts" ON carts FOR ALL USING (auth.uid() = user_id);

-- checkouts
CREATE POLICY "Users manage own checkouts" ON checkouts FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------
-- 5. Orders
-- ------------------------------------------
-- Read: Users can read own orders, merchants read own, admins read all
CREATE POLICY "Users read own orders, merchants read associated, admins read all" ON orders FOR SELECT
USING (
    auth.uid() = user_id OR
    auth.uid() = merchant_id OR
    (auth.jwt() ->> 'role') = 'admin'
);

-- Insert: Users can create own orders
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update: Merchants can update own orders, admins update all
CREATE POLICY "Merchants update associated orders, admins update all" ON orders FOR UPDATE
USING (
    auth.uid() = merchant_id OR
    (auth.jwt() ->> 'role') = 'admin'
);

-- Delete: Only admins can delete
CREATE POLICY "Only admins can delete orders" ON orders FOR DELETE
USING ((auth.jwt() ->> 'role') = 'admin');

-- ------------------------------------------
-- 6. Contact Messages
-- ------------------------------------------
-- Read: Only admins
CREATE POLICY "Admins can read contact messages" ON contact_messages FOR SELECT
USING ((auth.jwt() ->> 'role') = 'admin');

-- Insert: Anyone can insert
CREATE POLICY "Anyone can insert contact messages" ON contact_messages FOR INSERT
WITH CHECK (true);

-- ------------------------------------------
-- 7. System Categories
-- ------------------------------------------
-- Read: Anyone can read
CREATE POLICY "System categories are publicly readable" ON system_categories FOR SELECT USING (true);
-- Write/Update/Delete: Admins only
CREATE POLICY "Admins manage system categories" ON system_categories FOR ALL
USING ((auth.jwt() ->> 'role') = 'admin');

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_user_cart_items_user ON user_cart_items(user_id);

-- ==========================================
-- UPDATED_AT TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_product_variants_modtime BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_carts_modtime BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_checkouts_modtime BEFORE UPDATE ON checkouts FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_system_categories_modtime BEFORE UPDATE ON system_categories FOR EACH ROW EXECUTE FUNCTION update_modified_column();
