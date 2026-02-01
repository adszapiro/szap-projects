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

export interface Asset {
  symbol: string;
  name: string;
  type: "stock" | "crypto";
}

export default function BacktesterPage() {
  // Assets state
  const [watchlist, setWatchlist] = useState<Asset[]>([
    { symbol: "SPY", name: "S&P 500 ETF", type: "stock" },
    { symbol: "QQQ", name: "Nasdaq 100 ETF", type: "stock" },
    { symbol: "bitcoin", name: "Bitcoin", type: "crypto" },
  ]);
  const [selectedAsset, setSelectedAsset] = useState<Asset>(watchlist[0]);
  
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
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run backtest
  const handleRunBacktest = async () => {
    if (priceData.length === 0) {
      setError("No price data loaded");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Execute the custom strategy code
      const executionResult = executeStrategy(strategyCode, priceData, initialCapital);

      if (executionResult.success && executionResult.result) {
        setResult(executionResult.result);
      } else {
        setError(executionResult.error || "Strategy execution failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed");
    } finally {
      setLoading(false);
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
          onSelectAsset={setSelectedAsset}
          onAddAsset={handleAddAsset}
          onRemoveAsset={handleRemoveAsset}
        />

        {/* Main Area */}
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
          {/* Chart */}
          <div className="flex-1 min-h-0">
            <ChartPanel
              data={priceData}
              trades={result?.trades || []}
              loading={dataLoading}
              symbol={selectedAsset.symbol}
            />
          </div>

          {/* Bottom Panels */}
          <div className="h-[320px] flex gap-3">
            {/* Strategy Editor */}
            <div className="flex-1">
              <StrategyEditor
                code={strategyCode}
                onChange={setStrategyCode}
                onRun={handleRunBacktest}
                loading={loading}
                selectedTemplate={selectedTemplate}
                onTemplateChange={setSelectedTemplate}
              />
            </div>

            {/* Results */}
            <div className="w-[380px]">
              <ResultsPanel
                result={result}
                error={error}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
