import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = process.env.META_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_VERSION || "v21.0";
  const catalogId = process.env.META_CATALOG_ID;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const results: Record<string, any> = {
    env: {
      has_token: !!token,
      catalogId,
      phoneId,
      version,
    },
    accessible_catalogs: [],
    catalog_test_results: {},
    errors: [],
  };

  if (!token) {
    return NextResponse.json({ error: "META_ACCESS_TOKEN is missing in .env.local" }, { status: 400 });
  }

  const graph = axios.create({
    baseURL: `https://graph.facebook.com/${version}`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // 1. Inspect Token Debug Info
  try {
    const debugTokenRes = await graph.get(`/debug_token?input_token=${token}`);
    results.token_info = debugTokenRes.data?.data;
  } catch (err: any) {
    results.token_info_error = err.response?.data || err.message;
  }

  // 2. Fetch accessible Catalogs for this token
  try {
    const catalogsRes = await graph.get(`/me/catalogs?fields=id,name,vertical,product_count`);
    results.accessible_catalogs = catalogsRes.data?.data || [];
  } catch (err: any) {
    results.accessible_catalogs_error = err.response?.data || err.message;
  }

  // 3. Test known catalog IDs
  const testCatalogIds = [
    catalogId,
    "464687504761698",
    "2170054226905114",
    "1708353833601040",
  ].filter(Boolean) as string[];

  const uniqueIds = Array.from(new Set(testCatalogIds));

  for (const cId of uniqueIds) {
    try {
      const catInfo = await graph.get(`/${cId}?fields=id,name,product_count,is_catalog_segment`);
      results.catalog_test_results[cId] = {
        status: "ACCESSIBLE",
        data: catInfo.data,
      };
    } catch (err: any) {
      results.catalog_test_results[cId] = {
        status: "ERROR",
        error: err.response?.data || err.message,
      };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
