# Teamwork Preview Reviewer Handoff (Round 1)

## Overview
As `teamwork_preview_reviewer` (Round 1), an adversarial quality assurance review was conducted on the product analytics tracking system and popularity score algorithm.

## 1. What the prior attempt got wrong & issues identified

### Issue 1: PostgreSQL Trigger Column List on INSERT
- **Input:** Trigger definition using `BEFORE INSERT OR UPDATE OF views, cart_additions, wishlist_additions, purchases ON product_analytics`.
- **Expected:** Robust trigger execution on all row insertions and updates without column list restrictions for `INSERT`.
- **Actual:** In PostgreSQL, specifying column lists on an `INSERT` event or mixing `INSERT OR UPDATE OF` is non-standard and could bypass recalculation if updates affect columns indirectly or during bulk operations.
- **Root Cause:** Trigger was scoped with `BEFORE INSERT OR UPDATE OF ...` instead of `BEFORE INSERT OR UPDATE ON product_analytics`.

### Issue 2: RPC Security & Search Path Missing
- **Input:** `track_product_event` RPC function in `database_schema.sql`.
- **Expected:** Function executes securely under `SECURITY DEFINER` with fixed `search_path = public`, allowing anon/authenticated Supabase RPC callers to record analytics without exposing permissions or RLS failure.
- **Actual:** Function defaulted to `SECURITY INVOKER` without `search_path`, causing RLS permission denials when non-service-role clients invoked the RPC.
- **Root Cause:** Missing `SECURITY DEFINER SET search_path = public` declaration on `track_product_event`.

### Issue 3: Missing 404 Handling & Unchecked Foreign Key Errors in Tracking Route
- **Input:** `POST /api/analytics/track` with non-existent `productId`.
- **Expected:** Route returns `404 Not Found` with `{ error: "Product with ID 'xyz' does not exist" }`.
- **Actual:** RPC error fell through to Strategy 2 fallback, which attempted a direct table `INSERT` and threw an unhandled PostgreSQL 500 error (`23503 foreign key violation`).
- **Root Cause:** Absence of pre-flight existence check or 404 error trapping on RPC/foreign-key exceptions.

### Issue 4: Route Input Boundary Vulnerabilities
- **Input:** Malformed or adversarial payloads:
  - Primitive / Array bodies (e.g. `[1, 2, 3]` or `"string"`).
  - Huge integer quantities (e.g. `2147483648`, exceeding PostgreSQL 32-bit `INTEGER`).
  - Blank/whitespace `productId` (e.g. `'   '`).
  - Excessively long `productId` (> 255 chars).
  - `GET /api/analytics/track?limit=abc` or `limit=-5` (resulting in `NaN` passed to SQL `.limit()`).
- **Expected:** Clean 400 Bad Request responses and clamped positive integers.
- **Actual:** Missing checks caused uncaught exceptions or `NaN` limits.
- **Root Cause:** Incomplete type validation and boundary clamping.

### Issue 5: Missing Purchase & Storefront Action Tracking
- **Input:** Purchases placed via `POST /api/checkout` and quick-adds / wishlist toggles from catalog/wishlist pages.
- **Expected:** Popularity score metrics (`purchases`, `cart_additions`, `wishlist_additions`) automatically increment when purchases or catalog actions occur.
- **Actual:** Tracking was only hooked to `ProductDetailPage`, leaving checkout purchases and catalog quick-actions untracked.
- **Root Cause:** Integration was incomplete across secondary storefront action surfaces.

---

## 2. What I changed

1. **`database_schema.sql`**:
   - Updated `update_product_analytics_score_trigger` to `BEFORE INSERT OR UPDATE ON product_analytics`.
   - Updated `track_product_event` RPC function with `SECURITY DEFINER SET search_path = public`.
   - Added validation in `track_product_event` to reject invalid event types.
   - Added support for all normalized event aliases (kebab-case, plural forms).

2. **`src/lib/analytics/popularity.ts`**:
   - Expanded `normalizeTrackingEventType` to support kebab-case and plural forms (`product-view`, `cart-add`, `cart-adds`, `wishlist-add`, `wishlist-adds`, `buy_now`, etc.).

3. **`src/app/api/analytics/track/route.ts`**:
   - Added object body validation, string length validation (<= 255 chars), and whitespace trimming.
   - Clamped `quantity` between 1 and 100,000 to prevent 32-bit integer overflows.
   - Added 404 response handling when product does not exist in `products` table.
   - Added unique-key conflict retry in Strategy 2 fallback to handle concurrency.
   - Hardened `GET /api/analytics/track` limit parsing against `NaN` and clamped between 1 and 100.

4. **`src/lib/api/analytics.ts`**:
   - Hardened `trackProductEvent` with whitespace trimming and null/undefined parameter validation.

5. **Storefront & Checkout Integration**:
   - **`src/app/products/page.tsx`**: Added `trackAddToCart` and `trackAddToWishlist` on catalog card interactions.
   - **`src/app/wishlist/page.tsx`**: Added `trackAddToCart` on wishlist item add-to-cart.
   - **`src/app/api/checkout/route.ts`**: Added automatic purchase analytics tracking for all items upon successful checkout completion.

6. **Test Suite Expansion (`tests/*.test.ts`)**:
   - Added `tests/analytics-adversarial.test.ts` (boundary tests, monotonicity tests, attack payloads).
   - Expanded `tests/analytics.test.ts`, `tests/analytics-api.test.ts`, and `tests/analytics-integration.test.ts`. Total tests increased from 22 to 31.

---

## 3. SQL Statements

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

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_product_analytics_popularity ON product_analytics(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_analytics_views ON product_analytics(views DESC);

-- Score Calculation Helper Function
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

-- Trigger Function
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

-- Trigger Definition
DROP TRIGGER IF EXISTS update_product_analytics_score_trigger ON product_analytics;
CREATE TRIGGER update_product_analytics_score_trigger
BEFORE INSERT OR UPDATE ON product_analytics
FOR EACH ROW EXECUTE FUNCTION update_product_analytics_score();

DROP TRIGGER IF EXISTS update_product_analytics_modtime ON product_analytics;
CREATE TRIGGER update_product_analytics_modtime BEFORE UPDATE ON product_analytics FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Row Level Security & Public Read Policy
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for product analytics" ON product_analytics;
CREATE POLICY "Public read access for product analytics" ON product_analytics FOR SELECT USING (true);

-- Product Analytics RPC Function
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
    -- Ensure product exists
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product with ID % does not exist', p_product_id;
    END IF;

    -- Validate event type
    IF p_event_type NOT IN (
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
        CASE WHEN p_event_type IN ('view', 'views', 'product_view', 'product-view', 'product_views', 'product-views') THEN v_qty ELSE 0 END,
        CASE WHEN p_event_type IN ('cart_add', 'cart_addition', 'cart_additions', 'cart', 'add_to_cart', 'add-to-cart', 'cart_adds', 'cart-add', 'cart-adds', 'cart-addition', 'cart-additions') THEN v_qty ELSE 0 END,
        CASE WHEN p_event_type IN ('wishlist_add', 'wishlist_addition', 'wishlist_additions', 'wishlist', 'add_to_wishlist', 'add-to-wishlist', 'wishlist_adds', 'wishlist-add', 'wishlist-adds', 'wishlist-addition', 'wishlist-additions') THEN v_qty ELSE 0 END,
        CASE WHEN p_event_type IN ('purchase', 'purchases', 'order', 'orders', 'buy', 'purchased', 'checkout', 'buy_now', 'buy-now') THEN v_qty ELSE 0 END,
        0.00,
        NOW()
    )
    ON CONFLICT (product_id) DO UPDATE SET
        views = product_analytics.views + (CASE WHEN p_event_type IN ('view', 'views', 'product_view', 'product-view', 'product_views', 'product-views') THEN v_qty ELSE 0 END),
        cart_additions = product_analytics.cart_additions + (CASE WHEN p_event_type IN ('cart_add', 'cart_addition', 'cart_additions', 'cart', 'add_to_cart', 'add-to-cart', 'cart_adds', 'cart-add', 'cart-adds', 'cart-addition', 'cart-additions') THEN v_qty ELSE 0 END),
        wishlist_additions = product_analytics.wishlist_additions + (CASE WHEN p_event_type IN ('wishlist_add', 'wishlist_addition', 'wishlist_additions', 'wishlist', 'add_to_wishlist', 'add-to-wishlist', 'wishlist_adds', 'wishlist-add', 'wishlist-adds', 'wishlist-addition', 'wishlist-additions') THEN v_qty ELSE 0 END),
        purchases = product_analytics.purchases + (CASE WHEN p_event_type IN ('purchase', 'purchases', 'order', 'orders', 'buy', 'purchased', 'checkout', 'buy_now', 'buy-now') THEN v_qty ELSE 0 END),
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## 4. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsc --noEmit`: 0 type errors across whole project.
  - `npm test` (`tsx --test tests/*.test.ts`): 31 passed, 0 failed across 7 test suites:
    1. `Popularity Score Algorithm` (5 tests)
    2. `Analytics Algorithm Comprehensive Edge Cases` (3 tests)
    3. `Adversarial Analytics Stress & Edge Cases` (4 tests)
    4. `Event Type Normalization` (5 tests)
    5. `Tracking API Route Handlers` (5 tests)
    6. `Client-Side Analytics Helpers` (8 tests)
    7. `Database Schema & SQL Verification` (1 test)
- **Shallow Verification (manual run only):** Verified component lifecycles in `src/app/products/[id]/page.tsx`, `src/app/products/page.tsx`, `src/app/wishlist/page.tsx`, and `src/app/api/checkout/route.ts`.
- **Unverified aspects:** Live database migration execution against remote Supabase production project (requires running the SQL script in Supabase Dashboard SQL editor).

---

## 5. Known Issues
- `Shallow Verification`: Live Supabase production database instance execution requires executing `database_schema.sql` via Supabase SQL Editor dashboard.

---

## 6. Remaining Risk & Next Step
- Complete: All R1, R2, R3 requirements, edge case handling, adversary testing, schema integrity, and branch synchronization on `Test` are verified and complete.
