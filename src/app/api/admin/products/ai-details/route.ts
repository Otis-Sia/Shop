import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getServiceSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { rawDetails } = await req.json();
    if (!rawDetails) {
      return NextResponse.json({ error: 'rawDetails is required.' }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured.' }, { status: 500 });
    }
    const supabase = getServiceSupabase();

    // Fetch existing categories for AI context
    const { data: existingCategories } = await supabase.from('system_categories').select('*');
    const categoriesContext = existingCategories ? existingCategories.map(c => ({
      groupCategory: c.name,
      categories: (typeof c.categories === 'string' ? JSON.parse(c.categories) : c.categories).map((cat: any) => ({
        name: cat.name,
        subcategories: cat.subcategories || []
      }))
    })) : [];

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `\nYou are an expert e-commerce copywriter, merchandiser, and data extraction specialist.
Given the following raw, free‑form or arbitrary product text, extract, parse, and structure every piece of product information available.

Raw product details:
"""${rawDetails}"""

Existing categories (for reference):
${JSON.stringify(categoriesContext, null, 2)}

Return a JSON object containing the following fields:
- name: concise, high-converting product title/name.
- shortDescription: 1‑2 sentence punchy summary.
- description: comprehensive, well-structured product description.
- brand: brand name if identifiable, otherwise "Generic".
- countryOfOrigin: country of origin. (Rule: if brand is generic or unknown, default to "Kenya").
- supplierName: supplier, vendor, dropshipper, or manufacturer name if mentioned (otherwise null).
- sku: product SKU, model number, or code if present in the text (otherwise null).
- costPrice: supplier cost / cost price / wholesale price / buy price as a clean number (e.g. 150.00 or null if not found).
- price: selling price / retail price / MSRP as a clean number (e.g. 299.00 or null if not found).
- salePrice: discounted / promotional / sale price as a clean number (or null if not found).
- stock: inventory quantity / units available as an integer (e.g. 50 or null if not found).
- colors: array of distinct color names mentioned (e.g. ["Black", "White", "Navy Blue"]). If no colors are mentioned, return empty array [].
- sizes: array of distinct sizes or dimensions mentioned (e.g. ["S", "M", "L", "XL"] or ["40", "41", "42"]). If no sizes are mentioned, return empty array [].
- variants: array of variant objects if specific variant combinations, SKUs, or color/size options with individual prices/stock are listed in the text: [{"color": "...", "size": "...", "price": 0, "stock": 0}]. Return empty array [] if none specifically listed.
- groupCategory: top‑level category group (match existing if possible, or provide appropriate new name).
- category: primary category under the group (match existing if possible, or create appropriate new name).
- subcategories: array of 1-4 relevant subcategory names.
- tags: array of 5‑8 relevant search tags.
- labels: array of 1‑3 promotional labels (e.g. "Featured", "New Arrival", "Popular", "Best Seller").
- imageAltTexts: array of 2‑3 descriptive image alt text strings.

Do not include markdown code fences (like \`\`\`json). Output raw valid JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);

      // Insert or update categories if needed
      if (parsed.groupCategory && parsed.category) {
        const groupName = parsed.groupCategory;
        const catName = parsed.category;
        const subcats = parsed.subcategories || [];
        let existingGroup = existingCategories?.find(c => c.name.toLowerCase() === groupName.toLowerCase());
        if (existingGroup) {
          let catsArray = typeof existingGroup.categories === 'string' ? JSON.parse(existingGroup.categories) : existingGroup.categories;
          if (!Array.isArray(catsArray)) catsArray = [];
          const catIndex = catsArray.findIndex((c: any) => c.name.toLowerCase() === catName.toLowerCase());
          let updated = false;
          if (catIndex >= 0) {
            const currentSubs = catsArray[catIndex].subcategories || [];
            const newSubs = subcats.filter((s: string) => !currentSubs.some((cs: string) => cs.toLowerCase() === s.toLowerCase()));
            if (newSubs.length > 0) {
              catsArray[catIndex].subcategories = [...currentSubs, ...newSubs];
              updated = true;
            }
          } else {
            catsArray.push({ name: catName, subcategories: subcats });
            updated = true;
          }
          if (updated) {
            await supabase.from('system_categories')
              .update({ categories: catsArray, updated_at: new Date().toISOString() })
              .eq('id', existingGroup.id);
          }
        } else {
          const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
          await supabase.from('system_categories').insert({
            id: newId,
            name: groupName,
            categories: [{ name: catName, subcategories: subcats }],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
      return NextResponse.json(parsed);
    }
    return NextResponse.json({ error: 'Failed to generate content.' }, { status: 500 });
  } catch (error: any) {
    console.error('AI Details Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred during AI processing.' }, { status: 500 });
  }
}
