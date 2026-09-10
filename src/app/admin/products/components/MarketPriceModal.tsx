"use client";

import React, { useState } from "react";
import { MarketPriceResearchResult } from "@/lib/pricing/market-research";

interface MarketPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  brand?: string;
  costPrice?: number;
  currentRegularPrice?: number;
  onApplyPrice: (recommendedPrice: number, compareAtPrice?: number) => void;
}

export function MarketPriceModal({
  isOpen,
  onClose,
  productName,
  brand = "",
  costPrice,
  currentRegularPrice = 0,
  onApplyPrice,
}: MarketPriceModalProps) {
  const [queryName, setQueryName] = useState(productName || "");
  const [researchData, setResearchData] = useState<MarketPriceResearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setQueryName(productName || "");
      if (productName && !researchData) {
        handleSearch(productName);
      }
    }
  }, [isOpen, productName]);

  const handleSearch = async (nameToSearch: string) => {
    const term = nameToSearch.trim();
    if (!term) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/products/market-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: term,
          brand,
          costPrice,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch market research data");
      setResearchData(json.data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to research Kenyan market prices.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-surface border-4 border-on-surface shadow-[8px_8px_0px_0px_var(--color-on-surface)] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b-4 border-on-surface bg-surface-container">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
              Market Intelligence
            </span>
            <h3 className="text-xl md:text-2xl font-headline-lg font-black uppercase">
              Kenyan Competitor Pricing
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 border-2 border-on-surface font-bold uppercase text-xs hover:bg-surface transition-colors"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Search Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch(queryName);
                }
              }}
              placeholder="Search product across Kenyan marketplaces..."
              className="flex-1 p-2.5 border-2 border-on-surface bg-surface text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => handleSearch(queryName)}
              disabled={isLoading || !queryName.trim()}
              className="px-6 py-2.5 bg-primary text-on-primary font-black uppercase text-xs border-2 border-on-surface hover:bg-primary/90 disabled:opacity-50 transition-all shrink-0"
            >
              {isLoading ? "Researching..." : "Scan Market"}
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-100 text-red-900 border-2 border-red-600 font-bold text-xs">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-sm uppercase text-secondary">
                Scanning Jumia Kenya, Kilimall, Jiji, and Google Kenya for active competitor prices...
              </p>
            </div>
          ) : researchData ? (
            <div className="space-y-6">
              
              {/* Cost-Floor Guardrail Warning */}
              {researchData.costFloorApplied && researchData.costFloorWarning && (
                <div className="p-3 bg-yellow-100 text-yellow-900 border-2 border-yellow-600 text-xs font-semibold">
                  <span className="font-black uppercase block text-yellow-800 mb-0.5">
                    Profit Margin Protected
                  </span>
                  {researchData.costFloorWarning}
                </div>
              )}

              {/* Price Range & Recommendation Highlight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Lowest Market Price */}
                <div className="p-4 border-2 border-on-surface bg-surface-container/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-secondary block mb-1">
                    Lowest Found
                  </span>
                  <span className="text-2xl font-black block">
                    KSh {researchData.lowestPrice.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-secondary">
                    Market minimum
                  </span>
                </div>

                {/* Average Market Price */}
                <div className="p-4 border-2 border-on-surface bg-surface-container/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-secondary block mb-1">
                    Market Average
                  </span>
                  <span className="text-2xl font-black block">
                    KSh {researchData.averagePrice.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-secondary">
                    Based on {researchData.sampleCount} listings
                  </span>
                </div>

                {/* AI Recommended Price */}
                <div className="p-4 border-2 border-primary bg-primary/10 shadow-[3px_3px_0px_0px_var(--color-primary)]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary block mb-1">
                    Recommended Selling Price
                  </span>
                  <span className="text-2xl font-black text-primary block">
                    KSh {researchData.recommendedPrice.toLocaleString()}
                  </span>
                  {researchData.estimatedMarginPercent !== undefined && (
                    <span className="text-[11px] font-bold text-green-700 block">
                      +{researchData.estimatedMarginPercent}% estimated profit margin
                    </span>
                  )}
                </div>
              </div>

              {/* Action Apply Button */}
              <div className="p-4 border-2 border-on-surface bg-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="font-black uppercase text-sm block">
                    Target Lowest Competitor Price
                  </span>
                  <p className="text-xs text-secondary">
                    Sets Regular Price to <strong>KSh {researchData.recommendedPrice.toLocaleString()}</strong>
                    {researchData.recommendedCompareAtPrice ? ` with Strikethrough Market Price of KSh ${researchData.recommendedCompareAtPrice.toLocaleString()}` : ""}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onApplyPrice(researchData.recommendedPrice, researchData.recommendedCompareAtPrice);
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-primary text-on-primary font-black uppercase text-xs border-2 border-on-surface hover:translate-y-[1px] hover:translate-x-[1px] shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all shrink-0 w-full sm:w-auto"
                >
                  Apply Recommended Price
                </button>
              </div>

              {/* Competitor Listings Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-black uppercase tracking-wider block text-secondary">
                  Active Competitor Breakdown ({researchData.competitors.length} Found)
                </span>
                
                {researchData.competitors.length === 0 ? (
                  <p className="text-xs text-secondary italic">
                    No direct price tags found in search snippets. Estimated prices calculated from category baselines.
                  </p>
                ) : (
                  <div className="divide-y-2 divide-surface-dim border-2 border-on-surface bg-surface">
                    {researchData.competitors.map((comp, idx) => (
                      <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-surface-container/20 transition-colors">
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold uppercase text-[10px] px-1.5 py-0.5 border border-on-surface bg-surface-container">
                              {comp.source}
                            </span>
                            <span className="text-secondary text-[11px] truncate">
                              {comp.domain}
                            </span>
                          </div>
                          <a
                            href={comp.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-on-surface hover:underline truncate block"
                          >
                            {comp.title}
                          </a>
                          {comp.snippet && (
                            <p className="text-[11px] text-secondary line-clamp-1">
                              {comp.snippet}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
                          <span className="font-black text-sm text-on-surface">
                            KSh {comp.price.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onApplyPrice(comp.price);
                              onClose();
                            }}
                            className="px-2.5 py-1 border border-on-surface font-bold uppercase text-[10px] hover:bg-primary hover:text-on-primary transition-colors"
                          >
                            Use Price
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-secondary text-xs">
              Enter a product name or click Scan Market to research live Kenyan prices.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
