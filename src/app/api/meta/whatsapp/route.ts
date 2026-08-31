import { NextResponse } from "next/server";
import { sendWhatsAppProduct } from "@/lib/api/meta";
import { getServiceSupabase } from "@/lib/supabase/server";
import { verifyIdToken } from "@/lib/firebase-auth-edge";

export const dynamic = "force-dynamic";

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

    const body = await request.json();
    const { phoneNumber, productId, bodyText, footerText } = body;

    if (!phoneNumber || !productId) {
      return NextResponse.json(
        { error: "phoneNumber and productId are required" },
        { status: 400 }
      );
    }

    // 2. Verify Product Exists in Supabase
    const supabase = getServiceSupabase();
    const { data: product, error } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId.toString())
      .maybeSingle();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found in database" }, { status: 404 });
    }

    // 3. Send via WhatsApp
    const result = await sendWhatsAppProduct({
      phoneNumber,
      sku: productId.toString(),
      bodyText,
      footerText,
    });

    return NextResponse.json({
      success: true,
      productId,
      whatsapp: result,
    });
  } catch (error: any) {
    console.error("WhatsApp Send Error:", error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
