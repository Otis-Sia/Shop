import re

filename = 'src/app/api/admin/products/ai-details/route.ts'
with open(filename, 'r') as f:
    content = f.read()

# 1. Update the payload extraction and validation
content = content.replace(
    "const { rawDetails } = await req.json();\n    if (!rawDetails) {\n      return NextResponse.json({ error: 'rawDetails is required.' }, { status: 400 });\n    }",
    "const { rawDetails = '', images = [], currentName = '' } = await req.json();\n    if (!rawDetails && (!images || images.length === 0)) {\n      return NextResponse.json({ error: 'Please provide either raw details or at least one image.' }, { status: 400 });\n    }"
)

# 2. Update the prompt
new_prompt = """const prompt = `\\nYou are an expert e-commerce copywriter, merchandiser, and data extraction specialist.
We are creating or updating a product. Below is the available context:
${currentName ? `Current Product Name: ${currentName}\\n` : ''}${rawDetails ? `Raw product details/notes:\\n\"\"\"${rawDetails}\"\"\"\\n` : ''}${images && images.length > 0 ? `(Images are also provided as visual context)\\n` : ''}
Existing categories (for reference):
${JSON.stringify(categoriesContext)}

Return a JSON object containing the following fields based on the provided text and/or images. If a field cannot be determined, guess a reasonable default or return null.
- name: concise, high-converting product title/name.
- shortDescription: 1‑2 sentence punchy summary.
- description: comprehensive, well-structured product description.
- brand: brand name if identifiable, otherwise "Generic".
- countryOfOrigin: country of origin. (Rule: if brand is generic or unknown, default to "Kenya").
- supplierName: supplier, vendor, dropshipper, or manufacturer name if mentioned (otherwise null).
- sku: product SKU, model number, or generate a professional 6-8 character SKU if none exists.
- costPrice: supplier cost / cost price / wholesale price / buy price as a clean number (e.g. 150.00 or null if not found).
- price: selling price / retail price / MSRP as a clean number (e.g. 299.00 or null if not found).
- salePrice: discounted / promotional / sale price as a clean number (or null if not found).
- stock: inventory quantity / units available as an integer (e.g. 50 or null if not found).
- colors: array of distinct color names mentioned or visible in the image (e.g. ["Black", "White"]).
- sizes: array of distinct sizes or dimensions mentioned (e.g. ["S", "M", "L", "XL"]).
- grades: array of distinct grades or qualities mentioned (e.g. ["Grade A", "Premium"]).
- capacity: product capacity or volume if mentioned (e.g. "1.8ltr").
- power: product power rating or wattage if mentioned (e.g. "350 Watts").
- variants: array of variant objects if specific variant combinations are listed.
- groupCategory: top‑level category group.
- category: primary category under the group.
- subcategories: array of 1-4 relevant subcategory names.
- tags: array of 5‑8 relevant search tags.
- labels: array of 1‑3 promotional labels (e.g. "Featured", "New Arrival").
- imageAltTexts: array of 2‑3 descriptive image alt text strings based on the product.

Do not include markdown code fences (like \`\`\`json). Output raw valid JSON only.`;"""

content = re.sub(r"const prompt = `\\nYou are an expert.*?Output raw valid JSON only\.`;", new_prompt, content, flags=re.DOTALL)

# 3. Add image fetching logic and requestContents array
image_fetch_code = """
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
"""

content = content.replace("    let responseText = '';", image_fetch_code)
content = content.replace("contents: prompt,", "contents: requestContents as any,")

with open(filename, 'w') as f:
    f.write(content)
print("Updated ai-details backend!")
