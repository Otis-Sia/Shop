"use client";

import React from "react";
import { CreateProductInput } from "@/lib/products/types";

interface ProductDetailsFormProps {
  data: Partial<CreateProductInput>;
  onChange: (field: keyof CreateProductInput, value: any) => void;
}

export function ProductDetailsForm({ data, onChange }: ProductDetailsFormProps) {
  return (
    <div className="p-6 border-2 border-on-surface bg-surface space-y-4">
      <h3 className="font-bold text-xl mb-4 border-b-2 border-on-surface pb-2">Basic Details</h3>
      
      <div>
        <label className="block font-bold uppercase text-sm mb-1">Name *</label>
        <input
          type="text"
          value={data.name || ""}
          onChange={(e) => onChange("name", e.target.value)}
          className="w-full p-2 border-2 border-on-surface bg-background"
          required
        />
      </div>

      <div>
        <label className="block font-bold uppercase text-sm mb-1">SKU *</label>
        <input
          type="text"
          value={data.sku || ""}
          onChange={(e) => onChange("sku", e.target.value)}
          className="w-full p-2 border-2 border-on-surface bg-background"
          required
        />
      </div>

      <div>
        <label className="block font-bold uppercase text-sm mb-1">Short Description</label>
        <textarea
          value={data.shortDescription || ""}
          onChange={(e) => onChange("shortDescription", e.target.value)}
          className="w-full p-2 border-2 border-on-surface bg-background h-20"
        />
      </div>

      <div>
        <label className="block font-bold uppercase text-sm mb-1">Full Description *</label>
        <textarea
          value={data.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          className="w-full p-2 border-2 border-on-surface bg-background min-h-[150px]"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Brand</label>
          <input
            type="text"
            value={data.brand || ""}
            onChange={(e) => onChange("brand", e.target.value)}
            className="w-full p-2 border-2 border-on-surface bg-background"
          />
        </div>
        {/* Placeholder for actual Category picker component */}
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Category IDs</label>
          <input
            type="text"
            placeholder="comma separated UUIDs"
            value={(data.categoryIds || []).join(", ")}
            onChange={(e) => onChange("categoryIds", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
            className="w-full p-2 border-2 border-on-surface bg-background"
          />
        </div>
      </div>
    </div>
  );
}
