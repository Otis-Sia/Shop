import re

filename = 'src/app/api/admin/products/ai-analyze/route.ts'
with open(filename, 'r') as f:
    content = f.read()

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

# Insert image_fetch_code
content = content.replace("    let responseText = '';", image_fetch_code)

# Update gemini calls
content = content.replace("contents: prompt,", "contents: requestContents as any,")

# Update Groq/DeepSeek calls to just use prompt since they don't support imageParts in this setup easily
# The groq/deepseek are just text-only fallbacks so they still use the text prompt string!
# Wait, Groq might throw if we pass requestContents.
# Wait, they ALREADY use `messages: [{ role: 'user', content: prompt }]` which is hardcoded! So they are fine!

# Also update the parsed mapping
# At the end of the file:
update_mapping = """
        return NextResponse.json({
          name: parsed.name || undefined,
          shortDescription: parsed.shortDescription,
"""
content = content.replace("        return NextResponse.json({\n          shortDescription: parsed.shortDescription,", update_mapping)

with open(filename, 'w') as f:
    f.write(content)
print("Updated!")
