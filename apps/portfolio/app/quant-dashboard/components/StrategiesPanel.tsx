"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { StrategyWithPerformance } from "@/lib/supabase";

const STRATEGY_COLORS = [
  "#d4a574", "#c9825b", "#b8895f", "#a67c52", "#9cb870",
  "#d9a45e", "#c67b6a", "#8fa4b8", "#b89c7f", "#a68a6d",
];

interface StrategiesPanelProps {
  leaderboard: StrategyWithPerformance[];
}

export default function StrategiesPanel({ leaderboard }: StrategiesPanelProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "stock" | "crypto">("all");

  const filtered = useMemo(() =>
    leaderboard.filter(s => {
      const matchesSearch = search === "" || s.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || s.asset_class === filter;
      return matchesSearch && matchesFilter;
    }),
  [leaderboard, search, filter]);

  const allocationData = useMemo(() =>
    leaderboard
      .filter(s => s.performance?.current_weight && s.performance.current_weight > 0)
      .sort((a, b) => (b.performance?.current_weight || 0) - (a.performance?.current_weight || 0))
      .slice(0, 10)
      .map((s, i) => ({
        name: s.name,
        allocation: (s.performance?.current_weight || 0) * 100,
        color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
      })),
  [leaderboard]);

  return (
    <div className="space-y-5">
      {/* Capital Allocation Bar */}
      {allocationData.length > 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--accent)] rounded-full" />
            Capital Allocation
          </h2>
          <div className="flex h-3 rounded-full overflow-hidden bg-[var(--bg-elevated)]">
            {allocationData.map((item, i) => (
              <motion.div
                key={i}
                initial={{ width: 0 }}
                animate={{ width: `${item.allocation}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="h-full"
                style={{ backgroundColor: item.color }}
                title={`${item.name}: ${item.allocation.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {allocationData.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[100px]">{item.name}</span>
                <span className="text-[10px] font-mono text-[var(--accent-warm)]">{item.allocation.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-2xl p-5">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search strategies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/25"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "stock", "crypto"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                filter === f
                  ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-hover)] hover:bg-[var(--border)]"
              }`}
            >
              {f === "all" ? "All" : f === "stock" ? "Stocks" : "Crypto"}
            </button>
          ))}
        </div>
        <span className="text-sm text-[var(--text-muted)] self-center">{filtered.length} of {leaderboard.length}</span>
      </div>

      {/* Strategy Cards */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
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
              className="bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-2xl p-6 hover:border-[var(--border-hover)] transition-colors duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-9 rounded-full" style={{ backgroundColor: STRATEGY_COLORS[idx % STRATEGY_COLORS.length] }} />
                  <div>
                    <h3 className="font-semibold text-[var(--text)] text-sm">{strategy.name}</h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">Rank #{strategy.rank || "--"}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  strategy.asset_class === "crypto" ? "bg-[var(--accent-warm)]/20 text-[var(--accent-warm)]" : "bg-[var(--accent)]/20 text-[var(--accent)]"
                }`}>
                  {strategy.asset_class.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">{strategy.description}</p>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase mb-0.5">Win Rate</p>
                  <p className={`text-lg font-mono font-bold ${wr >= 55 ? "text-[var(--positive)]" : wr <= 45 ? "text-[var(--negative)]" : "text-[var(--text-secondary)]"}`}>
                    {wr.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase mb-0.5">Allocation</p>
                  <p className="text-lg font-mono font-bold text-[var(--accent-warm)]">{alloc.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase mb-0.5">P&L</p>
                  <p className={`text-lg font-mono font-bold ${pnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="bg-[var(--bg-elevated)] rounded px-2 py-1.5">
                  <span className="text-[var(--text-muted)]">Trades: </span>
                  <span className="text-[var(--text-secondary)] font-mono">{strategy.performance?.total_trades || 0}</span>
                </div>
                <div className="bg-[var(--bg-elevated)] rounded px-2 py-1.5">
                  <span className="text-[var(--text-muted)]">Wins: </span>
                  <span className="text-[var(--positive)] font-mono">{strategy.performance?.winning_trades || 0}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {strategy.symbols?.slice(0, 5).map(sym => (
                  <span key={sym} className="text-[10px] px-1.5 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-muted)] rounded font-mono">{sym}</span>
                ))}
                {(strategy.symbols?.length || 0) > 5 && (
                  <span className="text-[10px] px-1.5 py-0.5 text-[var(--text-muted)]">+{(strategy.symbols?.length || 0) - 5}</span>
                )}
              </div>

              <div className="flex items-center pt-3 border-t border-[var(--border)]/40">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    strategy.status === "deployed" ? "bg-[var(--positive)]" : strategy.status === "paused" ? "bg-[var(--warning)]" : "bg-[var(--text-muted)]"
                  }`} />
                  <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">{strategy.status}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
