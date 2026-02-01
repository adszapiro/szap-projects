"use client";

import { useState, useCallback, useEffect } from "react";
import { BacktestResult, OHLCV } from "@/lib/types";
import { fetchMarketData, popularStocks, popularCrypto } from "@/lib/data";
import { executeStrategy } from "@/lib/engine/executor";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Sidebar/Sidebar";
import ChartPanel from "@/components/Chart/ChartPanel";
import StrategyEditor from "@/components/Editor/StrategyEditor";
import ResultsPanel from "@/components/Results/ResultsPanel";
import ComparisonPanel from "@/components/Results/ComparisonPanel";

export interface Asset {
  symbol: string;
  name: string;
  type: "stock" | "crypto";
}

export interface AssetResult {
  asset: Asset;
  result: BacktestResult;
}

const DEFAULT_WATCHLIST: Asset[] = [
  { symbol: "SPY", name: "S&P 500 ETF", type: "stock" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", type: "stock" },
  { symbol: "bitcoin", name: "Bitcoin", type: "crypto" },
];

const WATCHLIST_STORAGE_KEY = "backtester-watchlist";

export default function BacktesterPage() {
  // Assets state - initialize with defaults, will load from localStorage in useEffect
  const [watchlist, setWatchlist] = useState<Asset[]>(DEFAULT_WATCHLIST);
  const [selectedAsset, setSelectedAsset] = useState<Asset>(DEFAULT_WATCHLIST[0]);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Data state
  const [priceData, setPriceData] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  // Strategy state
  const [strategyCode, setStrategyCode] = useState<string>(`// Custom Trading Strategy
// Available: data, indicators (sma, ema, rsi, macd, bollinger), context (buy, sell, position)

function strategy(data, indicators, context) {
  const prices = data.map(d => d.close);
  const sma20 = indicators.sma(prices, 20);
  const sma50 = indicators.sma(prices, 50);
  
  for (let i = 50; i < data.length; i++) {
    const prevFast = sma20[i - 1];
    const prevSlow = sma50[i - 1];
    const currFast = sma20[i];
    const currSlow = sma50[i];
    
    // Golden cross - buy signal
    if (prevFast <= prevSlow && currFast > currSlow && !context.position) {
      context.buy(i);
    }
    
    // Death cross - sell signal
    if (prevFast >= prevSlow && currFast < currSlow && context.position) {
      context.sell(i);
    }
  }
}`);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("sma_crossover");
  
  // Config state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [initialCapital, setInitialCapital] = useState(10000);
  
  // Results state
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [multiResults, setMultiResults] = useState<AssetResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [runningAll, setRunningAll] = useState(false);

  // Fetch data when asset changes
  const loadData = useCallback(async () => {
    setDataLoading(true);
    setError(null);
    try {
      const data = await fetchMarketData(
        selectedAsset.symbol,
        selectedAsset.type,
        startDate,
        endDate
      );
      setPriceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setDataLoading(false);
    }
  }, [selectedAsset, startDate, endDate]);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Asset[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWatchlist(parsed);
          setSelectedAsset(parsed[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load watchlist from localStorage:", err);
    }
    setIsHydrated(true);
  }, []);

  // Auto-run demo backtest on first visit
  useEffect(() => {
    const hasSeenDemo = localStorage.getItem("backtester-demo-shown");
    if (!hasSeenDemo && priceData.length > 0 && !result && !loading) {
      // Run the demo backtest after data loads
      const runDemo = async () => {
        setLoading(true);
        try {
          const executionResult = executeStrategy(strategyCode, priceData, initialCapital);
          if (executionResult.success && executionResult.result) {
            setResult(executionResult.result);
            setMultiResults([{ asset: selectedAsset, result: executionResult.result }]);
          }
        } catch (err) {
          console.error("Demo backtest failed:", err);
        } finally {
          setLoading(false);
          localStorage.setItem("backtester-demo-shown", "true");
        }
      };
      runDemo();
    }
  }, [priceData, result, loading, strategyCode, initialCapital, selectedAsset]);

  // Save watchlist to localStorage when it changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
      } catch (err) {
        console.error("Failed to save watchlist to localStorage:", err);
      }
    }
  }, [watchlist, isHydrated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run backtest on single asset
  const handleRunBacktest = async () => {
    if (priceData.length === 0) {
      setError("No price data loaded");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const executionResult = executeStrategy(strategyCode, priceData, initialCapital);

      if (executionResult.success && executionResult.result) {
        setResult(executionResult.result);
        // Update multi-results with this single result
        setMultiResults(prev => {
          const filtered = prev.filter(r => r.asset.symbol !== selectedAsset.symbol);
          return [...filtered, { asset: selectedAsset, result: executionResult.result! }];
        });
      } else {
        setError(executionResult.error || "Strategy execution failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed");
    } finally {
      setLoading(false);
    }
  };

  // Run backtest on ALL watchlist assets
  const handleRunAll = async () => {
    if (watchlist.length === 0) return;

    setRunningAll(true);
    setLoading(true);
    setError(null);
    setMultiResults([]);

    const results: AssetResult[] = [];

    for (const asset of watchlist) {
      try {
        // Fetch data for this asset
        const data = await fetchMarketData(
          asset.symbol,
          asset.type,
          startDate,
          endDate
        );

        // Run strategy
        const executionResult = executeStrategy(strategyCode, data, initialCapital);

        if (executionResult.success && executionResult.result) {
          results.push({ asset, result: executionResult.result });
        }
      } catch (err) {
        console.error(`Failed for ${asset.symbol}:`, err);
      }
    }

    setMultiResults(results);
    
    // Set the first result as the current result
    if (results.length > 0) {
      const selectedResult = results.find(r => r.asset.symbol === selectedAsset.symbol);
      if (selectedResult) {
        setResult(selectedResult.result);
        setPriceData(selectedResult.result.priceData);
      } else {
        setResult(results[0].result);
        setSelectedAsset(results[0].asset);
        setPriceData(results[0].result.priceData);
      }
    }

    setShowComparison(true);
    setLoading(false);
    setRunningAll(false);
  };

  // When selecting an asset, also show its result if available
  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    const assetResult = multiResults.find(r => r.asset.symbol === asset.symbol);
    if (assetResult) {
      setResult(assetResult.result);
    }
  };

  // Add asset to watchlist
  const handleAddAsset = (asset: Asset) => {
    if (!watchlist.find(a => a.symbol === asset.symbol)) {
      setWatchlist([...watchlist, asset]);
    }
  };

  // Remove asset from watchlist
  const handleRemoveAsset = (symbol: string) => {
    setWatchlist(watchlist.filter(a => a.symbol !== symbol));
    setMultiResults(prev => prev.filter(r => r.asset.symbol !== symbol));
    if (selectedAsset.symbol === symbol && watchlist.length > 1) {
      setSelectedAsset(watchlist[0]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <Header
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        initialCapital={initialCapital}
        onCapitalChange={setInitialCapital}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          watchlist={watchlist}
          selectedAsset={selectedAsset}
          onSelectAsset={handleSelectAsset}
          onAddAsset={handleAddAsset}
          onRemoveAsset={handleRemoveAsset}
          multiResults={multiResults}
        />

        {/* Main Area */}
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
          {/* Chart or Comparison View */}
          <div className="flex-1 min-h-0">
            {showComparison && multiResults.length > 1 ? (
              <ComparisonPanel
                results={multiResults}
                onClose={() => setShowComparison(false)}
                onSelectAsset={handleSelectAsset}
              />
            ) : (
              <ChartPanel
                data={priceData}
                trades={result?.trades || []}
                loading={dataLoading}
                symbol={selectedAsset.symbol}
              />
            )}
          </div>

          {/* Bottom Panels */}
          <div className="h-[320px] flex gap-3">
            {/* Strategy Editor */}
            <div className="flex-1">
              <StrategyEditor
                code={strategyCode}
                onChange={setStrategyCode}
                onRun={handleRunBacktest}
                onRunAll={handleRunAll}
                loading={loading}
                runningAll={runningAll}
                selectedTemplate={selectedTemplate}
                onTemplateChange={setSelectedTemplate}
                watchlistCount={watchlist.length}
              />
            </div>

            {/* Results */}
            <div className="w-[380px]">
              <ResultsPanel
                result={result}
                error={error}
                loading={loading}
                showCompareButton={multiResults.length > 1}
                onCompare={() => setShowComparison(true)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
