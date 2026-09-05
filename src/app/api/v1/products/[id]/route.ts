import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createProductSchema } from "@/lib/products/validator";
import { ProductService, SupabaseProductRepository, DuplicateSkuError, SlugCollisionError } from "@/lib/products/service";
// import { verifyIdToken } from "@/lib/firebase-auth-edge";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repo = new SupabaseProductRepository();
    const service = new ProductService(repo);
    
    const product = await service.getProduct(id);
    if (!product) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (err) {
    console.error("Error fetching product:", err);
    return NextResponse.json({ success: false, error: "InternalServerError" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate auth and match merchantId logic...
    // const authHeader = request.headers.get("Authorization");
    // const token = authHeader?.split("Bearer ")[1];
    // if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    // const user = await verifyIdToken(token);
    
    const body = await request.json();
    if (body.productType && (body.productType !== "service" || !body.service || Object.keys(body.service).length === 0 || !body.service.durationMinutes)) {
      delete body.service;
    }
    if (body.productType && (body.productType !== "physical" || !body.shipping || Object.keys(body.shipping).length === 0)) {
      delete body.shipping;
    }
    if (body.productType && (body.productType !== "digital" || !body.downloadUrl)) {
      delete body.downloadUrl;
    }

    // Re-using the same schema but making it partial is common,
    // For now we'll do a partial validation or rely on the frontend passing the full object
    const parsed = createProductSchema.partial().parse(body);

    const repo = new SupabaseProductRepository();
    const service = new ProductService(repo);

    const updated = await service.updateProduct(id, parsed);

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({
        success: false,
        error: "ValidationError",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
      }, { status: 422 });
    }
    if (err instanceof DuplicateSkuError || err instanceof SlugCollisionError) {
      return NextResponse.json({ success: false, error: err.name, message: err.message }, { status: 409 });
    }
    console.error("Error updating product:", err);
    return NextResponse.json({ success: false, error: "InternalServerError" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Auth validation...
    
    const repo = new SupabaseProductRepository();
    const service = new ProductService(repo);
    
    await service.deleteProduct(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting product:", err);
    return NextResponse.json({ success: false, error: "InternalServerError" }, { status: 500 });
  }
}
