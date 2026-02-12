"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import PortfolioChart from "./PortfolioChart";
import StrategyPnLChart from "./StrategyPnLChart";
import type { DailySnapshot, AgentTrade, Strategy, AgentLog, StrategyWithPerformance } from "@/lib/supabase";

const STRATEGY_COLORS = [
  "#2196F3", "#00BCD4", "#009688", "#4CAF50", "#8BC34A",
  "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800", "#FF5722",
];

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);

const fmtTime = (ds: string) =>
  new Date(ds).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

interface OverviewPanelProps {
  snapshots: DailySnapshot[];
  trades: AgentTrade[];
  strategies: Strategy[];
  logs: AgentLog[];
  leaderboard: StrategyWithPerformance[];
  agentStatus: { isRunning: boolean; lastActivity: string | null };
  onNavigate: (tab: string) => void;
}

export default function OverviewPanel({ snapshots, trades, strategies, logs, leaderboard, agentStatus, onNavigate }: OverviewPanelProps) {
  const allocationData = useMemo(() =>
    leaderboard
      .filter(s => s.performance?.current_weight && s.performance.current_weight > 0)
      .map((s, i) => ({
        name: s.name,
        allocation: (s.performance?.current_weight || 0) * 100,
        color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
      })),
  [leaderboard]);

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
    const wp = trades.length > 0 ? wins.length / trades.length : 0;
    const expectancy = wp * avgWin - (1 - wp) * avgLoss;
    return { sharpe, sortino, maxDD, pf, avgWin, avgLoss, expectancy };
  }, [trades, snapshots]);

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PortfolioChart snapshots={snapshots} trades={trades} />
        <StrategyPnLChart leaderboard={leaderboard} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Strategy Leaderboard */}
        <div className="lg:col-span-2 bg-[#12121a] border border-gray-800/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              Strategy Performance
            </h2>
            <button onClick={() => onNavigate("strategies")} className="text-xs text-blue-400 hover:text-blue-300">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/50 text-xs text-gray-400 uppercase font-mono">
                  <th className="px-6 py-3 text-left">Rank</th>
                  <th className="px-6 py-3 text-left">Strategy</th>
                  <th className="px-6 py-3 text-center">Asset</th>
                  <th className="px-6 py-3 text-right">Win Rate</th>
                  <th className="px-6 py-3 text-right">Alloc</th>
                  <th className="px-6 py-3 text-right">Trades</th>
                  <th className="px-6 py-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {leaderboard.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">Initializing strategies...</td></tr>
                ) : (
                  leaderboard.slice(0, 10).map((s, idx) => {
                    const wr = (s.expectedWinRate || 0.5) * 100;
                    const alloc = (s.performance?.current_weight || 0) * 100;
                    const pnl = s.performance?.total_pnl || 0;
                    return (
                      <tr key={s.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            s.rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
                            s.rank === 2 ? "bg-gray-400/20 text-gray-300" :
                            s.rank === 3 ? "bg-orange-500/20 text-orange-400" :
                            "bg-gray-800 text-gray-500"
                          }`}>{s.rank}</div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: STRATEGY_COLORS[idx % STRATEGY_COLORS.length] }} />
                            <div>
                              <p className="font-medium text-white text-sm">{s.name}</p>
                              <p className="text-[10px] text-gray-500 truncate max-w-[180px]">{s.description?.slice(0, 50)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono ${s.asset_class === "crypto" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                            {s.asset_class.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${wr >= 55 ? "bg-green-500" : wr <= 45 ? "bg-red-500" : "bg-yellow-500"}`} style={{ width: `${wr}%` }} />
                            </div>
                            <span className={`font-mono text-xs ${wr >= 55 ? "text-green-400" : wr <= 45 ? "text-red-400" : "text-gray-300"}`}>{wr.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-xs text-cyan-400">{alloc.toFixed(1)}%</td>
                        <td className="px-6 py-3 text-right font-mono text-xs text-gray-400">{s.performance?.total_trades || 0}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`font-mono text-xs font-medium ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Capital Allocation */}
          <div className="bg-[#12121a] border border-gray-800/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full" />
              Capital Allocation
            </h2>
            {allocationData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Allocating...</p>
            ) : (
              <div className="space-y-2.5">
                {allocationData.slice(0, 8).map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-400 truncate max-w-[140px]">{item.name}</span>
                      <span className="text-[10px] font-mono text-cyan-400">{item.allocation.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(item.allocation * 2.5, 100)}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Risk Summary */}
          <div className="bg-[#12121a] border border-gray-800/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              Risk Summary
            </h2>
            <div className="space-y-2.5">
              {[
                { label: "Sharpe Ratio", value: riskMetrics.sharpe.toFixed(2), pos: riskMetrics.sharpe > 0 },
                { label: "Sortino Ratio", value: riskMetrics.sortino.toFixed(2), pos: riskMetrics.sortino > 0 },
                { label: "Max Drawdown", value: `${riskMetrics.maxDD.toFixed(1)}%`, pos: false },
                { label: "Profit Factor", value: riskMetrics.pf === Infinity ? "\u221e" : riskMetrics.pf.toFixed(2), pos: riskMetrics.pf > 1 },
                { label: "Expectancy", value: fmt(riskMetrics.expectancy), pos: riskMetrics.expectancy > 0 },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{r.label}</span>
                  <span className={`text-sm font-mono font-bold ${r.pos ? "text-green-400" : "text-red-400"}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-[#12121a] border border-gray-800/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${agentStatus.isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              System Status
            </h2>
            <div className="space-y-2">
              {[
                { label: "Engine", value: agentStatus.isRunning ? "ONLINE" : "OFFLINE", cls: agentStatus.isRunning ? "text-green-400" : "text-red-400" },
                { label: "Mode", value: "PAPER", cls: "text-yellow-400" },
                { label: "Active", value: strategies.filter(s => s.status === "deployed").length.toString(), cls: "text-blue-400" },
                { label: "Paused", value: strategies.filter(s => s.status === "paused").length.toString(), cls: "text-yellow-400" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-800/30 last:border-0">
                  <span className="text-xs text-gray-400">{r.label}</span>
                  <span className={`text-xs font-mono ${r.cls}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity */}
          <div className="bg-[#12121a] border border-gray-800/50 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800/50">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                Live Activity
              </h2>
            </div>
            <div className="divide-y divide-gray-800/30 max-h-[200px] overflow-auto">
              {logs.slice(0, 12).map(l => (
                <div key={l.id} className="px-4 py-1.5 hover:bg-gray-800/20 transition-colors">
                  <div className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      l.level === "error" ? "bg-red-500" :
                      l.level === "warning" ? "bg-yellow-500" :
                      l.level === "decision" ? "bg-purple-500" : "bg-blue-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-300 truncate">{l.action}</p>
                      <p className="text-[10px] text-gray-600 font-mono">{fmtTime(l.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
