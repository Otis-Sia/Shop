"use client";

import React from "react";
import { CreateProductInput, ProductPricing } from "@/lib/products/types";

interface ProductPricingFormProps {
  pricing?: Partial<ProductPricing>;
  onChange: (value: ProductPricing) => void;
}

export function ProductPricingForm({ pricing, onChange }: ProductPricingFormProps) {
  const currentPricing: ProductPricing = {
    price: 0,
    currency: "USD",
    taxable: true,
    ...pricing,
  };

  const updateField = (field: keyof ProductPricing, value: any) => {
    onChange({ ...currentPricing, [field]: value });
  };

  return (
    <div className="p-6 border-2 border-on-surface bg-surface space-y-4">
      <h3 className="font-bold text-xl mb-4 border-b-2 border-on-surface pb-2">Pricing</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Price *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={currentPricing.price}
            onChange={(e) => updateField("price", parseFloat(e.target.value) || 0)}
            className="w-full p-2 border-2 border-on-surface bg-background"
            required
          />
        </div>
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Compare at Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={currentPricing.compareAtPrice || ""}
            onChange={(e) => updateField("compareAtPrice", parseFloat(e.target.value) || undefined)}
            className="w-full p-2 border-2 border-on-surface bg-background"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Cost Price (Internal)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={currentPricing.costPrice || ""}
            onChange={(e) => updateField("costPrice", parseFloat(e.target.value) || undefined)}
            className="w-full p-2 border-2 border-on-surface bg-background"
          />
        </div>
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Currency *</label>
          <input
            type="text"
            maxLength={3}
            value={currentPricing.currency}
            onChange={(e) => updateField("currency", e.target.value.toUpperCase())}
            className="w-full p-2 border-2 border-on-surface bg-background"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          id="taxable-checkbox"
          checked={currentPricing.taxable}
          onChange={(e) => updateField("taxable", e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="taxable-checkbox" className="font-bold uppercase text-sm">
          Charge tax on this product
        </label>
      </div>
    </div>
  );
}
