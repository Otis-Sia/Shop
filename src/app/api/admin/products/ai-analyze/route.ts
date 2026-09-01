import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getServiceSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { name, images = [] } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const supabase = getServiceSupabase();
    
    // 1. Fetch existing categories to provide as context to AI
    const { data: existingCategories } = await supabase.from('system_categories').select('*');
    const categoriesContext = existingCategories ? existingCategories.map(c => ({
      groupCategory: c.name,
      categories: (typeof c.categories === 'string' ? JSON.parse(c.categories) : c.categories).map((cat: any) => ({
        name: cat.name,
        subcategories: cat.subcategories || []
      }))
    })) : [];

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
You are an expert e-commerce copywriter and SEO specialist. 
Analyze the following product name.
Generate compelling, SEO-optimized content for this product.

Product Name: "${name}"

Here are the existing categories in the database:
${JSON.stringify(categoriesContext, null, 2)}

Try to fit the product into an existing groupCategory, category, and use existing subcategories if they perfectly match.
IF AND ONLY IF the existing categories do not fit well, you may invent a NEW groupCategory, category, or new subcategories.

Return your response strictly as a JSON object with the following fields:
- shortDescription: A punchy 1-2 sentence description.
- description: A detailed, engaging long-form description (2-3 paragraphs).
- groupCategory: A broad, top-level product grouping (e.g., "Apparel").
- category: A single, primary high-level category string (e.g., "Menswear").
- subcategories: An array of strings representing more specific subcategories.
- tags: An array of 5-8 relevant search tags.
- labels: An array of 1-3 promotional or descriptive labels.
- imageAltTexts: An array of 2-3 generic but highly relevant alt text strings.

Do not include any markdown code block wrapping like \`\`\`json around the output. Output raw JSON only.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    if (response.text) {
        const parsed = JSON.parse(response.text);
        
        // 2. Check if we need to create/update categories in the DB
        if (parsed.groupCategory && parsed.category) {
          const groupName = parsed.groupCategory;
          const catName = parsed.category;
          const subcats = parsed.subcategories || [];

          let existingGroup = existingCategories?.find(c => c.name.toLowerCase() === groupName.toLowerCase());
          
          if (existingGroup) {
            // Update existing group
            let catsArray = typeof existingGroup.categories === 'string' ? JSON.parse(existingGroup.categories) : existingGroup.categories;
            if (!Array.isArray(catsArray)) catsArray = [];
            
            const catIndex = catsArray.findIndex((c: any) => c.name.toLowerCase() === catName.toLowerCase());
            let updated = false;

            if (catIndex >= 0) {
              // Category exists, check subcategories
              const currentSubs = catsArray[catIndex].subcategories || [];
              const newSubs = subcats.filter((s: string) => !currentSubs.some((cs: string) => cs.toLowerCase() === s.toLowerCase()));
              if (newSubs.length > 0) {
                catsArray[catIndex].subcategories = [...currentSubs, ...newSubs];
                updated = true;
              }
            } else {
              // New category in existing group
              catsArray.push({ name: catName, subcategories: subcats });
              updated = true;
            }

            if (updated) {
              await supabase.from('system_categories')
                .update({ categories: catsArray, updated_at: new Date().toISOString() })
                .eq('id', existingGroup.id);
            }
          } else {
            // Create entirely new group
            const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
    console.error('AI Analysis Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during AI analysis.' },
      { status: 500 }
    );
  }
}
