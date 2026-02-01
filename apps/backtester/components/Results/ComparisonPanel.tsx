"use client";

import { useEffect, useRef, useCallback } from "react";
import { createChart, IChartApi, Time } from "lightweight-charts";
import { AssetResult, Asset } from "@/app/page";
import { X, TrendingUp, TrendingDown, Trophy } from "lucide-react";

interface ComparisonPanelProps {
  results: AssetResult[];
  onClose: () => void;
  onSelectAsset: (asset: Asset) => void;
}

const COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
  "#a855f7", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

export default function ComparisonPanel({
  results,
  onClose,
  onSelectAsset,
}: ComparisonPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Sort results by return (best first)
  const sortedResults = [...results].sort(
    (a, b) => b.result.metrics.totalReturnPercent - a.result.metrics.totalReturnPercent
  );

  const initChart = useCallback(() => {
    if (!chartContainerRef.current || results.length === 0) return null;

    // Clean up existing chart safely
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {
        // Already disposed
      }
      chartRef.current = null;
    }

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "#111113" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "#1f1f23" },
        horzLines: { color: "#1f1f23" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#3b82f6",
          width: 1,
          style: 2,
          labelBackgroundColor: "#3b82f6",
        },
        horzLine: {
          color: "#3b82f6",
          width: 1,
          style: 2,
          labelBackgroundColor: "#3b82f6",
        },
      },
      rightPriceScale: {
        borderColor: "#27272a",
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    // Add a line series for each asset's equity curve (normalized to %)
    results.forEach((result, index) => {
      const lineSeries = chart.addLineSeries({
        color: COLORS[index % COLORS.length],
        lineWidth: 2,
        title: result.asset.symbol.toUpperCase(),
      });

      // Normalize equity curve to percentage return
      const initialValue = result.result.equityCurve[0]?.value || 1;
      const normalizedData = result.result.equityCurve.map((point) => ({
        time: point.date as Time,
        value: ((point.value - initialValue) / initialValue) * 100,
      }));

      lineSeries.setData(normalizedData);
    });

    // Fit content
    chart.timeScale().fitContent();

    return chart;
  }, [results]);

  useEffect(() => {
    const chart = initChart();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        } catch {
          // Chart disposed
        }
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chart) {
        try {
          chart.remove();
        } catch {
          // Already disposed
        }
      }
      chartRef.current = null;
    };
  }, [initChart]);

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">
            Strategy Comparison
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {results.length} assets
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors"
        >
          <X className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart */}
        <div className="flex-1 relative">
          <div ref={chartContainerRef} className="w-full h-full" />
          {/* Legend */}
          <div className="absolute top-4 left-4 bg-[var(--bg-secondary)]/90 rounded-lg p-2 space-y-1">
            {results.map((result, index) => (
              <div
                key={result.asset.symbol}
                className="flex items-center gap-2 text-xs"
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-white font-medium">
                  {result.asset.symbol.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Results Table */}
        <div className="w-72 border-l border-[var(--border-color)] overflow-y-auto">
          <div className="p-3 border-b border-[var(--border-color)]">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
              Performance Ranking
            </div>
          </div>
          <div className="divide-y divide-[var(--border-color)]">
            {sortedResults.map((result, index) => {
              const isPositive = result.result.metrics.totalReturnPercent >= 0;
              const isWinner = index === 0;

              return (
                <button
                  key={result.asset.symbol}
                  onClick={() => onSelectAsset(result.asset)}
                  className="w-full p-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {isWinner && (
                        <Trophy className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium text-white">
                        {result.asset.symbol.toUpperCase()}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm font-semibold ${
                        isPositive ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {isPositive ? "+" : ""}
                      {result.result.metrics.totalReturnPercent.toFixed(2)}%
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <div className="text-[var(--text-muted)]">Sharpe</div>
                      <div className="text-white">
                        {result.result.metrics.sharpeRatio.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--text-muted)]">Drawdown</div>
                      <div className="text-red-400">
                        -{result.result.metrics.maxDrawdownPercent.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--text-muted)]">Win Rate</div>
                      <div className="text-white">
                        {result.result.metrics.winRate.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
