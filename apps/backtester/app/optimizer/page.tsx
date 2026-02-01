"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TrendingUp, Loader2, Plus, X, Play, PieChart } from "lucide-react";
import Link from "next/link";
import { fetchMarketData, popularStocks, popularCrypto } from "@/lib/data";
import { optimizePortfolio, equalWeightPortfolio, riskParityPortfolio, OptimizationResult, EfficientFrontierPoint } from "@/lib/optimizer";
import { OHLCV } from "@/lib/types";

interface AssetData {
  symbol: string;
  name: string;
  type: "stock" | "crypto";
  prices: number[];
}

export default function OptimizerPage() {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [addingAsset, setAddingAsset] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Results
  const [maxSharpe, setMaxSharpe] = useState<OptimizationResult | null>(null);
  const [minVolResult, setMinVolResult] = useState<OptimizationResult | null>(null);
  const [equalWeight, setEqualWeight] = useState<OptimizationResult | null>(null);
  const [riskParity, setRiskParity] = useState<OptimizationResult | null>(null);
  const [frontier, setFrontier] = useState<EfficientFrontierPoint[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadDefaultAssets();
  }, []);

  const loadDefaultAssets = async () => {
    const defaults = [
      { symbol: "SPY", name: "S&P 500 ETF", type: "stock" as const },
      { symbol: "QQQ", name: "Nasdaq 100 ETF", type: "stock" as const },
      { symbol: "GLD", name: "Gold ETF", type: "stock" as const },
      { symbol: "bitcoin", name: "Bitcoin", type: "crypto" as const },
    ];
    
    await loadAssets(defaults);
  };

  const loadAssets = async (assetsToLoad: { symbol: string; name: string; type: "stock" | "crypto" }[]) => {
    setLoading(true);
    
    try {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const loadedAssets: AssetData[] = [];

      for (const asset of assetsToLoad) {
        try {
          const data = await fetchMarketData(asset.symbol, asset.type, startDate, endDate);
          if (data.length > 0) {
            loadedAssets.push({
              ...asset,
              prices: data.map(d => d.close),
            });
          }
        } catch (error) {
          console.error(`Failed to load ${asset.symbol}:`, error);
        }
      }

      setAssets(loadedAssets);
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
    
    const existingAssets = assets.map(a => ({ symbol: a.symbol, name: a.name, type: a.type }));
    await loadAssets([...existingAssets, { symbol, name, type }]);
  };

  const removeAsset = (symbol: string) => {
    setAssets(assets.filter(a => a.symbol !== symbol));
    // Clear results
    setMaxSharpe(null);
    setMinVolResult(null);
    setEqualWeight(null);
    setRiskParity(null);
    setFrontier([]);
  };

  const runOptimization = async () => {
    if (assets.length < 2) return;
    
    setOptimizing(true);
    
    // Small delay to let UI update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const assetData = assets.map(a => ({ symbol: a.symbol, prices: a.prices }));
      
      // Run optimizations
      const result = optimizePortfolio(assetData, 5000);
      setMaxSharpe(result.maxSharpe);
      setMinVolResult(result.minVolatility);
      setFrontier(result.efficientFrontier);
      
      setEqualWeight(equalWeightPortfolio(assetData));
      setRiskParity(riskParityPortfolio(assetData));
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      setOptimizing(false);
    }
  };

  // Draw efficient frontier
  const drawFrontier = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || frontier.length === 0) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;
    
    // Clear
    ctx.fillStyle = "#111113";
    ctx.fillRect(0, 0, width, height);
    
    // Find ranges
    const minVol = Math.min(...frontier.map(p => p.volatility));
    const maxVol = Math.max(...frontier.map(p => p.volatility));
    const minRet = Math.min(...frontier.map(p => p.return));
    const maxRet = Math.max(...frontier.map(p => p.return));
    
    const volRange = maxVol - minVol || 1;
    const retRange = maxRet - minRet || 1;
    
    // Scale functions
    const scaleX = (vol: number) => padding + ((vol - minVol) / volRange) * (width - padding * 2);
    const scaleY = (ret: number) => height - padding - ((ret - minRet) / retRange) * (height - padding * 2);
    
    // Draw grid
    ctx.strokeStyle = "#27272a";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * (width - padding * 2);
      const y = padding + (i / 5) * (height - padding * 2);
      
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw frontier points
    ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
    frontier.forEach(point => {
      ctx.beginPath();
      ctx.arc(scaleX(point.volatility), scaleY(point.return), 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw frontier line
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    frontier.forEach((point, i) => {
      const x = scaleX(point.volatility);
      const y = scaleY(point.return);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Mark special portfolios
    if (maxSharpe) {
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(scaleX(maxSharpe.volatility), scaleY(maxSharpe.expectedReturn), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.fillText("Max Sharpe", scaleX(maxSharpe.volatility) + 12, scaleY(maxSharpe.expectedReturn) + 4);
    }
    
    if (minVolResult) {
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(scaleX(minVolResult.volatility), scaleY(minVolResult.expectedReturn), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.fillText("Min Vol", scaleX(minVolResult.volatility) + 12, scaleY(minVolResult.expectedReturn) + 4);
    }
    
    // Axis labels
    ctx.fillStyle = "#71717a";
    ctx.font = "11px sans-serif";
    ctx.fillText("Volatility (%)", width / 2 - 30, height - 10);
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Return (%)", 0, 0);
    ctx.restore();
  }, [frontier, maxSharpe, minVolResult]);

  useEffect(() => {
    drawFrontier();
  }, [drawFrontier]);

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
          <h1 className="text-sm font-medium text-white">Portfolio Optimizer</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runOptimization}
            disabled={optimizing || assets.length < 2}
            className="btn btn-primary text-xs"
          >
            {optimizing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Optimize Portfolio
          </button>
          <Link href="/" className="btn btn-secondary text-xs">
            Back to Backtester
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Asset Sidebar */}
        <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] min-h-[calc(100vh-56px)]">
          <div className="p-3 border-b border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Assets ({assets.length})
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : (
              assets.map((asset) => (
                <div
                  key={asset.symbol}
                  className="group flex items-center justify-between p-2 rounded hover:bg-[var(--bg-hover)]"
                >
                  <div>
                    <div className="text-sm font-medium text-white">
                      {asset.symbol.toUpperCase()}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">{asset.name}</div>
                  </div>
                  <button
                    onClick={() => removeAsset(asset.symbol)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--bg-primary)] rounded"
                  >
                    <X className="w-3 h-3 text-[var(--text-muted)]" />
                  </button>
                </div>
              ))
            )}
          </div>

          {assets.length < 2 && (
            <div className="px-3 py-2 text-[10px] text-[var(--text-muted)]">
              Add at least 2 assets to optimize
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {!maxSharpe ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <PieChart className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-white mb-2">Portfolio Optimizer</h2>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Find the optimal asset allocation using Modern Portfolio Theory
                </p>
                <button
                  onClick={runOptimization}
                  disabled={optimizing || assets.length < 2}
                  className="btn btn-primary"
                >
                  {optimizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Run Optimization
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Efficient Frontier Chart */}
              <div className="panel p-4">
                <h3 className="text-sm font-semibold text-white mb-4">Efficient Frontier</h3>
                <canvas ref={canvasRef} width={800} height={400} className="w-full" />
              </div>

              {/* Portfolio Comparison */}
              <div className="grid grid-cols-4 gap-4">
                {/* Max Sharpe */}
                <PortfolioCard
                  title="Max Sharpe Ratio"
                  subtitle="Optimal risk-adjusted return"
                  result={maxSharpe}
                  color="green"
                />
                
                {/* Min Volatility */}
                {minVolResult && (
                  <PortfolioCard
                    title="Minimum Volatility"
                    subtitle="Lowest risk portfolio"
                    result={minVolResult}
                    color="yellow"
                  />
                )}
                
                {/* Equal Weight */}
                {equalWeight && (
                  <PortfolioCard
                    title="Equal Weight"
                    subtitle="Simple diversification"
                    result={equalWeight}
                    color="blue"
                  />
                )}
                
                {/* Risk Parity */}
                {riskParity && (
                  <PortfolioCard
                    title="Risk Parity"
                    subtitle="Equal risk contribution"
                    result={riskParity}
                    color="purple"
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PortfolioCard({
  title,
  subtitle,
  result,
  color,
}: {
  title: string;
  subtitle: string;
  result: OptimizationResult;
  color: "green" | "yellow" | "blue" | "purple";
}) {
  const colorClasses = {
    green: "border-green-500/30 bg-green-500/5",
    yellow: "border-yellow-500/30 bg-yellow-500/5",
    blue: "border-blue-500/30 bg-blue-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
  };

  return (
    <div className={`panel p-4 border ${colorClasses[color]}`}>
      <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
      <p className="text-[10px] text-[var(--text-muted)] mb-3">{subtitle}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-muted)]">Expected Return</span>
          <span className={result.expectedReturn >= 0 ? "text-green-400" : "text-red-400"}>
            {result.expectedReturn >= 0 ? "+" : ""}{result.expectedReturn.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-muted)]">Volatility</span>
          <span className="text-white">{result.volatility.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-muted)]">Sharpe Ratio</span>
          <span className={result.sharpeRatio > 0 ? "text-green-400" : "text-red-400"}>
            {result.sharpeRatio.toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="border-t border-[var(--border-color)] pt-3">
        <div className="text-[10px] text-[var(--text-muted)] mb-2">Allocation</div>
        <div className="space-y-1">
          {result.weights
            .sort((a, b) => b.weight - a.weight)
            .map((w) => (
              <div key={w.symbol} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="h-1.5 bg-[var(--bg-tertiary)] rounded overflow-hidden">
                    <div
                      className={`h-full bg-${color}-500`}
                      style={{ width: `${w.weight * 100}%`, backgroundColor: `var(--accent-${color === "yellow" ? "yellow" : color})` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-white w-10">{w.symbol.toUpperCase().slice(0, 4)}</span>
                <span className="text-[10px] text-[var(--text-muted)] w-12 text-right">
                  {(w.weight * 100).toFixed(1)}%
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
