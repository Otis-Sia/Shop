"use client";

import React, { useState } from "react";
import { CreateProductVariantInput, CreateProductAttributeInput } from "@/lib/products/types";

interface ProductVariantManagerProps {
  variants?: CreateProductVariantInput[];
  attributes?: CreateProductAttributeInput[];
  onChangeVariants: (variants: CreateProductVariantInput[]) => void;
  onChangeAttributes: (attributes: CreateProductAttributeInput[]) => void;
}

export function ProductVariantManager({ variants = [], attributes = [], onChangeVariants, onChangeAttributes }: ProductVariantManagerProps) {
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

  const handleAddAttribute = () => {
    if (!newAttrName || !newAttrValue) return;
    onChangeAttributes([
      ...attributes,
      { name: newAttrName, value: newAttrValue, isVariantAxis: true }
    ]);
    setNewAttrName("");
    setNewAttrValue("");
  };

  const removeAttribute = (index: number) => {
    const newAttrs = [...attributes];
    newAttrs.splice(index, 1);
    onChangeAttributes(newAttrs);
  };

  const addEmptyVariant = () => {
    onChangeVariants([
      ...variants,
      {
        sku: `VAR-${Date.now()}`,
        attributes: [],
        stockQuantity: 0,
        isActive: true,
      }
    ]);
  };

  const updateVariant = (index: number, field: keyof CreateProductVariantInput, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    onChangeVariants(newVariants);
  };

  const removeVariant = (index: number) => {
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    onChangeVariants(newVariants);
  };

  return (
    <div className="p-6 border-2 border-on-surface bg-surface space-y-6">
      <h3 className="font-bold text-xl border-b-2 border-on-surface pb-2">Variants & Attributes</h3>
      
      {/* Global Attributes Configuration */}
      <div className="space-y-4">
        <h4 className="font-bold uppercase text-sm">Product Attributes (e.g. Color, Size)</h4>
        
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Name (e.g. Color)"
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            className="flex-1 p-2 border-2 border-on-surface bg-background"
          />
          <input
            type="text"
            placeholder="Value (e.g. Red)"
            value={newAttrValue}
            onChange={(e) => setNewAttrValue(e.target.value)}
            className="flex-1 p-2 border-2 border-on-surface bg-background"
          />
          <button
            type="button"
            onClick={handleAddAttribute}
            className="px-4 py-2 bg-on-surface text-surface font-bold uppercase"
          >
            Add
          </button>
        </div>

        {attributes.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-2">
            {attributes.map((attr, idx) => (
              <li key={idx} className="flex items-center gap-2 p-2 border-2 border-on-surface bg-background text-sm">
                <span className="font-bold">{attr.name}:</span>
                <span>{attr.value}</span>
                <button type="button" onClick={() => removeAttribute(idx)} className="text-error font-bold ml-2">X</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Variants List */}
      <div className="space-y-4 pt-4 border-t-2 border-on-surface">
        <div className="flex justify-between items-center">
          <h4 className="font-bold uppercase text-sm">Variants</h4>
          <button
            type="button"
            onClick={addEmptyVariant}
            className="px-4 py-1 border-2 border-on-surface text-sm font-bold uppercase hover:bg-surface-dim"
          >
            + Add Variant
          </button>
        </div>

        {variants.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic">No variants configured. The product will be sold as a single item.</p>
        ) : (
          <div className="space-y-4">
            {variants.map((variant, idx) => (
              <div key={idx} className="p-4 border-2 border-on-surface bg-background space-y-2 relative">
                <button
                  type="button"
                  onClick={() => removeVariant(idx)}
                  className="absolute top-2 right-2 text-error font-bold"
                >
                  Remove
                </button>
                <div className="grid grid-cols-2 gap-4 mr-10">
                  <div>
                    <label className="block font-bold text-xs uppercase mb-1">SKU</label>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => updateVariant(idx, "sku", e.target.value)}
                      className="w-full p-1 border-2 border-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-xs uppercase mb-1">Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={variant.stockQuantity}
                      onChange={(e) => updateVariant(idx, "stockQuantity", parseInt(e.target.value, 10) || 0)}
                      className="w-full p-1 border-2 border-on-surface"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-xs uppercase mb-1">Price Override</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Leave blank for base price"
                      value={variant.price || ""}
                      onChange={(e) => updateVariant(idx, "price", parseFloat(e.target.value) || undefined)}
                      className="w-full p-1 border-2 border-on-surface"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
