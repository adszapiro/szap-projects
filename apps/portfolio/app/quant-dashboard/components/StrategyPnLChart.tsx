"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { StrategyWithPerformance } from "@/lib/supabase";

const COLORS = { green: "#9cb870", red: "#c67b6a" };
const STRATEGY_COLORS = [
  "#d4a574", "#c9825b", "#b8895f", "#a67c52", "#9cb870",
  "#d9a45e", "#c67b6a", "#8fa4b8", "#b89c7f", "#a68a6d",
];

interface StrategyPnLChartProps {
  leaderboard: StrategyWithPerformance[];
}

export default function StrategyPnLChart({ leaderboard }: StrategyPnLChartProps) {
  const data = useMemo(() =>
    leaderboard.slice(0, 10).map((s, i) => ({
      name: s.name.length > 15 ? s.name.slice(0, 15) + "..." : s.name,
      fullName: s.name,
      pnl: s.performance?.total_pnl || 0,
      color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
    })),
  [leaderboard]);

  return (
    <div className="bg-[#1a1512] border border-[#2a2420]/40 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#f5e6d3] flex items-center gap-2">
          <span className="w-2 h-2 bg-[#d4a574] rounded-full" />
          Strategy P&L
        </h2>
        <span className="text-xs text-[#9b8772] font-mono">Top 10</span>
      </div>
      {data.length > 0 ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2420" horizontal vertical={false} />
              <XAxis type="number" stroke="#9b8772" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
              <YAxis type="category" dataKey="name" stroke="#9b8772" fontSize={10} tickLine={false} axisLine={false} width={75} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1512", border: "1px solid #3d342b", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#c9b79c" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]}
              />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                {data.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.pnl >= 0 ? COLORS.green : COLORS.red} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-[#9b8772]">
          <p className="text-sm">Loading strategy data...</p>
        </div>
      )}
    </div>
  );
}
