"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Loader2, RefreshCw, Plus, X } from "lucide-react";
import Link from "next/link";
import { fetchMarketData, popularStocks, popularCrypto } from "@/lib/data";
import { calculateRiskMetrics, buildCorrelationMatrix, RiskMetrics, CorrelationResult } from "@/lib/risk";
import { OHLCV } from "@/lib/types";
import RiskDashboard from "@/components/Risk/RiskDashboard";
import CorrelationMatrix from "@/components/Risk/CorrelationMatrix";

interface AssetData {
  symbol: string;
  name: string;
  type: "stock" | "crypto";
  data: OHLCV[];
  metrics: RiskMetrics;
}

export default function RiskPage() {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [addingAsset, setAddingAsset] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Default assets to analyze
  useEffect(() => {
    loadDefaultAssets();
  }, []);

  const loadDefaultAssets = async () => {
    const defaults = [
      { symbol: "SPY", name: "S&P 500 ETF", type: "stock" as const },
      { symbol: "QQQ", name: "Nasdaq 100 ETF", type: "stock" as const },
      { symbol: "bitcoin", name: "Bitcoin", type: "crypto" as const },
    ];
    
    await loadAssets(defaults);
  };

  const loadAssets = async (assetsToLoad: { symbol: string; name: string; type: "stock" | "crypto" }[]) => {
    setLoading(true);
    
    try {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Fetch benchmark data (SPY) for beta calculation
      let benchmarkData: OHLCV[] = [];
      try {
        benchmarkData = await fetchMarketData("SPY", "stock", startDate, endDate);
      } catch {
        // Continue without benchmark
      }

      const loadedAssets: AssetData[] = [];

      for (const asset of assetsToLoad) {
        try {
          const data = await fetchMarketData(asset.symbol, asset.type, startDate, endDate);
          if (data.length > 0) {
            const metrics = calculateRiskMetrics(data, benchmarkData);
            loadedAssets.push({
              ...asset,
              data,
              metrics,
            });
          }
        } catch (error) {
          console.error(`Failed to load ${asset.symbol}:`, error);
        }
      }

      setAssets(loadedAssets);
      
      if (loadedAssets.length > 0) {
        setSelectedAsset(loadedAssets[0].symbol);
      }

      // Build correlation matrix
      if (loadedAssets.length > 1) {
        const correlationData = buildCorrelationMatrix(
          loadedAssets.map(a => ({ symbol: a.symbol, prices: a.data.map(d => d.close) }))
        );
        setCorrelations(correlationData);
      }
    } catch (error) {
      console.error("Failed to load assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const addAsset = async (symbol: string, name: string, type: "stock" | "crypto") => {
    if (assets.find(a => a.symbol === symbol)) return;
    
    setAddingAsset(false);
    setSearchQuery("");
    
    await loadAssets([...assets.map(a => ({ symbol: a.symbol, name: a.name, type: a.type })), { symbol, name, type }]);
  };

  const removeAsset = (symbol: string) => {
    const newAssets = assets.filter(a => a.symbol !== symbol);
    setAssets(newAssets);
    
    if (selectedAsset === symbol && newAssets.length > 0) {
      setSelectedAsset(newAssets[0].symbol);
    }

    // Rebuild correlations
    if (newAssets.length > 1) {
      const correlationData = buildCorrelationMatrix(
        newAssets.map(a => ({ symbol: a.symbol, prices: a.data.map(d => d.close) }))
      );
      setCorrelations(correlationData);
    } else {
      setCorrelations([]);
    }
  };

  const allAssets = [
    ...popularStocks.map(s => ({ ...s, type: "stock" as const })),
    ...popularCrypto.map(c => ({ ...c, type: "crypto" as const })),
  ];

  const filteredAssets = allAssets.filter(
    a => 
      !assets.find(existing => existing.symbol === a.symbol) &&
      (a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
       a.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedAssetData = assets.find(a => a.symbol === selectedAsset);

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
          <h1 className="text-sm font-medium text-white">Risk Analytics</h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => loadAssets(assets)} className="btn btn-secondary text-xs" disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link href="/" className="btn btn-secondary text-xs">
            Back to Backtester
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Asset Sidebar */}
        <aside className="w-56 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] min-h-[calc(100vh-56px)]">
          <div className="p-3 border-b border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Portfolio
              </span>
              <button
                onClick={() => setAddingAsset(!addingAsset)}
                className="p-1 hover:bg-[var(--bg-hover)] rounded"
              >
                <Plus className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {addingAsset && (
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs mb-2"
                  autoFocus
                />
                <div className="max-h-32 overflow-y-auto">
                  {filteredAssets.slice(0, 5).map((asset) => (
                    <button
                      key={asset.symbol}
                      onClick={() => addAsset(asset.symbol, asset.name, asset.type)}
                      className="w-full text-left px-2 py-1.5 text-xs hover:bg-[var(--bg-hover)] rounded"
                    >
                      <span className="text-white">{asset.symbol.toUpperCase()}</span>
                      <span className="text-[var(--text-muted)] ml-2">{asset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-2">
            {loading && assets.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : (
              assets.map((asset) => (
                <div
                  key={asset.symbol}
                  className={`group flex items-center justify-between p-2 rounded cursor-pointer ${
                    selectedAsset === asset.symbol
                      ? "bg-[var(--bg-tertiary)] border-l-2 border-blue-500"
                      : "hover:bg-[var(--bg-hover)] border-l-2 border-transparent"
                  }`}
                  onClick={() => setSelectedAsset(asset.symbol)}
                >
                  <div>
                    <div className="text-sm font-medium text-white">
                      {asset.symbol.toUpperCase()}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Vol: {asset.metrics.volatility.toFixed(1)}%
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAsset(asset.symbol);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--bg-primary)] rounded"
                  >
                    <X className="w-3 h-3 text-[var(--text-muted)]" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          ) : selectedAssetData ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Risk Dashboard for Selected Asset */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  {selectedAssetData.symbol.toUpperCase()} Risk Analysis
                </h2>
                <RiskDashboard metrics={selectedAssetData.metrics} />
              </div>

              {/* Correlation Matrix */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  Portfolio Correlations
                </h2>
                {correlations.length > 0 ? (
                  <CorrelationMatrix
                    correlations={correlations}
                    symbols={assets.map(a => a.symbol)}
                  />
                ) : (
                  <div className="panel p-8 text-center">
                    <p className="text-[var(--text-muted)]">
                      Add more assets to see correlations
                    </p>
                  </div>
                )}

                {/* Portfolio Summary */}
                <div className="panel p-4 mt-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Portfolio Summary</h3>
                  <div className="space-y-2">
                    {assets.map((asset) => (
                      <div key={asset.symbol} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">{asset.symbol.toUpperCase()}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-[var(--text-muted)]">
                            β {asset.metrics.beta.toFixed(2)}
                          </span>
                          <span className={asset.metrics.sharpeRatio > 0 ? "text-green-400" : "text-red-400"}>
                            SR {asset.metrics.sharpeRatio.toFixed(2)}
                          </span>
                          <span className="text-red-400">
                            DD -{asset.metrics.maxDrawdown.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-40">
              <p className="text-[var(--text-muted)]">Select an asset to view risk metrics</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
