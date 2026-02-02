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
  getResearchPapers,
  getStrategiesWithPerformance,
  getTournamentStats,
  DailySnapshot,
  AgentTrade,
  Strategy,
  AgentLog,
  ResearchPaper,
  StrategyWithPerformance,
} from "@/lib/supabase";

export default function QuantDashboard() {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [trades, setTrades] = useState<AgentTrade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [leaderboard, setLeaderboard] = useState<StrategyWithPerformance[]>([]);
  const [tournamentStats, setTournamentStats] = useState<{
    totalStrategies: number;
    totalPapers: number;
    averageWinRate: number;
    topPerformer: string | null;
    totalTrades: number;
  } | null>(null);
  const [agentStatus, setAgentStatus] = useState<{
    isRunning: boolean;
    lastActivity: string | null;
  }>({ isRunning: false, lastActivity: null });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<"overview" | "tournament" | "trades" | "logs">("overview");

  const fetchData = useCallback(async () => {
    try {
      const [snapshotsData, tradesData, strategiesData, logsData, status, papersData, leaderboardData, statsData] =
        await Promise.all([
          getDailySnapshots(30),
          getRecentTrades(50),
          getActiveStrategies(),
          getRecentLogs(100),
          getAgentStatus(),
          getResearchPapers(),
          getStrategiesWithPerformance(),
          getTournamentStats(),
        ]);

      setSnapshots(snapshotsData);
      setTrades(tradesData);
      setStrategies(strategiesData);
      setLogs(logsData);
      setAgentStatus(status);
      setPapers(papersData);
      setLeaderboard(leaderboardData);
      setTournamentStats(statsData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate stats from trades and logs
  const portfolioValue = 50000; // Simulated starting capital
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl && t.pnl > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100) : 0;
  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const pnlPercent = (totalPnL / portfolioValue) * 100;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-gray-400 hover:text-black transition-colors text-sm"
              >
                ← Portfolio
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-black">AI Quant Agent</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Autonomous trading with GPT-4 + Claude
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
                <span
                  className={`w-2 h-2 rounded-full ${
                    agentStatus.isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {agentStatus.isRunning ? "Live" : "Offline"}
                </span>
              </div>
              <a
                href="https://github.com/adszapiro/szap-projects/tree/main/apps/quant-agent"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-black transition-colors"
              >
                Source Code →
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10"
        >
          <div className="p-6 border border-gray-200 rounded-lg">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Portfolio Value</p>
            <p className="text-3xl font-light text-black">
              {formatCurrency(portfolioValue + totalPnL)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Simulated Paper Trading</p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Total P&L</p>
            <p className={`text-3xl font-light ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL)}
            </p>
            <p className={`text-xs mt-1 ${pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
              {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
            </p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Total Trades</p>
            <p className="text-3xl font-light text-black">{totalTrades}</p>
            <p className="text-xs text-gray-400 mt-1">{strategies.length} active strategies</p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Win Rate</p>
            <p className="text-3xl font-light text-black">{winRate.toFixed(0)}%</p>
            <p className="text-xs text-gray-400 mt-1">{winningTrades} / {totalTrades} trades</p>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(["overview", "tournament", "trades", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-black text-black"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab === "tournament" ? "Tournament 🏆" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 py-2">
            <button
              onClick={fetchData}
              className="text-xs text-gray-400 hover:text-black transition-colors"
            >
              Refresh
            </button>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-xs text-gray-400">
              Updated {formatTime(lastRefresh.toISOString())}
            </span>
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Active Strategies */}
              <div>
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                  Active Strategies
                </h2>
                <div className="space-y-3">
                  {strategies.length === 0 ? (
                    <p className="text-gray-400 text-sm py-8 text-center border border-dashed border-gray-200 rounded-lg">
                      No active strategies. Agent will generate them automatically.
                    </p>
                  ) : (
                    strategies.map((strategy) => (
                      <div
                        key={strategy.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-black">{strategy.name}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              strategy.asset_class === "crypto"
                                ? "bg-purple-50 text-purple-600"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {strategy.asset_class}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                          {strategy.description}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {strategy.symbols?.slice(0, 5).map((symbol) => (
                            <span
                              key={symbol}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                            >
                              {symbol}
                            </span>
                          ))}
                          {strategy.symbols && strategy.symbols.length > 5 && (
                            <span className="text-xs px-2 py-0.5 text-gray-400">
                              +{strategy.symbols.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                  Recent Activity
                </h2>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[400px] overflow-auto">
                  {logs.length === 0 ? (
                    <p className="text-gray-400 text-sm py-8 text-center">
                      No activity yet. Start the agent to see logs.
                    </p>
                  ) : (
                    logs.slice(0, 20).map((log) => (
                      <div key={log.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              log.level === "error"
                                ? "bg-red-500"
                                : log.level === "warning"
                                ? "bg-yellow-500"
                                : log.level === "decision"
                                ? "bg-purple-500"
                                : "bg-blue-500"
                            }`}
                          />
                          <span className="text-sm text-black flex-1 truncate">
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatTime(log.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "tournament" && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Strategy Leaderboard */}
              <div>
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                  Strategy Leaderboard
                </h2>
                {leaderboard.length === 0 ? (
                  <p className="text-gray-400 text-sm py-8 text-center border border-dashed border-gray-200 rounded-lg">
                    No strategies in tournament yet.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allocation</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {leaderboard.slice(0, 10).map((strategy) => (
                          <tr key={strategy.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className={`text-sm font-medium ${
                                strategy.rank === 1 ? "text-yellow-600" :
                                strategy.rank === 2 ? "text-gray-500" :
                                strategy.rank === 3 ? "text-orange-600" : "text-gray-400"
                              }`}>
                                {strategy.rank === 1 ? "🥇" : strategy.rank === 2 ? "🥈" : strategy.rank === 3 ? "🥉" : `#${strategy.rank}`}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-black truncate max-w-[200px]">{strategy.name}</div>
                              <div className="text-xs text-gray-400">{strategy.asset_class}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-medium ${
                                (strategy.expectedWinRate || 0) >= 0.55 ? "text-green-600" :
                                (strategy.expectedWinRate || 0) <= 0.45 ? "text-red-600" : "text-gray-600"
                              }`}>
                                {((strategy.expectedWinRate || 0.5) * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {((strategy.performance?.current_weight || 0) * 100).toFixed(1)}%
                            </td>
                            <td className={`px-4 py-3 text-right font-medium ${
                              (strategy.performance?.total_pnl || 0) >= 0 ? "text-green-600" : "text-red-600"
                            }`}>
                              {formatCurrency(strategy.performance?.total_pnl || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tournament Stats */}
                {tournamentStats && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">Tournament Stats</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Total Strategies</p>
                        <p className="font-medium text-black">{tournamentStats.totalStrategies}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total Trades</p>
                        <p className="font-medium text-black">{tournamentStats.totalTrades}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Avg Win Rate</p>
                        <p className="font-medium text-black">{(tournamentStats.averageWinRate * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Research Papers</p>
                        <p className="font-medium text-black">{tournamentStats.totalPapers}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Research Papers Library */}
              <div>
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                  Research Paper Library
                </h2>
                {papers.length === 0 ? (
                  <p className="text-gray-400 text-sm py-8 text-center border border-dashed border-gray-200 rounded-lg">
                    No research papers added yet.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-auto">
                    {papers.map((paper) => (
                      <div
                        key={paper.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-black text-sm">{paper.title}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              paper.status === "active"
                                ? "bg-green-50 text-green-600"
                                : paper.status === "extracted"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {paper.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          {paper.authors?.join(", ")} ({paper.year}) • {paper.source}
                        </p>
                        {paper.key_insights && paper.key_insights.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-1">Key Insights:</p>
                            <ul className="text-xs text-gray-600 space-y-0.5">
                              {paper.key_insights.slice(0, 2).map((insight, i) => (
                                <li key={i}>• {insight}</li>
                              ))}
                              {paper.key_insights.length > 2 && (
                                <li className="text-gray-400">+{paper.key_insights.length - 2} more...</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "trades" && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                Trade History
              </h2>
              {trades.length === 0 ? (
                <p className="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-lg">
                  No trades executed yet. The agent will trade when market conditions are met.
                </p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Side</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{formatTime(trade.created_at)}</td>
                          <td className="px-4 py-3 font-medium text-black">{trade.symbol}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded ${
                                trade.side === "buy"
                                  ? "bg-green-50 text-green-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {trade.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">{trade.qty}</td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            ${trade.price?.toFixed(2) || "--"}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${
                            trade.pnl && trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {trade.pnl ? formatCurrency(trade.pnl) : "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                Agent Logs
              </h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-900 text-gray-100 font-mono text-xs">
                <div className="max-h-[500px] overflow-auto p-4 space-y-1">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 py-8 text-center">No logs available</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex gap-3 py-1 hover:bg-gray-800/50">
                        <span className="text-gray-500 flex-shrink-0">
                          {formatTime(log.created_at)}
                        </span>
                        <span
                          className={`flex-shrink-0 w-16 ${
                            log.level === "error"
                              ? "text-red-400"
                              : log.level === "warning"
                              ? "text-yellow-400"
                              : log.level === "decision"
                              ? "text-purple-400"
                              : "text-blue-400"
                          }`}
                        >
                          [{log.level}]
                        </span>
                        <span className="text-gray-300">{log.action}</span>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <span className="text-gray-600 truncate">
                            {JSON.stringify(log.details)}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Paper trading simulation using real market data. Tournament mode with Thompson Sampling bandit learns from results. Auto-refreshes every 15 seconds.
          </p>
        </footer>
      </main>
    </div>
  );
}
