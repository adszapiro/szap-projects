"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { StrategyWithPerformance } from "@/lib/supabase";

const COLORS = { green: "#00C853", red: "#FF5252" };
const STRATEGY_COLORS = [
  "#2196F3", "#00BCD4", "#009688", "#4CAF50", "#8BC34A",
  "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800", "#FF5722",
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
    <div className="bg-[#12121a] border border-gray-800/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full" />
          Strategy P&L
        </h2>
        <span className="text-xs text-gray-500 font-mono">Top 10</span>
      </div>
      {data.length > 0 ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal vertical={false} />
              <XAxis type="number" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
              <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} width={75} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a24", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#9ca3af" }}
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
        <div className="h-[280px] flex items-center justify-center text-gray-500">
          <p className="text-sm">Loading strategy data...</p>
        </div>
      )}
    </div>
  );
}
