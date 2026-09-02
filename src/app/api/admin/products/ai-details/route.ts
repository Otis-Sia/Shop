import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getServiceSupabase } from '@/lib/supabase/server';

export const runtime = 'edge';

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
${JSON.stringify(categoriesContext)}

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
- grades: array of distinct grades or qualities mentioned (e.g. ["Grade A", "Grade B", "Premium"]). If no grades are mentioned, return empty array [].
- capacity: product capacity or volume if mentioned (e.g. "1.8ltr", "500ml", "2TB", or null if not found).
- power: product power rating or wattage if mentioned (e.g. "350 Watts", "1000W", or null if not found).
- variants: array of variant objects if specific variant combinations, SKUs, or color/size options with individual prices/stock are listed in the text: [{"color": "...", "size": "...", "price": 0, "stock": 0}]. Return empty array [] if none specifically listed.
- groupCategory: top‑level category group (match existing if possible, or provide appropriate new name).
- category: primary category under the group (match existing if possible, or create appropriate new name).
- subcategories: array of 1-4 relevant subcategory names.
- tags: array of 5‑8 relevant search tags.
- labels: array of 1‑3 promotional labels (e.g. "Featured", "New Arrival", "Popular", "Best Seller").
- imageAltTexts: array of 2‑3 descriptive image alt text strings.

Do not include markdown code fences (like \`\`\`json). Output raw valid JSON only.`;

    let responseText = '';
    
    // 1. Try Groq (Qwen)
    try {
      if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured.');
      
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          max_tokens: 8000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (!groqResponse.ok) {
        const errText = await groqResponse.text();
        throw new Error(`Groq API failed: ${groqResponse.status} ${errText}`);
      }
      
      const groqData = await groqResponse.json();
      responseText = groqData.choices?.[0]?.message?.content || '';
      JSON.parse(responseText.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim());
    } catch (groqError: any) {
      console.warn('Groq failed, attempting Gemini 3.6 Flash:', groqError.message);
      
      try {
        // 2. Fallback to gemini-3.6-flash
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        responseText = response.text || '';
      JSON.parse(responseText.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim());
      } catch (genAiError1: any) {
        console.warn('Gemini 3.6 Flash failed, attempting Gemini 3.7 Flash:', genAiError1.message);
        
        try {
          // 3. Fallback to gemini-3.7-flash
          const response2 = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
          });
          responseText = response2.text || '';
        JSON.parse(responseText.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim());
        } catch (genAiError2: any) {
          console.warn('Gemini 3.7 Flash failed, attempting DeepSeek fallback:', genAiError2.message);
          
          // 4. Fallback to DeepSeek
          if (!process.env.DEEPSEEK_API_KEY) {
            throw new Error('All other models failed and DEEPSEEK_API_KEY is not configured.');
          }
          
          const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              max_tokens: 8000,
              messages: [{ role: 'user', content: prompt }]
            })
          });
          
          if (!dsResponse.ok) {
            const errText = await dsResponse.text();
            throw new Error(`DeepSeek API failed: ${dsResponse.status} ${errText}`);
          }
          
          const dsData = await dsResponse.json();
          responseText = dsData.choices?.[0]?.message?.content || '';
          JSON.parse(responseText.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim());
        }
      }
    }

    if (responseText) {
      const cleanJson = responseText
        .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '')
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();
      const parsed = JSON.parse(cleanJson);

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
