import fs from 'fs';

// Read .env.local manually to ensure accurate values
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const token = env.META_ACCESS_TOKEN;
const version = env.META_GRAPH_VERSION || 'v21.0';

console.log("=== META DIAGNOSTIC RUN ===");
console.log("Graph Version:", version);
console.log("Configured META_CATALOG_ID:", env.META_CATALOG_ID);

if (!token) {
  console.error("META_ACCESS_TOKEN is missing!");
  process.exit(1);
}

async function run() {
  // Test me
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/me?access_token=${token}`);
    const data = await res.json();
    console.log("\n1. Token User/App Identity:", JSON.stringify(data));
  } catch (e) {
    console.error("Failed me:", e);
  }

  // Test debug_token
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/debug_token?input_token=${token}&access_token=${token}`);
    const data = await res.json();
    console.log("\n1b. Token Details & Scopes:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed debug_token:", e);
  }

  // Test businesses
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/me/businesses?access_token=${token}&fields=id,name,owned_product_catalogs{id,name,product_count},client_product_catalogs{id,name,product_count}`);
    const data = await res.json();
    console.log("\n2. Businesses & Catalogs:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed /me/businesses:", e);
  }

  // Test /me/owned_product_catalogs
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/me/owned_product_catalogs?access_token=${token}&fields=id,name,product_count`);
    const data = await res.json();
    console.log("\n2b. Owned Product Catalogs:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed /me/owned_product_catalogs:", e);
  }
}

run();
