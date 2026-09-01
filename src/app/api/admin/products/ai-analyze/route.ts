import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { name, images = [] } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Product name is required.' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
You are an expert e-commerce copywriter and SEO specialist. 
Analyze the following product name (and images if you were provided any, though currently you only have text context from the name).
Generate compelling, SEO-optimized content for this product.

Product Name: "${name}"

Return your response strictly as a JSON object with the following fields:
- shortDescription: A punchy 1-2 sentence description highlighting the main benefit.
- description: A detailed, engaging long-form description (2-3 paragraphs) suitable for a product page. Use markdown formatting if helpful (e.g. bolding, bullet points).
- groupCategory: A broad, top-level product grouping (e.g., "Apparel", "Electronics & Gadgets").
- category: A single, primary high-level category string (e.g., "Menswear", "Audio").
- subcategories: An array of strings representing more specific subcategories.
- tags: An array of 5-8 relevant search tags.
- labels: An array of 1-3 promotional or descriptive labels (e.g., "Bestseller", "New Arrival", "Eco-friendly").
- imageAltTexts: An object where keys are "primary", "secondary", etc. and values are descriptive alt texts for SEO. Or if you were given an array, just return a flat array of alt texts. Let's return an array of 2-3 generic but highly relevant alt text strings that could apply to photos of this product.

Do not include any markdown code block wrapping like \`\`\`json around the output. Output raw JSON only.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
        return NextResponse.json(JSON.parse(response.text));
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
