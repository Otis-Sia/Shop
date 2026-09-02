"use client";

import React, { useState } from "react";
import { CreateProductInput, ProductSEO } from "@/lib/products/types";
import { useToast } from "@/components/providers/ToastProvider";

interface ProductAIAssistantProps {
  currentData: Partial<CreateProductInput>;
  onApply: (updates: Partial<CreateProductInput>) => void;
}

export function ProductAIAssistant({ currentData, onApply }: ProductAIAssistantProps) {
  const { showToast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rawDetails, setRawDetails] = useState("");
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);

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
          currentName: currentData.name 
        }),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate details");
      
      const generated = json.data?.generated_json || json.data || json;
      
      onApply({
        name: generated.name || currentData.name,
        description: generated.description || currentData.description,
        shortDescription: generated.shortDescription || currentData.shortDescription,
        brand: generated.brand || currentData.brand,
        tags: generated.tags || currentData.tags,
        sku: generated.sku || currentData.sku,
        categoryIds: generated.category ? [...(currentData.categoryIds || []), generated.category] : currentData.categoryIds,
        // Wrap raw pricing strings or numbers into the new pricing object
        pricing: generated.price ? {
          ...currentData.pricing,
          price: parseFloat(generated.price) || currentData.pricing?.price || 0,
          currency: currentData.pricing?.currency || "USD",
          taxable: currentData.pricing?.taxable ?? true
        } : currentData.pricing,
        // Basic SEO injection
        seo: {
          ...currentData.seo,
          metaTitle: generated.name ? `${generated.name} | ${generated.brand || 'Store'}` : currentData.seo?.metaTitle,
          metaDescription: generated.shortDescription || currentData.seo?.metaDescription,
          keywords: generated.tags || currentData.seo?.keywords,
        }
      });
      
      showToast("AI Magic Fill complete!", "success");
      setRawDetails("");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to generate AI details", "error");
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  return (
    <div className="p-6 border border-primary/40 bg-surface-dim rounded-xl space-y-4">
      <h3 className="font-bold text-xl mb-4 border-b border-primary/20 pb-2 text-primary">✨ AI Magic Fill</h3>
      
      <p className="text-xs text-on-surface-variant leading-relaxed">
        One button to rule them all! The AI will scan any uploaded <strong>images</strong> and read the <strong>notes</strong> below to automatically generate the product name, SKU, price, SEO, categories, tags, description, and specs.
      </p>

      <div className="space-y-2">
        <textarea
          value={rawDetails}
          onChange={(e) => setRawDetails(e.target.value)}
          placeholder="Optional: Paste raw supplier info, dimensions, or a messy description here..."
          className="w-full p-3 border border-outline/30 bg-background rounded-lg text-sm h-28 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
        <button
          type="button"
          onClick={handleAIAutoFill}
          disabled={isGeneratingDetails || (!rawDetails.trim() && !(currentData.media && currentData.media.length > 0))}
          className="w-full px-4 py-3 bg-primary text-on-primary font-bold uppercase tracking-wider text-sm hover:bg-primary/90 disabled:opacity-50 rounded-lg shadow-sm transition-all"
        >
          {isGeneratingDetails ? "Generating Magic..." : "✨ Auto-Fill Everything"}
        </button>
      </div>
    </div>
  );
}
