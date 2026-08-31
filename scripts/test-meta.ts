import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import axios from "axios";

async function main() {
  const token = process.env.META_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_VERSION || "v21.0";
  const configuredCatalogId = process.env.META_CATALOG_ID;

  console.log("=== META DIAGNOSTIC TEST ===");
  console.log("Configured Catalog ID in .env.local:", configuredCatalogId);
  console.log("Graph Version:", version);
  console.log("Token Present:", !!token);

  if (!token) {
    console.error("Error: META_ACCESS_TOKEN is missing.");
    return;
  }

  const graph = axios.create({
    baseURL: `https://graph.facebook.com/${version}`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // 1. Get Me / User / App info
  try {
    const meRes = await graph.get("/me?fields=id,name");
    console.log("\nToken Identity:", meRes.data);
  } catch (err: any) {
    console.log("\nToken Identity Check Failed:", err.response?.data?.error?.message || err.message);
  }

  // 2. Fetch accessible Catalogs
  try {
    const catalogsRes = await graph.get("/me/catalogs?fields=id,name,product_count,vertical");
    console.log("\nAccessible Catalogs for this Token:");
    console.log(JSON.stringify(catalogsRes.data, null, 2));
  } catch (err: any) {
    console.log("\nCould not list /me/catalogs:", err.response?.data?.error?.message || err.message);
  }

  // 3. Test specific Catalog IDs
  const catalogsToTest = ["2170054226905114", "464687504761698", "1708353833601040"];
  for (const cId of catalogsToTest) {
    console.log(`\nTesting Catalog ID [${cId}]...`);
    try {
      const res = await graph.get(`/${cId}?fields=id,name,product_count`);
      console.log(` SUCCESS: Found Catalog "${res.data.name}" (ID: ${res.data.id}, Products: ${res.data.product_count ?? 0})`);
    } catch (err: any) {
      console.log(` FAILED:`, err.response?.data?.error?.message || err.message);
    }
  }
}

main().catch(console.error);
