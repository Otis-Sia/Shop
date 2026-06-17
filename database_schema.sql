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
    discount DECIMAL(5, 2),
    brand VARCHAR(100),
    currency VARCHAR(10) NOT NULL,
    track_inventory BOOLEAN DEFAULT FALSE,
    stock INTEGER NOT NULL DEFAULT 0,
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
    stock INTEGER NOT NULL DEFAULT 0,
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
    items JSONB, -- Storing array of CartItem objects
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
