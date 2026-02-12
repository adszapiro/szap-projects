"use client";

import { useMemo, useCallback, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DailySnapshot, AgentTrade } from "@/lib/supabase";

const COLORS = { green: "#00C853" };
type TimeRange = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";

interface PortfolioChartProps {
  snapshots: DailySnapshot[];
  trades: AgentTrade[];
}

export default function PortfolioChart({ snapshots, trades }: PortfolioChartProps) {
  const [chartTimeRange, setChartTimeRange] = useState<TimeRange>("1W");

  const getTimeRangeCutoff = useCallback((range: TimeRange): Date => {
    const now = new Date();
    switch (range) {
      case "1D": return new Date(now.setDate(now.getDate() - 1));
      case "1W": return new Date(now.setDate(now.getDate() - 7));
      case "1M": return new Date(now.setMonth(now.getMonth() - 1));
      case "3M": return new Date(now.setMonth(now.getMonth() - 3));
      case "YTD": return new Date(now.getFullYear(), 0, 1);
      case "1Y": return new Date(now.setFullYear(now.getFullYear() - 1));
      case "ALL": default: return new Date(0);
    }
  }, []);

  const pnlHistory = useMemo(() => {
    const cutoffDate = getTimeRangeCutoff(chartTimeRange);
    const baseValue = 100000;

    if (chartTimeRange === "1D" || snapshots.length <= 1) {
      if (trades.length === 0) return [];
      const sortedTrades = [...trades]
        .filter(t => new Date(t.created_at) >= cutoffDate)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (sortedTrades.length === 0) return [{ date: "Now", value: baseValue }];
      const preCutoffPnL = trades.filter(t => new Date(t.created_at) < cutoffDate).reduce((s, t) => s + (t.pnl || 0), 0);
      let cum = preCutoffPnL;
      const pts: { date: string; value: number }[] = [{ date: "Start", value: baseValue + cum }];
      sortedTrades.forEach(trade => {
        cum += trade.pnl || 0;
        const d = new Date(trade.created_at);
        pts.push({ date: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), value: baseValue + cum });
      });
      return pts;
    }

    if (snapshots.length > 0) {
      const filtered = snapshots
        .filter(s => new Date(s.date) >= cutoffDate)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (filtered.length > 0) {
        const fmt = (ds: string) => {
          const d = new Date(ds);
          if (chartTimeRange === "1W") return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
          if (chartTimeRange === "1M" || chartTimeRange === "3M") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        };
        return filtered.map(s => ({ date: fmt(s.date), value: s.portfolio_value }));
      }
    }

    if (trades.length === 0) return [];
    const sorted = [...trades].filter(t => new Date(t.created_at) >= cutoffDate).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sorted.length === 0) return [];
    const daily: Record<string, number> = {};
    const pre = trades.filter(t => new Date(t.created_at) < cutoffDate).reduce((s, t) => s + (t.pnl || 0), 0);
    let cum2 = pre;
    sorted.forEach(t => { const d = t.created_at.split("T")[0]; cum2 += t.pnl || 0; daily[d] = cum2; });
    return Object.entries(daily).map(([d, c]) => ({
      date: new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: baseValue + c,
    }));
  }, [snapshots, trades, chartTimeRange, getTimeRangeCutoff]);

  return (
    <div className="bg-[#12121a] border border-gray-800/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Portfolio Value
        </h2>
        <div className="flex items-center gap-1">
          {(["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"] as const).map(r => (
            <button
              key={r}
              onClick={() => setChartTimeRange(r)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                chartTimeRange === r
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {pnlHistory.length > 0 ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pnlHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a24", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Portfolio"]}
              />
              <Area type="monotone" dataKey="value" stroke={COLORS.green} strokeWidth={2} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-gray-500">
          <p className="text-sm">Collecting P&L data...</p>
        </div>
      )}
    </div>
  );
}
