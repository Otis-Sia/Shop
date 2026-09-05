import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createProductSchema } from "@/lib/products/validator";
import { ProductService, SupabaseProductRepository, DuplicateSkuError, SlugCollisionError } from "@/lib/products/service";
// Depending on auth, uncomment or adapt this:
// import { verifyIdToken } from "@/lib/firebase-auth-edge";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. (Optional) Validate auth and inject merchant ID here
    // const authHeader = req.headers.get("Authorization");
    // const token = authHeader?.split("Bearer ")[1];
    // if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    // const user = await verifyIdToken(token);
    // const merchantId = user.uid;

    const body = await req.json();

    if (!body.merchantId) {
      body.merchantId = "admin";
    }
    if (!body.sku || !body.sku.trim()) {
      body.sku = `SKU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }
    if (!body.pricing) {
      body.pricing = { price: Number(body.price || 0), currency: body.currency || "KES", taxable: false };
    }
    if (!body.inventory) {
      body.inventory = { trackInventory: body.trackInventory || false, allowBackorder: body.allowBackorders || false };
    }
    if (!body.shipping && (body.productType === "physical" || !body.productType)) {
      body.shipping = { requiresShipping: true, countryOfOrigin: body.countryOfOrigin || "Kenya" };
    }
    if (!body.categoryIds || (Array.isArray(body.categoryIds) && body.categoryIds.length === 0)) {
      body.categoryIds = body.category ? [body.category] : ["General"];
    }

    if (body.productType !== "service" || !body.service || Object.keys(body.service).length === 0 || !body.service.durationMinutes) {
      delete body.service;
    }
    if (body.productType !== "physical" || !body.shipping || Object.keys(body.shipping).length === 0) {
      delete body.shipping;
    }
    if (body.productType !== "digital" || !body.downloadUrl) {
      delete body.downloadUrl;
    }

    // 2. Parse and validate
    const parsed = createProductSchema.parse(body);

    // 3. Delegate to service
    const repo = new SupabaseProductRepository();
    const service = new ProductService(repo);
    
    const product = await service.createProduct(parsed);

    return NextResponse.json({
      success: true,
      data: product,
    }, { status: 201 });

  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({
        success: false,
        error: "ValidationError",
        issues: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      }, { status: 422 });
    }

    if (err instanceof DuplicateSkuError || err instanceof SlugCollisionError) {
      return NextResponse.json({
        success: false,
        error: err.name,
        message: err.message,
      }, { status: 409 });
    }

    console.error("Unexpected error creating product:", err);
    return NextResponse.json({
      success: false,
      error: "InternalServerError",
      message: err instanceof Error ? err.message : "Something went wrong while creating the product",
      stack: err instanceof Error ? err.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");
    
    // Auth validation...
    
    const repo = new SupabaseProductRepository();
    const service = new ProductService(repo);
    
    const products = await service.getProducts(merchantId || undefined);

    return NextResponse.json({ success: true, data: products });
  } catch (err) {
    console.error("Error fetching products:", err);
    return NextResponse.json({ success: false, error: "InternalServerError" }, { status: 500 });
  }
}
