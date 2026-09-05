import { NextResponse } from "next/server";
import { syncProducts, deleteProducts, syncProductSets } from "@/lib/api/meta";
import { getServiceSupabase } from "@/lib/supabase/server";
import { verifyIdToken } from "@/lib/firebase-auth-edge";
import { Product } from "@/types/schema";

export const dynamic = "force-dynamic";

function mapDbProductToProduct(row: any): Product {
  const imageUrls = Array.isArray(row.image_urls) ? row.image_urls : [];
  return {
    id: row.id,
    adminId: row.merchant_id || "admin",
    name: row.name || "",
    description: row.description || "",
    shortDescription: row.short_description || "",
    price: Number(row.price || 0),
    currency: row.currency || "KES",
    stock: row.stock !== null && row.stock !== undefined ? Number(row.stock) : null,
    trackInventory: row.track_inventory ?? true,
    category: row.category || "General",
    brand: row.brand || "",
    imageUrls: imageUrls,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Product;
}

export async function POST(request: Request) {
  try {
    // 1. Verify Authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    
    try {
      await verifyIdToken(token);
    } catch (authError) {
      console.error("Invalid token:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { productId, productData } = body;

    const supabase = getServiceSupabase();
    let productsToSync: Product[] = [];

    if (productData) {
      // If client passed the product data directly
      productsToSync.push(productData);
    } else if (productId) {
      // Fetch specific product from Supabase
      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId.toString())
        .maybeSingle();

      if (error || !product) {
        return NextResponse.json({ error: "Product not found in Supabase" }, { status: 404 });
      }
      productsToSync.push(mapDbProductToProduct(product));
    } else {
      // Fetch all products from Supabase
      const { data: products, error } = await supabase
        .from("products")
        .select("*");

      if (error) {
        throw error;
      }

      if (products && products.length > 0) {
        productsToSync = products.map(mapDbProductToProduct);
      }
    }

    if (productsToSync.length === 0) {
      return NextResponse.json({ success: true, message: "No products to sync." });
    }

    // 2. Push to Meta Catalog Batch API
    const result = await syncProducts(productsToSync);

    // 3. Automatically create/sync Meta Product Sets for all categories
    let setsResult = null;
    try {
      const categories = productsToSync
        .map((p) => p.category)
        .filter((cat): cat is string => Boolean(cat) && cat.trim() !== "");
      
      if (categories.length > 0) {
        setsResult = await syncProductSets(categories);
      }
    } catch (setError: any) {
      console.warn("Automated Meta Product Sets sync warning:", setError.message);
    }

    return NextResponse.json({
      success: true,
      synced: productsToSync.length,
      meta: result,
      sets: setsResult,
    });
  } catch (error: any) {
    console.error("Meta Sync Error:", error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split("Bearer ")[1];
    await verifyIdToken(token);

    const body = await request.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json({ error: "productIds array is required" }, { status: 400 });
    }

    const result = await deleteProducts(productIds.map(String));

    return NextResponse.json({
      success: true,
      deleted: productIds.length,
      meta: result,
    });
  } catch (error: any) {
    console.error("Meta Delete Error:", error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
