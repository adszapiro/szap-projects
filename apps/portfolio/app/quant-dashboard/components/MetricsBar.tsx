"use client";

import { useMemo } from "react";
import type { AgentTrade, Strategy } from "@/lib/supabase";

interface MetricsBarProps {
  trades: AgentTrade[];
  strategies: Strategy[];
  tournamentStats: {
    totalStrategies: number;
    totalPapers: number;
    averageWinRate: number;
    topPerformer: string | null;
    totalTrades: number;
  } | null;
  snapshots: { portfolio_value: number }[];
}

function MetricCard({
  label,
  value,
  subtext,
  isPositive,
  trend,
}: {
  label: string;
  value: string;
  subtext?: string;
  isPositive?: boolean;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase font-mono mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className={`font-mono font-semibold text-base ${
          isPositive === true ? "text-green-400" :
          isPositive === false ? "text-red-400" : "text-white"
        }`}>
          {value}
        </p>
        {trend && trend !== "flat" && (
          <svg className={`w-3 h-3 ${trend === "up" ? "text-green-400" : "text-red-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend === "up" ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
          </svg>
        )}
      </div>
      {subtext && <p className="text-[10px] text-gray-500 font-mono">{subtext}</p>}
    </div>
  );
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);

export default function MetricsBar({ trades, strategies, tournamentStats, snapshots }: MetricsBarProps) {
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
      winCount: wins.length, lossCount: losses.length, closedCount: closedTrades.length,
      totalTrades: trades.length,
      todayPnL, todayTrades: todayTrades.length,
      pnlTrend,
    };
  }, [trades, snapshots]);

  return (
    <div className="border-b border-gray-800/50 bg-[#0d0d14]/50 px-6 py-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-6 gap-y-2">
        <MetricCard
          label="Portfolio"
          value={fmt(m.portfolioValue)}
          subtext={`${m.pnlPercent >= 0 ? "+" : ""}${m.pnlPercent.toFixed(2)}%`}
          isPositive={m.pnlPercent >= 0 ? true : false}
        />
        <MetricCard
          label="Total P&L"
          value={fmt(m.totalPnL)}
          isPositive={m.totalPnL >= 0}
          trend={m.pnlTrend}
        />
        <MetricCard
          label="Today"
          value={fmt(m.todayPnL)}
          isPositive={m.todayPnL >= 0}
          subtext={`${m.todayTrades} trades`}
        />
        <MetricCard
          label="Win Rate"
          value={`${m.winRate.toFixed(1)}%`}
          subtext={`${m.winCount}W / ${m.lossCount}L`}
          isPositive={m.winRate >= 50}
        />
        <MetricCard
          label="Trades"
          value={m.totalTrades.toString()}
          subtext={`${strategies.length} strategies`}
        />
        <MetricCard
          label="Avg Win Rate"
          value={`${((tournamentStats?.averageWinRate || 0.5) * 100).toFixed(1)}%`}
          subtext="Thompson"
          isPositive={(tournamentStats?.averageWinRate || 0.5) >= 0.5}
        />
        <MetricCard
          label="Active"
          value={strategies.filter(s => s.status === "deployed").length.toString()}
          subtext={`${strategies.filter(s => s.status === "paused").length} paused`}
        />
        <MetricCard
          label="Closed"
          value={m.closedCount.toString()}
          subtext="resolved trades"
        />
      </div>
    </div>
  );
}
