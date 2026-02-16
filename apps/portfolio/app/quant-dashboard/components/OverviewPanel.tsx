"use client";

import { useMemo, useState } from "react";
import PortfolioChart from "./PortfolioChart";
import StrategyPnLChart from "./StrategyPnLChart";
import type { DailySnapshot, AgentTrade, StrategyWithPerformance } from "@/lib/supabase";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);

interface OverviewPanelProps {
  snapshots: DailySnapshot[];
  trades: AgentTrade[];
  leaderboard: StrategyWithPerformance[];
}

export default function OverviewPanel({ snapshots, trades, leaderboard }: OverviewPanelProps) {
  const [riskOpen, setRiskOpen] = useState(false);

  const riskMetrics = useMemo(() => {
    const closedTrades = trades.filter(t => t.pnl !== null);
    const wins = closedTrades.filter(t => t.pnl && t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl && t.pnl < 0);
    const baseVal = (snapshots[0] as { portfolio_value: number } | undefined)?.portfolio_value || 100000;
    const returns = closedTrades.map(t => (t.pnl || 0) / baseVal);
    const avg = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const std = returns.length > 1 ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / returns.length) : 0;
    const rf = 0.05 / 252;
    const sharpe = std > 0 ? ((avg - rf) / std) * Math.sqrt(252) : 0;
    const downReturns = returns.filter(r => r < 0);
    const downStd = downReturns.length > 0 ? Math.sqrt(downReturns.reduce((s, r) => s + r * r, 0) / downReturns.length) : 0;
    const sortino = downStd > 0 ? ((avg - rf) / downStd) * Math.sqrt(252) : 0;
    let peak = baseVal, maxDD = 0, running = baseVal;
    trades.forEach(t => { running += t.pnl || 0; if (running > peak) peak = running; const dd = (peak - running) / peak * 100; if (dd > maxDD) maxDD = dd; });
    const totalWins = wins.reduce((s, t) => s + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0));
    const pf = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const wp = closedTrades.length > 0 ? wins.length / closedTrades.length : 0;
    const expectancy = wp * avgWin - (1 - wp) * avgLoss;
    return { sharpe, sortino, maxDD, pf, expectancy };
  }, [trades, snapshots]);

  return (
    <div className="space-y-8">
      <PortfolioChart snapshots={snapshots} trades={trades} />
      <StrategyPnLChart leaderboard={leaderboard} />

      {/* Collapsible Risk Summary */}
      <div className="bg-[#1a1512] border border-[#2a2420]/40 rounded-2xl overflow-hidden">
        <button
          onClick={() => setRiskOpen(o => !o)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#211d19] transition-colors duration-200"
        >
          <h2 className="text-sm font-semibold text-[#f5e6d3] flex items-center gap-2">
            <span className="w-2 h-2 bg-[#d9a45e] rounded-full" />
            Risk Metrics
          </h2>
          <svg
            className={`w-4 h-4 text-[#9b8772] transition-transform ${riskOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {riskOpen && (
          <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Sharpe", value: riskMetrics.sharpe.toFixed(2), pos: riskMetrics.sharpe > 0 },
              { label: "Sortino", value: riskMetrics.sortino.toFixed(2), pos: riskMetrics.sortino > 0 },
              { label: "Max DD", value: `${riskMetrics.maxDD.toFixed(1)}%`, pos: false },
              { label: "Profit Factor", value: riskMetrics.pf === Infinity ? "\u221e" : riskMetrics.pf.toFixed(2), pos: riskMetrics.pf > 1 },
              { label: "Expectancy", value: fmt(riskMetrics.expectancy), pos: riskMetrics.expectancy > 0 },
            ].map(r => (
              <div key={r.label} className="text-center">
                <p className="text-[10px] text-[#9b8772] uppercase font-mono mb-1">{r.label}</p>
                <p className={`text-sm font-mono font-bold ${r.pos ? "text-[#9cb870]" : "text-[#c67b6a]"}`}>{r.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
