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
    const prompt = `\nYou are an expert e-commerce copywriter and data extraction specialist.
Given the following free‑form product details, extract the structured information required for our product database.
\nFree‑form details:\n"""${rawDetails}"""\n\nExisting categories (for reference):\n${JSON.stringify(categoriesContext, null, 2)}\n\nReturn a JSON object with the following fields (no markdown):
- shortDescription: 1‑2 sentence summary.
- description: detailed description (2‑3 paragraphs).
- brand: brand name if identifiable, otherwise a generic brand.
- countryOfOrigin: country of origin (apply Kenya rule for generic brand).
- groupCategory: top‑level grouping (use existing or create new).
- category: primary category (use existing or create new).
- subcategories: array of sub‑category strings.
- tags: array of 5‑8 relevant tags.
- labels: array of 1‑3 promotional labels.
- imageAltTexts: array of 2‑3 alt‑text strings.
\nDo not wrap the output in markdown code fences. Output raw JSON only.`;

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
