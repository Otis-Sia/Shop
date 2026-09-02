"use client";

import React from "react";
import { ProductType, ShippingInfo, ServiceInfo } from "@/lib/products/types";

interface ProductFulfillmentFormProps {
  productType: ProductType;
  shipping?: Partial<ShippingInfo>;
  service?: Partial<ServiceInfo>;
  downloadUrl?: string;
  onChangeShipping: (value: ShippingInfo) => void;
  onChangeService: (value: ServiceInfo) => void;
  onChangeDownloadUrl: (value: string) => void;
}

export function ProductFulfillmentForm({
  productType,
  shipping,
  service,
  downloadUrl,
  onChangeShipping,
  onChangeService,
  onChangeDownloadUrl,
}: ProductFulfillmentFormProps) {
  
  if (productType === "physical") {
    const currentShipping: ShippingInfo = {
      requiresShipping: true,
      ...shipping,
    };

    const updateShipping = (field: keyof ShippingInfo, value: any) => {
      onChangeShipping({ ...currentShipping, [field]: value });
    };

    return (
      <div className="p-6 border border-outline/20 bg-surface rounded-xl space-y-4">
        <h3 className="font-bold text-xl mb-4 border-b border-outline/10 pb-2">Shipping Information</h3>
        
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="requires-shipping"
            checked={currentShipping.requiresShipping}
            onChange={(e) => updateShipping("requiresShipping", e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="requires-shipping" className="font-bold uppercase text-sm">
            This is a physical product that requires shipping
          </label>
        </div>

        {currentShipping.requiresShipping && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase text-sm mb-1">Weight Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={currentShipping.weight?.value || ""}
                onChange={(e) => updateShipping("weight", { ...currentShipping.weight, value: parseFloat(e.target.value) || 0, unit: currentShipping.weight?.unit || "kg" })}
                className="w-full p-2 border border-outline/30 bg-background rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-sm mb-1">Weight Unit</label>
              <select
                value={currentShipping.weight?.unit || "kg"}
                onChange={(e) => updateShipping("weight", { ...currentShipping.weight, value: currentShipping.weight?.value || 0, unit: e.target.value })}
                className="w-full p-2 border border-outline/30 bg-background rounded-lg"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="lb">lb</option>
                <option value="oz">oz</option>
              </select>
            </div>
            
            <div className="col-span-2">
              <label className="block font-bold uppercase text-sm mb-1">Country of Origin (ISO 2)</label>
              <input
                type="text"
                maxLength={2}
                value={currentShipping.countryOfOrigin || ""}
                onChange={(e) => updateShipping("countryOfOrigin", e.target.value.toUpperCase())}
                className="w-full p-2 border border-outline/30 bg-background rounded-lg"
                placeholder="e.g. US, KE"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (productType === "service") {
    const currentService: ServiceInfo = {
      durationMinutes: 60,
      locationType: "on_site",
      ...service,
    };

    const updateService = (field: keyof ServiceInfo, value: any) => {
      onChangeService({ ...currentService, [field]: value });
    };

    return (
      <div className="p-6 border border-outline/20 bg-surface rounded-xl space-y-4">
        <h3 className="font-bold text-xl mb-4 border-b border-outline/10 pb-2">Service Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold uppercase text-sm mb-1">Duration (Minutes) *</label>
            <input
              type="number"
              min="1"
              value={currentService.durationMinutes}
              onChange={(e) => updateService("durationMinutes", parseInt(e.target.value, 10) || 60)}
              className="w-full p-2 border border-outline/30 bg-background rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block font-bold uppercase text-sm mb-1">Buffer (Minutes)</label>
            <input
              type="number"
              min="0"
              value={currentService.bufferMinutes || ""}
              onChange={(e) => updateService("bufferMinutes", parseInt(e.target.value, 10) || undefined)}
              className="w-full p-2 border border-outline/30 bg-background rounded-lg"
            />
          </div>
          
          <div className="col-span-2">
            <label className="block font-bold uppercase text-sm mb-1">Location Type *</label>
            <select
              value={currentService.locationType}
              onChange={(e) => updateService("locationType", e.target.value)}
              className="w-full p-2 border border-outline/30 bg-background rounded-lg"
            >
              <option value="on_site">On Site</option>
              <option value="remote">Remote / Virtual</option>
              <option value="customer_location">Customer Location</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (productType === "digital") {
    return (
      <div className="p-6 border border-outline/20 bg-surface rounded-xl space-y-4">
        <h3 className="font-bold text-xl mb-4 border-b border-outline/10 pb-2">Digital Delivery</h3>
        
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Download URL *</label>
          <input
            type="url"
            value={downloadUrl || ""}
            onChange={(e) => onChangeDownloadUrl(e.target.value)}
            className="w-full p-2 border border-outline/30 bg-background rounded-lg"
            placeholder="https://..."
            required={productType === "digital"}
          />
        </div>
      </div>
    );
  }

  return null;
}
