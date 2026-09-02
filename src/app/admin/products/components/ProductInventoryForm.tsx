"use client";

import React from "react";
import { InventoryPolicy } from "@/lib/products/types";

interface ProductInventoryFormProps {
  inventory?: Partial<InventoryPolicy>;
  stockQuantity?: number;
  onChangeInventory: (value: InventoryPolicy) => void;
  onChangeStock: (value: number) => void;
}

export function ProductInventoryForm({ inventory, stockQuantity, onChangeInventory, onChangeStock }: ProductInventoryFormProps) {
  const currentInventory: InventoryPolicy = {
    trackInventory: false,
    allowBackorder: false,
    ...inventory,
  };

  const updateField = (field: keyof InventoryPolicy, value: any) => {
    onChangeInventory({ ...currentInventory, [field]: value });
  };

  return (
    <div className="p-6 border-2 border-on-surface bg-surface space-y-4">
      <h3 className="font-bold text-xl mb-4 border-b-2 border-on-surface pb-2">Inventory</h3>
      
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="track-inventory-checkbox"
          checked={currentInventory.trackInventory}
          onChange={(e) => updateField("trackInventory", e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="track-inventory-checkbox" className="font-bold uppercase text-sm">
          Track Inventory
        </label>
      </div>

      {currentInventory.trackInventory && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase text-sm mb-1">Available Stock</label>
              <input
                type="number"
                min="0"
                value={stockQuantity || 0}
                onChange={(e) => onChangeStock(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2 border-2 border-on-surface bg-background"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-sm mb-1">Low Stock Threshold</label>
              <input
                type="number"
                min="0"
                value={currentInventory.lowStockThreshold || ""}
                onChange={(e) => updateField("lowStockThreshold", parseInt(e.target.value, 10) || undefined)}
                className="w-full p-2 border-2 border-on-surface bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="allow-backorder-checkbox"
              checked={currentInventory.allowBackorder}
              onChange={(e) => updateField("allowBackorder", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="allow-backorder-checkbox" className="font-bold uppercase text-sm">
              Allow customers to purchase when out of stock (Backorder)
            </label>
          </div>
        </>
      )}
    </div>
  );
}
