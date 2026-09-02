import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getServiceSupabase } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { name, images = [] } = await req.json();

    if (!name && (!images || images.length === 0)) {
      return NextResponse.json({ error: 'Please provide either a product name or at least one image.' }, { status: 400 });
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
Analyze the provided product name and/or images.
Generate compelling, SEO-optimized content for this product.

${name ? `Product Name: "${name}"` : 'Product Name: (Not provided, please generate one based on the images)'}

Here are the existing categories in the database:
${JSON.stringify(categoriesContext)}

Try to fit the product into an existing groupCategory, category, and use existing subcategories if they perfectly match.
IF AND ONLY IF the existing categories do not fit well, you may invent a NEW groupCategory, category, or new subcategories.

Return your response strictly as a JSON object with the following fields:
- name: A concise, high-converting product title/name. (Required if not provided, otherwise output the optimized version).
- shortDescription: A punchy 1-2 sentence description.
- description: A detailed, engaging long-form description (2-3 paragraphs).
- groupCategory: A broad, top-level product grouping (e.g., "Apparel").
- category: A single, primary high-level category string (e.g., "Menswear").
- subcategories: An array of strings representing more specific subcategories.
- tags: An array of 5-8 relevant search tags.
- labels: An array of 1-3 promotional or descriptive labels.
- imageAltTexts: An array of 2-3 generic but highly relevant alt text strings.
- brand: The brand name of the product. Extract this from the product name/images if present, otherwise suggest a fitting generic brand or leave it blank.
- countryOfOrigin: The country where this product is likely from. IMPORTANT RULE: If the brand is generic (not a well-known international brand), make the countryOfOrigin "Kenya".

Do not include any markdown code block wrapping like \`\`\`json around the output. Output raw JSON only.
`;


    // Process up to 3 images for AI vision
    const imageParts = await Promise.all(
      (images || []).slice(0, 3).map(async (url: string) => {
        try {
          const imgRes = await fetch(url);
          if (!imgRes.ok) return null;
          const arrayBuffer = await imgRes.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = btoa(binary);
          const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
          return {
            inlineData: {
              data: base64Data,
              mimeType
            }
          };
        } catch (e) {
          console.error("Failed to process image:", url, e);
          return null;
        }
      })
    );
    const validImageParts = imageParts.filter(Boolean);

    const requestContents = [
      {
        role: 'user',
        parts: [
          { text: prompt },
          ...validImageParts
        ]
      }
    ];

    let responseText = '';

    
    // 1. Try gemini-3.6-flash first
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: requestContents as any,
        config: { responseMimeType: 'application/json' }
      });
      responseText = response.text || '';
      JSON.parse(responseText.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim());
    } catch (genAiError1: any) {
      console.warn('Gemini 3.6 Flash failed, attempting Gemini 3.7 Flash:', genAiError1.message);
      
      try {
        // 2. Fallback to gemini-3.7-flash
        const response2 = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: requestContents as any,
          config: { responseMimeType: 'application/json' }
        });
        responseText = response2.text || '';
        JSON.parse(responseText.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim());
      } catch (genAiError2: any) {
        console.warn('Gemini 3.7 Flash failed, attempting Groq fallback:', genAiError2.message);
        
        try {
          // 3. Fallback to Groq (Qwen)
          if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured.');
          
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: 'qwen/qwen3.6-27b',
              max_tokens: 3000,
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
          console.warn('Groq failed, attempting DeepSeek fallback:', groqError.message);
          
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
              max_tokens: 3000,
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
