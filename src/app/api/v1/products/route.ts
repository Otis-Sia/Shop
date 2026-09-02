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

    // Enforce merchantId if injected from auth, otherwise it relies on payload
    // if (merchantId) body.merchantId = merchantId;

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
      message: "Something went wrong while creating the product",
    }, { status: 500 });
  }
}
