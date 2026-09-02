"use client";

import React, { useState } from "react";
import { ProductMedia } from "@/lib/products/types";
import { auth } from "@/lib/firebase";

interface ProductMediaManagerProps {
  media?: Omit<ProductMedia, "id">[];
  onChange: (media: Omit<ProductMedia, "id">[]) => void;
}

export function ProductMediaManager({ media = [], onChange }: ProductMediaManagerProps) {
  const [newUrl, setNewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Basic URL Add
  const handleAddMedia = () => {
    if (!newUrl) return;
    onChange([
      ...media,
      {
        url: newUrl,
        type: "image",
        position: media.length,
        isPrimary: media.length === 0,
      }
    ]);
    setNewUrl("");
  };

  // Drag and Drop Flow
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFilesUpload(e.dataTransfer.files);
    }
  };

  const handleFilesUpload = async (files: FileList) => {
    setIsUploading(true);
    try {
      const newMediaItems: Omit<ProductMedia, "id">[] = [];
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. Get Signed URL
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        });
        
        if (!response.ok) throw new Error('Failed to get upload URL');
        const { signedUrl, fileUrl } = await response.json();
        
        // 2. Upload to Supabase/S3
        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });
        
        if (!uploadResponse.ok) throw new Error('Failed to upload file');
        
        newMediaItems.push({
          url: fileUrl,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          position: media.length + i,
          isPrimary: media.length === 0 && i === 0,
        });
      }
      
      onChange([...media, ...newMediaItems]);
    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    const newMedia = [...media];
    newMedia.splice(index, 1);
    
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
      
      {/* Drop Zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full p-8 border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-on-surface/30 hover:border-on-surface/50'}`}
      >
        <span className="font-bold uppercase text-on-surface-variant mb-2">
          {isUploading ? "Uploading..." : "Drag & Drop Images Here"}
        </span>
        <span className="text-xs text-on-surface-variant">or</span>
        <input 
          type="file"
          multiple
          accept="image/*,video/*"
          className="mt-2 text-sm max-w-xs"
          onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
          disabled={isUploading}
        />
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-xs uppercase font-bold text-on-surface-variant">OR Add URL:</span>
        <input
          type="url"
          placeholder="https://..."
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="flex-1 p-2 border-2 border-on-surface bg-background text-sm"
        />
        <button
          type="button"
          onClick={handleAddMedia}
          className="px-4 py-2 bg-on-surface text-surface font-bold uppercase text-sm"
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
