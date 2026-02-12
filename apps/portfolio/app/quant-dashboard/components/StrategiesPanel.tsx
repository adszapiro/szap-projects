"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import type { StrategyWithPerformance } from "@/lib/supabase";

const STRATEGY_COLORS = [
  "#2196F3", "#00BCD4", "#009688", "#4CAF50", "#8BC34A",
  "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800", "#FF5722",
];

interface StrategiesPanelProps {
  leaderboard: StrategyWithPerformance[];
  onStrategyAction: (id: string, action: "pause" | "resume") => void;
  strategyActions: Record<string, boolean>;
}

export default function StrategiesPanel({ leaderboard, onStrategyAction, strategyActions }: StrategiesPanelProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "stock" | "crypto">("all");

  const filtered = useMemo(() =>
    leaderboard.filter(s => {
      const matchesSearch = search === "" || s.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || s.asset_class === filter;
      return matchesSearch && matchesFilter;
    }),
  [leaderboard, search, filter]);

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[#12121a] border border-gray-800/50 rounded-xl p-4">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search strategies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "stock", "crypto"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50"
              }`}
            >
              {f === "all" ? "All" : f === "stock" ? "Stocks" : "Crypto"}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500 self-center">{filtered.length} of {leaderboard.length}</span>
      </div>

      {/* Strategy Cards */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((strategy, idx) => {
          const wr = (strategy.expectedWinRate || 0.5) * 100;
          const alloc = (strategy.performance?.current_weight || 0) * 100;
          const pnl = strategy.performance?.total_pnl || 0;

          return (
            <motion.div
              key={strategy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-[#12121a] border border-gray-800/50 rounded-xl p-5 hover:border-gray-700/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-9 rounded-full" style={{ backgroundColor: STRATEGY_COLORS[idx % STRATEGY_COLORS.length] }} />
                  <div>
                    <h3 className="font-semibold text-white text-sm">{strategy.name}</h3>
                    <p className="text-[10px] text-gray-500 font-mono">Rank #{strategy.rank || "--"}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  strategy.asset_class === "crypto" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                }`}>
                  {strategy.asset_class.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{strategy.description}</p>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-0.5">Win Rate</p>
                  <p className={`text-lg font-mono font-bold ${wr >= 55 ? "text-green-400" : wr <= 45 ? "text-red-400" : "text-gray-300"}`}>
                    {wr.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-0.5">Allocation</p>
                  <p className="text-lg font-mono font-bold text-cyan-400">{alloc.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-0.5">P&L</p>
                  <p className={`text-lg font-mono font-bold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="bg-gray-800/30 rounded px-2 py-1.5">
                  <span className="text-gray-500">Trades: </span>
                  <span className="text-gray-300 font-mono">{strategy.performance?.total_trades || 0}</span>
                </div>
                <div className="bg-gray-800/30 rounded px-2 py-1.5">
                  <span className="text-gray-500">Wins: </span>
                  <span className="text-green-400 font-mono">{strategy.performance?.winning_trades || 0}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {strategy.symbols?.slice(0, 5).map(sym => (
                  <span key={sym} className="text-[10px] px-1.5 py-0.5 bg-gray-800/50 text-gray-400 rounded font-mono">{sym}</span>
                ))}
                {(strategy.symbols?.length || 0) > 5 && (
                  <span className="text-[10px] px-1.5 py-0.5 text-gray-500">+{(strategy.symbols?.length || 0) - 5}</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    strategy.status === "deployed" ? "bg-green-500" : strategy.status === "paused" ? "bg-yellow-500" : "bg-gray-500"
                  }`} />
                  <span className="text-[10px] text-gray-400 font-mono uppercase">{strategy.status}</span>
                </div>
                <button
                  onClick={() => onStrategyAction(strategy.id, strategy.status === "deployed" ? "pause" : "resume")}
                  disabled={strategyActions[strategy.id]}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                    strategy.status === "deployed"
                      ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                      : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  }`}
                >
                  {strategyActions[strategy.id] ? "..." : strategy.status === "deployed" ? "Pause" : "Resume"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
