"use client";

import { useEffect, useRef, useState } from "react";
import { BacktestResult } from "@/lib/types";

interface ChartProps {
  result: BacktestResult;
  symbol: string;
}

export default function Chart({ result, symbol }: ChartProps) {
  const [activeTab, setActiveTab] = useState<"equity" | "price">("equity");

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl">
      {/* Tab Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {activeTab === "equity" ? "Equity Curve" : `${symbol.toUpperCase()} Price`}
        </h3>
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("equity")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "equity"
                ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Equity
          </button>
          <button
            onClick={() => setActiveTab("price")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "price"
                ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Price
          </button>
        </div>
      </div>

      {/* Chart */}
      {activeTab === "equity" ? (
        <EquityChart data={result.equityCurve} />
      ) : (
        <PriceChart result={result} />
      )}
    </div>
  );
}

function EquityChart({ data }: { data: { date: string; value: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get dimensions
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 60 };

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate scales
    const values = data.map((d) => d.value);
    const minValue = Math.min(...values) * 0.95;
    const maxValue = Math.max(...values) * 1.05;

    const xScale = (i: number) =>
      padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    const yScale = (v: number) =>
      height - padding.bottom - ((v - minValue) / (maxValue - minValue)) * (height - padding.top - padding.bottom);

    // Draw grid lines
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * (height - padding.top - padding.bottom);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const value = maxValue - (i / 4) * (maxValue - minValue);
      ctx.fillStyle = "#64748b";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`$${(value / 1000).toFixed(1)}k`, padding.left - 10, y + 4);
    }

    // Draw line
    const startValue = data[0].value;
    const endValue = data[data.length - 1].value;
    const isPositive = endValue >= startValue;
    
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(data[0].value));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(xScale(i), yScale(data[i].value));
    }
    ctx.strokeStyle = isPositive ? "#10b981" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill area under line
    ctx.lineTo(xScale(data.length - 1), height - padding.bottom);
    ctx.lineTo(xScale(0), height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = isPositive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
    ctx.fill();

  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-64"
      style={{ width: "100%", height: "256px" }}
    />
  );
}

function PriceChart({ result }: { result: BacktestResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { priceData, trades } = result;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get dimensions
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 60 };

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate scales
    const prices = priceData.map((d) => d.close);
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;

    const xScale = (i: number) =>
      padding.left + (i / (priceData.length - 1)) * (width - padding.left - padding.right);
    const yScale = (v: number) =>
      height - padding.bottom - ((v - minPrice) / (maxPrice - minPrice)) * (height - padding.top - padding.bottom);

    // Draw grid lines
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * (height - padding.top - padding.bottom);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const value = maxPrice - (i / 4) * (maxPrice - minPrice);
      ctx.fillStyle = "#64748b";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`$${value.toFixed(0)}`, padding.left - 10, y + 4);
    }

    // Draw price line
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(priceData[0].close));
    for (let i = 1; i < priceData.length; i++) {
      ctx.lineTo(xScale(i), yScale(priceData[i].close));
    }
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw trade markers
    const dateToIndex = new Map<string, number>();
    priceData.forEach((d, i) => dateToIndex.set(d.date, i));

    trades.forEach((trade) => {
      const index = dateToIndex.get(trade.date);
      if (index === undefined) return;

      const x = xScale(index);
      const y = yScale(trade.price);

      // Draw marker
      ctx.beginPath();
      if (trade.type === "buy") {
        // Green triangle pointing up
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x - 6, y + 4);
        ctx.lineTo(x + 6, y + 4);
        ctx.closePath();
        ctx.fillStyle = "#10b981";
      } else {
        // Red triangle pointing down
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x - 6, y - 4);
        ctx.lineTo(x + 6, y - 4);
        ctx.closePath();
        ctx.fillStyle = "#ef4444";
      }
      ctx.fill();
    });

  }, [priceData, trades]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full h-64"
        style={{ width: "100%", height: "256px" }}
      />
      <div className="flex items-center justify-center gap-6 mt-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-emerald-500" />
          <span className="text-slate-600 dark:text-slate-400">Buy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500" />
          <span className="text-slate-600 dark:text-slate-400">Sell</span>
        </div>
      </div>
    </div>
  );
}
