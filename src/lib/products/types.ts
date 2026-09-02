// ============================================================================
// PRODUCT DOMAIN TYPES
// Covers: core metadata, pricing, inventory, variants/attributes, media,
// SEO, shipping, and multi-merchant/product-type fields.
// ============================================================================

export type ProductStatus = "draft" | "active" | "archived" | "out_of_stock";

// Distinguishes fulfillment path — relevant for marketplaces that mix
// physical goods, digital downloads, and bookable services.
export type ProductType = "physical" | "digital" | "service";

export type WeightUnit = "kg" | "g" | "lb" | "oz";
export type DimensionUnit = "cm" | "in" | "m";

export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: DimensionUnit;
}

export interface Weight {
  value: number;
  unit: WeightUnit;
}

// ---------------------------------------------------------------------------
// Attributes & Variants
// ---------------------------------------------------------------------------

// A single defining attribute for a variant axis, e.g. { name: "Color", value: "Red" }
export interface ProductAttribute {
  name: string;
  value: string;
  /** Optional grouping, e.g. "Physical", "Technical", "Material" */
  group?: string;
  /** Whether this attribute is used to generate variants (e.g. Color, Size) */
  isVariantAxis?: boolean;
}

// A purchasable variant of a product (e.g. Red / Large)
export interface ProductVariant {
  id: string;
  sku: string;
  barcode?: string;
  attributes: ProductAttribute[]; // subset that define this specific variant
  price?: number; // overrides base price if set
  compareAtPrice?: number;
  costPrice?: number;
  stockQuantity: number;
  weight?: Weight;
  dimensions?: Dimensions;
  images?: string[]; // variant-specific images (e.g. per color)
  isDefault?: boolean;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface ProductMedia {
  id: string;
  url: string;
  type: "image" | "video" | "3d_model";
  altText?: string;
  position: number; // display order
  isPrimary?: boolean;
}

// ---------------------------------------------------------------------------
// SEO / Metadata
// ---------------------------------------------------------------------------

export interface ProductSEO {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  keywords?: string[];
  ogImageUrl?: string;
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface InventoryPolicy {
  trackInventory: boolean;
  allowBackorder: boolean;
  lowStockThreshold?: number;
  warehouseLocation?: string;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface ProductPricing {
  price: number;
  compareAtPrice?: number; // "was" price for showing discounts
  costPrice?: number; // internal cost, not shown to buyers
  currency: string; // ISO 4217, e.g. "USD", "KES"
  taxable: boolean;
  taxClass?: string; // e.g. "standard", "reduced", "zero"
}

// ---------------------------------------------------------------------------
// Shipping (physical products only)
// ---------------------------------------------------------------------------

export interface ShippingInfo {
  weight?: Weight;
  dimensions?: Dimensions;
  requiresShipping: boolean;
  shippingClass?: string; // e.g. "fragile", "oversized"
  countryOfOrigin?: string;
  hsCode?: string; // customs/harmonized system code
}

// ---------------------------------------------------------------------------
// Service-specific fields (for marketplaces with bookable services)
// ---------------------------------------------------------------------------

export interface ServiceInfo {
  durationMinutes: number;
  bufferMinutes?: number;
  locationType: "on_site" | "remote" | "customer_location";
  maxBookingsPerSlot?: number;
}

// ---------------------------------------------------------------------------
// Core Product entity
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  merchantId: string; // owning vendor/seller in a multi-merchant setup
  productType: ProductType;

  // Basic metadata
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku: string;
  status: ProductStatus;

  // Categorization
  categoryIds: string[];
  tags: string[];
  features?: string[];
  brand?: string;
  supplierName?: string;

  // Pricing & inventory
  pricing: ProductPricing;
  inventory: InventoryPolicy;
  stockQuantity: number; // base stock if no variants

  // Attributes & variants
  attributes: ProductAttribute[]; // non-variant descriptive attributes
  variants: ProductVariant[];
  hasVariants: boolean;

  // Media
  media: ProductMedia[];

  // SEO
  seo: ProductSEO;

  // Shipping / fulfillment
  shipping?: ShippingInfo; // present when productType === "physical"
  service?: ServiceInfo; // present when productType === "service"
  downloadUrl?: string; // present when productType === "digital"

  // Timestamps & audit
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;

  // Ratings (denormalized aggregate; not editable directly on create)
  averageRating?: number;
  reviewCount?: number;
}

// ---------------------------------------------------------------------------
// DTOs — what a client actually submits to create a product
// ---------------------------------------------------------------------------

export interface CreateProductAttributeInput {
  name: string;
  value: string;
  group?: string;
  isVariantAxis?: boolean;
}

export interface CreateProductVariantInput {
  sku: string;
  barcode?: string;
  attributes: CreateProductAttributeInput[];
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  stockQuantity: number;
  weight?: Weight;
  dimensions?: Dimensions;
  images?: string[];
  isDefault?: boolean;
}

export interface CreateProductInput {
  merchantId: string;
  productType: ProductType;

  name: string;
  description: string;
  shortDescription?: string;
  sku: string;
  status?: ProductStatus;

  categoryIds: string[];
  tags?: string[];
  features?: string[];
  brand?: string;
  supplierName?: string;

  pricing: ProductPricing;
  inventory: InventoryPolicy;
  stockQuantity?: number;

  attributes?: CreateProductAttributeInput[];
  variants?: CreateProductVariantInput[];

  media?: Omit<ProductMedia, "id">[];

  seo?: ProductSEO;

  shipping?: ShippingInfo;
  service?: ServiceInfo;
  downloadUrl?: string;
}
