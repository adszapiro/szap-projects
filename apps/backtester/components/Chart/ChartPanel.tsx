"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, IChartApi, CandlestickData, LineData, Time } from "lightweight-charts";
import { OHLCV, Trade } from "@/lib/types";
import { Loader2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface ChartPanelProps {
  data: OHLCV[];
  trades: Trade[];
  loading: boolean;
  symbol: string;
}

export default function ChartPanel({ data, trades, loading, symbol }: ChartPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(["sma20", "sma50"]);

  // Calculate stats
  const latestPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const firstPrice = data.length > 0 ? data[0].close : 0;
  const priceChange = latestPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  // Memoize chart creation to avoid recreating on every render
  const initChart = useCallback(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Clean up existing chart safely
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {
        // Chart already disposed, ignore
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

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // Format data for lightweight-charts
    const candleData: CandlestickData[] = data.map((d) => ({
      time: d.date as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candleSeries.setData(candleData);

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: "#3b82f6",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    const volumeData = data.map((d) => ({
      time: d.date as Time,
      value: d.volume,
      color: d.close >= d.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
    }));

    volumeSeries.setData(volumeData);
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Add SMA indicators if active
    if (activeIndicators.includes("sma20")) {
      const sma20Series = chart.addLineSeries({
        color: "#eab308",
        lineWidth: 1,
        title: "SMA 20",
      });
      const sma20Data = calculateSMA(data, 20);
      sma20Series.setData(sma20Data);
    }

    if (activeIndicators.includes("sma50")) {
      const sma50Series = chart.addLineSeries({
        color: "#a855f7",
        lineWidth: 1,
        title: "SMA 50",
      });
      const sma50Data = calculateSMA(data, 50);
      sma50Series.setData(sma50Data);
    }

    // Add trade markers
    if (trades.length > 0) {
      const markers = trades.map((trade) => ({
        time: trade.date as Time,
        position: trade.type === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
        color: trade.type === "buy" ? "#22c55e" : "#ef4444",
        shape: trade.type === "buy" ? ("arrowUp" as const) : ("arrowDown" as const),
        text: trade.type === "buy" ? "BUY" : "SELL",
      }));
      candleSeries.setMarkers(markers);
    }

    // Fit content
    chart.timeScale().fitContent();

    return chart;
  }, [data, trades, activeIndicators]);

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
          // Chart disposed, ignore
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

  const toggleIndicator = (indicator: string) => {
    setActiveIndicators((prev) =>
      prev.includes(indicator)
        ? prev.filter((i) => i !== indicator)
        : [...prev, indicator]
    );
  };

  return (
    <div className="panel h-full flex flex-col">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{symbol.toUpperCase()}</span>
              {priceChange !== 0 && (
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${
                    priceChange >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {priceChange >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {priceChange >= 0 ? "+" : ""}
                  {priceChangePercent.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="text-xl font-semibold text-white">
              ${latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Indicator Toggles */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] mr-2">Indicators:</span>
          <button
            onClick={() => toggleIndicator("sma20")}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeIndicators.includes("sma20")
                ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]"
            }`}
          >
            SMA 20
          </button>
          <button
            onClick={() => toggleIndicator("sma50")}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeIndicators.includes("sma50")
                ? "bg-purple-500/20 text-purple-500 border border-purple-500/30"
                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]"
            }`}
          >
            SMA 50
          </button>
          <button
            onClick={() => toggleIndicator("volume")}
            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              activeIndicators.includes("volume")
                ? "bg-blue-500/20 text-blue-500 border border-blue-500/30"
                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]"
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            Vol
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-[var(--bg-secondary)]/80 flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}
        {data.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <BarChart3 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-white font-medium mb-1">Loading market data...</p>
              <p className="text-sm text-[var(--text-muted)]">
                Select an asset from the watchlist or add a new one to view historical price data.
              </p>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}

// Helper function to calculate SMA
function calculateSMA(data: OHLCV[], period: number): LineData[] {
  const result: LineData[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    result.push({
      time: data[i].date as Time,
      value: sum / period,
    });
  }
  
  return result;
}
