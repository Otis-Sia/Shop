"use client";

import React, { useState, useEffect, useRef } from "react";
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
  initialData?: Partial<CreateProductInput> | any;
  isAdding: boolean;
  onSave: (data: CreateProductInput) => Promise<void>;
  onCancel: () => void;
  existingSuppliers?: string[];
  existingProducts?: { id: string | number; name: string; thumbnail?: string }[];
  onChange?: (data: Partial<CreateProductInput>) => void;
  draftSaveStatus?: "idle" | "saving" | "saved" | "error";
}

function normalizeProductData(data?: any): Partial<CreateProductInput> {
  if (!data || Object.keys(data).length === 0) {
    return {
      productType: "physical",
      status: "draft",
      categoryIds: ["Apparel"],
      tags: [],
      attributes: [],
      variants: [],
      media: [],
      pricing: { price: 0, currency: "KES", taxable: true },
      stockQuantity: 0,
      inventory: { trackInventory: true, allowBackorder: false },
    };
  }

  // Normalize media
  let media = data.media;
  if ((!media || media.length === 0) && Array.isArray(data.imageUrls)) {
    media = data.imageUrls
      .filter((u: string) => typeof u === "string" && u.trim() !== "")
      .map((url: string, index: number) => ({
        url,
        type: "image" as const,
        position: index,
        isPrimary: index === 0,
      }));
  }

  // Normalize pricing
  const pricing = {
    price: data.pricing?.price !== undefined ? Number(data.pricing.price) : (data.price !== undefined && data.price !== "" ? Number(data.price) : 0),
    compareAtPrice: data.pricing?.compareAtPrice !== undefined ? Number(data.pricing.compareAtPrice) : (data.salePrice !== undefined && data.salePrice !== "" ? Number(data.salePrice) : undefined),
    costPrice: data.pricing?.costPrice !== undefined ? Number(data.pricing.costPrice) : (data.costPrice !== undefined && data.costPrice !== "" ? Number(data.costPrice) : undefined),
    currency: data.pricing?.currency || data.currency || "KES",
    taxable: data.pricing?.taxable ?? true,
  };

  // Normalize stock and inventory
  const stockQuantity = data.stockQuantity !== undefined && data.stockQuantity !== null
    ? Number(data.stockQuantity)
    : (data.stock !== undefined && data.stock !== null && data.stock !== "" ? Number(data.stock) : 0);

  const inventory = {
    trackInventory: data.inventory?.trackInventory ?? (data.trackInventory ?? true),
    allowBackorder: data.inventory?.allowBackorder ?? (data.allowBackorders ?? false),
    lowStockThreshold: data.inventory?.lowStockThreshold ?? (data.lowStockAlert ? 5 : undefined),
  };

  // Normalize categories
  const categoryIds = Array.isArray(data.categoryIds) && data.categoryIds.length > 0
    ? data.categoryIds
    : (data.category ? [data.category] : ["Apparel"]);

  // Normalize tags
  const tags = Array.isArray(data.tags)
    ? data.tags
    : (typeof data.tags === "string" ? data.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : []);

  return {
    ...data,
    name: data.name || "",
    sku: data.sku || "",
    shortDescription: data.shortDescription || "",
    description: data.description || "",
    brand: data.brand || "",
    supplierName: data.supplierName || "",
    productType: data.productType || "physical",
    status: data.status || "draft",
    categoryIds,
    tags,
    attributes: data.attributes || [],
    variants: data.variants || [],
    media: media || [],
    pricing,
    stockQuantity,
    inventory,
    seo: data.seo || {},
    shipping: data.shipping || {},
    service: data.service && Object.keys(data.service).length > 0 ? data.service : undefined,
    downloadUrl: data.downloadUrl || "",
  };
}

export function ProductEditor({ 
  initialData, 
  isAdding, 
  onSave, 
  onCancel, 
  existingSuppliers = [],
  existingProducts = [],
  onChange,
  draftSaveStatus = "idle"
}: ProductEditorProps) {
  const [formData, setFormData] = useState<Partial<CreateProductInput>>(() => normalizeProductData(initialData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(Boolean(initialData?.sku));

  const lastEmittedRef = useRef<string>("");
  const lastInitialDataRef = useRef<string>(JSON.stringify(initialData || {}));

  // Sync state if initialData changes externally (e.g., resuming an unsaved draft or switching products)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const currentSerialized = JSON.stringify(initialData || {});
    if (currentSerialized !== lastEmittedRef.current && currentSerialized !== lastInitialDataRef.current) {
      lastInitialDataRef.current = currentSerialized;
      if (initialData) {
        setFormData(normalizeProductData(initialData));
      }
    }
  }, [initialData]);

  // Safely emit changes to parent after render
  useEffect(() => {
    const serialized = JSON.stringify(formData);
    if (serialized !== lastEmittedRef.current) {
      lastEmittedRef.current = serialized;
      onChange?.(formData);
    }
  }, [formData, onChange]);

  function generateSku(supplierName: string = "", productName: string = "") {
    const cleanTarget = (supplierName || "").replace(/[^a-zA-Z]/g, "");
    let uniqueSupplierLetters = "XXXX";
    
    if (cleanTarget) {
      const list = [...new Set(existingSuppliers || [])].map((s) => s.replace(/[^a-zA-Z]/g, "")).filter(Boolean);
      if (!list.includes(cleanTarget)) list.push(cleanTarget);

      const assignedPrefixes = new Map<string, string>();
      const usedPrefixesLower = new Set<string>();

      for (const sup of list) {
        if (assignedPrefixes.has(sup)) continue;
        let base = sup;
        if (base.length < 4) base = base.padEnd(4, "x");
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
      uniqueSupplierLetters = assignedPrefixes.get(cleanTarget) || "XXXX";
    }

    let hash = 0;
    const nameToHash = productName || "DEFAULT";
    for (let i = 0; i < nameToHash.length; i++) {
      hash = (hash << 5) - hash + nameToHash.charCodeAt(i);
      hash |= 0;
    }
    const productCode = Math.abs(hash).toString(36).toUpperCase().padStart(4, "0").slice(0, 4);

    if (uniqueSupplierLetters === "XXXX" && !productName) return "";
    return `${uniqueSupplierLetters}-${productCode}`;
  }

  const handleUpdate = (field: keyof CreateProductInput, value: any) => {
    if (field === "sku") {
      setIsSkuManuallyEdited(true);
    }
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (!isSkuManuallyEdited && (field === "name" || field === "supplierName")) {
        next.sku = generateSku(next.supplierName, next.name);
      }
      if (next.variants && next.variants.length > 0) {
        next.variants = next.variants.map((v) => {
          if (!v.sku || field === "name" || field === "supplierName") {
            const variantName = (next.name || "") + " " + (v.attributes || []).map((a) => a.value).join(" ");
            return { ...v, sku: generateSku(next.supplierName, variantName) };
          }
          return v;
        });
      }
      return next;
    });
  };

  const handleApplyAI = (updates: Partial<CreateProductInput>) => {
    setFormData((prev) => {
      const next = { ...prev, ...updates };
      if (!isSkuManuallyEdited && (next.name || next.supplierName)) {
        next.sku = generateSku(next.supplierName, next.name);
      }
      if (next.variants && next.variants.length > 0) {
        next.variants = next.variants.map((v) => {
          const variantName = (next.name || "") + " " + (v.attributes || []).map((a) => a.value).join(" ");
          return { ...v, sku: generateSku(next.supplierName, variantName) };
        });
      }
      return next;
    });
  };

  const handleSubmit = async (e?: React.FormEvent, customStatus?: "draft" | "active") => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const targetStatus = customStatus || formData.status || "active";
      if (!formData.name && targetStatus !== "draft") {
        throw new Error("Product name is required");
      }
      if (!formData.productType) {
        throw new Error("Product type is required");
      }
      
      const targetProductType = formData.productType || "physical";
      const payload: CreateProductInput = {
        ...(formData as CreateProductInput),
        name: formData.name || "Untitled Draft",
        productType: targetProductType,
        status: targetStatus,
        service: targetProductType === "service" && formData.service?.durationMinutes 
          ? {
              durationMinutes: Number(formData.service.durationMinutes) || 60,
              locationType: formData.service.locationType || "on_site",
              bufferMinutes: formData.service.bufferMinutes ? Number(formData.service.bufferMinutes) : undefined,
              maxBookingsPerSlot: formData.service.maxBookingsPerSlot ? Number(formData.service.maxBookingsPerSlot) : undefined,
            }
          : undefined,
        shipping: targetProductType === "physical" ? formData.shipping : undefined,
        downloadUrl: targetProductType === "digital" ? formData.downloadUrl : undefined,
      };

      await onSave(payload);
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to save product" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="bg-surface border-4 border-on-surface p-6 md:p-8 shadow-[6px_6px_0px_0px_var(--color-on-surface)] mb-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b-4 border-on-surface pb-4">
        <div>
          <h2 className="font-headline-lg font-black text-2xl uppercase">
            {isAdding ? "Add New" : "Edit"} Product
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs uppercase font-bold text-secondary">
              Status: <span className="text-on-surface underline">{formData.status || "draft"}</span>
            </span>
            {draftSaveStatus === "saving" && (
              <span className="text-xs text-secondary animate-pulse font-mono font-bold">
                Saving draft...
              </span>
            )}
            {draftSaveStatus === "saved" && (
              <span className="text-xs text-green-700 font-mono font-bold">
                Draft auto-saved
              </span>
            )}
            {draftSaveStatus === "error" && (
              <span className="text-xs text-red-600 font-mono font-bold">
                Auto-save failed
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border-2 border-on-surface font-bold uppercase text-xs sm:text-sm hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, "draft")}
            disabled={isSubmitting}
            className="px-4 py-2 bg-surface text-on-surface border-2 border-on-surface font-bold uppercase text-xs sm:text-sm hover:bg-surface-container transition-colors disabled:opacity-50 shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
          >
            {isSubmitting ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary-container text-on-surface border-4 border-on-surface font-black uppercase text-xs sm:text-sm hover:translate-y-[2px] hover:translate-x-[2px] transition-all disabled:opacity-50 shadow-[4px_4px_0px_0px_var(--color-on-surface)]"
          >
            {isSubmitting ? "Saving..." : "Publish / Save"}
          </button>
        </div>
      </div>

      {errors.submit && (
        <div className="p-4 bg-red-100 text-red-800 border-2 border-red-600 font-bold mb-6">
          {errors.submit}
        </div>
      )}

      {similarProduct && (
        <div className="p-4 bg-yellow-100 text-yellow-900 border-2 border-yellow-600 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-[4px_4px_0px_0px_#ca8a04]">
          <div>
            <span className="block text-sm font-black uppercase tracking-wider text-yellow-800 mb-1">WARNING: Possible Duplicate Detected</span>
            <span className="font-semibold text-sm">The product name looks {(similarProduct.similarity * 100).toFixed(0)}% similar to an existing product: <strong>{similarProduct.name}</strong>.</span>
          </div>
          <button type="button" onClick={() => window.open(`/admin/products`, '_blank')} className="px-4 py-2 bg-yellow-600 text-white font-bold uppercase text-xs border-2 border-yellow-800 shadow-[2px_2px_0px_0px_#854d0e] hover:translate-y-[1px] hover:translate-x-[1px] transition-all shrink-0">
            Check Catalog
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1 space-y-6">
          <ProductDetailsForm data={formData} onChange={handleUpdate} existingSuppliers={existingSuppliers} />
          <ProductPricingForm pricing={formData.pricing} onChange={(val) => handleUpdate("pricing", val)} />
          <ProductInventoryForm 
            stockQuantity={formData.stockQuantity} 
            inventory={formData.inventory} 
            onChangeInventory={(val) => handleUpdate("inventory", val)} 
            onChangeStock={(val) => handleUpdate("stockQuantity", val)} 
          />
          <ProductVariantManager 
            variants={formData.variants} 
            attributes={formData.attributes} 
            onChangeVariants={(val) => handleUpdate("variants", val)} 
            onChangeAttributes={(val) => handleUpdate("attributes", val)} 
          />
          <ProductFulfillmentForm 
            productType={formData.productType as ProductType} 
            shipping={formData.shipping} 
            service={formData.service} 
            downloadUrl={formData.downloadUrl} 
            onChangeShipping={(val) => handleUpdate("shipping", val)} 
            onChangeService={(val) => handleUpdate("service", val)} 
            onChangeDownloadUrl={(val) => handleUpdate("downloadUrl", val)} 
          />
          <ProductSEOForm seo={formData.seo} onChange={(val) => handleUpdate("seo", val)} />
        </div>
        
        <div className="order-1 lg:order-2 space-y-6">
          <div className="p-6 border-2 border-on-surface bg-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
            <h3 className="font-bold text-lg uppercase mb-4 border-b-2 border-on-surface pb-2">Organization</h3>
            <div className="space-y-4">
              <div>
                <label className="block font-bold uppercase text-xs mb-1">Product Type</label>
                <select
                  value={formData.productType || "physical"}
                  onChange={(e) => handleUpdate("productType", e.target.value as ProductType)}
                  className="w-full p-2 border-2 border-on-surface bg-surface text-sm font-bold"
                >
                  <option value="physical">Physical Product</option>
                  <option value="digital">Digital Download</option>
                  <option value="service">Bookable Service</option>
                </select>
              </div>
              <div>
                <label className="block font-bold uppercase text-xs mb-1">Status</label>
                <select
                  value={formData.status || "draft"}
                  onChange={(e) => handleUpdate("status", e.target.value)}
                  className="w-full p-2 border-2 border-on-surface bg-surface text-sm font-bold"
                >
                  <option value="draft">Draft (Unlisted)</option>
                  <option value="active">Active (Published)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
          
          <ProductAIAssistant 
            currentData={formData} 
            onApply={handleApplyAI} 
          />
          <ProductMediaManager media={formData.media} onChange={(val) => handleUpdate("media", val)} />
        </div>
      </div>
    </form>
  );
}
