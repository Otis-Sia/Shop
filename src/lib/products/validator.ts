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
  price: z.number().positive().optional(),
  compareAtPrice: z.number().positive().optional(),
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

export const pricingSchema = z
  .object({
    price: z.number().positive("Price must be greater than 0"),
    compareAtPrice: z.number().positive().optional(),
    costPrice: z.number().nonnegative().optional(),
    currency: z.string().length(3, "Currency must be an ISO 4217 code, e.g. USD"),
    taxable: z.boolean(),
    taxClass: z.string().max(50).optional(),
  })
  .refine((p) => !p.compareAtPrice || p.compareAtPrice > p.price, {
    message: "compareAtPrice must be greater than price",
    path: ["compareAtPrice"],
  });

export const inventoryPolicySchema = z.object({
  trackInventory: z.boolean(),
  allowBackorder: z.boolean(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  warehouseLocation: z.string().max(120).optional(),
});

export const seoSchema = z.object({
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  canonicalUrl: z.string().url().optional(),
  keywords: z.array(z.string()).max(20).optional(),
  ogImageUrl: z.string().url().optional(),
});

export const shippingSchema = z.object({
  weight: weightSchema.optional(),
  dimensions: dimensionsSchema.optional(),
  requiresShipping: z.boolean(),
  shippingClass: z.string().max(50).optional(),
  countryOfOrigin: z.string().length(2).optional(), // ISO 3166-1 alpha-2
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
    merchantId: z.string(), // Removed .uuid() to allow arbitrary merchantIds
    productType: z.enum(["physical", "digital", "service"]),

    name: z.string().min(3).max(200),
    description: z.string().min(10).max(20000),
    shortDescription: z.string().max(300).optional(),
    sku: z.string().min(1).max(64),
    status: z.enum(["draft", "active", "archived", "out_of_stock"]).optional(),

    categoryIds: z.array(z.string()).min(1, "At least one category is required"),
    tags: z.array(z.string().max(40)).max(30).optional(),
    brand: z.string().max(120).optional(),

    pricing: pricingSchema,
    inventory: inventoryPolicySchema,
    stockQuantity: z.number().int().nonnegative().optional(),

    attributes: z.array(attributeSchema).optional(),
    variants: z.array(variantSchema).optional(),

    media: z.array(mediaSchema).optional(),

    seo: seoSchema.optional(),

    shipping: shippingSchema.optional(),
    service: serviceInfoSchema.optional(),
    downloadUrl: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.productType === "physical" && !data.shipping) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "shipping info is required for physical products",
        path: ["shipping"],
      });
    }
    if (data.productType === "service" && !data.service) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "service info is required for service products",
        path: ["service"],
      });
    }
    if (data.productType === "digital" && !data.downloadUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "downloadUrl is required for digital products",
        path: ["downloadUrl"],
      });
    }

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
