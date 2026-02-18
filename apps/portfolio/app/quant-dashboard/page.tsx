"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

import Sidebar, { type TabId } from "./components/Sidebar";
import MetricsBar from "./components/MetricsBar";
import OverviewPanel from "./components/OverviewPanel";
import StrategiesPanel from "./components/StrategiesPanel";
import TradesPanel from "./components/TradesPanel";
import ResearchPanel from "./components/ResearchPanel";
import LogsPanel from "./components/LogsPanel";

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setError(null);
    try {
      const [snapshotsData, tradesData, strategiesData, logsData, status, papersData, leaderboardData, statsData] =
        await Promise.all([
          getDailySnapshots(30),
          getRecentTrades(100),
          getActiveStrategies(),
          getRecentLogs(200),
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
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);


  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] text-sm font-mono">Connecting to trading system...</p>
        </div>
      </div>
    );
  }

  if (error && trades.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-semibold text-[var(--text)] mb-2">Connection Error</h2>
          <p className="text-[var(--text-muted)] text-sm mb-4">{error}</p>
          <button onClick={() => fetchData(true)} className="px-6 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg text-sm font-medium transition-colors text-[var(--bg)]">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        agentStatus={agentStatus}
        lastRefresh={lastRefresh}
        refreshing={refreshing}
        onRefresh={() => fetchData(true)}
        strategiesCount={strategies.length}
        papersCount={tournamentStats?.totalPapers || 0}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
      />

      <div className="lg:ml-[220px]">
        <MetricsBar trades={trades} snapshots={snapshots} />

        <main className="px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "overview" && (
                <OverviewPanel
                  snapshots={snapshots}
                  trades={trades}
                  leaderboard={leaderboard}
                />
              )}
              {activeTab === "strategies" && (
                <StrategiesPanel leaderboard={leaderboard} />
              )}
              {activeTab === "trades" && <TradesPanel trades={trades} />}
              {activeTab === "research" && <ResearchPanel papers={papers} strategies={strategies} />}
              {activeTab === "logs" && <LogsPanel logs={logs} />}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="border-t border-[var(--border)]/40 mt-4">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-3">
                <span className="font-mono">Paper Trading</span>
                <span>&#8226;</span>
                <span>Thompson Sampling</span>
                <span>&#8226;</span>
                <span>Auto-refresh 10s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--positive)] rounded-full animate-pulse" />
                <span className="font-mono">Connected</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
