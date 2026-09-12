"use client";

import React, { useState } from "react";
import { CreateProductVariantInput, CreateProductAttributeInput } from "@/lib/products/types";

interface ProductVariantManagerProps {
  variants?: CreateProductVariantInput[];
  attributes?: CreateProductAttributeInput[];
  onChangeVariants: (variants: CreateProductVariantInput[]) => void;
  onChangeAttributes: (attributes: CreateProductAttributeInput[]) => void;
  basePrice?: number;
  overridePrice?: boolean;
  onChangeOverridePrice?: (override: boolean) => void;
}

export function ProductVariantManager({
  variants = [],
  attributes = [],
  onChangeVariants,
  onChangeAttributes,
  basePrice = 0,
  overridePrice,
  onChangeOverridePrice,
}: ProductVariantManagerProps) {
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

  const [internalOverridePrice, setInternalOverridePrice] = useState<boolean>(() => {
    if (overridePrice !== undefined) return overridePrice;
    return variants.some(
      (v) =>
        v.price !== undefined &&
        v.price !== null &&
        Number(v.price) > 0 &&
        Number(v.price) !== Number(basePrice)
    );
  });

  const isOverridePrice = overridePrice !== undefined ? overridePrice : internalOverridePrice;

  const handleToggleOverridePrice = (checked: boolean) => {
    setInternalOverridePrice(checked);
    onChangeOverridePrice?.(checked);
    if (!checked) {
      // When unchecking, sync all variants to the main product's price
      const updated = variants.map((v) => ({
        ...v,
        price: basePrice > 0 ? basePrice : undefined,
      }));
      onChangeVariants(updated);
    }
  };

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
    const nextIdx = variants.length + 1;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    onChangeVariants([
      ...variants,
      {
        id: `var-${Date.now()}-${randomSuffix}`,
        name: compositeName,
        sku: `VAR-${Date.now().toString(36).toUpperCase()}-${nextIdx}`,
        attributes: defaultAttributes,
        stockQuantity: 0,
        price: isOverridePrice ? undefined : (basePrice > 0 ? basePrice : undefined),
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
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h4 className="font-bold uppercase text-sm">Variants</h4>
            <p className="text-xs text-on-surface-variant">Each variant represents a purchasable option with distinct attributes (e.g. Black / 42)</p>
          </div>
          <button
            type="button"
            onClick={addEmptyVariant}
            className="px-4 py-1.5 border-2 border-on-surface bg-surface text-on-surface rounded-lg text-xs font-bold uppercase hover:bg-surface-dim self-start sm:self-auto"
          >
            + Add Variant
          </button>
        </div>

        {/* Override price checkmark */}
        <div className="p-3.5 bg-surface-container/30 border-2 border-outline/20 rounded-xl flex items-start sm:items-center justify-between gap-3">
          <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="override-price-checkbox"
              checked={isOverridePrice}
              onChange={(e) => handleToggleOverridePrice(e.target.checked)}
              className="w-4 h-4 mt-0.5 sm:mt-0 rounded border-outline/40 text-primary focus:ring-primary accent-on-surface cursor-pointer"
            />
            <div>
              <span className="font-bold text-xs uppercase tracking-wider block">
                Override price
              </span>
              <span className="text-[11px] text-on-surface-variant block mt-0.5">
                {isOverridePrice
                  ? "Different prices enabled for variants. You can set individual prices on each variant below."
                  : `All variants use the same price as the main product (${basePrice && basePrice > 0 ? `KES ${basePrice.toLocaleString()}` : "Same as main product"}).`}
              </span>
            </div>
          </label>
          <div className="hidden sm:block text-right">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded border ${
              isOverridePrice 
                ? "bg-primary/10 text-primary border-primary/30" 
                : "bg-surface-container text-on-surface-variant border-outline/20"
            }`}>
              {isOverridePrice ? "Custom Variant Pricing Enabled" : "Same as Main Product"}
            </span>
          </div>
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
                      <div className="flex justify-between items-center mb-1">
                        <label className="block font-bold text-xs uppercase">SKU</label>
                        {variants.some((other, oIdx) => oIdx !== idx && other.sku && variant.sku && other.sku.trim().toUpperCase() === variant.sku.trim().toUpperCase()) && (
                          <span className="text-error font-extrabold text-[10px] uppercase tracking-wider">Duplicate SKU</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={(e) => updateVariant(idx, "sku", e.target.value)}
                        className={`w-full p-2 border rounded-lg text-xs ${
                          variants.some((other, oIdx) => oIdx !== idx && other.sku && variant.sku && other.sku.trim().toUpperCase() === variant.sku.trim().toUpperCase())
                            ? "border-error bg-error-container/20 text-error font-bold"
                            : "border-outline/30"
                        }`}
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
                      <div className="flex justify-between items-center mb-1">
                        <label className="block font-bold text-xs uppercase">
                          Price {isOverridePrice ? "Override" : ""} (KES)
                        </label>
                        {!isOverridePrice && (
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Locked to Main</span>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={basePrice > 0 ? `${basePrice}` : "0.00"}
                        value={
                          isOverridePrice
                            ? (variant.price !== undefined && variant.price !== null ? variant.price : "")
                            : (basePrice > 0 ? basePrice : (variant.price !== undefined && variant.price !== null ? variant.price : ""))
                        }
                        disabled={!isOverridePrice}
                        onChange={(e) => updateVariant(idx, "price", e.target.value !== "" ? parseFloat(e.target.value) : undefined)}
                        className={`w-full p-2 border rounded-lg text-xs transition-colors ${
                          !isOverridePrice
                            ? "bg-surface-container/50 border-outline/20 text-on-surface-variant cursor-not-allowed font-medium"
                            : "border-outline/30 bg-surface font-bold text-on-surface"
                        }`}
                      />
                      {!isOverridePrice ? (
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          Same as main product ({basePrice > 0 ? `KES ${basePrice.toLocaleString()}` : "Not set"}). Check &apos;Override price&apos; to change.
                        </p>
                      ) : (
                        <p className="text-[10px] text-primary font-medium mt-1">
                          Custom price for this variant.
                        </p>
                      )}
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
