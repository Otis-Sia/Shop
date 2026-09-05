"use client";

import React from "react";
import { CreateProductInput } from "@/lib/products/types";

interface ProductDetailsFormProps {
  data: Partial<CreateProductInput>;
  onChange: (field: keyof CreateProductInput, value: any) => void;
  existingSuppliers?: string[];
}

export function ProductDetailsForm({ data, onChange, existingSuppliers = [] }: ProductDetailsFormProps) {
  return (
    <div className="p-6 border border-outline/20 bg-surface rounded-xl space-y-4">
      <h3 className="font-bold text-xl mb-4 border-b border-outline/10 pb-2">Basic Details</h3>
      
      <div>
        <label className="block font-bold uppercase text-sm mb-1">Name *</label>
        <input
          type="text"
          value={data.name || ""}
          onChange={(e) => onChange("name", e.target.value)}
          className="w-full p-2 border border-outline/30 bg-background rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block font-bold uppercase text-sm mb-1">SKU *</label>
        <input
          type="text"
          value={data.sku || ""}
          onChange={(e) => onChange("sku", e.target.value)}
          className="w-full p-2 border border-outline/30 bg-background rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block font-bold uppercase text-sm mb-1">Short Description</label>
        <textarea
          value={data.shortDescription || ""}
          onChange={(e) => onChange("shortDescription", e.target.value)}
          className="w-full p-2 border border-outline/30 bg-background rounded-lg h-20"
        />
      </div>

      <div>
        <label className="block font-bold uppercase text-sm mb-1">Full Description *</label>
        <textarea
          value={data.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          className="w-full p-2 border border-outline/30 bg-background rounded-lg min-h-[150px]"
          required
        />
      </div>

      <div>
        <label className="block font-bold uppercase text-sm mb-1">Key Features</label>
        <p className="text-xs text-on-surface-variant mb-1">Enter one feature per line. These will display as bullet points.</p>
        <textarea
          value={Array.isArray(data.features) ? data.features.join('\n') : ''}
          onChange={(e) => onChange("features", e.target.value.split('\n').filter(l => l.trim()))}
          className="w-full p-2 border border-outline/30 bg-background rounded-lg h-28"
          placeholder="e.g. 1.8ltr Jug Capacity&#10;350 Watts&#10;Model(TYB-202-A)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Brand</label>
          <input
            type="text"
            value={data.brand || ""}
            onChange={(e) => onChange("brand", e.target.value)}
            className="w-full p-2 border border-outline/30 bg-background rounded-lg"
          />
        </div>
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Supplier</label>
          <input
            type="text"
            list="suppliers-list"
            value={data.supplierName || ""}
            onChange={(e) => onChange("supplierName", e.target.value)}
            className="w-full p-2 border border-outline/30 bg-background rounded-lg"
            placeholder="e.g. Cedar Supply"
          />
          <datalist id="suppliers-list">
            {existingSuppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>
      
      <div>
        {/* Placeholder for actual Category picker component */}
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Category IDs</label>
          <input
            type="text"
            placeholder="comma separated UUIDs"
            value={(data.categoryIds || []).join(", ")}
            onChange={(e) => onChange("categoryIds", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
            className="w-full p-2 border border-outline/30 bg-background rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
