"use client";

import { useState } from "react";
import { BacktestConfig, BacktestResult, StrategyType } from "@/lib/types";
import { fetchMarketData, popularStocks, popularCrypto } from "@/lib/data";
import { runBacktest } from "@/lib/backtest";
import { strategyConfigs } from "@/lib/strategies";
import MetricsCard from "@/components/MetricsCard";
import TradeLog from "@/components/TradeLog";
import Chart from "@/components/Chart";

export default function BacktesterPage() {
  // Form state
  const [assetType, setAssetType] = useState<"stock" | "crypto">("stock");
  const [symbol, setSymbol] = useState("SPY");
  const [strategy, setStrategy] = useState<StrategyType>("sma_crossover");
  const [params, setParams] = useState<Record<string, number>>({
    fastPeriod: 10,
    slowPeriod: 50,
  });
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [initialCapital, setInitialCapital] = useState(10000);

  // Results state
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get assets based on type
  const assets = assetType === "stock" ? popularStocks : popularCrypto;

  // Get strategy config
  const strategyConfig = strategyConfigs[strategy];

  // Update params when strategy changes
  const handleStrategyChange = (newStrategy: StrategyType) => {
    setStrategy(newStrategy);
    const config = strategyConfigs[newStrategy];
    const newParams: Record<string, number> = {};
    config.params.forEach((p) => {
      newParams[p.key] = p.default;
    });
    setParams(newParams);
  };

  // Run backtest
  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Fetch market data
      const data = await fetchMarketData(symbol, assetType, startDate, endDate);

      if (data.length === 0) {
        throw new Error("No data returned for this symbol and date range");
      }

      // Run backtest
      const config: BacktestConfig = {
        symbol,
        assetType,
        strategy,
        params,
        startDate,
        endDate,
        initialCapital,
      };

      const backtestResult = runBacktest(data, config);
      setResult(backtestResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Algo Backtester
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Test trading strategies on historical stock and crypto data
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                Configuration
              </h2>

              {/* Asset Type Toggle */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Asset Type
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                  {(["stock", "crypto"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setAssetType(type);
                        setSymbol(type === "stock" ? "SPY" : "bitcoin");
                      }}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        assetType === type
                          ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {type === "stock" ? "Stocks" : "Crypto"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symbol Select */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Symbol
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {assets.map((asset) => (
                    <option key={asset.symbol} value={asset.symbol}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Strategy Select */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Strategy
                </label>
                <select
                  value={strategy}
                  onChange={(e) =>
                    handleStrategyChange(e.target.value as StrategyType)
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.entries(strategyConfigs).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  {strategyConfig.description}
                </p>
              </div>

              {/* Strategy Parameters */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Parameters
                </label>
                <div className="space-y-3">
                  {strategyConfig.params.map((param) => (
                    <div key={param.key} className="flex items-center gap-3">
                      <label className="text-sm text-slate-600 dark:text-slate-400 w-28">
                        {param.label}
                      </label>
                      <input
                        type="number"
                        value={params[param.key] ?? param.default}
                        onChange={(e) =>
                          setParams({
                            ...params,
                            [param.key]: Number(e.target.value),
                          })
                        }
                        min={param.min}
                        max={param.max}
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Initial Capital */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Initial Capital ($)
                </label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  min={100}
                  step={1000}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Run Button */}
              <button
                onClick={handleRunBacktest}
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Running...
                  </span>
                ) : (
                  "Run Backtest"
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Back to Portfolio */}
            <div className="text-center mt-6">
              <a
                href="https://portfolio-adszapiro.vercel.app"
                className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-sm transition-colors"
              >
                ← Back to Portfolio
              </a>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {result ? (
              <>
                {/* Metrics */}
                <MetricsCard metrics={result.metrics} />

                {/* Chart */}
                <Chart result={result} symbol={symbol} />

                {/* Trade Log */}
                <TradeLog trades={result.trades} />
              </>
            ) : (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  No Results Yet
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Configure your backtest parameters and click "Run Backtest" to
                  see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
