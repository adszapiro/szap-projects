"use client";

import { BacktestResult } from "@/lib/types";
import { TrendingUp, TrendingDown, Target, BarChart3, Clock, AlertCircle, Loader2, GitCompare } from "lucide-react";

interface ResultsPanelProps {
  result: BacktestResult | null;
  error: string | null;
  loading: boolean;
  showCompareButton?: boolean;
  onCompare?: () => void;
}

export default function ResultsPanel({ result, error, loading, showCompareButton, onCompare }: ResultsPanelProps) {
  if (loading) {
    return (
      <div className="panel h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-[var(--text-muted)]">Running backtest...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel h-full flex items-center justify-center">
        <div className="text-center max-w-xs px-4">
          <BarChart3 className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm text-white font-medium mb-2">Ready to backtest</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Edit the strategy code on the left, then click &quot;Run&quot; to test it against historical data.
          </p>
          <div className="text-xs text-[var(--text-muted)] space-y-1">
            <p className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Green arrows = Buy signals
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Red arrows = Sell signals
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { metrics } = result;
  const isPositive = metrics.totalReturn >= 0;

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            Results
          </span>
        </div>
        {showCompareButton && onCompare && (
          <button
            onClick={onCompare}
            className="btn btn-secondary text-xs py-1 px-2"
          >
            <GitCompare className="w-3 h-3" />
            Compare
          </button>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Primary Metric - Total Return */}
        <div className="metric-card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="metric-label">Total Return</div>
              <div className={`text-2xl font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                {isPositive ? "+" : ""}
                {metrics.totalReturnPercent.toFixed(2)}%
              </div>
              <div className={`text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}${metrics.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className={`p-3 rounded-xl ${isPositive ? "bg-green-500/10" : "bg-red-500/10"}`}>
              {isPositive ? (
                <TrendingUp className="w-6 h-6 text-green-500" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="metric-card">
            <div className="metric-label">Final Value</div>
            <div className="metric-value text-white">
              ${metrics.finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Sharpe Ratio</div>
            <div className={`metric-value ${metrics.sharpeRatio > 1 ? "positive" : metrics.sharpeRatio > 0 ? "text-yellow-500" : "negative"}`}>
              {metrics.sharpeRatio.toFixed(2)}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Max Drawdown</div>
            <div className="metric-value negative">
              -{metrics.maxDrawdownPercent.toFixed(2)}%
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Win Rate</div>
            <div className={`metric-value ${metrics.winRate >= 50 ? "positive" : "negative"}`}>
              {metrics.winRate.toFixed(1)}%
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label flex items-center gap-1">
              <Target className="w-3 h-3" />
              Trades
            </div>
            <div className="metric-value text-white">
              {metrics.numberOfTrades}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Avg Duration
            </div>
            <div className="metric-value text-white">
              {Math.round(metrics.avgTradeDuration)}d
            </div>
          </div>
        </div>

        {/* Trade Summary */}
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <div className="text-xs text-[var(--text-muted)] mb-2">Recent Trades</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {result.trades.slice(-6).map((trade, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-2 bg-[var(--bg-primary)] rounded text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      trade.type === "buy" ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-[var(--text-secondary)]">
                    {trade.type.toUpperCase()}
                  </span>
                </div>
                <span className="text-[var(--text-muted)]">
                  ${trade.price.toFixed(2)}
                </span>
                <span className="text-[var(--text-muted)]">
                  {trade.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
