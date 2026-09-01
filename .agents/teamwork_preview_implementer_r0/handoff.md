# Product Analytics & Popularity Score Tracking System Handoff

## Summary of Implementation

Implemented an end-to-end product analytics tracking system and popularity score algorithm across Next.js and Supabase.

### 1. Database Schema & SQL Updates (`database_schema.sql`)

```sql
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

-- Indexes for fast popularity queries and view counting
CREATE INDEX IF NOT EXISTS idx_product_analytics_popularity ON product_analytics(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_analytics_views ON product_analytics(views DESC);

-- Auto-update timestamps and popularity score triggers
CREATE OR REPLACE FUNCTION calculate_product_popularity_score(
    p_views INTEGER,
    p_wishlist_additions INTEGER,
    p_cart_additions INTEGER,
    p_purchases INTEGER
)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
    RETURN (
        (COALESCE(p_views, 0) * 1.0) +
        (COALESCE(p_wishlist_additions, 0) * 3.0) +
        (COALESCE(p_cart_additions, 0) * 5.0) +
        (COALESCE(p_purchases, 0) * 10.0)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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

-- Trigger registration
DROP TRIGGER IF EXISTS update_product_analytics_score_trigger ON product_analytics;
CREATE TRIGGER update_product_analytics_score_trigger
BEFORE INSERT OR UPDATE OF views, cart_additions, wishlist_additions, purchases ON product_analytics
FOR EACH ROW EXECUTE FUNCTION update_product_analytics_score();

DROP TRIGGER IF EXISTS update_product_analytics_modtime ON product_analytics;
CREATE TRIGGER update_product_analytics_modtime BEFORE UPDATE ON product_analytics FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Row Level Security (RLS)
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for product analytics" ON product_analytics;
CREATE POLICY "Public read access for product analytics" ON product_analytics FOR SELECT USING (true);

-- Product Analytics RPC Tracking Function
CREATE OR REPLACE FUNCTION track_product_event(
    p_product_id VARCHAR(255),
    p_event_type VARCHAR(50),
    p_quantity INTEGER DEFAULT 1
)
RETURNS product_analytics AS $$
DECLARE
    v_qty INTEGER := GREATEST(COALESCE(p_quantity, 1), 1);
    v_result product_analytics;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product with ID % does not exist', p_product_id;
    END IF;

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
        CASE WHEN p_event_type IN ('view', 'views') THEN v_qty ELSE 0 END,
        CASE WHEN p_event_type IN ('cart_add', 'cart_addition', 'cart', 'add_to_cart') THEN v_qty ELSE 0 END,
        CASE WHEN p_event_type IN ('wishlist_add', 'wishlist_addition', 'wishlist', 'add_to_wishlist') THEN v_qty ELSE 0 END,
        CASE WHEN p_event_type IN ('purchase', 'purchases', 'order', 'buy') THEN v_qty ELSE 0 END,
        0.00,
        NOW()
    )
    ON CONFLICT (product_id) DO UPDATE SET
        views = product_analytics.views + (CASE WHEN p_event_type IN ('view', 'views') THEN v_qty ELSE 0 END),
        cart_additions = product_analytics.cart_additions + (CASE WHEN p_event_type IN ('cart_add', 'cart_addition', 'cart', 'add_to_cart') THEN v_qty ELSE 0 END),
        wishlist_additions = product_analytics.wishlist_additions + (CASE WHEN p_event_type IN ('wishlist_add', 'wishlist_addition', 'wishlist', 'add_to_wishlist') THEN v_qty ELSE 0 END),
        purchases = product_analytics.purchases + (CASE WHEN p_event_type IN ('purchase', 'purchases', 'order', 'buy') THEN v_qty ELSE 0 END),
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

### 2. Popularity Score Calculation & Event Handling (`src/lib/analytics/popularity.ts`)
- Configured weights:
  - `VIEW`: 1.0 point
  - `WISHLIST_ADD`: 3.0 points
  - `CART_ADD`: 5.0 points
  - `PURCHASE`: 10.0 points
- Defined `calculatePopularityScore()` and `normalizeTrackingEventType()`.

### 3. API Tracking Endpoint (`src/app/api/analytics/track/route.ts`)
- `POST /api/analytics/track`: Validates `productId`, event type ('view', 'cart_add', 'wishlist_add', 'purchase'), and updates counters in Supabase via RPC or table upsert.
- `GET /api/analytics/track`: Fetches analytics for a specific product (`?productId=...`) or returns top products ranked by `popularity_score`.

### 4. Client-side Analytics SDK & Frontend Integration
- `src/lib/api/analytics.ts`: Provides helper functions (`trackProductView`, `trackAddToCart`, `trackAddToWishlist`, `trackPurchase`, `getProductAnalytics`).
- `src/app/products/[id]/page.tsx`: Automatically triggers `trackProductView(productId)` when a product is loaded, guarded by `useRef` to avoid duplicate triggers. Also dispatches `trackAddToCart` and `trackAddToWishlist` upon user actions.

### 5. Verification & Tests
- Created 22 automated tests spanning unit tests, edge cases, route validation, database schema verification, and client helper mocks.
- Test suite executed with `npm test` passing with 22/22 successful test cases.
- Pushed commit to `Test` branch.
