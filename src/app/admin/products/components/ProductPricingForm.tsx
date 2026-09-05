"use client";

import React from "react";
import { ProductPricing } from "@/lib/products/types";

interface ProductPricingFormProps {
  pricing?: Partial<ProductPricing>;
  onChange: (value: ProductPricing) => void;
}

export function ProductPricingForm({ pricing, onChange }: ProductPricingFormProps) {
  const currentPricing: ProductPricing = {
    price: pricing?.price ?? 0,
    salePrice: pricing?.salePrice ?? pricing?.compareAtPrice ?? undefined,
    compareAtPrice: pricing?.compareAtPrice ?? pricing?.salePrice ?? undefined,
    costPrice: pricing?.costPrice ?? undefined,
    currency: pricing?.currency || "KES",
    taxable: pricing?.taxable ?? true,
    ...pricing,
  };

  const updateField = (field: keyof ProductPricing, value: any) => {
    const updated: ProductPricing = { ...currentPricing, [field]: value };
    // Keep salePrice and compareAtPrice synced for cross-compatibility
    if (field === "salePrice") {
      updated.compareAtPrice = value;
    } else if (field === "compareAtPrice") {
      updated.salePrice = value;
    }
    onChange(updated);
  };

  const regularPrice = Number(currentPricing.price) || 0;
  const cost = Number(currentPricing.costPrice) || 0;
  const salePrice = currentPricing.salePrice !== undefined && currentPricing.salePrice !== null ? Number(currentPricing.salePrice) : null;
  const effectiveSellingPrice = (salePrice !== null && salePrice > 0) ? salePrice : regularPrice;

  const profit = effectiveSellingPrice > 0 && cost > 0 ? effectiveSellingPrice - cost : null;
  const margin = profit !== null && effectiveSellingPrice > 0 ? ((profit / effectiveSellingPrice) * 100).toFixed(1) : null;
  const discountPercent = (salePrice !== null && salePrice > 0 && regularPrice > salePrice) 
    ? (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0) 
    : null;

  return (
    <div className="p-6 border-2 border-on-surface bg-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] space-y-4">
      <div className="flex justify-between items-center border-b-2 border-on-surface pb-2">
        <h3 className="font-headline-lg font-black text-lg uppercase">Pricing & Profitability</h3>
        <span className="text-xs uppercase font-bold bg-primary-container px-2 py-0.5 border border-on-surface">
          {currentPricing.currency || "KES"}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Regular Price */}
        <div>
          <label className="block font-bold uppercase text-xs mb-1">
            Regular Price *
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.01"
              value={currentPricing.price || ""}
              placeholder="0.00"
              onChange={(e) => updateField("price", parseFloat(e.target.value) || 0)}
              className="w-full p-2 border-2 border-on-surface bg-surface text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <p className="text-[11px] text-secondary mt-1">Base selling price</p>
        </div>

        {/* Cost Price */}
        <div>
          <label className="block font-bold uppercase text-xs mb-1">
            Cost (Buying Price)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.01"
              value={currentPricing.costPrice !== undefined && currentPricing.costPrice !== null ? currentPricing.costPrice : ""}
              placeholder="0.00"
              onChange={(e) => updateField("costPrice", e.target.value !== "" ? parseFloat(e.target.value) : undefined)}
              className="w-full p-2 border-2 border-on-surface bg-surface text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-[11px] text-secondary mt-1">Internal cost per unit</p>
        </div>

        {/* Sale Price */}
        <div>
          <label className="block font-bold uppercase text-xs mb-1">
            Sale Price (Discounted)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.01"
              value={currentPricing.salePrice !== undefined && currentPricing.salePrice !== null ? currentPricing.salePrice : ""}
              placeholder="Optional discount"
              onChange={(e) => updateField("salePrice", e.target.value !== "" ? parseFloat(e.target.value) : undefined)}
              className="w-full p-2 border-2 border-on-surface bg-surface text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-[11px] text-secondary mt-1">
            {discountPercent ? `${discountPercent}% off regular price` : "Customer pays this if entered"}
          </p>
        </div>
      </div>

      {/* Currency & Tax Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-outline/20">
        <div>
          <label className="block font-bold uppercase text-xs mb-1">Currency Code *</label>
          <input
            type="text"
            maxLength={5}
            value={currentPricing.currency}
            onChange={(e) => updateField("currency", e.target.value.toUpperCase())}
            className="w-full p-2 border-2 border-on-surface bg-surface text-sm font-bold"
            required
          />
        </div>

        <div className="flex items-center gap-2 sm:mt-6">
          <input
            type="checkbox"
            id="taxable-checkbox"
            checked={currentPricing.taxable}
            onChange={(e) => updateField("taxable", e.target.checked)}
            className="w-4 h-4 accent-primary cursor-pointer"
          />
          <label htmlFor="taxable-checkbox" className="font-bold uppercase text-xs cursor-pointer select-none">
            Charge tax on this product
          </label>
        </div>
      </div>

      {/* Live Profit Margin Box */}
      {(cost > 0 || (salePrice !== null && salePrice > 0)) && (
        <div className="mt-4 p-3 bg-secondary-container text-on-surface border-2 border-on-surface flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          <div>
            <span className="uppercase text-secondary text-[10px] block">Effective Customer Price</span>
            <span className="text-sm font-black">{currentPricing.currency} {effectiveSellingPrice.toLocaleString()}</span>
          </div>

          {profit !== null && (
            <div>
              <span className="uppercase text-secondary text-[10px] block">Estimated Profit</span>
              <span className={`text-sm font-black ${profit >= 0 ? "text-green-800" : "text-red-700"}`}>
                {currentPricing.currency} {profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {margin !== null && (
            <div>
              <span className="uppercase text-secondary text-[10px] block">Profit Margin</span>
              <span className={`text-sm font-black ${Number(margin) >= 0 ? "text-green-800" : "text-red-700"}`}>
                {margin}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
