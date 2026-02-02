"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  getDailySnapshots,
  getRecentTrades,
  getActiveStrategies,
  getRecentLogs,
  getAgentStatus,
  DailySnapshot,
  AgentTrade,
  Strategy,
  AgentLog,
} from "@/lib/supabase";

export default function QuantDashboard() {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [trades, setTrades] = useState<AgentTrade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [agentStatus, setAgentStatus] = useState<{
    isRunning: boolean;
    lastActivity: string | null;
  }>({ isRunning: false, lastActivity: null });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [snapshotsData, tradesData, strategiesData, logsData, status] =
        await Promise.all([
          getDailySnapshots(30),
          getRecentTrades(20),
          getActiveStrategies(),
          getRecentLogs(50),
          getAgentStatus(),
        ]);

      setSnapshots(snapshotsData);
      setTrades(tradesData);
      setStrategies(strategiesData);
      setLogs(logsData);
      setAgentStatus(status);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const latestSnapshot = snapshots[0];
  const todaysTrades = trades.filter(
    (t) => new Date(t.created_at).toDateString() === new Date().toDateString()
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">
            Loading agent data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
            >
              ← Back to Portfolio
            </Link>
            <h1 className="text-xl font-semibold">AI Quant Agent</h1>
            <a
              href="https://github.com/adszapiro/szap-projects/tree/main/apps/quant-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--bg-secondary)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border)] rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View Source Code
            </a>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  agentStatus.isRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"
                }`}
              />
              <span className="text-sm text-[var(--text-secondary)]">
                {agentStatus.isRunning ? "Running" : "Offline"}
              </span>
            </div>
            <button
              onClick={fetchData}
              className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
            >
              Refresh
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              Last updated: {formatTime(lastRefresh.toISOString())}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              Portfolio Value
            </p>
            <p className="text-2xl font-bold">
              {latestSnapshot
                ? formatCurrency(latestSnapshot.portfolio_value)
                : "$--"}
            </p>
          </div>
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              Today&apos;s P&L
            </p>
            <p
              className={`text-2xl font-bold ${
                latestSnapshot && latestSnapshot.daily_pnl >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {latestSnapshot
                ? formatPercent(latestSnapshot.daily_pnl_percent)
                : "--"}
            </p>
          </div>
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              Total P&L
            </p>
            <p
              className={`text-2xl font-bold ${
                latestSnapshot && latestSnapshot.total_pnl >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {latestSnapshot
                ? formatPercent(latestSnapshot.total_pnl_percent)
                : "--"}
            </p>
          </div>
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              Win Rate Today
            </p>
            <p className="text-2xl font-bold">
              {latestSnapshot
                ? `${(latestSnapshot.win_rate_today * 100).toFixed(0)}%`
                : "--"}
            </p>
          </div>
        </motion.section>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Active Strategies */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              Active Strategies ({strategies.length})
            </h2>
            <div className="space-y-3">
              {strategies.length === 0 ? (
                <p className="text-[var(--text-secondary)] text-sm">
                  No active strategies. The agent will generate new ones during
                  the next cycle.
                </p>
              ) : (
                strategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className="bg-[var(--card)] rounded-lg p-4 border border-[var(--border)]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{strategy.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                          {strategy.description?.slice(0, 100)}...
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          strategy.asset_class === "crypto"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {strategy.asset_class}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {strategy.symbols?.map((symbol) => (
                        <span
                          key={symbol}
                          className="px-2 py-0.5 text-xs bg-[var(--bg)] rounded"
                        >
                          {symbol}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>

          {/* Recent Trades */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Recent Trades ({todaysTrades.length} today)
            </h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {trades.length === 0 ? (
                <p className="text-[var(--text-secondary)] text-sm">
                  No trades yet. The agent will execute trades when conditions
                  are met.
                </p>
              ) : (
                trades.slice(0, 10).map((trade) => (
                  <div
                    key={trade.id}
                    className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${
                          trade.side === "buy"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {trade.side.toUpperCase()}
                      </span>
                      <div>
                        <span className="font-medium">{trade.symbol}</span>
                        <span className="text-sm text-[var(--text-secondary)] ml-2">
                          {trade.qty} @ ${trade.price?.toFixed(2) || "--"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {trade.pnl !== null && (
                        <span
                          className={`text-sm font-medium ${
                            trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {formatCurrency(trade.pnl)}
                        </span>
                      )}
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatDate(trade.created_at)}{" "}
                        {formatTime(trade.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>
        </div>

        {/* Agent Logs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
            Agent Activity Log
          </h2>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p className="p-4 text-[var(--text-secondary)]">
                  No activity logs yet. Start the agent to see real-time
                  activity.
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="px-4 py-2 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          log.level === "error"
                            ? "bg-red-500/20 text-red-400"
                            : log.level === "warning"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : log.level === "decision"
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        [{formatTime(log.created_at)}]
                      </span>
                      <span className="text-[var(--text)]">{log.action}</span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <pre className="text-xs text-[var(--text-muted)] mt-1 ml-20 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2).slice(0, 200)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.section>

        {/* Performance Chart Placeholder */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <h2 className="text-lg font-semibold mb-4">Performance History</h2>
          <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
            {snapshots.length === 0 ? (
              <p className="text-center text-[var(--text-secondary)]">
                Performance data will appear here once the agent starts
                trading.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {snapshots.slice(0, 5).map((snapshot) => (
                  <div key={snapshot.id} className="text-center">
                    <p className="text-sm text-[var(--text-secondary)]">
                      {formatDate(snapshot.date)}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        snapshot.daily_pnl >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {formatPercent(snapshot.daily_pnl_percent)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {snapshot.trades_today} trades
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* Footer Info */}
        <footer className="mt-12 text-center text-sm text-[var(--text-muted)]">
          <p>
            Dual-model AI (GPT-4 + Claude) | Paper Trading via Alpaca | 24/7
            Crypto + Market Hours Stocks
          </p>
          <p className="mt-1">
            Data refreshes automatically every 30 seconds. Agent runs locally on
            your machine.
          </p>
        </footer>
      </main>
    </div>
  );
}
