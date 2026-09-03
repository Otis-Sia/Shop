"use client";

import React, { useState } from "react";
import { CreateProductInput, ProductType } from "@/lib/products/types";

import { ProductDetailsForm } from "./ProductDetailsForm";
import { ProductPricingForm } from "./ProductPricingForm";
import { ProductInventoryForm } from "./ProductInventoryForm";
import { ProductVariantManager } from "./ProductVariantManager";
import { ProductMediaManager } from "./ProductMediaManager";
import { ProductFulfillmentForm } from "./ProductFulfillmentForm";
import { ProductSEOForm } from "./ProductSEOForm";
import { ProductAIAssistant } from "./ProductAIAssistant";

interface ProductEditorProps {
  initialData?: Partial<CreateProductInput>;
  isAdding: boolean;
  onSave: (data: CreateProductInput) => Promise<void>;
  onCancel: () => void;
  existingSuppliers?: string[];
}

export function ProductEditor({ initialData, isAdding, onSave, onCancel, existingSuppliers = [] }: ProductEditorProps) {
  const [formData, setFormData] = useState<Partial<CreateProductInput>>({
    productType: "physical",
    status: "draft",
    categoryIds: [],
    tags: [],
    attributes: [],
    variants: [],
    media: [],
    ...initialData,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);

  function generateSku(supplierName: string = '', productName: string = '') {
    const cleanTarget = (supplierName || '').replace(/[^a-zA-Z]/g, '');
    let uniqueSupplierLetters = 'XXXX';
    
    if (cleanTarget) {
      const list = [...new Set(existingSuppliers || [])].map(s => s.replace(/[^a-zA-Z]/g, '')).filter(Boolean);
      if (!list.includes(cleanTarget)) list.push(cleanTarget);

      const assignedPrefixes = new Map<string, string>();
      const usedPrefixesLower = new Set<string>();

      for (const sup of list) {
        if (assignedPrefixes.has(sup)) continue;
        let base = sup;
        if (base.length < 4) base = base.padEnd(4, 'x');
        let prefix = base.slice(0, 4);
        
        if (!usedPrefixesLower.has(prefix.toLowerCase())) {
          assignedPrefixes.set(sup, prefix);
          usedPrefixesLower.add(prefix.toLowerCase());
        } else {
          let found = false;
          for (let i = 4; i < base.length; i++) {
            let candidate = base.slice(0, 3) + base[i];
            if (!usedPrefixesLower.has(candidate.toLowerCase())) {
               prefix = candidate;
               found = true;
               break;
            }
          }
          if (!found) {
             let counter = 1;
             while (true) {
                let candidate = (base.slice(0, 3) + counter.toString()).slice(0, 4);
                if (!usedPrefixesLower.has(candidate.toLowerCase())) {
                   prefix = candidate;
                   break;
                }
                counter++;
             }
          }
          assignedPrefixes.set(sup, prefix);
          usedPrefixesLower.add(prefix.toLowerCase());
        }
      }
      uniqueSupplierLetters = assignedPrefixes.get(cleanTarget) || 'XXXX';
    }

    let hash = 0;
    const nameToHash = productName || 'DEFAULT';
    for (let i = 0; i < nameToHash.length; i++) {
      hash = (hash << 5) - hash + nameToHash.charCodeAt(i);
      hash |= 0;
    }
    const productCode = Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);

    if (uniqueSupplierLetters === 'XXXX' && !productName) return '';
    return `${uniqueSupplierLetters}-${productCode}`;
  }

  const handleUpdate = (field: keyof CreateProductInput, value: any) => {
    if (field === 'sku') {
      setIsSkuManuallyEdited(true);
    }
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (!isSkuManuallyEdited && (field === 'name' || field === 'supplierName')) {
         next.sku = generateSku(next.supplierName, next.name);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    try {
      // Basic fallback validation before sending to API
      if (!formData.name) throw new Error("Name is required");
      if (!formData.productType) throw new Error("Product type is required");
      
      // Assume parent component maps this payload to /api/v1/products POST
      await onSave(formData as CreateProductInput);
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to save product" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-outline/20 rounded-2xl p-6 md:p-8 shadow-sm mb-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-outline/10 pb-4">
        <div>
          <h2 className="font-bold text-2xl uppercase">
            {isAdding ? "Add New" : "Edit"} Product (v2)
          </h2>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 border border-outline/30 rounded-lg font-bold uppercase hover:bg-surface-dim"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-on-primary border-0 rounded-lg font-bold uppercase hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>

      {errors.submit && (
        <div className="p-4 bg-error/10 text-error border border-error rounded-lg font-bold mb-6">
          {errors.submit}
        </div>
      )}

      {/* 
        This is where we will map the new modular components.
        For example:
        <ProductDetailsForm data={formData} onChange={handleUpdate} existingSuppliers={existingSuppliers} />
        <ProductPricingForm pricing={formData.pricing} onChange={(val) => handleUpdate('pricing', val)} />
        <ProductInventoryForm inventory={formData.inventory} onChange={(val) => handleUpdate('inventory', val)} />
        <ProductVariantManager variants={formData.variants} attributes={formData.attributes} onChange={...} />
        <ProductMediaManager media={formData.media} onChange={(val) => handleUpdate('media', val)} />
        <ProductFulfillmentForm type={formData.productType} shipping={formData.shipping} service={formData.service} onChange={...} />
      */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1 space-y-6">
          <ProductDetailsForm data={formData} onChange={handleUpdate} existingSuppliers={existingSuppliers} />
          <ProductPricingForm pricing={formData.pricing} onChange={(val) => handleUpdate('pricing', val)} />
          <ProductInventoryForm stockQuantity={formData.stockQuantity} inventory={formData.inventory} onChangeInventory={(val) => handleUpdate('inventory', val)} onChangeStock={(val) => handleUpdate('stockQuantity', val)} />
          <ProductVariantManager variants={formData.variants} attributes={formData.attributes} onChangeVariants={(val) => handleUpdate('variants', val)} onChangeAttributes={(val) => handleUpdate('attributes', val)} />
          <ProductFulfillmentForm productType={formData.productType as ProductType} shipping={formData.shipping} service={formData.service} downloadUrl={formData.downloadUrl} onChangeShipping={(val) => handleUpdate('shipping', val)} onChangeService={(val) => handleUpdate('service', val)} onChangeDownloadUrl={(val) => handleUpdate('downloadUrl', val)} />
          <ProductSEOForm seo={formData.seo} onChange={(val) => handleUpdate('seo', val)} />
        </div>
        
        <div className="order-1 lg:order-2 space-y-6">
          <div className="p-6 border border-outline/20 bg-surface rounded-xl">
            <h3 className="font-bold text-xl mb-4 border-b border-outline/10 pb-2">Organization</h3>
            <div className="space-y-4">
              <div>
                <label className="block font-bold uppercase text-sm mb-1">Product Type</label>
                <select
                  value={formData.productType || "physical"}
                  onChange={(e) => handleUpdate("productType", e.target.value as ProductType)}
                  className="w-full p-2 border border-outline/30 bg-background rounded-lg"
                >
                  <option value="physical">Physical Product</option>
                  <option value="digital">Digital Download</option>
                  <option value="service">Bookable Service</option>
                </select>
              </div>
              <div>
                <label className="block font-bold uppercase text-sm mb-1">Status</label>
                <select
                  value={formData.status || "draft"}
                  onChange={(e) => handleUpdate("status", e.target.value)}
                  className="w-full p-2 border border-outline/30 bg-background rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
          
          <ProductAIAssistant 
            currentData={formData} 
            onApply={(updates) => setFormData(prev => {
              const next = { ...prev, ...updates };
              if (!isSkuManuallyEdited && (next.name || next.supplierName)) {
                next.sku = generateSku(next.supplierName, next.name);
              }
              return next;
            })} 
          />
          <ProductMediaManager media={formData.media} onChange={(val) => handleUpdate('media', val)} />
        </div>
      </div>
    </form>
  );
}
