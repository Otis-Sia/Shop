const fs = require('fs');

const filepath = 'src/app/api/admin/products/ai-analyze/route.ts';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Remove the rigid name check
content = content.replace(
  "    if (!name) {\n      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });\n    }",
  "    if (!name && (!images || images.length === 0)) {\n      return NextResponse.json({ error: 'Please provide either a product name or at least one image.' }, { status: 400 });\n    }"
);

// 2. Update the prompt to ask for a name and remove strict name dependency
content = content.replace(
  "Analyze the following product name.\nGenerate compelling, SEO-optimized content for this product.\n\nProduct Name: \"${name}\"",
  "Analyze the provided product name and/or images.\nGenerate compelling, SEO-optimized content for this product.\n\n${name ? `Product Name: \"${name}\"` : 'Product Name: (Not provided, please generate one based on the images)'}"
);

content = content.replace(
  "Return your response strictly as a JSON object with the following fields:",
  "Return your response strictly as a JSON object with the following fields:\n- name: A concise, high-converting product title/name. (Only generate if not already provided or if the provided one is too generic)."
);

// 3. We need to parse images for Gemini.
// Wait, doing this via regex replacement is hard. I'll just write a script to rewrite the route entirely, 
// or maybe inject a function at the top to fetch images, and then pass them to contents.
