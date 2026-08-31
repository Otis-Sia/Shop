import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET Handler for Meta Webhook Verification
 * Meta sends a GET request to verify the webhook endpoint URL.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "meta_shop_webhook_token_2026";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Meta webhook verified successfully.");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 });
}

/**
 * POST Handler for Meta Webhook Events
 * Receives product updates or catalog notifications from Meta Commerce Manager
 * and automatically synchronizes them into the Supabase 'products' table.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log("Meta Webhook Event Received:", JSON.stringify(payload, null, 2));

    const supabase = getServiceSupabase();

    // Check for catalog item changes / product updates
    if (payload.object === "product_catalog" || payload.entry) {
      const entries = payload.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          const value = change.value || {};
          const item = value.item || value;

          // If a catalog item was created or updated in Meta Commerce Manager
          if (change.field === "catalog_item" || change.field === "product_item" || item.id || item.retailer_id) {
            const productId = String(item.retailer_id || item.id || item.product_id || "");
            if (!productId) continue;

            const name = item.title || item.name || "WhatsApp Catalog Product";
            const description = item.description || "";
            const priceNum = parseFloat(String(item.price || "0").replace(/[^0-9.]/g, "")) || 0;
            const currency = item.currency || "KES";
            const imageUrl = item.image_link || item.image_url || "";
            const availability = item.availability === "in stock";

            // If item was deleted on Meta side
            if (change.verb === "delete" || change.action === "delete") {
              await supabase.from("products").delete().eq("id", productId);
              console.log(`Deleted product ${productId} from Supabase based on Meta webhook.`);
              continue;
            }

            // Find a default merchant_id / admin user if not present
            const { data: adminUser } = await supabase
              .from("users")
              .select("uid")
              .limit(1)
              .maybeSingle();

            const merchantId = adminUser?.uid || "admin";

            // Upsert into Supabase products table
            const { error: upsertError } = await supabase.from("products").upsert(
              {
                id: productId,
                merchant_id: merchantId,
                name: name,
                description: description,
                short_description: description.slice(0, 200),
                price: priceNum,
                currency: currency,
                stock: availability ? 10 : 0,
                track_inventory: true,
                category: item.category || "General",
                brand: item.brand || "",
                image_urls: imageUrl ? [imageUrl] : [],
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            );

            if (upsertError) {
              console.error(`Error saving product ${productId} to Supabase:`, upsertError);
            } else {
              console.log(`Successfully synced product ${productId} (${name}) into Supabase!`);
            }
          }
        }
      }
    }

    // Always acknowledge Meta with 200 OK
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error: any) {
    console.error("Meta Webhook Processing Error:", error);
    // Return 200 to prevent Meta from retrying failed malformed payloads indefinitely
    return NextResponse.json({ status: "ERROR_HANDLED", error: error.message }, { status: 200 });
  }
}
