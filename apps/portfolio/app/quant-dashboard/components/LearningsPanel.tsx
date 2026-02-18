"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { ChildLearning, StrategyRiskScore, AgentLog } from "@/lib/supabase";

interface LearningsPanelProps {
  learnings: ChildLearning[];
  riskScores: (StrategyRiskScore & { name?: string })[];
  learningLogs: AgentLog[];
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.7 ? "var(--positive)" :
    value <= 0.3 ? "var(--negative)" :
    "var(--warning)";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-[var(--border)]/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono w-7 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-semibold text-[var(--text)] font-mono uppercase tracking-wider">{title}</h3>
      <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">{count}</span>
    </div>
  );
}

export default function LearningsPanel({ learnings, riskScores, learningLogs }: LearningsPanelProps) {
  const [assetFilter, setAssetFilter] = useState<"all" | "stock" | "crypto">("all");
  const [patternFilter, setPatternFilter] = useState<"all" | "use" | "avoid">("all");

  // Last learning cycle log
  const lastCycle = useMemo(() =>
    learningLogs.find(l => l.action === "learning_cycle_completed"),
  [learningLogs]);

  const convergence = lastCycle
    ? Number((lastCycle.details as Record<string, unknown>)?.convergence ?? 0)
    : null;

  // Pattern counts
  const recentLosses = learningLogs.filter(l => l.action === "loss_analyzed").length;
  const recentWins = learningLogs.filter(l => l.action === "win_analyzed").length;
  const paused = learningLogs.filter(l => l.action === "strategy_paused").length;
  const retired = learningLogs.filter(l => l.action === "strategy_retired").length;

  // Filtered learnings
  const filtered = useMemo(() => {
    return learnings.filter(l => {
      const matchesAsset = assetFilter === "all" || l.asset_class === assetFilter;
      const isUse = l.pattern.startsWith("USE:");
      const isAvoid = l.pattern.startsWith("AVOID:");
      const matchesPattern =
        patternFilter === "all" ? true :
        patternFilter === "use" ? isUse :
        isAvoid;
      return matchesAsset && matchesPattern;
    });
  }, [learnings, assetFilter, patternFilter]);

  // Proven patterns (confidence >= 0.7)
  const proven = filtered.filter(l => l.confidence >= 0.7);
  // Warning patterns (0.3 < confidence < 0.7)
  const uncertain = filtered.filter(l => l.confidence > 0.3 && l.confidence < 0.7);
  // Avoid patterns (confidence <= 0.3)
  const avoid = filtered.filter(l => l.confidence <= 0.3);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const stripPrefix = (pattern: string) =>
    pattern.replace(/^(USE:|AVOID:)\s*/, "");

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Patterns", value: learnings.length, color: "var(--accent)" },
          { label: "Proven (≥70%)", value: learnings.filter(l => l.confidence >= 0.7).length, color: "var(--positive)" },
          { label: "Avoid (≤30%)", value: learnings.filter(l => l.confidence <= 0.3).length, color: "var(--negative)" },
          { label: "Convergence", value: convergence !== null ? `${Math.round(convergence * 100)}%` : "—", color: "var(--text-secondary)" },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-xl p-4">
            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-semibold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Activity summary */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[var(--text)] font-mono uppercase tracking-wider">Recent ML Activity</h3>
          {lastCycle && (
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              Last cycle: {formatTime(lastCycle.created_at)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Wins analyzed", value: recentWins, color: "var(--positive)" },
            { label: "Losses analyzed", value: recentLosses, color: "var(--negative)" },
            { label: "Strats paused", value: paused, color: "var(--warning)" },
            { label: "Strats retired", value: retired, color: "var(--text-muted)" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
              <span className="text-lg font-semibold" style={{ color: item.color }}>{item.value}</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono leading-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", "stock", "crypto"] as const).map(f => (
            <button
              key={f}
              onClick={() => setAssetFilter(f)}
              className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded transition-colors ${
                assetFilter === f
                  ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] border border-transparent"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="h-3 w-px bg-[var(--border)]/40" />
        <div className="flex gap-1">
          {(["all", "use", "avoid"] as const).map(f => (
            <button
              key={f}
              onClick={() => setPatternFilter(f)}
              className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded transition-colors ${
                patternFilter === f
                  ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] border border-transparent"
              }`}
            >
              {f === "use" ? "✓ USE" : f === "avoid" ? "✗ AVOID" : "ALL"}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[var(--text-muted)] font-mono ml-auto">{filtered.length} patterns</span>
      </div>

      {/* Proven patterns */}
      {proven.length > 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--positive)]/20 rounded-xl p-4">
          <SectionHeader title="Proven — must incorporate" count={proven.length} />
          <div className="space-y-2">
            {proven.map(l => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3 py-2 border-b border-[var(--border)]/20 last:border-0"
              >
                <span className="text-[10px] font-mono text-[var(--positive)] mt-0.5 flex-shrink-0">USE</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text)] leading-relaxed">{stripPrefix(l.pattern)}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{l.asset_class}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{l.wins}W / {l.losses}L</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{l.source_model}</span>
                  </div>
                </div>
                <ConfidenceBar value={l.confidence} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Uncertain patterns */}
      {uncertain.length > 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-xl p-4">
          <SectionHeader title="Learning — building evidence" count={uncertain.length} />
          <div className="space-y-2">
            {uncertain.map(l => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3 py-2 border-b border-[var(--border)]/20 last:border-0"
              >
                <span className="text-[10px] font-mono text-[var(--warning)] mt-0.5 flex-shrink-0">
                  {l.pattern.startsWith("USE:") ? "USE" : "AVD"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{stripPrefix(l.pattern)}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{l.asset_class}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{l.wins}W / {l.losses}L</span>
                  </div>
                </div>
                <ConfidenceBar value={l.confidence} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Avoid patterns */}
      {avoid.length > 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--negative)]/20 rounded-xl p-4">
          <SectionHeader title="Avoid — must not use" count={avoid.length} />
          <div className="space-y-2">
            {avoid.map(l => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3 py-2 border-b border-[var(--border)]/20 last:border-0"
              >
                <span className="text-[10px] font-mono text-[var(--negative)] mt-0.5 flex-shrink-0">AVD</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{stripPrefix(l.pattern)}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{l.asset_class}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{l.wins}W / {l.losses}L</span>
                  </div>
                </div>
                <ConfidenceBar value={l.confidence} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-xl p-12 text-center">
          <p className="text-[var(--text-muted)] text-sm font-mono">No patterns yet.</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">Patterns accumulate as the bot trades and closes positions.</p>
        </div>
      )}

      {/* Risk scores table */}
      {riskScores.length > 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]/40 bg-[var(--bg-secondary)]">
            <h3 className="text-xs font-semibold text-[var(--text)] font-mono uppercase tracking-wider">Strategy Risk Scores</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)]/30">
                  {["Strategy", "Score", "Sharpe", "Sortino", "PF", "Expectancy", "MaxDD", "Trades"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-mono text-[var(--text-muted)] font-normal uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskScores.map(s => (
                  <tr key={s.strategy_id} className="border-b border-[var(--border)]/20 hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-3 py-2 font-mono text-[var(--text)] max-w-[140px] truncate">{s.name || s.strategy_id.slice(0, 8)}</td>
                    <td className="px-3 py-2">
                      <span className={`font-mono font-medium ${
                        s.composite_score >= 0.6 ? "text-[var(--positive)]" :
                        s.composite_score >= 0.4 ? "text-[var(--warning)]" :
                        "text-[var(--negative)]"
                      }`}>
                        {(s.composite_score * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{s.sharpe_ratio.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{s.sortino_ratio.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{s.profit_factor.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">${s.expectancy.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-[var(--negative)]">{(s.max_drawdown_pct * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2 font-mono text-[var(--text-muted)]">{s.trades_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
