"use client";

import React, { useState } from "react";
import { ProductMedia } from "@/lib/products/types";

interface ProductMediaManagerProps {
  media?: Omit<ProductMedia, "id">[];
  onChange: (media: Omit<ProductMedia, "id">[]) => void;
}

export function ProductMediaManager({ media = [], onChange }: ProductMediaManagerProps) {
  const [newUrl, setNewUrl] = useState("");

  const handleAddMedia = () => {
    if (!newUrl) return;
    onChange([
      ...media,
      {
        url: newUrl,
        type: "image",
        position: media.length,
        isPrimary: media.length === 0, // First image defaults to primary
      }
    ]);
    setNewUrl("");
  };

  const removeMedia = (index: number) => {
    const newMedia = [...media];
    newMedia.splice(index, 1);
    
    // Fix positions & primary status
    if (newMedia.length > 0 && !newMedia.some(m => m.isPrimary)) {
      newMedia[0].isPrimary = true;
    }
    
    onChange(newMedia.map((m, i) => ({ ...m, position: i })));
  };

  const setPrimary = (index: number) => {
    onChange(
      media.map((m, i) => ({
        ...m,
        isPrimary: i === index,
      }))
    );
  };

  return (
    <div className="p-6 border-2 border-on-surface bg-surface space-y-4">
      <h3 className="font-bold text-xl mb-4 border-b-2 border-on-surface pb-2">Media Gallery</h3>
      
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://... (Image URL)"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="flex-1 p-2 border-2 border-on-surface bg-background"
        />
        <button
          type="button"
          onClick={handleAddMedia}
          className="px-6 py-2 bg-on-surface text-surface font-bold uppercase"
        >
          Add
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {media.map((m, idx) => (
          <div key={idx} className={`relative border-2 p-1 ${m.isPrimary ? 'border-primary' : 'border-on-surface'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url} alt="Product media" className="w-full h-32 object-cover bg-background" />
            
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                type="button"
                onClick={() => removeMedia(idx)}
                className="bg-error text-surface px-2 text-xs font-bold"
              >
                X
              </button>
            </div>
            
            <div className="mt-2 flex justify-between items-center px-1">
              <label className="text-xs font-bold flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="primary-image"
                  checked={m.isPrimary}
                  onChange={() => setPrimary(idx)}
                />
                Primary
              </label>
              <span className="text-xs uppercase">Pos: {m.position}</span>
            </div>
          </div>
        ))}
      </div>
      
      {media.length === 0 && (
        <p className="text-sm text-on-surface-variant italic">No media added yet.</p>
      )}
    </div>
  );
}
