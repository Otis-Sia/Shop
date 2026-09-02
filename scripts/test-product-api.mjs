import fetch from 'node-fetch'; // Requires node-fetch if Node < 18, otherwise native fetch works

const API_URL = "http://localhost:3000/api/v1/products";

// Ensure you replace this with a valid merchant ID from your database if you have foreign key constraints
const TEST_MERCHANT_ID = "ug0bco554QbaAc6qS3G3Vn9Ya7y1";

const payload = {
  merchantId: TEST_MERCHANT_ID,
  productType: "physical",
  
  name: "Classic Cotton T-Shirt",
  description: "A soft, breathable 100% cotton t-shirt available in multiple colors and sizes. Pre-shrunk and machine washable.",
  shortDescription: "Soft 100% cotton tee, multiple colors and sizes.",
  sku: `TSHIRT-CLASSIC-${Date.now()}`, // Ensuring uniqueness for testing
  status: "active",
  
  categoryIds: ["b2c9f6a0-1234-4a1b-9d3e-abcdef123456"], // Replace with actual category UUID if restricted
  tags: ["apparel", "t-shirt", "cotton", "unisex"],
  brand: "Cedar Basics",
  
  pricing: {
    price: 19.99,
    compareAtPrice: 24.99,
    costPrice: 7.50,
    currency: "USD",
    taxable: true,
    taxClass: "standard"
  },
  
  inventory: {
    trackInventory: true,
    allowBackorder: false,
    lowStockThreshold: 10,
    warehouseLocation: "NAIROBI-WH1"
  },
  stockQuantity: 80, // Total stock, usually computed from variants later
  
  attributes: [
    { name: "Material", value: "100% Cotton", group: "Fabric" },
    { name: "Fit", value: "Regular", group: "Fabric" },
    { name: "Care", value: "Machine wash cold", group: "Care" }
  ],
  
  variants: [
    {
      sku: `TSHIRT-RED-M-${Date.now()}`,
      attributes: [
        { name: "Color", value: "Red", isVariantAxis: true },
        { name: "Size", value: "M", isVariantAxis: true }
      ],
      stockQuantity: 50,
      isDefault: true,
      price: 19.99
    },
    {
      sku: `TSHIRT-BLUE-L-${Date.now()}`,
      attributes: [
        { name: "Color", value: "Blue", isVariantAxis: true },
        { name: "Size", value: "L", isVariantAxis: true }
      ],
      stockQuantity: 30,
      price: 21.99 // Example price override
    }
  ],
  
  media: [
    {
      url: "https://cdn.example.com/products/tshirt-main.jpg",
      type: "image",
      position: 0,
      isPrimary: true,
      altText: "Classic cotton t-shirt, front view"
    }
  ],
  
  seo: {
    metaTitle: "Classic Cotton T-Shirt | Cedar Basics",
    metaDescription: "Shop the Classic Cotton T-Shirt — soft, breathable, and available in multiple colors.",
    keywords: ["t-shirt", "cotton tee", "unisex shirt"]
  },
  
  shipping: {
    requiresShipping: true,
    weight: { value: 200, unit: "g" },
    dimensions: { length: 30, width: 20, height: 2, unit: "cm" },
    countryOfOrigin: "KE"
  }
};

async function testCreateProduct() {
  console.log(`Sending POST request to ${API_URL}...`);
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // "Authorization": "Bearer YOUR_TEST_TOKEN_HERE" // Uncomment if token verification is active
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Success! Product Created:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error("❌ Failed to create product. API returned:");
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("🚨 Request Error:", error);
  }
}

testCreateProduct();
