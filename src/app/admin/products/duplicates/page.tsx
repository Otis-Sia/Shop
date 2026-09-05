"use client";

import React, { useEffect, useState } from "react";
import { getProducts, Product } from "@/lib/api/products";
import Link from "next/link";
import { useToast } from "@/components/providers/ToastProvider";
import { auth } from "@/lib/firebase";

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
  b1.forEach(b => { if (b2.has(b)) intersection++; });
  const union = b1.size + b2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export default function DeduplicatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState<Product[][]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const data = await getProducts({ limit: 1000 });
        setProducts(data);
        scanDuplicates(data);
      } catch (err: any) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const scanDuplicates = (allProds: Product[]) => {
    const groups: Product[][] = [];
    const visited = new Set<number|string>();

    for (let i = 0; i < allProds.length; i++) {
      if (visited.has(allProds[i].id)) continue;
      const group = [allProds[i]];
      visited.add(allProds[i].id);

      for (let j = i + 1; j < allProds.length; j++) {
        if (visited.has(allProds[j].id)) continue;
        const sim = calcSimilarity(allProds[i].name, allProds[j].name);
        if (sim > 0.65) {
          group.push(allProds[j]);
          visited.add(allProds[j].id);
        }
      }
      if (group.length > 1) {
        groups.push(group);
      }
    }
    setDuplicateGroups(groups);
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/v1/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete product");
      
      showToast("Product deleted", "success");
      const newProds = products.filter(p => p.id !== id);
      setProducts(newProds);
      scanDuplicates(newProds);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b-4 border-on-surface pb-4">
        <h1 className="font-headline-lg font-black text-2xl sm:text-4xl uppercase">Duplicate Scanner</h1>
        <Link href="/admin/products" className="px-4 py-2 border-2 border-on-surface font-bold uppercase text-sm hover:bg-surface-container">Back to Catalog</Link>
      </div>

      {loading ? (
        <p className="font-bold text-secondary uppercase tracking-widest">Scanning database...</p>
      ) : (
        <div className="space-y-8">
          <p className="font-bold text-sm uppercase">Found {duplicateGroups.length} potential duplicate groups.</p>
          
          {duplicateGroups.length === 0 && (
            <div className="p-12 border-4 border-on-surface bg-surface-container flex flex-col items-center justify-center text-center">
              <span className="text-4xl mb-4">✨</span>
              <h2 className="font-black uppercase text-xl text-on-surface mb-2">Clean Database!</h2>
              <p className="text-secondary font-bold uppercase text-xs tracking-wider">No similar products were found.</p>
            </div>
          )}

          {duplicateGroups.map((group, gIdx) => (
            <div key={gIdx} className="border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] bg-surface p-6">
              <h3 className="font-black uppercase text-lg mb-4 border-b-2 border-surface-container pb-2">Match Group {gIdx + 1}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.map((p) => (
                  <div key={p.id} className="border border-on-surface-variant p-4 flex flex-col gap-2">
                    <div className="flex gap-4">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-16 h-16 object-cover border border-on-surface-variant" />
                      ) : (
                        <div className="w-16 h-16 bg-surface-container border border-on-surface-variant flex items-center justify-center text-[10px] uppercase font-bold text-secondary">No Img</div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm">{p.name}</h4>
                        <p className="text-xs font-semibold text-secondary uppercase tracking-wider mt-1">SKU: {p.sku || 'N/A'}</p>
                        <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Price: {(p as any).pricing?.currency || p.currency || 'KES'} {(p as any).pricing?.price || p.price}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Link href={`/admin/products?edit=${p.id}`} className="flex-1 text-center py-1 bg-primary-container text-on-surface border-2 border-on-surface font-bold uppercase text-[10px] hover:translate-y-[1px] hover:translate-x-[1px] transition-all">Edit</Link>
                      <button onClick={() => handleDelete(p.id)} className="flex-1 py-1 bg-red-100 text-red-800 border-2 border-red-800 font-bold uppercase text-[10px] hover:bg-red-200">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
