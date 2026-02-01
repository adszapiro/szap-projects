"use client";

import { useState } from "react";
import { Search, Plus, X, TrendingUp, Bitcoin } from "lucide-react";
import { Asset } from "@/app/page";
import { popularStocks, popularCrypto } from "@/lib/data";

interface SidebarProps {
  watchlist: Asset[];
  selectedAsset: Asset;
  onSelectAsset: (asset: Asset) => void;
  onAddAsset: (asset: Asset) => void;
  onRemoveAsset: (symbol: string) => void;
}

export default function Sidebar({
  watchlist,
  selectedAsset,
  onSelectAsset,
  onAddAsset,
  onRemoveAsset,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const allAssets: Asset[] = [
    ...popularStocks.map(s => ({ ...s, type: "stock" as const })),
    ...popularCrypto.map(c => ({ ...c, type: "crypto" as const })),
  ];

  const filteredAssets = allAssets.filter(
    a =>
      !watchlist.find(w => w.symbol === a.symbol) &&
      (a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <aside className="w-56 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            Watchlist
          </span>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
          >
            <Plus className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Search Results */}
      {showSearch && searchQuery && (
        <div className="border-b border-[var(--border-color)] max-h-48 overflow-y-auto">
          {filteredAssets.slice(0, 5).map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => {
                onAddAsset(asset);
                setSearchQuery("");
                setShowSearch(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors text-left"
            >
              <div className="w-6 h-6 rounded bg-[var(--bg-tertiary)] flex items-center justify-center">
                {asset.type === "crypto" ? (
                  <Bitcoin className="w-3 h-3 text-yellow-500" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-white">{asset.symbol.toUpperCase()}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{asset.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Watchlist */}
      <div className="flex-1 overflow-y-auto py-2">
        {watchlist.map((asset) => (
          <div
            key={asset.symbol}
            className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
              selectedAsset.symbol === asset.symbol
                ? "bg-[var(--bg-tertiary)] border-l-2 border-blue-500"
                : "hover:bg-[var(--bg-hover)] border-l-2 border-transparent"
            }`}
            onClick={() => onSelectAsset(asset)}
          >
            <div className="w-7 h-7 rounded bg-[var(--bg-primary)] flex items-center justify-center">
              {asset.type === "crypto" ? (
                <Bitcoin className="w-4 h-4 text-yellow-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {asset.symbol.toUpperCase()}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">{asset.name}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveAsset(asset.symbol);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--bg-primary)] rounded transition-all"
            >
              <X className="w-3 h-3 text-[var(--text-muted)]" />
            </button>
          </div>
        ))}
      </div>

      {/* Quick Add Buttons */}
      <div className="p-3 border-t border-[var(--border-color)]">
        <div className="text-[10px] text-[var(--text-muted)] mb-2">Quick Add</div>
        <div className="flex flex-wrap gap-1">
          {["AAPL", "MSFT", "ETH"].map((sym) => {
            const asset = allAssets.find(a => a.symbol.toLowerCase() === sym.toLowerCase() || a.symbol === sym);
            if (!asset || watchlist.find(w => w.symbol === asset.symbol)) return null;
            return (
              <button
                key={sym}
                onClick={() => onAddAsset(asset)}
                className="px-2 py-1 text-[10px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded text-[var(--text-secondary)] transition-colors"
              >
                +{sym}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
