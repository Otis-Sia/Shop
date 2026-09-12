"use client";

import React, { useState, useEffect, useRef } from "react";
import { CreateProductInput, CreateProductVariantInput, ProductType } from "@/lib/products/types";

import { ProductDetailsForm } from "./ProductDetailsForm";
import { ProductPricingForm } from "./ProductPricingForm";
import { ProductInventoryForm } from "./ProductInventoryForm";
import { ProductVariantManager } from "./ProductVariantManager";
import { ProductMediaManager } from "./ProductMediaManager";
import { ProductFulfillmentForm } from "./ProductFulfillmentForm";
import { ProductSEOForm } from "./ProductSEOForm";
import { ProductAIAssistant } from "./ProductAIAssistant";

import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";

export interface ExistingProductSummary {
  id: string | number;
  name: string;
  thumbnail?: string;
  sku?: string;
  price?: number;
  currency?: string;
  stock?: number | null;
  status?: string;
  supplierName?: string;
}

interface ProductEditorProps {
  initialData?: Partial<CreateProductInput> | any;
  isAdding: boolean;
  onSave: (data: CreateProductInput) => Promise<void>;
  onCancel: () => void;
  existingSuppliers?: string[];
  existingProducts?: ExistingProductSummary[];
  onChange?: (data: Partial<CreateProductInput>) => void;
  draftSaveStatus?: "idle" | "saving" | "saved" | "error";
}

function getBigrams(str: string) {
  const s = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bigrams = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.add(s.slice(i, i + 2));
  }
  return bigrams;
}

function calcSimilarity(s1: string, s2: string) {
  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  if (b1.size === 0 || b2.size === 0) return 0;
  let intersection = 0;
  b1.forEach((b) => {
    if (b2.has(b)) intersection++;
  });
  const union = b1.size + b2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeProductData(data?: any): Partial<CreateProductInput> {
  if (!data || Object.keys(data).length === 0) {
    return {
      productType: "physical",
      status: "draft",
      categoryIds: [],
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
  const rawSalePrice = data.pricing?.salePrice !== undefined 
    ? Number(data.pricing.salePrice) 
    : (data.pricing?.compareAtPrice !== undefined 
        ? Number(data.pricing.compareAtPrice) 
        : (data.salePrice !== undefined && data.salePrice !== "" ? Number(data.salePrice) : undefined));

  const rawCostPrice = data.pricing?.costPrice !== undefined 
    ? Number(data.pricing.costPrice) 
    : (data.costPrice !== undefined && data.costPrice !== "" ? Number(data.costPrice) : undefined);

  const rawPrice = data.pricing?.price !== undefined 
    ? Number(data.pricing.price) 
    : (data.price !== undefined && data.price !== "" ? Number(data.price) : 0);

  const pricing = {
    price: rawPrice,
    salePrice: rawSalePrice,
    compareAtPrice: rawSalePrice,
    costPrice: rawCostPrice,
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
    : (data.category ? [data.category] : []);

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
  const [overridePrice, setOverridePrice] = useState<boolean>(() => {
    const base = Number(initialData?.pricing?.price ?? initialData?.price) || 0;
    const vars = initialData?.variants || [];
    return Boolean(
      vars.some(
        (v: any) => v.price !== undefined && v.price !== null && Number(v.price) > 0 && Number(v.price) !== base
      )
    );
  });

  const [showDuplicateDropdown, setShowDuplicateDropdown] = useState(false);
  const [dismissedName, setDismissedName] = useState<string | null>(null);

  const suspectedDuplicates = React.useMemo(() => {
    if (!formData.name || !existingProducts || existingProducts.length === 0) return [];
    const currentName = formData.name.toLowerCase().trim();
    if (currentName.length < 3) return [];

    const currentId = initialData?.id !== undefined && initialData?.id !== null ? String(initialData.id) : null;

    const matches: (ExistingProductSummary & { similarity: number })[] = [];

    for (const p of existingProducts) {
      if (!p.name) continue;
      // Exclude the current product being edited
      if (currentId && String(p.id) === currentId) {
        continue;
      }

      const otherName = p.name.toLowerCase().trim();
      let similarity = 0;
      if (currentName === otherName) {
        similarity = 1.0;
      } else {
        similarity = calcSimilarity(currentName, otherName);
      }

      if (similarity >= 0.85) {
        matches.push({ ...p, similarity });
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }, [formData.name, existingProducts, initialData?.id]);

  const isDuplicateDismissed = dismissedName !== null && dismissedName === (formData.name || "").trim().toLowerCase();
  const hasDuplicates = suspectedDuplicates.length > 0 && !isDuplicateDismissed;

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

  function ensureUniqueVariantSkus(baseSku: string, variants: CreateProductVariantInput[]): CreateProductVariantInput[] {
    const usedSkus = new Set<string>();
    const cleanBaseSku = (baseSku || "SKU").trim();

    return variants.map((v, idx) => {
      const attrTokens = (v.attributes || [])
        .map((a: any) => (a.value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
        .filter(Boolean);
      const suffix = attrTokens.length > 0 ? attrTokens.join("-") : `${idx + 1}`;
      let candidate = (v.sku && typeof v.sku === "string" && v.sku.trim()) ? v.sku.trim() : `${cleanBaseSku}-${suffix}`;

      let uniqueSku = candidate;
      let counter = 1;
      while (usedSkus.has(uniqueSku.toUpperCase())) {
        counter++;
        uniqueSku = `${candidate}-${counter}`;
      }

      usedSkus.add(uniqueSku.toUpperCase());
      return { ...v, sku: uniqueSku };
    });
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
      if (field === "pricing" && !overridePrice) {
        const newPrice = Number(value?.price) || 0;
        if (next.variants && next.variants.length > 0) {
          next.variants = next.variants.map((v) => ({
            ...v,
            price: newPrice > 0 ? newPrice : undefined,
          }));
        }
      }
      if (field === "variants" && !overridePrice) {
        const currentPrice = Number(next.pricing?.price) || 0;
        next.variants = (value || []).map((v: CreateProductVariantInput) => ({
          ...v,
          price: currentPrice > 0 ? currentPrice : undefined,
        }));
      }
      if (next.variants && next.variants.length > 0) {
        next.variants = ensureUniqueVariantSkus(next.sku || "SKU", next.variants);
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
      if (!overridePrice && next.variants && next.variants.length > 0) {
        const regularPrice = Number(next.pricing?.price) || 0;
        next.variants = next.variants.map((v) => ({
          ...v,
          price: regularPrice > 0 ? regularPrice : undefined,
        }));
      }
      if (next.variants && next.variants.length > 0) {
        next.variants = ensureUniqueVariantSkus(next.sku || "SKU", next.variants);
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
      if (!formData.name || !formData.name.trim()) {
        throw new Error("Product name is required");
      }
      if (!formData.productType) {
        throw new Error("Product type is required");
      }
      if (!formData.supplierName || !formData.supplierName.trim()) {
        throw new Error("Supplier name is required");
      }

      const regularPrice = Number(formData.pricing?.price);
      if (formData.pricing?.price === undefined || formData.pricing?.price === null || isNaN(regularPrice) || regularPrice <= 0) {
        throw new Error("Regular Price is required and must be greater than 0");
      }

      const costPrice = Number(formData.pricing?.costPrice);
      if (formData.pricing?.costPrice === undefined || formData.pricing?.costPrice === null || isNaN(costPrice) || costPrice <= 0) {
        throw new Error("Cost Price (Buying Price) is required and must be greater than 0");
      }

      if (regularPrice <= costPrice) {
        throw new Error(`Regular Price (${regularPrice}) must be strictly greater than Cost Price (${costPrice})`);
      }

      const rawSalePrice = formData.pricing?.salePrice ?? formData.pricing?.compareAtPrice;
      if (rawSalePrice !== undefined && rawSalePrice !== null && !isNaN(Number(rawSalePrice))) {
        const salePrice = Number(rawSalePrice);
        if (salePrice <= 0) {
          throw new Error("Sale Price must be greater than 0 if provided");
        }
        if (salePrice >= regularPrice) {
          throw new Error(`Sale Price (${salePrice}) must be lower than Regular Price (${regularPrice})`);
        }
        if (salePrice < costPrice) {
          throw new Error(`Sale Price (${salePrice}) cannot be lower than Cost Price (${costPrice})`);
        }
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

      if (payload.variants && payload.variants.length > 0) {
        payload.variants = ensureUniqueVariantSkus(payload.sku || formData.sku || "SKU", payload.variants);
        if (!overridePrice) {
          payload.variants = payload.variants.map((v) => ({
            ...v,
            price: regularPrice,
          }));
        }
      }

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

      {hasDuplicates && (
        <div className="p-4 bg-yellow-50 text-yellow-900 border-2 border-yellow-600 mb-6 shadow-[4px_4px_0px_0px_#ca8a04] transition-all">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-700 shrink-0 mt-0.5" />
              <div>
                <span className="block text-sm font-black uppercase tracking-wider text-yellow-800 mb-0.5">
                  WARNING: Possible Duplicate Detected
                </span>
                <span className="font-medium text-sm text-yellow-950">
                  {suspectedDuplicates.length === 1 ? (
                    <>
                      The product name looks {Math.round(suspectedDuplicates[0].similarity * 100)}% similar to an existing product:{" "}
                      <strong>{suspectedDuplicates[0].name}</strong>.
                    </>
                  ) : (
                    <>
                      Found {suspectedDuplicates.length} existing products with very similar names (up to {Math.round(suspectedDuplicates[0].similarity * 100)}% match).
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setShowDuplicateDropdown((prev) => !prev)}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold uppercase text-xs border-2 border-yellow-800 shadow-[2px_2px_0px_0px_#854d0e] hover:translate-y-[1px] hover:translate-x-[1px] transition-all flex items-center gap-1.5"
              >
                <span>{showDuplicateDropdown ? "Hide Suspected" : "Show Suspected Product"}</span>
                {showDuplicateDropdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setDismissedName((formData.name || "").trim().toLowerCase())}
                title="Dismiss warning"
                className="p-2 text-yellow-800 hover:text-yellow-950 hover:bg-yellow-200/60 border border-yellow-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showDuplicateDropdown && (
            <div className="mt-4 pt-4 border-t-2 border-yellow-300/80 space-y-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-yellow-800 flex items-center justify-between">
                <span>Suspected Duplicate Products ({suspectedDuplicates.length})</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {suspectedDuplicates.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white border-2 border-yellow-700 shadow-[2px_2px_0px_0px_#ca8a04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {p.thumbnail ? (
                        <img
                          src={p.thumbnail}
                          alt={p.name}
                          className="w-12 h-12 object-cover border border-yellow-800 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-yellow-100 border border-yellow-800 flex items-center justify-center text-[10px] uppercase font-bold text-yellow-800 shrink-0">
                          No Img
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-900 truncate">{p.name}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-black uppercase bg-yellow-200 text-yellow-900 border border-yellow-700 shrink-0">
                            {Math.round(p.similarity * 100)}% match
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-secondary font-medium mt-1">
                          <span>SKU: <strong>{p.sku || "N/A"}</strong></span>
                          {p.price !== undefined && (
                            <span>Price: <strong>{p.currency || "KES"} {Number(p.price).toLocaleString()}</strong></span>
                          )}
                          {p.stock !== undefined && p.stock !== null && (
                            <span>Stock: <strong>{p.stock}</strong></span>
                          )}
                          {p.supplierName && (
                            <span>Supplier: <strong>{p.supplierName}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <a
                        href={`/admin/products?search=${encodeURIComponent(p.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-yellow-600 text-white border-2 border-yellow-800 font-bold uppercase text-[11px] hover:bg-yellow-700 shadow-[2px_2px_0px_0px_#854d0e] hover:translate-y-[1px] hover:translate-x-[1px] transition-all flex items-center gap-1.5"
                      >
                        <span>View in Catalog</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1 space-y-6">
          <ProductDetailsForm data={formData} onChange={handleUpdate} existingSuppliers={existingSuppliers} />
          <ProductPricingForm 
            pricing={formData.pricing} 
            onChange={(val) => handleUpdate("pricing", val)} 
            productName={formData.name}
            brand={formData.brand}
          />
          <ProductInventoryForm 
            stockQuantity={formData.stockQuantity} 
            inventory={formData.inventory} 
            onChangeInventory={(val) => handleUpdate("inventory", val)} 
            onChangeStock={(val) => handleUpdate("stockQuantity", val)} 
          />
          <ProductVariantManager 
            variants={formData.variants} 
            attributes={formData.attributes} 
            basePrice={Number(formData.pricing?.price) || 0}
            overridePrice={overridePrice}
            onChangeOverridePrice={(val) => {
              setOverridePrice(val);
              if (!val) {
                const currentBase = Number(formData.pricing?.price) || 0;
                handleUpdate(
                  "variants",
                  (formData.variants || []).map((v) => ({
                    ...v,
                    price: currentBase > 0 ? currentBase : undefined,
                  }))
                );
              }
            }}
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
          <ProductMediaManager media={formData.media} onChange={(val) => handleUpdate("media", val)} productName={formData.name} />
        </div>
      </div>
    </form>
  );
}
