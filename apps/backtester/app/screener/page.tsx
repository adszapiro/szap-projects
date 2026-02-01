"use client";

import { useState, useEffect } from "react";
import { Search, Filter, TrendingUp, TrendingDown, Plus, ArrowUpDown, Loader2 } from "lucide-react";
import Link from "next/link";

interface ScreenerResult {
  symbol: string;
  name: string;
  type: "stock" | "crypto";
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  rsi?: number;
  sma20?: number;
  sma50?: number;
}

interface Filters {
  assetType: "all" | "stock" | "crypto";
  priceMin: string;
  priceMax: string;
  changeMin: string;
  changeMax: string;
  rsiMin: string;
  rsiMax: string;
  volumeMin: string;
  aboveSma20: boolean;
  aboveSma50: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
}

const defaultFilters: Filters = {
  assetType: "all",
  priceMin: "",
  priceMax: "",
  changeMin: "",
  changeMax: "",
  rsiMin: "",
  rsiMax: "",
  volumeMin: "",
  aboveSma20: false,
  aboveSma50: false,
  sortBy: "changePercent",
  sortDir: "desc",
};

export default function ScreenerPage() {
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    loadScreenerData();
  }, []);

  const loadScreenerData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/screener");
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Failed to load screener data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredResults = results.filter((item) => {
    if (filters.assetType !== "all" && item.type !== filters.assetType) return false;
    if (filters.priceMin && item.price < parseFloat(filters.priceMin)) return false;
    if (filters.priceMax && item.price > parseFloat(filters.priceMax)) return false;
    if (filters.changeMin && item.changePercent < parseFloat(filters.changeMin)) return false;
    if (filters.changeMax && item.changePercent > parseFloat(filters.changeMax)) return false;
    if (filters.rsiMin && item.rsi && item.rsi < parseFloat(filters.rsiMin)) return false;
    if (filters.rsiMax && item.rsi && item.rsi > parseFloat(filters.rsiMax)) return false;
    if (filters.volumeMin && item.volume < parseFloat(filters.volumeMin)) return false;
    if (filters.aboveSma20 && item.sma20 && item.price < item.sma20) return false;
    if (filters.aboveSma50 && item.sma50 && item.price < item.sma50) return false;
    return true;
  });

  // Sort results
  const sortedResults = [...filteredResults].sort((a, b) => {
    const aVal = a[filters.sortBy as keyof ScreenerResult] ?? 0;
    const bVal = b[filters.sortBy as keyof ScreenerResult] ?? 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return filters.sortDir === "desc" ? bVal - aVal : aVal - bVal;
    }
    return 0;
  });

  const handleSort = (column: string) => {
    if (filters.sortBy === column) {
      setFilters({ ...filters, sortDir: filters.sortDir === "desc" ? "asc" : "desc" });
    } else {
      setFilters({ ...filters, sortBy: column, sortDir: "desc" });
    }
  };

  const presetFilters = {
    topGainers: { ...defaultFilters, changeMin: "5", sortBy: "changePercent", sortDir: "desc" as const },
    topLosers: { ...defaultFilters, changeMax: "-5", sortBy: "changePercent", sortDir: "asc" as const },
    oversold: { ...defaultFilters, rsiMax: "30", sortBy: "rsi", sortDir: "asc" as const },
    overbought: { ...defaultFilters, rsiMin: "70", sortBy: "rsi", sortDir: "desc" as const },
    highVolume: { ...defaultFilters, volumeMin: "1000000000", sortBy: "volume", sortDir: "desc" as const },
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">AlgoBacktest</span>
          </Link>
          <div className="h-6 w-px bg-[var(--border-color)]" />
          <h1 className="text-sm font-medium text-white">Market Screener</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="btn btn-secondary text-xs">
            Back to Backtester
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Filter Sidebar */}
        {showFilters && (
          <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] p-4 min-h-[calc(100vh-56px)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h2>
              <button
                onClick={() => setFilters(defaultFilters)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Reset
              </button>
            </div>

            {/* Preset Filters */}
            <div className="mb-6">
              <div className="text-xs text-[var(--text-muted)] mb-2">Quick Filters</div>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilters(presetFilters.topGainers)}
                  className="px-2 py-1 text-[10px] bg-green-500/10 text-green-400 rounded hover:bg-green-500/20"
                >
                  Top Gainers
                </button>
                <button
                  onClick={() => setFilters(presetFilters.topLosers)}
                  className="px-2 py-1 text-[10px] bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"
                >
                  Top Losers
                </button>
                <button
                  onClick={() => setFilters(presetFilters.oversold)}
                  className="px-2 py-1 text-[10px] bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20"
                >
                  Oversold
                </button>
                <button
                  onClick={() => setFilters(presetFilters.overbought)}
                  className="px-2 py-1 text-[10px] bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20"
                >
                  Overbought
                </button>
              </div>
            </div>

            {/* Asset Type */}
            <div className="mb-4">
              <label className="text-xs text-[var(--text-muted)] block mb-1">Asset Type</label>
              <select
                value={filters.assetType}
                onChange={(e) => setFilters({ ...filters, assetType: e.target.value as Filters["assetType"] })}
                className="w-full text-xs"
              >
                <option value="all">All</option>
                <option value="stock">Stocks</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="mb-4">
              <label className="text-xs text-[var(--text-muted)] block mb-1">Price Range ($)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin}
                  onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                  className="w-1/2 text-xs"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax}
                  onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                  className="w-1/2 text-xs"
                />
              </div>
            </div>

            {/* Change % Range */}
            <div className="mb-4">
              <label className="text-xs text-[var(--text-muted)] block mb-1">Change % Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.changeMin}
                  onChange={(e) => setFilters({ ...filters, changeMin: e.target.value })}
                  className="w-1/2 text-xs"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.changeMax}
                  onChange={(e) => setFilters({ ...filters, changeMax: e.target.value })}
                  className="w-1/2 text-xs"
                />
              </div>
            </div>

            {/* RSI Range */}
            <div className="mb-4">
              <label className="text-xs text-[var(--text-muted)] block mb-1">RSI Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.rsiMin}
                  onChange={(e) => setFilters({ ...filters, rsiMin: e.target.value })}
                  className="w-1/2 text-xs"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.rsiMax}
                  onChange={(e) => setFilters({ ...filters, rsiMax: e.target.value })}
                  className="w-1/2 text-xs"
                />
              </div>
            </div>

            {/* Technical Filters */}
            <div className="mb-4">
              <label className="text-xs text-[var(--text-muted)] block mb-2">Technical</label>
              <label className="flex items-center gap-2 text-xs text-white mb-2">
                <input
                  type="checkbox"
                  checked={filters.aboveSma20}
                  onChange={(e) => setFilters({ ...filters, aboveSma20: e.target.checked })}
                  className="rounded"
                />
                Above SMA 20
              </label>
              <label className="flex items-center gap-2 text-xs text-white">
                <input
                  type="checkbox"
                  checked={filters.aboveSma50}
                  onChange={(e) => setFilters({ ...filters, aboveSma50: e.target.checked })}
                  className="rounded"
                />
                Above SMA 50
              </label>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn btn-secondary text-xs ${showFilters ? "bg-blue-500/20 border-blue-500/30" : ""}`}
              >
                <Filter className="w-3 h-3" />
                Filters
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                {sortedResults.length} results
              </span>
            </div>
            <button onClick={loadScreenerData} className="btn btn-secondary text-xs">
              Refresh
            </button>
          </div>

          {/* Results Table */}
          <div className="panel overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">
                      Symbol
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] cursor-pointer hover:text-white"
                      onClick={() => handleSort("price")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Price
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] cursor-pointer hover:text-white"
                      onClick={() => handleSort("changePercent")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Change %
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] cursor-pointer hover:text-white"
                      onClick={() => handleSort("volume")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Volume
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] cursor-pointer hover:text-white"
                      onClick={() => handleSort("rsi")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        RSI
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((item) => (
                    <tr
                      key={item.symbol}
                      className="border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                              item.type === "crypto"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {item.symbol.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {item.symbol.toUpperCase()}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">{item.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-white">
                        ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`flex items-center justify-end gap-1 text-sm font-medium ${
                            item.changePercent >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {item.changePercent >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {item.changePercent >= 0 ? "+" : ""}
                          {item.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--text-secondary)]">
                        {formatVolume(item.volume)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.rsi && (
                          <span
                            className={`text-sm font-medium ${
                              item.rsi < 30
                                ? "text-green-400"
                                : item.rsi > 70
                                ? "text-red-400"
                                : "text-[var(--text-secondary)]"
                            }`}
                          >
                            {item.rsi.toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/?symbol=${item.symbol}&type=${item.type}`}
                          className="btn btn-secondary text-xs py-1 px-2"
                        >
                          <Plus className="w-3 h-3" />
                          Backtest
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function formatVolume(volume: number): string {
  if (volume >= 1e12) return (volume / 1e12).toFixed(1) + "T";
  if (volume >= 1e9) return (volume / 1e9).toFixed(1) + "B";
  if (volume >= 1e6) return (volume / 1e6).toFixed(1) + "M";
  if (volume >= 1e3) return (volume / 1e3).toFixed(1) + "K";
  return volume.toString();
}
