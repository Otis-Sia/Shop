"use client";

import React, { useState } from "react";
import { CreateProductInput, ProductSEO } from "@/lib/products/types";
import { useToast } from "@/components/providers/ToastProvider";

interface ProductAIAssistantProps {
  currentData: Partial<CreateProductInput>;
  onApply: (updates: Partial<CreateProductInput>) => void;
}

function extractQuotedCostFromText(text: string): number | undefined {
  if (!text) return undefined;
  const patterns = [
    /(?:cost|buy|wholesale|buying|price|ksh|kes|@)\s*[:=-]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+)\s*(?:\/=|bob|ksh|kes)?/i,
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]{3,6})\s*(?:\/=|bob|ksh|kes)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return undefined;
}

export function ProductAIAssistant({ currentData, onApply }: ProductAIAssistantProps) {
  const { showToast } = useToast();
  const [rawDetails, setRawDetails] = useState("");
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [isFindingImages, setIsFindingImages] = useState(false);

  const handleAIAutoFill = async () => {
    if (!rawDetails.trim() && !(currentData.media && currentData.media.length > 0)) {
      showToast("Please enter some product details or upload an image first.", "warning");
      return;
    }
    
    setIsGeneratingDetails(true);
    try {
      const res = await fetch("/api/admin/products/ai-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rawDetails, 
          images: currentData.media?.map(m => m.url) || [], 
          currentName: currentData.name,
          findImages: false,
        }),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate details");
      
      const generated = json.data?.generated_json || json.data || json;
      
      // Quoted cost in AI Magic Fill is the wholesale Buying Price (costPrice)
      const textQuotedCost = extractQuotedCostFromText(rawDetails);
      const rawCost = (generated.costPrice !== undefined && generated.costPrice !== null && !isNaN(parseFloat(generated.costPrice)) && parseFloat(generated.costPrice) > 0)
        ? parseFloat(generated.costPrice)
        : (textQuotedCost !== undefined && textQuotedCost > 0
            ? textQuotedCost
            : (generated.price !== undefined && generated.price !== null && !isNaN(parseFloat(generated.price)) && parseFloat(generated.price) > 0
                ? parseFloat(generated.price)
                : (currentData.pricing?.costPrice && !isNaN(Number(currentData.pricing.costPrice)) ? Number(currentData.pricing.costPrice) : undefined)));

      let regularPrice = (generated.price !== undefined && generated.price !== null && !isNaN(parseFloat(generated.price)))
        ? parseFloat(generated.price)
        : (currentData.pricing?.price && !isNaN(Number(currentData.pricing.price)) ? Number(currentData.pricing.price) : 0);

      // Ensure regular retail selling price is strictly greater than costPrice
      if (rawCost && rawCost > 0) {
        if (!regularPrice || regularPrice <= rawCost) {
          // Standard profitable retail markup (40% margin rounded to nearest 50 KES)
          regularPrice = Math.ceil((rawCost * 1.4) / 50) * 50;
        }
      }

      let salePrice = (generated.salePrice !== undefined && generated.salePrice !== null && !isNaN(parseFloat(generated.salePrice)))
        ? parseFloat(generated.salePrice)
        : currentData.pricing?.salePrice;

      if (salePrice !== undefined && salePrice !== null) {
        if ((rawCost && salePrice < rawCost) || salePrice >= regularPrice) {
          salePrice = undefined;
        }
      }

      onApply({
        name: generated.name || currentData.name,
        description: generated.description || currentData.description,
        shortDescription: generated.shortDescription || currentData.shortDescription,
        brand: generated.brand || currentData.brand,
        tags: generated.tags || currentData.tags,
        sku: generated.sku || currentData.sku,
        categoryIds: generated.category 
          ? Array.from(new Set([generated.category, ...(Array.isArray(generated.subcategories) ? generated.subcategories : [])].filter(Boolean)))
          : currentData.categoryIds,
        // Wrap raw pricing strings or numbers into the new pricing object
        pricing: {
          ...currentData.pricing,
          price: regularPrice,
          costPrice: rawCost,
          salePrice: salePrice,
          compareAtPrice: salePrice ? regularPrice : currentData.pricing?.compareAtPrice,
          currency: generated.currency || currentData.pricing?.currency || "KES",
          taxable: currentData.pricing?.taxable ?? true
        },
        // Shipping & Weight
        shipping: {
          ...currentData.shipping,
          requiresShipping: currentData.shipping?.requiresShipping ?? true,
          countryOfOrigin: generated.countryOfOrigin || currentData.shipping?.countryOfOrigin || "Kenya",
          weight: generated.weight !== undefined && generated.weight !== null ? {
            value: parseFloat(generated.weight) || 0,
            unit: (generated.weightUnit as any) || "kg"
          } : currentData.shipping?.weight,
        },
        // Attributes
        attributes: (() => {
          const baseAttrs = generated.attributes ? (
            Array.isArray(generated.attributes)
              ? generated.attributes
              : Object.entries(generated.attributes).map(([name, value]) => ({ name, value: String(value) }))
          ) : (currentData.attributes || []);
          
          if (Array.isArray(generated.variants) && generated.variants.length > 0) {
            generated.variants.forEach((v: any) => {
              if (Array.isArray(v.attributes)) {
                v.attributes.forEach((va: any) => {
                  if (va.name && va.value && !baseAttrs.some((ba: any) => ba.name === va.name && ba.value === va.value)) {
                    baseAttrs.push({ name: va.name, value: va.value, isVariantAxis: true });
                  }
                });
              }
            });
          }
          return baseAttrs.length > 0 ? baseAttrs : currentData.attributes;
        })(),
        features: Array.isArray(generated.features) && generated.features.length > 0
          ? generated.features
          : (typeof generated.features === 'string' && generated.features.trim()
              ? generated.features.split('\n').map((l: string) => l.trim()).filter(Boolean)
              : (generated.attributes && typeof generated.attributes === 'object' && !Array.isArray(generated.attributes)
                  ? Object.entries(generated.attributes).map(([k, v]) => `${k}: ${v}`)
                  : currentData.features)),
        variants: (() => {
          if (!Array.isArray(generated.variants) || generated.variants.length === 0) {
            return currentData.variants;
          }
          const baseSku = (generated.sku || currentData.sku || 'SKU').trim();
          const usedSkus = new Set<string>();

          return generated.variants.map((v: any, idx: number) => {
            const attrList = Array.isArray(v.attributes) ? [...v.attributes] : [];
            if (v.color && !attrList.some((a: any) => a.name?.toLowerCase() === 'color')) {
              attrList.push({ name: 'Color', value: v.color, isVariantAxis: true });
            }
            if (v.size && !attrList.some((a: any) => a.name?.toLowerCase() === 'size')) {
              attrList.push({ name: 'Size', value: v.size, isVariantAxis: true });
            }
            const colorVal = v.color || attrList.find((a: any) => a.name?.toLowerCase() === 'color')?.value || '';
            const sizeVal = v.size || attrList.find((a: any) => a.name?.toLowerCase() === 'size')?.value || '';
            const attrVals = attrList.map((a: any) => a.value).filter(Boolean);
            const compositeName = v.name && !v.name.toLowerCase().startsWith('option ') && !v.name.toLowerCase().startsWith('variant ')
              ? v.name
              : (attrVals.length > 0 ? attrVals.join(' / ') : [colorVal, sizeVal].filter(Boolean).join(' / ') || `Variant ${idx + 1}`);

            const attrTokens = [colorVal, sizeVal]
              .filter(Boolean)
              .map((s) => s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
              .filter(Boolean);
            const suffix = attrTokens.length > 0 ? attrTokens.join('-') : `${idx + 1}`;
            let candidateSku = (v.sku && typeof v.sku === 'string' && v.sku.trim())
              ? v.sku.trim()
              : `${baseSku}-${suffix}`;

            let uniqueSku = candidateSku;
            let counter = 1;
            while (usedSkus.has(uniqueSku.toUpperCase())) {
              counter++;
              uniqueSku = `${candidateSku}-${counter}`;
            }
            usedSkus.add(uniqueSku.toUpperCase());

            const variantCost = (v.costPrice !== undefined && v.costPrice !== null && !isNaN(parseFloat(v.costPrice)) && parseFloat(v.costPrice) > 0)
              ? parseFloat(v.costPrice)
              : undefined;

            // Variants always inherit the main product regular price by default
            const variantPrice = regularPrice > 0 ? regularPrice : undefined;

            return {
              id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              name: compositeName,
              sku: uniqueSku,
              color: colorVal,
              size: sizeVal,
              imageUrl: v.imageUrl || v.image_url || '',
              attributes: attrList.length > 0 ? attrList : [{ name: 'Variant', value: compositeName, isVariantAxis: true }],
              price: variantPrice,
              costPrice: variantCost,
              stockQuantity: v.stockQuantity !== undefined ? Number(v.stockQuantity) : (v.stock !== undefined ? Number(v.stock) : 0),
              isActive: true
            };
          });
        })(),
        // Basic SEO injection
        seo: {
          ...currentData.seo,
          metaTitle: generated.name ? `${generated.name} | ${generated.brand || 'Store'}` : currentData.seo?.metaTitle,
          metaDescription: generated.shortDescription || currentData.seo?.metaDescription,
          keywords: generated.tags || currentData.seo?.keywords,
        }
      });
      
      showToast("AI Auto-Fill complete!", "success");
      setRawDetails("");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to generate AI details", "error");
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleFindImages = async () => {
    const query = (currentData.name || rawDetails || "").trim();
    if (!query) {
      showToast("Please enter a product name or product details first to find images.", "warning");
      return;
    }

    setIsFindingImages(true);
    try {
      const brandPart = (currentData.brand && currentData.brand !== "Generic") ? `${currentData.brand} ` : "";
      const searchQuery = `${brandPart}${query}`.slice(0, 120);

      const res = await fetch("/api/admin/products/search-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, count: 6 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to find images");

      const foundList: Array<{ url: string; title?: string }> = data.images || [];
      if (foundList.length === 0) {
        showToast("No matching images found. Try adding a more specific product title.", "warning");
        return;
      }

      const existingMedia = Array.isArray(currentData.media) ? currentData.media : [];
      const existingUrls = new Set(existingMedia.map(m => m.url));
      const newMediaItems = [...existingMedia];

      foundList.forEach((item) => {
        if (item.url && !existingUrls.has(item.url)) {
          existingUrls.add(item.url);
          newMediaItems.push({
            url: item.url,
            type: "image" as const,
            position: newMediaItems.length,
            isPrimary: newMediaItems.length === 0,
            altText: item.title || currentData.name || "Product image"
          });
        }
      });

      onApply({ media: newMediaItems });
      showToast(`Found and added ${foundList.length} product images!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error generating images", "error");
    } finally {
      setIsFindingImages(false);
    }
  };

  return (
    <div className="p-6 border border-primary/40 bg-surface-dim rounded-xl space-y-4">
      <h3 className="font-bold text-xl mb-4 border-b border-primary/20 pb-2 text-primary">AI Magic Fill</h3>
      
      <p className="text-xs text-on-surface-variant leading-relaxed">
        The AI will scan any uploaded <strong>images</strong> and read the <strong>notes</strong> below to automatically generate the product name, SKU, price, SEO, categories, tags, description, and specs. Image generation is optional and can be run separately using the dedicated image button below.
      </p>

      <div className="space-y-2">
        <textarea
          value={rawDetails}
          onChange={(e) => setRawDetails(e.target.value)}
          placeholder="Optional: Paste raw supplier info, dimensions, or a messy description here..."
          className="w-full p-3 border border-outline/30 bg-background rounded-lg text-sm h-28 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleAIAutoFill}
            disabled={isGeneratingDetails || (!rawDetails.trim() && !(currentData.media && currentData.media.length > 0))}
            className="w-full px-4 py-3 bg-primary text-on-primary font-bold uppercase tracking-wider text-sm hover:bg-primary/90 disabled:opacity-50 rounded-lg shadow-sm transition-all"
          >
            {isGeneratingDetails ? "Generating Magic..." : "Auto-Fill Everything"}
          </button>
          
          <button
            type="button"
            onClick={handleFindImages}
            disabled={isFindingImages || (!currentData.name?.trim() && !rawDetails.trim())}
            className="w-full px-4 py-3 bg-surface border-2 border-primary text-primary font-bold uppercase tracking-wider text-sm hover:bg-primary/10 disabled:opacity-50 rounded-lg shadow-sm transition-all"
          >
            {isFindingImages ? "Finding Images..." : "Generate / Find Images"}
          </button>
        </div>
      </div>
    </div>
  );
}
