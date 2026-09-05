import axios from "axios";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v18.0";
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const CATALOG_ID = process.env.META_CATALOG_ID;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const getGraphClient = () => {
  if (!ACCESS_TOKEN) {
    throw new Error("META_ACCESS_TOKEN is not set.");
  }
  return axios.create({
    baseURL: `https://graph.facebook.com/${GRAPH_VERSION}`,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
};

/**
 * Create or update products in a Meta catalog.
 *
 * Meta identifies the product using the "id" / retailer ID.
 */
export async function syncProducts(products: any[]) {
  if (!CATALOG_ID) throw new Error("META_CATALOG_ID is not set.");
  
  const graph = getGraphClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://juj4.cepine.com";
  
  const requests = products
    .filter((p) => p && (p.id || p.sku) && p.name)
    .map((product) => {
      const productId = String(product.id || product.sku);
      const mainImage = (product.imageUrls && product.imageUrls[0]) || product.image_url || "";
      const priceVal = Number(product.price || 0).toFixed(2);
      const currencyVal = (product.currency || "KES").toUpperCase();
      const inStock = (product.stock === null || product.stock === undefined || Number(product.stock) > 0) && product.trackInventory !== false;
      const category = product.category || "General";

      return {
        method: "UPDATE",
        data: {
          id: productId,
          title: product.name,
          description: product.description || product.shortDescription || product.name || "",
          availability: inStock ? "in stock" : "out of stock",
          condition: "new",
          price: `${priceVal} ${currencyVal}`,
          link: `${appUrl}/products/${productId}`,
          image_link: mainImage,
          brand: product.brand || "Generic",
          category: category,
          retailer_category: category,
          product_type: category,
          custom_label_0: category,
          visibility: "published",
        },
      };
    });

  if (requests.length === 0) {
    return { message: "No valid products to sync." };
  }

  const response = await graph.post(`/${CATALOG_ID}/items_batch`, {
    allow_upsert: true,
    item_type: "PRODUCT_ITEM",
    requests,
  });

  return response.data;
}

/**
 * Automatically create or sync Product Sets on Meta Catalog for each product category.
 */
export async function syncProductSets(categories: string[]) {
  if (!CATALOG_ID) throw new Error("META_CATALOG_ID is not set.");
  const graph = getGraphClient();

  const uniqueCategories = Array.from(new Set(categories.filter((c) => Boolean(c) && c.trim() !== "")));
  if (uniqueCategories.length === 0) {
    return { message: "No categories to sync." };
  }

  // Fetch existing product sets
  let existingSets: { id: string; name: string }[] = [];
  try {
    const existingRes = await graph.get(`/${CATALOG_ID}/product_sets`, {
      params: { fields: "id,name,filter", limit: 100 },
    });
    existingSets = existingRes.data?.data || [];
  } catch (err: any) {
    console.warn("Could not fetch existing Meta product sets:", err.response?.data || err.message);
  }

  const existingSetNames = new Set(existingSets.map((s) => s.name?.trim().toLowerCase()));
  const createdSets: any[] = [];
  const errors: any[] = [];

  for (const category of uniqueCategories) {
    if (existingSetNames.has(category.trim().toLowerCase())) {
      continue;
    }

    try {
      const response = await graph.post(`/${CATALOG_ID}/product_sets`, {
        name: category,
        filter: {
          retailer_category: { eq: category },
        },
      });
      createdSets.push({ category, id: response.data?.id });
    } catch (createErr: any) {
      // Fallback filter using product_type if retailer_category fails
      try {
        const fallbackRes = await graph.post(`/${CATALOG_ID}/product_sets`, {
          name: category,
          filter: {
            product_type: { eq: category },
          },
        });
        createdSets.push({ category, id: fallbackRes.data?.id });
      } catch (fallbackErr: any) {
        console.error(`Failed to create Meta Product Set for "${category}":`, fallbackErr.response?.data || fallbackErr.message);
        errors.push({ category, error: fallbackErr.response?.data || fallbackErr.message });
      }
    }
  }

  return {
    totalCategories: uniqueCategories.length,
    existingSetsCount: existingSets.length,
    createdSetsCount: createdSets.length,
    createdSets,
    errors,
  };
}

/**
 * Delete products from the Meta catalog.
 */
export async function deleteProducts(skus: string[]) {
  if (!CATALOG_ID) throw new Error("META_CATALOG_ID is not set.");
  
  const graph = getGraphClient();
  
  const requests = skus.map((sku) => ({
    method: "DELETE",
    data: {
      id: String(sku),
    },
  }));

  const response = await graph.post(`/${CATALOG_ID}/items_batch`, {
    item_type: "PRODUCT_ITEM",
    requests,
  });

  return response.data;
}

/**
 * Send one catalog product through WhatsApp.
 */
export async function sendWhatsAppProduct({
  phoneNumber,
  sku,
  bodyText,
  footerText,
}: {
  phoneNumber: string;
  sku: string;
  bodyText?: string;
  footerText?: string;
}) {
  if (!PHONE_NUMBER_ID) throw new Error("WHATSAPP_PHONE_NUMBER_ID is not set.");
  if (!CATALOG_ID) throw new Error("META_CATALOG_ID is not set.");
  
  const graph = getGraphClient();
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneNumber,
    type: "interactive",
    interactive: {
      type: "product",
      body: {
        text: bodyText || "Check out this product!",
      },
      ...(footerText
        ? {
            footer: {
              text: footerText,
            },
          }
        : {}),
      action: {
        catalog_id: CATALOG_ID,
        product_retailer_id: sku,
      },
    },
  };

  const response = await graph.post(`/${PHONE_NUMBER_ID}/messages`, payload);

  return response.data;
}
