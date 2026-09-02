"use client";

import React from "react";
import { ProductSEO } from "@/lib/products/types";

interface ProductSEOFormProps {
  seo?: Partial<ProductSEO>;
  onChange: (value: ProductSEO) => void;
}

export function ProductSEOForm({ seo, onChange }: ProductSEOFormProps) {
  const currentSEO: ProductSEO = {
    ...seo,
  };

  const updateField = (field: keyof ProductSEO, value: any) => {
    onChange({ ...currentSEO, [field]: value });
  };

  return (
    <div className="p-6 border border-outline/20 bg-surface rounded-xl space-y-4">
      <h3 className="font-bold text-xl mb-4 border-b border-outline/10 pb-2">Search Engine Optimization</h3>
      
      <div>
        <label className="block font-bold uppercase text-sm mb-1">Meta Title</label>
        <input
          type="text"
          maxLength={70}
          value={currentSEO.metaTitle || ""}
          onChange={(e) => updateField("metaTitle", e.target.value)}
          className="w-full p-2 border border-outline/30 bg-background rounded-lg"
          placeholder="Leave blank to use product name"
        />
        <p className="text-xs text-on-surface-variant mt-1">
          {(currentSEO.metaTitle?.length || 0)}/70 characters
        </p>
      </div>

      <div>
        <label className="block font-bold uppercase text-sm mb-1">Meta Description</label>
        <textarea
          maxLength={160}
          value={currentSEO.metaDescription || ""}
          onChange={(e) => updateField("metaDescription", e.target.value)}
          className="w-full p-2 border border-outline/30 bg-background rounded-lg min-h-[100px]"
          placeholder="Leave blank to use short description"
        />
        <p className="text-xs text-on-surface-variant mt-1">
          {(currentSEO.metaDescription?.length || 0)}/160 characters
        </p>
      </div>

      <div>
        <label className="block font-bold uppercase text-sm mb-1">Keywords</label>
        <input
          type="text"
          value={(currentSEO.keywords || []).join(", ")}
          onChange={(e) => updateField("keywords", e.target.value.split(",").map(k => k.trim()).filter(Boolean))}
          className="w-full p-2 border border-outline/30 bg-background rounded-lg"
          placeholder="Comma separated keywords"
        />
      </div>
    </div>
  );
}
