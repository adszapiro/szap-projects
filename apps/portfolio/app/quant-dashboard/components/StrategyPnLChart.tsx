"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { StrategyWithPerformance } from "@/lib/supabase";
import { useThemeColors } from "@/hooks/useThemeColors";

const STRATEGY_COLORS = [
  "#d4a574", "#c9825b", "#b8895f", "#a67c52", "#9cb870",
  "#d9a45e", "#c67b6a", "#8fa4b8", "#b89c7f", "#a68a6d",
];

interface StrategyPnLChartProps {
  leaderboard: StrategyWithPerformance[];
}

export default function StrategyPnLChart({ leaderboard }: StrategyPnLChartProps) {
  const colors = useThemeColors();
  const data = useMemo(() =>
    leaderboard.slice(0, 10).map((s, i) => ({
      name: s.name.length > 15 ? s.name.slice(0, 15) + "..." : s.name,
      fullName: s.name,
      pnl: s.performance?.total_pnl || 0,
      color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
    })),
  [leaderboard]);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <span className="w-2 h-2 bg-[var(--accent)] rounded-full" />
          Strategy P&L
        </h2>
        <span className="text-xs text-[var(--text-muted)] font-mono">Top 10</span>
      </div>
      {data.length > 0 ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal vertical={false} />
              <XAxis type="number" stroke={colors.textMuted} fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
              <YAxis type="category" dataKey="name" stroke={colors.textMuted} fontSize={10} tickLine={false} axisLine={false} width={75} />
              <Tooltip
                contentStyle={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.borderHover}`, borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: colors.textSecondary }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]}
              />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                {data.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.pnl >= 0 ? colors.positive : colors.negative} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-[var(--text-muted)]">
          <p className="text-sm">Loading strategy data...</p>
        </div>
      )}
    </div>
  );
}
