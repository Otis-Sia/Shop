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

function buildRichWhatsAppDescription(product: any): string {
  const sections: string[] = [];

  // 1. Primary Description
  const mainDesc = (product.description || product.shortDescription || "").trim();
  if (mainDesc) {
    sections.push(mainDesc);
  }

  // 2. Key Features / Highlights
  const features = Array.isArray(product.features) ? product.features.filter(Boolean) : [];
  if (features.length > 0) {
    const featureLines = features.map((f: string) => `• ${f}`);
    sections.push(`*Key Features:*\n${featureLines.join("\n")}`);
  }

  // 3. Specifications & Variants
  const specs: string[] = [];
  if (product.brand && product.brand.toLowerCase() !== "generic") {
    specs.push(`• Brand: ${product.brand}`);
  }
  if (product.sku) {
    specs.push(`• SKU / Model: ${product.sku}`);
  }
  if (product.category) {
    specs.push(`• Category: ${product.category}`);
  }
  if (product.capacity) {
    specs.push(`• Capacity: ${product.capacity}`);
  }
  if (product.power) {
    specs.push(`• Power: ${product.power}`);
  }
  if (product.weight) {
    specs.push(`• Weight: ${product.weight} ${product.weightUnit || "kg"}`);
  }
  if (Array.isArray(product.grades) && product.grades.length > 0) {
    specs.push(`• Condition / Grade: ${product.grades.join(", ")}`);
  }
  if (Array.isArray(product.colors) && product.colors.length > 0) {
    specs.push(`• Available Colors: ${product.colors.join(", ")}`);
  }
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    specs.push(`• Available Sizes: ${product.sizes.join(", ")}`);
  }
  if (product.countryOfOrigin) {
    specs.push(`• Origin: ${product.countryOfOrigin}`);
  }

  if (specs.length > 0) {
    sections.push(`*Specifications:*\n${specs.join("\n")}`);
  }

  // 4. Delivery & Order Info
  sections.push(`*Ordering & Delivery:*\n• Fast dispatch & delivery across Kenya\n• 100% Genuine & Quality Assured`);

  const combined = sections.join("\n\n");
  return combined.length > 0 ? combined.slice(0, 4900) : product.name || "";
}

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
      const additionalImages = (product.imageUrls || []).slice(1, 11).filter(Boolean);
      const salePriceVal = product.salePrice ? Number(product.salePrice).toFixed(2) : null;
      const richDescription = buildRichWhatsAppDescription(product);

      const itemData: Record<string, any> = {
        id: productId,
        title: product.name,
        description: richDescription,
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
      };

      if (salePriceVal && Number(salePriceVal) < Number(priceVal)) {
        itemData.sale_price = `${salePriceVal} ${currencyVal}`;
      }

      if (additionalImages.length > 0) {
        itemData.additional_image_urls = additionalImages;
      }

      if (product.groupCategory) {
        itemData.custom_label_1 = product.groupCategory;
      }

      return {
        method: "UPDATE",
        data: itemData,
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
  let existingSets: { id: string; name: string; filter?: any }[] = [];
  try {
    const existingRes = await graph.get(`/${CATALOG_ID}/product_sets`, {
      params: { fields: "id,name,filter", limit: 100 },
    });
    existingSets = existingRes.data?.data || [];
  } catch (err: any) {
    console.warn("Could not fetch existing Meta product sets:", err.response?.data || err.message);
  }

  const existingSetsByName = new Map(existingSets.map((s) => [s.name?.trim().toLowerCase(), s]));
  const createdSets: any[] = [];
  const updatedSets: any[] = [];
  const errors: any[] = [];

  for (const category of uniqueCategories) {
    const key = category.trim().toLowerCase();
    const existing = existingSetsByName.get(key);

    const filterObj = {
      custom_label_0: { eq: category },
    };

    if (existing) {
      // Check if filter needs repair
      const filterStr = typeof existing.filter === "string" ? existing.filter : JSON.stringify(existing.filter || "");
      if (!filterStr.includes("custom_label_0")) {
        try {
          await graph.post(`/${existing.id}`, { filter: filterObj });
          updatedSets.push({ category, id: existing.id });
        } catch (updateErr: any) {
          console.warn(`Could not update filter for set "${category}":`, updateErr.response?.data || updateErr.message);
        }
      }
      continue;
    }

    try {
      const response = await graph.post(`/${CATALOG_ID}/product_sets`, {
        name: category,
        filter: filterObj,
      });
      createdSets.push({ category, id: response.data?.id });
    } catch (createErr: any) {
      console.error(`Failed to create Meta Product Set for "${category}":`, createErr.response?.data || createErr.message);
      errors.push({ category, error: createErr.response?.data || createErr.message });
    }
  }

  return {
    totalCategories: uniqueCategories.length,
    existingSetsCount: existingSets.length,
    createdSetsCount: createdSets.length,
    updatedSetsCount: updatedSets.length,
    createdSets,
    updatedSets,
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
