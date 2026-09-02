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

  const handleAIAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/admin/products/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentData.name,
          images: currentData.media?.map(m => m.url) || [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze product");

      onApply({
        shortDescription: data.shortDescription || currentData.shortDescription,
        description: data.description || currentData.description,
        categoryIds: data.category ? [...(currentData.categoryIds || []), data.category] : currentData.categoryIds,
        brand: data.brand || currentData.brand,
        tags: Array.isArray(data.tags) ? [...new Set([...(currentData.tags || []), ...data.tags])] : currentData.tags,
      });
      showToast("AI Analysis complete!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to analyze product", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAIAutoFill = async () => {
    if (!rawDetails.trim()) {
      showToast("Please enter some product details first.", "warning");
      return;
    }
    
    setIsGeneratingDetails(true);
    try {
      const res = await fetch("/api/admin/products/ai-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: rawDetails }),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate details");
      
      const generated = json.data?.generated_json || json.data || {};
      
      onApply({
        name: generated.name || currentData.name,
        description: generated.description || currentData.description,
        shortDescription: generated.shortDescription || currentData.shortDescription,
        brand: generated.brand || currentData.brand,
        tags: generated.tags || currentData.tags,
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
      
      showToast("AI Auto-fill applied!", "success");
      setRawDetails("");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to generate AI details", "error");
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const generateSKU = () => {
    const cleanTarget = (currentData.brand || currentData.name || 'PRD').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
    const uniqueHash = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newSku = `${cleanTarget || 'SKU'}-${uniqueHash}`;
    onApply({ sku: newSku });
    showToast(`Generated SKU: ${newSku}`, "success");
  };

  const generateSEO = () => {
    if (!currentData.name || !currentData.description) {
      showToast("Need a name and description to generate SEO", "warning");
      return;
    }
    const generatedSeo: ProductSEO = {
      ...currentData.seo,
      metaTitle: `${currentData.name} - ${currentData.brand || 'Store'}`.substring(0, 70),
      metaDescription: (currentData.shortDescription || currentData.description).substring(0, 160),
      keywords: currentData.tags || [],
    };
    onApply({ seo: generatedSeo });
    showToast("SEO generated from product data!", "success");
  };

  return (
    <div className="p-6 border-2 border-on-surface bg-surface-dim space-y-4">
      <h3 className="font-bold text-xl mb-4 border-b-2 border-on-surface pb-2">AI Assistants</h3>
      
      {/* Auto SKU & SEO */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={generateSKU}
          className="flex-1 px-4 py-2 bg-on-surface text-surface font-bold uppercase text-xs hover:bg-on-surface/90"
        >
          Auto SKU
        </button>
        <button
          type="button"
          onClick={generateSEO}
          className="flex-1 px-4 py-2 border-2 border-on-surface font-bold uppercase text-xs hover:bg-surface"
        >
          Auto SEO
        </button>
      </div>

      <div className="border-t-2 border-on-surface pt-4 mt-4">
        <p className="text-xs font-bold uppercase mb-2">Analyze Product Media</p>
        <button
          type="button"
          onClick={handleAIAnalyze}
          disabled={isAnalyzing || !(currentData.media && currentData.media.length > 0)}
          className="w-full px-4 py-2 bg-primary text-on-primary font-bold uppercase text-xs hover:bg-primary/90 disabled:opacity-50"
        >
          {isAnalyzing ? "Analyzing..." : "AI Analyze Media"}
        </button>
        <p className="text-[10px] text-on-surface-variant mt-1 leading-tight">
          Extracts categories, tags, and description directly from the uploaded product images.
        </p>
      </div>

      <div className="border-t-2 border-on-surface pt-4 mt-4 space-y-2">
        <p className="text-xs font-bold uppercase">AI Free-form Auto Fill</p>
        <textarea
          value={rawDetails}
          onChange={(e) => setRawDetails(e.target.value)}
          placeholder="Paste raw supplier info or type a messy description here..."
          className="w-full p-2 border-2 border-on-surface bg-background text-sm h-24"
        />
        <button
          type="button"
          onClick={handleAIAutoFill}
          disabled={isGeneratingDetails || !rawDetails.trim()}
          className="w-full px-4 py-2 border-2 border-primary text-primary font-bold uppercase text-xs hover:bg-primary/10 disabled:opacity-50"
        >
          {isGeneratingDetails ? "Generating..." : "Generate & Fill Fields"}
        </button>
      </div>
    </div>
  );
}
