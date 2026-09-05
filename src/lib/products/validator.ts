import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMAS — mirror types/product.types.ts, enforced at the API edge
// ============================================================================

export const weightSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(["kg", "g", "lb", "oz"]),
});

export const dimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(["cm", "in", "m"]),
});

export const attributeSchema = z.object({
  name: z.string().min(1).max(100),
  value: z.string().min(1).max(255),
  group: z.string().max(100).optional(),
  isVariantAxis: z.boolean().optional(),
});

export const variantSchema = z.object({
  sku: z.string().min(1).max(64),
  barcode: z.string().max(64).optional(),
  attributes: z.array(attributeSchema).min(1, "Variant needs at least one attribute"),
  price: z.number().nonnegative().optional(),
  salePrice: z.number().nonnegative().optional(),
  compareAtPrice: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  stockQuantity: z.number().int().nonnegative(),
  weight: weightSchema.optional(),
  dimensions: dimensionsSchema.optional(),
  images: z.array(z.string().url()).optional(),
  isDefault: z.boolean().optional(),
});

export const mediaSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video", "3d_model"]),
  altText: z.string().max(255).optional(),
  position: z.number().int().nonnegative(),
  isPrimary: z.boolean().optional(),
});

export const pricingSchema = z.object({
  price: z.number().nonnegative("Price must be 0 or greater").default(0),
  salePrice: z.number().nonnegative("Sale price must be 0 or greater").optional(),
  compareAtPrice: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative("Cost price must be 0 or greater").optional(),
  currency: z.string().min(1).max(10).optional().default("KES"),
  taxable: z.boolean().optional().default(false),
  taxClass: z.string().max(50).optional(),
});

export const inventoryPolicySchema = z.object({
  trackInventory: z.boolean().optional().default(false),
  allowBackorder: z.boolean().optional().default(false),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  warehouseLocation: z.string().max(120).optional(),
});

export const seoSchema = z.object({
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(300).optional(),
  canonicalUrl: z.string().url().optional(),
  keywords: z.array(z.string()).max(50).optional(),
  ogImageUrl: z.string().url().optional(),
});

export const shippingSchema = z.object({
  weight: weightSchema.optional(),
  dimensions: dimensionsSchema.optional(),
  requiresShipping: z.boolean().optional().default(true),
  shippingClass: z.string().max(50).optional(),
  countryOfOrigin: z.string().max(100).optional(),
  hsCode: z.string().max(20).optional(),
});

export const serviceInfoSchema = z.object({
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().nonnegative().optional(),
  locationType: z.enum(["on_site", "remote", "customer_location"]),
  maxBookingsPerSlot: z.number().int().positive().optional(),
});

const slugSafe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createProductSchema = z
  .object({
    merchantId: z.string().optional().default("admin"),
    productType: z.enum(["physical", "digital", "service"]).optional().default("physical"),

    name: z.string().min(1, "Product name is required").max(255),
    description: z.string().max(50000).optional().default(""),
    shortDescription: z.string().max(1000).optional(),
    sku: z.string().max(100).optional(),
    status: z.enum(["draft", "active", "archived", "out_of_stock"]).optional().default("draft"),

    categoryIds: z.array(z.string()).optional().default([]),
    tags: z.array(z.string().max(60)).max(50).optional().default([]),
    brand: z.string().max(120).optional(),

    pricing: pricingSchema.optional().default({ price: 0, currency: "KES", taxable: false }),
    inventory: inventoryPolicySchema.optional().default({ trackInventory: false, allowBackorder: false }),
    stockQuantity: z.number().int().nonnegative().optional().default(0),

    attributes: z.array(attributeSchema).optional().default([]),
    variants: z.array(variantSchema).optional().default([]),

    media: z.array(mediaSchema).optional().default([]),

    seo: seoSchema.optional(),

    shipping: shippingSchema.optional(),
    service: serviceInfoSchema.optional(),
    downloadUrl: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.variants && data.variants.length > 0) {
      const skus = data.variants.map((v) => v.sku);
      const dupes = skus.filter((s, i) => skus.indexOf(s) !== i);
      if (dupes.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate variant SKUs: ${[...new Set(dupes)].join(", ")}`,
          path: ["variants"],
        });
      }
      const defaults = data.variants.filter((v) => v.isDefault);
      if (defaults.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only one variant may be marked isDefault",
          path: ["variants"],
        });
      }
    }
  });

export const slugSchema = z.string().regex(slugSafe, "Slug must be lowercase, alphanumeric, hyphen-separated");

export type CreateProductSchema = z.infer<typeof createProductSchema>;
