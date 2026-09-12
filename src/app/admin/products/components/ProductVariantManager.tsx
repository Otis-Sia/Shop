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
    const defaultAttributes = attributes.length > 0
      ? [{ ...attributes[0] }]
      : [{ name: "Variant", value: `Variant ${variants.length + 1}`, isVariantAxis: true }];
    const compositeName = defaultAttributes.map(a => a.value).join(" / ") || `Variant ${variants.length + 1}`;

    onChangeVariants([
      ...variants,
      {
        id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: compositeName,
        sku: `VAR-${Date.now()}`,
        attributes: defaultAttributes,
        stockQuantity: 0,
      }
    ]);
  };

  const updateVariant = (index: number, field: keyof CreateProductVariantInput, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    onChangeVariants(newVariants);
  };

  const updateVariantAttribute = (variantIndex: number, attrIndex: number, field: 'name' | 'value', val: string) => {
    const newVariants = [...variants];
    const targetVariant = { ...newVariants[variantIndex] };
    const targetAttrs = [...(targetVariant.attributes || [])];
    targetAttrs[attrIndex] = { ...targetAttrs[attrIndex], [field]: val };
    targetVariant.attributes = targetAttrs;
    
    // Auto-update composite name if not custom or matching previous join
    const newComposite = targetAttrs.map(a => a.value).filter(Boolean).join(" / ");
    if (newComposite) {
      targetVariant.name = newComposite;
      const colorAttr = targetAttrs.find(a => a.name?.toLowerCase() === 'color')?.value;
      const sizeAttr = targetAttrs.find(a => a.name?.toLowerCase() === 'size')?.value;
      if (colorAttr) targetVariant.color = colorAttr;
      if (sizeAttr) targetVariant.size = sizeAttr;
    }
    
    newVariants[variantIndex] = targetVariant;
    onChangeVariants(newVariants);
  };

  const addAttributeToVariant = (variantIndex: number, name: string, value: string) => {
    const newVariants = [...variants];
    const targetVariant = { ...newVariants[variantIndex] };
    const targetAttrs = [...(targetVariant.attributes || [])];
    targetAttrs.push({ name, value, isVariantAxis: true });
    targetVariant.attributes = targetAttrs;
    
    const newComposite = targetAttrs.map(a => a.value).filter(Boolean).join(" / ");
    if (newComposite) targetVariant.name = newComposite;
    
    newVariants[variantIndex] = targetVariant;
    onChangeVariants(newVariants);
  };

  const removeAttributeFromVariant = (variantIndex: number, attrIndex: number) => {
    const newVariants = [...variants];
    const targetVariant = { ...newVariants[variantIndex] };
    const targetAttrs = [...(targetVariant.attributes || [])];
    targetAttrs.splice(attrIndex, 1);
    targetVariant.attributes = targetAttrs;
    
    const newComposite = targetAttrs.map(a => a.value).filter(Boolean).join(" / ");
    if (newComposite) targetVariant.name = newComposite;
    
    newVariants[variantIndex] = targetVariant;
    onChangeVariants(newVariants);
  };

  const removeVariant = (index: number) => {
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    onChangeVariants(newVariants);
  };

  return (
    <div className="p-6 border border-outline/20 bg-surface rounded-xl space-y-6">
      <h3 className="font-bold text-xl border-b border-outline/10 pb-2">Variants & Attributes</h3>
      
      {/* Global Attributes Configuration */}
      <div className="space-y-4">
        <h4 className="font-bold uppercase text-sm">Product Attributes (e.g. Color, Size)</h4>
        
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Name (e.g. Color)"
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            className="flex-1 p-2 border border-outline/30 bg-background rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Value (e.g. Red)"
            value={newAttrValue}
            onChange={(e) => setNewAttrValue(e.target.value)}
            className="flex-1 p-2 border border-outline/30 bg-background rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={handleAddAttribute}
            className="px-4 py-2 bg-on-surface text-surface font-bold uppercase text-xs rounded-lg"
          >
            Add
          </button>
        </div>

        {attributes.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-2">
            {attributes.map((attr, idx) => (
              <li key={idx} className="flex items-center gap-2 p-2 border border-outline/30 bg-background rounded-lg text-sm">
                <span className="font-bold">{attr.name}:</span>
                <span>{attr.value}</span>
                <button type="button" onClick={() => removeAttribute(idx)} className="text-error font-bold ml-2">X</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Variants List */}
      <div className="space-y-4 pt-4 border-t border-outline/10">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold uppercase text-sm">Variants</h4>
            <p className="text-xs text-on-surface-variant">Each variant represents a purchasable option with distinct attributes (e.g. Black / 42)</p>
          </div>
          <button
            type="button"
            onClick={addEmptyVariant}
            className="px-4 py-1.5 border-2 border-on-surface bg-surface text-on-surface rounded-lg text-xs font-bold uppercase hover:bg-surface-dim"
          >
            + Add Variant
          </button>
        </div>

        {variants.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic">No variants configured. The product will be sold as a single item.</p>
        ) : (
          <div className="space-y-4">
            {variants.map((variant, idx) => {
              const currentName = variant.name || (variant.attributes || []).map(a => a.value).filter(Boolean).join(" / ") || `Variant ${idx + 1}`;
              return (
                <div key={idx} className="p-4 border-2 border-outline/30 bg-background rounded-xl space-y-3 relative shadow-sm">
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    className="absolute top-3 right-3 text-error font-extrabold text-xs uppercase hover:underline"
                  >
                    Delete Variant
                  </button>

                  {/* Variant Title / Name */}
                  <div className="mr-24">
                    <label className="block font-bold text-xs uppercase mb-1">
                      Variant Name <span className="text-secondary text-[10px] font-normal lowercase">(e.g. Black / 42 or 1.8L / Stainless)</span>
                    </label>
                    <input
                      type="text"
                      value={currentName}
                      onChange={(e) => updateVariant(idx, "name", e.target.value)}
                      placeholder="e.g. Black / 42"
                      className="w-full p-2 border border-outline/30 rounded-lg text-sm font-bold bg-surface"
                    />
                  </div>

                  {/* Attributes assigned to this variant */}
                  <div className="p-3 bg-surface-container/30 border border-outline/20 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-secondary">
                        Variant Defining Attributes
                      </span>
                      <button
                        type="button"
                        onClick={() => addAttributeToVariant(idx, "Option", `Val ${((variant.attributes || []).length + 1)}`)}
                        className="text-[11px] font-bold text-primary hover:underline uppercase"
                      >
                        + Add Attribute Axis
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(variant.attributes || []).map((attr, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-1 border border-outline/30 bg-background rounded-lg px-2 py-1 text-xs">
                          <input
                            type="text"
                            value={attr.name}
                            placeholder="Color / Size"
                            onChange={(e) => updateVariantAttribute(idx, aIdx, "name", e.target.value)}
                            className="w-20 font-bold bg-transparent outline-none border-b border-transparent focus:border-outline text-xs"
                          />
                          <span className="text-outline">:</span>
                          <input
                            type="text"
                            value={attr.value}
                            placeholder="Value"
                            onChange={(e) => updateVariantAttribute(idx, aIdx, "value", e.target.value)}
                            className="w-24 bg-transparent outline-none border-b border-transparent focus:border-outline text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => removeAttributeFromVariant(idx, aIdx)}
                            className="text-error font-bold ml-1 hover:opacity-80"
                            title="Remove attribute"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Core Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-xs uppercase mb-1">SKU</label>
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={(e) => updateVariant(idx, "sku", e.target.value)}
                        className="w-full p-2 border border-outline/30 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-xs uppercase mb-1">Stock Quantity</label>
                      <input
                        type="number"
                        min="0"
                        value={variant.stockQuantity}
                        onChange={(e) => updateVariant(idx, "stockQuantity", parseInt(e.target.value, 10) || 0)}
                        className="w-full p-2 border border-outline/30 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-xs uppercase mb-1">Image URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={variant.imageUrl || (variant.images && variant.images[0]) || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newVariants = [...variants];
                          newVariants[idx] = { ...newVariants[idx], imageUrl: val, images: val ? [val] : [] };
                          onChangeVariants(newVariants);
                        }}
                        className="w-full p-2 border border-outline/30 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Pricing Overrides */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-outline/10">
                    <div>
                      <label className="block font-bold text-xs uppercase mb-1">Price Override (KES)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Base price"
                        value={variant.price !== undefined && variant.price !== null ? variant.price : ""}
                        onChange={(e) => updateVariant(idx, "price", e.target.value !== "" ? parseFloat(e.target.value) : undefined)}
                        className="w-full p-2 border border-outline/30 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-xs uppercase mb-1">Cost Override (KES)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Base cost"
                        value={variant.costPrice !== undefined && variant.costPrice !== null ? variant.costPrice : ""}
                        onChange={(e) => updateVariant(idx, "costPrice", e.target.value !== "" ? parseFloat(e.target.value) : undefined)}
                        className="w-full p-2 border border-outline/30 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-xs uppercase mb-1">Sale Price (KES)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Discounted"
                        value={variant.salePrice !== undefined && variant.salePrice !== null ? variant.salePrice : (variant.compareAtPrice !== undefined && variant.compareAtPrice !== null ? variant.compareAtPrice : "")}
                        onChange={(e) => {
                          const val = e.target.value !== "" ? parseFloat(e.target.value) : undefined;
                          const newVariants = [...variants];
                          newVariants[idx] = { ...newVariants[idx], salePrice: val, compareAtPrice: val };
                          onChangeVariants(newVariants);
                        }}
                        className="w-full p-2 border border-outline/30 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
