import { v4 as randomUUID } from "uuid";
import {
  Product,
  ProductVariant,
  ProductMedia,
  CreateProductInput,
} from "./types";
import { getServiceSupabase } from "@/lib/supabase/server";

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySku(merchantId: string, sku: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findAll(merchantId?: string): Promise<Product[]>;
  save(product: Product): Promise<Product>;
  delete(id: string): Promise<void>;
}

export class SupabaseProductRepository implements ProductRepository {
  async findById(id: string): Promise<Product | null> {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("*, product_variants(*)")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToDomain(data);
  }

  async findAll(merchantId?: string): Promise<Product[]> {
    const supabase = getServiceSupabase();
    let query = supabase.from("products").select("*, product_variants(*)");
    if (merchantId) query = query.eq("merchant_id", merchantId);
    
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(d => this.mapToDomain(d));
  }

  async delete(id: string): Promise<void> {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete product: ${error.message}`);
  }
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
      supplierName: dbProduct.supplier_name,
      pricing: dbProduct.pricing || { price: dbProduct.price, currency: dbProduct.currency, taxable: false },
      inventory: dbProduct.inventory || { trackInventory: dbProduct.track_inventory || false, allowBackorder: dbProduct.allow_backorders || false },
      stockQuantity: dbProduct.stock_quantity || dbProduct.stock || 0,
      attributes: dbProduct.attributes || [],
      variants: (dbProduct.product_variants || []).map((v: any) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        attributes: v.attributes,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        costPrice: v.cost_price,
        stockQuantity: v.stock,
        weight: v.weight,
        dimensions: v.dimensions,
        images: v.images,
        isDefault: v.is_default,
        isActive: v.is_active,
      })),
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
      supplier_name: input.supplierName,

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

  async getProduct(id: string): Promise<Product | null> {
    return this.repo.findById(id);
  }

  async getProducts(merchantId?: string): Promise<Product[]> {
    return this.repo.findAll(merchantId);
  }

  async updateProduct(id: string, input: Partial<CreateProductInput>): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Product not found");

    if (input.sku && input.sku !== existing.sku) {
      const existingSku = await this.repo.findBySku(existing.merchantId, input.sku);
      if (existingSku) throw new DuplicateSkuError(input.sku);
    }

    let slug = existing.slug;
    if (input.name && input.name !== existing.name) {
      slug = slugify(input.name);
      let attempt = 0;
      while (true) {
        const check = await this.repo.findBySlug(attempt === 0 ? slug : `${slug}-${attempt}`);
        if (!check || check.id === id) break;
        attempt += 1;
        if (attempt > 20) throw new SlugCollisionError(slug);
      }
      if (attempt > 0) slug = `${slug}-${attempt}`;
    }

    const variants: ProductVariant[] = (input.variants ?? existing.variants).map((v) => ({
      id: (v as any).id || randomUUID(),
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

    const media: ProductMedia[] = (input.media ?? existing.media).map((m) => ({
      id: (m as any).id || randomUUID(),
      ...m,
    }));
    if (media.length > 0 && !media.some((m) => m.isPrimary)) {
      media[0].isPrimary = true;
    }

    const updated: Product = {
      ...existing,
      ...input,
      slug,
      variants,
      hasVariants: variants.length > 0,
      media,
      seo: {
        ...existing.seo,
        ...input.seo,
      },
      updatedAt: new Date(),
    } as Product;

    return this.repo.save(updated);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
