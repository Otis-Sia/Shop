import { v4 as randomUUID } from "uuid";
import {
  Product,
  ProductVariant,
  ProductMedia,
  CreateProductInput,
} from "./types";
import { getServiceSupabase } from "@/lib/supabase/server";

export interface ProductRepository {
  findBySku(merchantId: string, sku: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  save(product: Product): Promise<Product>;
}

export class SupabaseProductRepository implements ProductRepository {
  async findBySku(merchantId: string, sku: string): Promise<Product | null> {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("sku", sku)
      .single();

    if (error || !data) return null;
    return this.mapToDomain(data);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) return null;
    return this.mapToDomain(data);
  }

  async save(product: Product): Promise<Product> {
    const supabase = getServiceSupabase();
    
    // Save Product
    const { error: productError } = await supabase
      .from("products")
      .upsert({
        id: product.id,
        merchant_id: product.merchantId,
        product_type: product.productType,
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: product.shortDescription,
        sku: product.sku,
        status: product.status,
        category_ids: product.categoryIds,
        tags: product.tags,
        brand: product.brand,
        pricing: product.pricing,
        inventory: product.inventory,
        stock_quantity: product.stockQuantity,
        attributes: product.attributes,
        has_variants: product.hasVariants,
        media: product.media,
        seo: product.seo,
        shipping: product.shipping,
        service: product.service,
        download_url: product.downloadUrl,
        created_at: product.createdAt.toISOString(),
        updated_at: product.updatedAt.toISOString(),
        published_at: product.publishedAt?.toISOString(),
      });

    if (productError) throw new Error(`Failed to save product: ${productError.message}`);

    // Save Variants
    if (product.variants && product.variants.length > 0) {
      const variantsToUpsert = product.variants.map((v) => ({
        id: v.id,
        product_id: product.id,
        sku: v.sku,
        barcode: v.barcode,
        attributes: v.attributes,
        price: v.price,
        compare_at_price: v.compareAtPrice,
        cost_price: v.costPrice,
        stock: v.stockQuantity,
        weight: v.weight,
        dimensions: v.dimensions,
        images: v.images,
        is_default: v.isDefault,
        is_active: v.isActive,
      }));

      const { error: variantError } = await supabase
        .from("product_variants")
        .upsert(variantsToUpsert);

      if (variantError) throw new Error(`Failed to save variants: ${variantError.message}`);
    }

    return product;
  }

  private mapToDomain(dbProduct: any): Product {
    return {
      id: dbProduct.id,
      merchantId: dbProduct.merchant_id,
      productType: dbProduct.product_type || "physical",
      name: dbProduct.name,
      slug: dbProduct.slug,
      description: dbProduct.description,
      shortDescription: dbProduct.short_description,
      sku: dbProduct.sku,
      status: dbProduct.status || "draft",
      categoryIds: dbProduct.category_ids || [],
      tags: dbProduct.tags || [],
      brand: dbProduct.brand,
      pricing: dbProduct.pricing || { price: dbProduct.price, currency: dbProduct.currency, taxable: false },
      inventory: dbProduct.inventory || { trackInventory: dbProduct.track_inventory || false, allowBackorder: dbProduct.allow_backorders || false },
      stockQuantity: dbProduct.stock_quantity || dbProduct.stock || 0,
      attributes: dbProduct.attributes || [],
      variants: [], // You would ideally fetch variants here as well if needed in memory
      hasVariants: dbProduct.has_variants || false,
      media: dbProduct.media || [],
      seo: dbProduct.seo || {},
      shipping: dbProduct.shipping,
      service: dbProduct.service,
      downloadUrl: dbProduct.download_url,
      createdAt: new Date(dbProduct.created_at || Date.now()),
      updatedAt: new Date(dbProduct.updated_at || Date.now()),
      publishedAt: dbProduct.published_at ? new Date(dbProduct.published_at) : undefined,
    };
  }
}

export class DuplicateSkuError extends Error {
  constructor(sku: string) {
    super(`A product with SKU "${sku}" already exists for this merchant`);
    this.name = "DuplicateSkuError";
  }
}

export class SlugCollisionError extends Error {
  constructor(slug: string) {
    super(`Slug "${slug}" is already taken`);
    this.name = "SlugCollisionError";
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export class ProductService {
  constructor(private readonly repo: ProductRepository) {}

  async createProduct(input: CreateProductInput): Promise<Product> {
    // 1. Uniqueness checks
    const existingSku = await this.repo.findBySku(input.merchantId, input.sku);
    if (existingSku) throw new DuplicateSkuError(input.sku);

    let slug = slugify(input.name);
    let attempt = 0;
    while (await this.repo.findBySlug(attempt === 0 ? slug : `${slug}-${attempt}`)) {
      attempt += 1;
      if (attempt > 20) throw new SlugCollisionError(slug);
    }
    if (attempt > 0) slug = `${slug}-${attempt}`;

    // 2. Build variants with generated ids, defaulting one variant if needed
    const variants: ProductVariant[] = (input.variants ?? []).map((v) => ({
      id: randomUUID(),
      sku: v.sku,
      barcode: v.barcode,
      attributes: v.attributes,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      costPrice: v.costPrice,
      stockQuantity: v.stockQuantity,
      weight: v.weight,
      dimensions: v.dimensions,
      images: v.images,
      isDefault: v.isDefault ?? false,
      isActive: true,
    }));

    if (variants.length > 0 && !variants.some((v) => v.isDefault)) {
      variants[0].isDefault = true;
    }

    // 3. Build media with generated ids and a guaranteed primary image
    const media: ProductMedia[] = (input.media ?? []).map((m) => ({
      id: randomUUID(),
      ...m,
    }));
    if (media.length > 0 && !media.some((m) => m.isPrimary)) {
      media[0].isPrimary = true;
    }

    const now = new Date();

    const product: Product = {
      id: randomUUID(),
      merchantId: input.merchantId,
      productType: input.productType,

      name: input.name,
      slug,
      description: input.description,
      shortDescription: input.shortDescription,
      sku: input.sku,
      status: input.status ?? "draft",

      categoryIds: input.categoryIds,
      tags: input.tags ?? [],
      brand: input.brand,

      pricing: input.pricing,
      inventory: input.inventory,
      stockQuantity: input.stockQuantity ?? 0,

      attributes: (input.attributes ?? []).map((a) => ({ ...a })),
      variants,
      hasVariants: variants.length > 0,

      media,

      seo: {
        metaTitle: input.seo?.metaTitle ?? input.name,
        metaDescription: input.seo?.metaDescription ?? input.shortDescription,
        canonicalUrl: input.seo?.canonicalUrl,
        keywords: input.seo?.keywords ?? input.tags ?? [],
        ogImageUrl: input.seo?.ogImageUrl ?? media[0]?.url,
      },

      shipping: input.productType === "physical" ? input.shipping : undefined,
      service: input.productType === "service" ? input.service : undefined,
      downloadUrl: input.productType === "digital" ? input.downloadUrl : undefined,

      createdAt: now,
      updatedAt: now,
      publishedAt: input.status === "active" ? now : undefined,
    };

    return this.repo.save(product);
  }
}
