"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";

interface HeatmapItem {
  symbol: string;
  name: string;
  sector?: string;
  price: number;
  changePercent: number;
  marketCap: number;
  volume: number;
}

interface SectorData {
  name: string;
  items: HeatmapItem[];
  totalMarketCap: number;
  avgChange: number;
}

export default function HeatmapPage() {
  const [data, setData] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"sector" | "flat">("sector");
  const [metric, setMetric] = useState<"marketCap" | "volume">("marketCap");
  const [timeframe, setTimeframe] = useState<"1d" | "1w" | "1m">("1d");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/screener");
      const screenerData = await response.json();
      
      // Add mock sector data for stocks
      const withSectors = screenerData.map((item: HeatmapItem & { type: string }) => ({
        ...item,
        sector: item.type === "crypto" ? "Crypto" : getSector(item.symbol),
        marketCap: item.marketCap || Math.random() * 1000000000000,
      }));
      
      setData(withSectors);
    } catch (error) {
      console.error("Failed to load heatmap data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group by sector
  const sectorData: SectorData[] = [];
  const sectorMap = new Map<string, HeatmapItem[]>();
  
  data.forEach((item) => {
    const sector = item.sector || "Other";
    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, []);
    }
    sectorMap.get(sector)!.push(item);
  });

  sectorMap.forEach((items, name) => {
    const totalMarketCap = items.reduce((sum, i) => sum + (i.marketCap || 0), 0);
    const avgChange = items.reduce((sum, i) => sum + i.changePercent, 0) / items.length;
    sectorData.push({ name, items, totalMarketCap, avgChange });
  });

  // Sort sectors by market cap
  sectorData.sort((a, b) => b.totalMarketCap - a.totalMarketCap);

  const getColor = (changePercent: number): string => {
    if (changePercent >= 5) return "bg-green-500";
    if (changePercent >= 3) return "bg-green-600";
    if (changePercent >= 1) return "bg-green-700";
    if (changePercent >= 0) return "bg-green-900";
    if (changePercent >= -1) return "bg-red-900";
    if (changePercent >= -3) return "bg-red-700";
    if (changePercent >= -5) return "bg-red-600";
    return "bg-red-500";
  };

  const getTextColor = (changePercent: number): string => {
    if (Math.abs(changePercent) >= 3) return "text-white";
    return "text-gray-300";
  };

  // Calculate sizes based on market cap
  const maxMarketCap = Math.max(...data.map((d) => d.marketCap || 0));
  const getSize = (marketCap: number): number => {
    const minSize = 60;
    const maxSize = 200;
    const ratio = (marketCap || 0) / maxMarketCap;
    return minSize + ratio * (maxSize - minSize);
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
          <h1 className="text-sm font-medium text-white">Market Heatmap</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Timeframe */}
          <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1">
            {(["1d", "1w", "1m"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs rounded ${
                  timeframe === tf
                    ? "bg-blue-500 text-white"
                    : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1">
            <button
              onClick={() => setView("sector")}
              className={`px-3 py-1 text-xs rounded ${
                view === "sector"
                  ? "bg-blue-500 text-white"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              By Sector
            </button>
            <button
              onClick={() => setView("flat")}
              className={`px-3 py-1 text-xs rounded ${
                view === "flat"
                  ? "bg-blue-500 text-white"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              All
            </button>
          </div>

          <button onClick={loadData} className="btn btn-secondary text-xs">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>

          <Link href="/" className="btn btn-secondary text-xs">
            Back to Backtester
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        ) : view === "sector" ? (
          /* Sector View */
          <div className="space-y-4">
            {sectorData.map((sector) => (
              <div key={sector.name} className="panel p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white">{sector.name}</h2>
                  <span
                    className={`text-xs font-medium ${
                      sector.avgChange >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {sector.avgChange >= 0 ? "+" : ""}
                    {sector.avgChange.toFixed(2)}% avg
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sector.items
                    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
                    .map((item) => {
                      const size = getSize(item.marketCap);
                      return (
                        <Link
                          key={item.symbol}
                          href={`/?symbol=${item.symbol}&type=${item.sector === "Crypto" ? "crypto" : "stock"}`}
                          className={`${getColor(item.changePercent)} rounded-lg p-2 hover:opacity-80 transition-opacity cursor-pointer flex flex-col justify-between`}
                          style={{
                            width: size,
                            height: size * 0.6,
                            minWidth: 60,
                            minHeight: 40,
                          }}
                        >
                          <div
                            className={`text-xs font-bold ${getTextColor(item.changePercent)} truncate`}
                          >
                            {item.symbol.toUpperCase()}
                          </div>
                          <div
                            className={`text-[10px] font-medium ${getTextColor(item.changePercent)}`}
                          >
                            {item.changePercent >= 0 ? "+" : ""}
                            {item.changePercent.toFixed(2)}%
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat View */
          <div className="panel p-4">
            <div className="flex flex-wrap gap-2">
              {data
                .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
                .map((item) => {
                  const size = getSize(item.marketCap);
                  return (
                    <Link
                      key={item.symbol}
                      href={`/?symbol=${item.symbol}&type=${item.sector === "Crypto" ? "crypto" : "stock"}`}
                      className={`${getColor(item.changePercent)} rounded-lg p-2 hover:opacity-80 transition-opacity cursor-pointer flex flex-col justify-between`}
                      style={{
                        width: size,
                        height: size * 0.6,
                        minWidth: 70,
                        minHeight: 45,
                      }}
                    >
                      <div>
                        <div
                          className={`text-xs font-bold ${getTextColor(item.changePercent)} truncate`}
                        >
                          {item.symbol.toUpperCase()}
                        </div>
                        <div
                          className={`text-[9px] ${getTextColor(item.changePercent)} opacity-70 truncate`}
                        >
                          {item.name}
                        </div>
                      </div>
                      <div
                        className={`text-[10px] font-medium ${getTextColor(item.changePercent)}`}
                      >
                        {item.changePercent >= 0 ? "+" : ""}
                        {item.changePercent.toFixed(2)}%
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-xs text-[var(--text-muted)]">-5%+</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-700" />
            <span className="text-xs text-[var(--text-muted)]">-3%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-900" />
            <span className="text-xs text-[var(--text-muted)]">-1%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-900" />
            <span className="text-xs text-[var(--text-muted)]">+1%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-700" />
            <span className="text-xs text-[var(--text-muted)]">+3%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-xs text-[var(--text-muted)]">+5%+</span>
          </div>
        </div>
      </main>
    </div>
  );
}

// Mock sector assignment
function getSector(symbol: string): string {
  const sectors: Record<string, string> = {
    AAPL: "Technology",
    MSFT: "Technology",
    GOOGL: "Technology",
    META: "Technology",
    NVDA: "Technology",
    AMD: "Technology",
    INTC: "Technology",
    CRM: "Technology",
    ORCL: "Technology",
    NFLX: "Communication",
    DIS: "Communication",
    AMZN: "Consumer",
    TSLA: "Consumer",
    WMT: "Consumer",
    HD: "Consumer",
    JPM: "Financial",
    V: "Financial",
    MA: "Financial",
    JNJ: "Healthcare",
    PG: "Consumer",
    SPY: "ETF",
    QQQ: "ETF",
    IWM: "ETF",
    GLD: "ETF",
    XLF: "ETF",
  };
  return sectors[symbol] || "Other";
}
