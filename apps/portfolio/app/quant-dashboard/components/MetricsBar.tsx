"use client";

import { useMemo } from "react";
import type { AgentTrade } from "@/lib/supabase";

interface MetricsBarProps {
  trades: AgentTrade[];
  snapshots: { portfolio_value: number }[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);

export default function MetricsBar({ trades, snapshots }: MetricsBarProps) {
  const m = useMemo(() => {
    const latestSnapshot = snapshots[0];
    const basePortfolioValue = (latestSnapshot as { portfolio_value: number } | undefined)?.portfolio_value || 100000;
    const closedTrades = trades.filter(t => t.pnl !== null);
    const wins = closedTrades.filter(t => t.pnl && t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl && t.pnl < 0);
    const totalPnL = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length * 100) : 0;
    const pnlPercent = (totalPnL / basePortfolioValue) * 100;

    const today = new Date().toISOString().split("T")[0];
    const todayTrades = trades.filter(t => t.created_at.startsWith(today));
    const todayPnL = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);

    const recentClosed = closedTrades.slice(0, 10);
    const last5 = recentClosed.slice(0, 5).reduce((s, t) => s + (t.pnl || 0), 0);
    const prev5 = recentClosed.slice(5, 10).reduce((s, t) => s + (t.pnl || 0), 0);
    const pnlTrend = last5 > prev5 ? "up" as const : last5 < prev5 ? "down" as const : "flat" as const;

    return {
      portfolioValue: basePortfolioValue + totalPnL,
      totalPnL, pnlPercent, winRate,
      winCount: wins.length, lossCount: losses.length,
      todayPnL, todayTrades: todayTrades.length,
      pnlTrend,
    };
  }, [trades, snapshots]);

  return (
    <div className="border-b border-[#2a2420]/40 bg-[#141210]/50 px-8 py-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
        <div>
          <p className="text-[10px] text-[#9b8772] uppercase font-mono mb-0.5">Portfolio</p>
          <p className={`font-mono font-semibold text-base ${m.pnlPercent >= 0 ? "text-[#9cb870]" : "text-[#c67b6a]"}`}>
            {fmt(m.portfolioValue)}
          </p>
          <p className="text-[10px] text-[#9b8772] font-mono">{m.pnlPercent >= 0 ? "+" : ""}{m.pnlPercent.toFixed(2)}%</p>
        </div>

        <div>
          <p className="text-[10px] text-[#9b8772] uppercase font-mono mb-0.5">Total P&L</p>
          <div className="flex items-center gap-1.5">
            <p className={`font-mono font-semibold text-base ${m.totalPnL >= 0 ? "text-[#9cb870]" : "text-[#c67b6a]"}`}>
              {fmt(m.totalPnL)}
            </p>
            {m.pnlTrend !== "flat" && (
              <svg className={`w-3 h-3 ${m.pnlTrend === "up" ? "text-[#9cb870]" : "text-[#c67b6a]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.pnlTrend === "up" ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
              </svg>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-[#9b8772] uppercase font-mono mb-0.5">Today</p>
          <p className={`font-mono font-semibold text-base ${m.todayPnL >= 0 ? "text-[#9cb870]" : "text-[#c67b6a]"}`}>
            {fmt(m.todayPnL)}
          </p>
          <p className="text-[10px] text-[#9b8772] font-mono">{m.todayTrades} trades</p>
        </div>

        <div>
          <p className="text-[10px] text-[#9b8772] uppercase font-mono mb-0.5">Win Rate</p>
          <p className={`font-mono font-semibold text-base ${m.winRate >= 50 ? "text-[#9cb870]" : "text-[#c67b6a]"}`}>
            {m.winRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-[#9b8772] font-mono">{m.winCount}W / {m.lossCount}L</p>
        </div>
      </div>
    </div>
  );
}
