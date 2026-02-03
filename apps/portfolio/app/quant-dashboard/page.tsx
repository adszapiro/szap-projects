"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
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

// Professional color scheme
const COLORS = {
  green: "#00C853",
  red: "#FF5252",
  blue: "#2196F3",
  purple: "#9C27B0",
  orange: "#FF9800",
  cyan: "#00BCD4",
  yellow: "#FFEB3B",
};

const STRATEGY_COLORS = [
  "#2196F3", "#00BCD4", "#009688", "#4CAF50", "#8BC34A",
  "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800", "#FF5722",
];

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
  const [activeTab, setActiveTab] = useState<"overview" | "strategies" | "research" | "trades" | "logs">("overview");
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [tradesPage, setTradesPage] = useState(1);
  const TRADES_PER_PAGE = 20;
  const [strategyActions, setStrategyActions] = useState<Record<string, boolean>>({});

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

  const handleStrategyAction = useCallback(async (strategyId: string, action: "pause" | "resume") => {
    setStrategyActions(prev => ({ ...prev, [strategyId]: true }));
    try {
      const response = await fetch(`/api/strategies/${strategyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      
      if (response.ok) {
        // Refresh data to get updated status
        await fetchData();
      } else {
        console.error("Failed to update strategy");
      }
    } catch (error) {
      console.error("Strategy action error:", error);
    } finally {
      setStrategyActions(prev => ({ ...prev, [strategyId]: false }));
    }
  }, [fetchData]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const portfolioValue = 100000;
    const totalTrades = trades.length;
    
    // Only count closed trades (with P&L) for win rate calculation
    const closedTrades = trades.filter(t => t.pnl !== null);
    const winningTradesArr = closedTrades.filter(t => t.pnl && t.pnl > 0);
    const losingTradesArr = closedTrades.filter(t => t.pnl && t.pnl < 0);
    const winningTrades = winningTradesArr.length;
    const losingTrades = losingTradesArr.length;
    
    // Win rate based on closed trades only (not open positions)
    const closedTradesCount = closedTrades.length;
    const winRate = closedTradesCount > 0 ? (winningTrades / closedTradesCount * 100) : 0;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const pnlPercent = (totalPnL / portfolioValue) * 100;
    
    // Calculate returns for risk metrics
    const returns = trades.filter(t => t.pnl).map(t => (t.pnl || 0) / portfolioValue);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1 
      ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
      : 0;
    
    // Sharpe Ratio (annualized)
    const dailyRiskFree = 0.05 / 252; // 5% annual risk-free rate
    const sharpeRatio = stdDev > 0 ? ((avgReturn - dailyRiskFree) / stdDev) * Math.sqrt(252) : 0;
    
    // Sortino Ratio (downside deviation only)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideStdDev = downsideReturns.length > 0
      ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length)
      : 0;
    const sortinoRatio = downsideStdDev > 0 ? ((avgReturn - dailyRiskFree) / downsideStdDev) * Math.sqrt(252) : 0;

    // Max drawdown
    let peak = portfolioValue;
    let maxDrawdown = 0;
    let runningValue = portfolioValue;
    trades.forEach(t => {
      runningValue += (t.pnl || 0);
      if (runningValue > peak) peak = runningValue;
      const drawdown = (peak - runningValue) / peak * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    // Profit Factor: Total Wins / Total Losses
    const totalWins = winningTradesArr.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losingTradesArr.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    
    // Average Win/Loss
    const avgWin = winningTrades > 0 ? totalWins / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
    
    // Expectancy
    const winProb = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const lossProb = 1 - winProb;
    const expectancy = (winProb * avgWin) - (lossProb * avgLoss);

    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = trades.filter(t => t.created_at.startsWith(today));
    const todayPnL = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    // P&L Trend: Compare last 5 closed trades vs previous 5
    const recentClosed = closedTrades.slice(0, 10); // Most recent 10 closed trades
    const last5Pnl = recentClosed.slice(0, 5).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const prev5Pnl = recentClosed.slice(5, 10).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const pnlTrend = last5Pnl > prev5Pnl ? "up" : last5Pnl < prev5Pnl ? "down" : "flat";
    const trendStrength = recentClosed.length >= 5 ? Math.abs(last5Pnl - prev5Pnl) : 0;

    return {
      portfolioValue: portfolioValue + totalPnL,
      totalPnL,
      pnlPercent,
      totalTrades,
      winningTrades,
      losingTrades,
      closedTradesCount,
      winRate,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      profitFactor,
      avgWin,
      avgLoss,
      expectancy,
      todayTrades: todayTrades.length,
      todayPnL,
      pnlTrend,
      trendStrength,
    };
  }, [trades]);

  // Strategy allocation data
  const allocationData = useMemo(() => {
    return leaderboard
      .filter(s => s.performance?.current_weight && s.performance.current_weight > 0)
      .map((s, i) => ({
        name: s.name,
        allocation: (s.performance?.current_weight || 0) * 100,
        color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
        pnl: s.performance?.total_pnl || 0,
        winRate: s.expectedWinRate || 0.5,
      }));
  }, [leaderboard]);

  // P&L History for chart
  const pnlHistory = useMemo(() => {
    if (trades.length === 0) return [];
    
    // Sort trades by date (oldest first)
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Group by date and calculate cumulative P&L
    const dailyPnL: { [date: string]: number } = {};
    let cumulativePnL = 0;
    
    sortedTrades.forEach(trade => {
      const date = trade.created_at.split('T')[0];
      cumulativePnL += (trade.pnl || 0);
      dailyPnL[date] = cumulativePnL;
    });
    
    // Convert to array for chart
    return Object.entries(dailyPnL).map(([date, pnl]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: pnl,
      value: 100000 + pnl,
    }));
  }, [trades]);

  // Strategy performance comparison data
  const strategyComparison = useMemo(() => {
    return leaderboard
      .slice(0, 10)
      .map((s, i) => ({
        name: s.name.length > 15 ? s.name.slice(0, 15) + '...' : s.name,
        fullName: s.name,
        winRate: ((s.expectedWinRate || 0.5) * 100),
        pnl: s.performance?.total_pnl || 0,
        trades: s.performance?.total_trades || 0,
        allocation: (s.performance?.current_weight || 0) * 100,
        color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
      }));
  }, [leaderboard]);

  // Paginated trades
  const paginatedTrades = useMemo(() => {
    const start = (tradesPage - 1) * TRADES_PER_PAGE;
    const end = start + TRADES_PER_PAGE;
    return trades.slice(start, end);
  }, [trades, tradesPage]);

  const totalTradesPages = Math.ceil(trades.length / TRADES_PER_PAGE);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  // Export trades to CSV
  const exportTradesToCSV = useCallback(() => {
    if (trades.length === 0) return;
    
    const headers = ["Date", "Time", "Symbol", "Side", "Asset Class", "Quantity", "Price", "Value", "P&L", "P&L %", "Status", "Reasoning"];
    const rows = trades.map(trade => {
      const date = new Date(trade.created_at);
      const value = trade.qty * (trade.price || 0);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        trade.symbol,
        trade.side.toUpperCase(),
        trade.asset_class,
        trade.qty.toString(),
        trade.price?.toFixed(2) || "",
        value.toFixed(2),
        trade.pnl?.toFixed(2) || "",
        trade.pnl_percent?.toFixed(2) || "",
        trade.status,
        (trade.reasoning || "").replace(/,/g, ";"), // Escape commas in reasoning
      ];
    });
    
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `quant-trades-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [trades]);

  const formatCompact = (value: number) =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(value);

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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm font-mono">Connecting to trading system...</p>
        </div>
      </div>
    );
  }

  if (error && trades.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchData(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Professional Header */}
      <header className="border-b border-gray-800/50 bg-[#0d0d14]">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                    Quant Research Terminal
                  </h1>
                  <p className="text-xs text-gray-500 font-mono">v2.0 | Paper Trading</p>
                </div>
              </Link>
              
              {/* Status Indicators */}
              <div className="flex items-center gap-4 border-l border-gray-800 pl-6">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${agentStatus.isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                  <span className="text-xs text-gray-400 font-mono">
                    {agentStatus.isRunning ? "LIVE" : "OFFLINE"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {strategies.length} Strategies | {tournamentStats?.totalPapers || 0} Papers
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 font-mono">Last Update</p>
                <p className="text-sm text-gray-300 font-mono">{formatTime(lastRefresh.toISOString())}</p>
              </div>
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <a
                href="https://github.com/adszapiro/szap-projects/tree/main/apps/quant-agent"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-gray-700 hover:border-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                Source Code
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Key Metrics Bar */}
      <div className="border-b border-gray-800/50 bg-[#0d0d14]/50">
        <div className="max-w-[1600px] mx-auto px-6 py-4 space-y-4">
          {/* Primary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <MetricCard
              label="Portfolio"
              value={formatCurrency(metrics.portfolioValue)}
              change={metrics.pnlPercent}
              size="large"
            />
            <MetricCard
              label="Total P&L"
              value={formatCurrency(metrics.totalPnL)}
              isPositive={metrics.totalPnL >= 0}
              size="large"
              trend={metrics.pnlTrend as "up" | "down" | "flat"}
            />
            <MetricCard
              label="Today"
              value={formatCurrency(metrics.todayPnL)}
              isPositive={metrics.todayPnL >= 0}
              subtext={`${metrics.todayTrades} trades`}
            />
            <MetricCard
              label="Win Rate"
              value={`${metrics.winRate.toFixed(1)}%`}
              subtext={`${metrics.winningTrades}W / ${metrics.losingTrades}L (${metrics.closedTradesCount} closed)`}
              isPositive={metrics.winRate >= 50}
            />
            <MetricCard
              label="Total Trades"
              value={metrics.totalTrades.toString()}
              subtext={`${strategies.length} strategies`}
            />
            <MetricCard
              label="Sharpe Ratio"
              value={metrics.sharpeRatio.toFixed(2)}
              isPositive={metrics.sharpeRatio > 0}
              subtext="Risk-adjusted"
            />
            <MetricCard
              label="Max Drawdown"
              value={`${metrics.maxDrawdown.toFixed(1)}%`}
              isPositive={false}
            />
            <MetricCard
              label="Avg Win Rate"
              value={`${((tournamentStats?.averageWinRate || 0.5) * 100).toFixed(1)}%`}
              subtext="Thompson Sampling"
              isPositive={(tournamentStats?.averageWinRate || 0.5) >= 0.5}
            />
          </div>
          {/* Risk Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-2 border-t border-gray-800/30">
            <MetricCard
              label="Sortino Ratio"
              value={metrics.sortinoRatio.toFixed(2)}
              isPositive={metrics.sortinoRatio > 0}
              subtext="Downside risk"
            />
            <MetricCard
              label="Profit Factor"
              value={metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}
              isPositive={metrics.profitFactor > 1}
              subtext="Wins / Losses"
            />
            <MetricCard
              label="Avg Win"
              value={formatCurrency(metrics.avgWin)}
              isPositive={true}
            />
            <MetricCard
              label="Avg Loss"
              value={formatCurrency(metrics.avgLoss)}
              isPositive={false}
            />
            <MetricCard
              label="Expectancy"
              value={formatCurrency(metrics.expectancy)}
              isPositive={metrics.expectancy > 0}
              subtext="Per trade"
            />
            <MetricCard
              label="Strategies Active"
              value={strategies.filter(s => s.status === "deployed").length.toString()}
              subtext={`${strategies.filter(s => s.status === "paused").length} paused`}
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-800/50">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: "overview", label: "Overview", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
              { id: "strategies", label: "Strategies", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
              { id: "research", label: "Research", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
              { id: "trades", label: "Trade History", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
              { id: "logs", label: "System Logs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400 bg-blue-500/5"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/30"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Charts Row */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* P&L Over Time Chart */}
                  <div className="bg-[#12121a] border border-gray-800/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Portfolio Value Over Time
                      </h2>
                      <span className="text-xs text-gray-500 font-mono">
                        {pnlHistory.length > 0 ? `${pnlHistory.length} data points` : 'Waiting for data...'}
                      </span>
                    </div>
                    {pnlHistory.length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={pnlHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={COLORS.green} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              stroke="#6b7280" 
                              fontSize={10} 
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              stroke="#6b7280" 
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1a1a24', 
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              labelStyle={{ color: '#9ca3af' }}
                              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio']}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke={COLORS.green} 
                              strokeWidth={2}
                              fill="url(#colorValue)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <svg className="w-10 h-10 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                          </svg>
                          <p className="text-sm">Collecting P&L data...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Strategy P&L Comparison Chart */}
                  <div className="bg-[#12121a] border border-gray-800/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Strategy P&L Comparison
                      </h2>
                      <span className="text-xs text-gray-500 font-mono">Top 10 strategies</span>
                    </div>
                    {strategyComparison.length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={strategyComparison} 
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={true} vertical={false} />
                            <XAxis 
                              type="number"
                              stroke="#6b7280" 
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => `$${v.toFixed(0)}`}
                            />
                            <YAxis 
                              type="category"
                              dataKey="name" 
                              stroke="#6b7280" 
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              width={75}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1a1a24', 
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              labelStyle={{ color: '#9ca3af' }}
                              formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                            />
                            <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                              {strategyComparison.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.pnl >= 0 ? COLORS.green : COLORS.red}
                                  opacity={0.8}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <svg className="w-10 h-10 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p className="text-sm">Loading strategy data...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Strategy Performance */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Strategy Leaderboard */}
                  <div className="bg-[#12121a] border border-gray-800/50 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Strategy Performance
                      </h2>
                      <span className="text-xs text-gray-500 font-mono">Thompson Sampling • Real-time</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-900/50 text-xs text-gray-400 uppercase font-mono">
                            <th className="px-6 py-3 text-left">Rank</th>
                            <th className="px-6 py-3 text-left">Strategy</th>
                            <th className="px-6 py-3 text-center">Asset</th>
                            <th className="px-6 py-3 text-right">Win Rate</th>
                            <th className="px-6 py-3 text-right">Allocation</th>
                            <th className="px-6 py-3 text-right">Trades</th>
                            <th className="px-6 py-3 text-right">P&L</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/30">
                          {leaderboard.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col items-center gap-2">
                                  <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  <p className="text-sm">Initializing strategies...</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            leaderboard.map((strategy, idx) => {
                              const winRate = (strategy.expectedWinRate || 0.5) * 100;
                              const allocation = (strategy.performance?.current_weight || 0) * 100;
                              const pnl = strategy.performance?.total_pnl || 0;
                              const trades = strategy.performance?.total_trades || 0;
                              
                              return (
                                <tr 
                                  key={strategy.id} 
                                  className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                                  onClick={() => setSelectedStrategy(selectedStrategy === strategy.id ? null : strategy.id)}
                                >
                                  <td className="px-6 py-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                                      strategy.rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
                                      strategy.rank === 2 ? "bg-gray-400/20 text-gray-300" :
                                      strategy.rank === 3 ? "bg-orange-500/20 text-orange-400" :
                                      "bg-gray-800 text-gray-500"
                                    }`}>
                                      {strategy.rank}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-1 h-10 rounded-full" 
                                        style={{ backgroundColor: STRATEGY_COLORS[idx % STRATEGY_COLORS.length] }}
                                      />
                                      <div>
                                        <p className="font-medium text-white text-sm">{strategy.name}</p>
                                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                          {strategy.description?.slice(0, 50)}...
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-mono ${
                                      strategy.asset_class === "crypto" 
                                        ? "bg-purple-500/20 text-purple-400"
                                        : "bg-blue-500/20 text-blue-400"
                                    }`}>
                                      {strategy.asset_class.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full transition-all ${
                                            winRate >= 55 ? "bg-green-500" :
                                            winRate <= 45 ? "bg-red-500" : "bg-yellow-500"
                                          }`}
                                          style={{ width: `${winRate}%` }}
                                        />
                                      </div>
                                      <span className={`font-mono text-sm ${
                                        winRate >= 55 ? "text-green-400" :
                                        winRate <= 45 ? "text-red-400" : "text-gray-300"
                                      }`}>
                                        {winRate.toFixed(1)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-12 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-cyan-500 rounded-full transition-all"
                                          style={{ width: `${Math.min(allocation * 2.5, 100)}%` }}
                                        />
                                      </div>
                                      <span className="font-mono text-sm text-cyan-400">
                                        {allocation.toFixed(1)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono text-sm text-gray-400">
                                    {trades}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className={`font-mono text-sm font-medium ${
                                      pnl >= 0 ? "text-green-400" : "text-red-400"
                                    }`}>
                                      {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
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

                  {/* Recent Trades */}
                  <div className="bg-[#12121a] border border-gray-800/50 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Recent Trades
                      </h2>
                      <Link href="#" onClick={() => setActiveTab("trades")} className="text-xs text-blue-400 hover:text-blue-300">
                        View All →
                      </Link>
                    </div>
                    <div className="divide-y divide-gray-800/30 max-h-[300px] overflow-auto">
                      {trades.length === 0 ? (
                        <div className="px-6 py-8 text-center text-gray-500">
                          <p className="text-sm">Waiting for market signals...</p>
                        </div>
                      ) : (
                        trades.slice(0, 10).map((trade) => (
                          <div key={trade.id} className="px-6 py-3 hover:bg-gray-800/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <span className={`w-2 h-2 rounded-full ${
                                  trade.side === "buy" ? "bg-green-500" : "bg-red-500"
                                }`} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-medium text-white">{trade.symbol}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      trade.side === "buy" 
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-red-500/20 text-red-400"
                                    }`}>
                                      {trade.side.toUpperCase()}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      trade.asset_class === "crypto"
                                        ? "bg-purple-500/10 text-purple-400"
                                        : "bg-blue-500/10 text-blue-400"
                                    }`}>
                                      {trade.asset_class}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 font-mono">
                                    {trade.qty} @ ${trade.price?.toFixed(2) || "--"}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {trade.pnl !== null && (
                                  <p className={`font-mono font-medium ${
                                    trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                                  }`}>
                                    {trade.pnl >= 0 ? "+" : ""}{formatCurrency(trade.pnl)}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 font-mono">
                                  {formatTime(trade.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Allocation & Activity */}
                <div className="space-y-6">
                  {/* Capital Allocation */}
                  <div className="bg-[#12121a] border border-gray-800/50 rounded-xl p-6">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                      Capital Allocation
                    </h2>
                    {allocationData.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        <p className="text-sm">Allocating capital...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allocationData.slice(0, 8).map((item, idx) => (
                          <div key={idx} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400 truncate max-w-[150px]">{item.name}</span>
                              <span className="text-xs font-mono text-cyan-400">{item.allocation.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.allocation * 2.5}%` }}
                                transition={{ duration: 0.5, delay: idx * 0.05 }}
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
                  <div className="bg-[#12121a] border border-gray-800/50 rounded-xl p-6">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      Risk Summary
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Sharpe Ratio</span>
                        <span className={`text-sm font-mono font-bold ${metrics.sharpeRatio > 0 ? "text-green-400" : "text-red-400"}`}>
                          {metrics.sharpeRatio.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Sortino Ratio</span>
                        <span className={`text-sm font-mono font-bold ${metrics.sortinoRatio > 0 ? "text-green-400" : "text-red-400"}`}>
                          {metrics.sortinoRatio.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Max Drawdown</span>
                        <span className="text-sm font-mono font-bold text-red-400">
                          {metrics.maxDrawdown.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Profit Factor</span>
                        <span className={`text-sm font-mono font-bold ${metrics.profitFactor > 1 ? "text-green-400" : "text-red-400"}`}>
                          {metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Expectancy</span>
                        <span className={`text-sm font-mono font-bold ${metrics.expectancy > 0 ? "text-green-400" : "text-red-400"}`}>
                          {formatCurrency(metrics.expectancy)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* System Status */}
                  <div className="bg-[#12121a] border border-gray-800/50 rounded-xl p-6">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${agentStatus.isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
                      System Status
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-800/30">
                        <span className="text-xs text-gray-400">Trading Engine</span>
                        <span className={`text-xs font-mono ${agentStatus.isRunning ? "text-green-400" : "text-red-400"}`}>
                          {agentStatus.isRunning ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-800/30">
                        <span className="text-xs text-gray-400">Mode</span>
                        <span className="text-xs font-mono text-yellow-400">PAPER</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-800/30">
                        <span className="text-xs text-gray-400">Active Strategies</span>
                        <span className="text-xs font-mono text-blue-400">{strategies.filter(s => s.status === "deployed").length}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-800/30">
                        <span className="text-xs text-gray-400">Paused</span>
                        <span className="text-xs font-mono text-yellow-400">{strategies.filter(s => s.status === "paused").length}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-gray-400">Last Activity</span>
                        <span className="text-xs font-mono text-gray-300">
                          {agentStatus.lastActivity ? formatTime(agentStatus.lastActivity) : "--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live Activity Feed */}
                  <div className="bg-[#12121a] border border-gray-800/50 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800/50">
                      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                        Live Activity
                      </h2>
                    </div>
                    <div className="divide-y divide-gray-800/30 max-h-[250px] overflow-auto">
                      {logs.slice(0, 15).map((log) => (
                        <div key={log.id} className="px-4 py-2 hover:bg-gray-800/20 transition-colors">
                          <div className="flex items-start gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                              log.level === "error" ? "bg-red-500" :
                              log.level === "warning" ? "bg-yellow-500" :
                              log.level === "decision" ? "bg-purple-500" : "bg-blue-500"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-300 truncate">{log.action}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{formatTime(log.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}

            {activeTab === "strategies" && (
              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {strategies.map((strategy, idx) => {
                  const perf = leaderboard.find(l => l.id === strategy.id);
                  const winRate = (perf?.expectedWinRate || 0.5) * 100;
                  const allocation = (perf?.performance?.current_weight || 0) * 100;
                  
                  return (
                    <motion.div
                      key={strategy.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-[#12121a] border border-gray-800/50 rounded-xl p-5 hover:border-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-10 rounded-full" 
                            style={{ backgroundColor: STRATEGY_COLORS[idx % STRATEGY_COLORS.length] }}
                          />
                          <div>
                            <h3 className="font-semibold text-white">{strategy.name}</h3>
                            <p className="text-xs text-gray-500 font-mono">Rank #{perf?.rank || "--"}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded font-mono ${
                          strategy.asset_class === "crypto" 
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}>
                          {strategy.asset_class.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{strategy.description}</p>
                      
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase mb-1">Win Rate</p>
                          <p className={`text-lg font-mono font-bold ${
                            winRate >= 55 ? "text-green-400" :
                            winRate <= 45 ? "text-red-400" : "text-gray-300"
                          }`}>
                            {winRate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase mb-1">Allocation</p>
                          <p className="text-lg font-mono font-bold text-cyan-400">
                            {allocation.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase mb-1">P&L</p>
                          <p className={`text-lg font-mono font-bold ${
                            (perf?.performance?.total_pnl || 0) >= 0 ? "text-green-400" : "text-red-400"
                          }`}>
                            {(perf?.performance?.total_pnl || 0) >= 0 ? "+" : ""}${(perf?.performance?.total_pnl || 0).toFixed(0)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                        <div className="bg-gray-800/30 rounded px-2 py-1.5">
                          <span className="text-gray-500">Trades: </span>
                          <span className="text-gray-300 font-mono">{perf?.performance?.total_trades || 0}</span>
                        </div>
                        <div className="bg-gray-800/30 rounded px-2 py-1.5">
                          <span className="text-gray-500">Wins: </span>
                          <span className="text-green-400 font-mono">{perf?.performance?.winning_trades || 0}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {strategy.symbols?.slice(0, 6).map((symbol) => (
                          <span
                            key={symbol}
                            className="text-[10px] px-2 py-1 bg-gray-800/50 text-gray-400 rounded font-mono"
                          >
                            {symbol}
                          </span>
                        ))}
                        {(strategy.symbols?.length || 0) > 6 && (
                          <span className="text-[10px] px-2 py-1 text-gray-500">
                            +{(strategy.symbols?.length || 0) - 6}
                          </span>
                        )}
                      </div>
                      
                      {/* Pause/Resume Controls */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            strategy.status === "deployed" ? "bg-green-500" :
                            strategy.status === "paused" ? "bg-yellow-500" : "bg-gray-500"
                          }`} />
                          <span className="text-xs text-gray-400 font-mono uppercase">
                            {strategy.status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleStrategyAction(
                            strategy.id, 
                            strategy.status === "deployed" ? "pause" : "resume"
                          )}
                          disabled={strategyActions[strategy.id]}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                            strategy.status === "deployed"
                              ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                              : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          }`}
                        >
                          {strategyActions[strategy.id] ? (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              ...
                            </span>
                          ) : strategy.status === "deployed" ? (
                            "Pause"
                          ) : (
                            "Resume"
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {activeTab === "research" && (
              <div className="grid lg:grid-cols-2 gap-4">
                {papers.length === 0 ? (
                  <div className="lg:col-span-2 bg-[#12121a] border border-gray-800/50 rounded-xl p-12 text-center">
                    <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-gray-400">No research papers loaded</p>
                  </div>
                ) : (
                  papers.map((paper, idx) => {
                    const linkedStrategies = strategies.filter(s => 
                      s.name.toLowerCase().includes(paper.title.split(' ')[0].toLowerCase())
                    );
                    
                    return (
                      <motion.div
                        key={paper.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-[#12121a] border border-gray-800/50 rounded-xl overflow-hidden hover:border-gray-700/50 transition-colors"
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white mb-1 line-clamp-2">{paper.title}</h3>
                              <p className="text-xs text-gray-500">
                                {paper.authors?.join(", ")} • {paper.year}
                              </p>
                            </div>
                            <span className={`ml-3 text-[10px] px-2 py-1 rounded font-mono ${
                              paper.status === "active" ? "bg-green-500/20 text-green-400" :
                              paper.status === "extracted" ? "bg-blue-500/20 text-blue-400" :
                              "bg-gray-800 text-gray-400"
                            }`}>
                              {paper.status.toUpperCase()}
                            </span>
                          </div>
                          
                          {paper.key_insights && paper.key_insights.length > 0 && (
                            <div className="mb-4">
                              <p className="text-[10px] text-gray-500 uppercase mb-2">Key Insights</p>
                              <ul className="space-y-1">
                                {paper.key_insights.slice(0, 3).map((insight, i) => (
                                  <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                    <span className="text-blue-500 mt-0.5">•</span>
                                    {insight}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t border-gray-800/30">
                            <span className="text-[10px] text-gray-500 font-mono">{paper.source}</span>
                            {paper.pdf_url && (
                              <a 
                                href={paper.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                View Paper →
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "trades" && (
              <div className="bg-[#12121a] border border-gray-800/50 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white">Trade History</h2>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={exportTradesToCSV}
                      disabled={trades.length === 0}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export CSV
                    </button>
                    <span className="text-xs text-gray-500 font-mono">{trades.length} total trades</span>
                    {totalTradesPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTradesPage(p => Math.max(1, p - 1))}
                          disabled={tradesPage === 1}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-mono"
                        >
                          ←
                        </button>
                        <span className="text-xs text-gray-400 font-mono">
                          {tradesPage} / {totalTradesPages}
                        </span>
                        <button
                          onClick={() => setTradesPage(p => Math.min(totalTradesPages, p + 1))}
                          disabled={tradesPage === totalTradesPages}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-mono"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-900/50 text-xs text-gray-400 uppercase font-mono">
                        <th className="px-4 sm:px-6 py-3 text-left">Time</th>
                        <th className="px-4 sm:px-6 py-3 text-left">Symbol</th>
                        <th className="px-4 sm:px-6 py-3 text-center">Side</th>
                        <th className="px-4 sm:px-6 py-3 text-center hidden sm:table-cell">Asset</th>
                        <th className="px-4 sm:px-6 py-3 text-right hidden md:table-cell">Quantity</th>
                        <th className="px-4 sm:px-6 py-3 text-right hidden md:table-cell">Price</th>
                        <th className="px-4 sm:px-6 py-3 text-right hidden lg:table-cell">Value</th>
                        <th className="px-4 sm:px-6 py-3 text-right">P&L</th>
                        <th className="px-4 sm:px-6 py-3 text-center hidden sm:table-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                      {trades.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                            <svg className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-sm">No trades executed yet</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedTrades.map((trade) => (
                          <tr key={trade.id} className="hover:bg-gray-800/20 transition-colors">
                            <td className="px-4 sm:px-6 py-3">
                              <div>
                                <p className="text-sm text-white font-mono">{formatTime(trade.created_at)}</p>
                                <p className="text-[10px] text-gray-500">{formatDate(trade.created_at)}</p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              <span className="font-mono font-semibold text-white">{trade.symbol}</span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-center">
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-mono font-medium ${
                                trade.side === "buy" 
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}>
                                {trade.side.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-center hidden sm:table-cell">
                              <span className={`inline-flex px-2 py-1 rounded text-[10px] font-mono ${
                                trade.asset_class === "crypto"
                                  ? "bg-purple-500/10 text-purple-400"
                                  : "bg-blue-500/10 text-blue-400"
                              }`}>
                                {trade.asset_class.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right font-mono text-sm text-gray-300 hidden md:table-cell">
                              {trade.qty}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right font-mono text-sm text-gray-300 hidden md:table-cell">
                              ${trade.price?.toFixed(2) || "--"}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right font-mono text-sm text-gray-300 hidden lg:table-cell">
                              {trade.price ? formatCurrency(trade.qty * trade.price) : "--"}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right">
                              {trade.pnl !== null ? (
                                <span className={`font-mono text-sm font-medium ${
                                  trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                                }`}>
                                  {trade.pnl >= 0 ? "+" : ""}{formatCurrency(trade.pnl)}
                                </span>
                              ) : (
                                <span className="text-gray-500">--</span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-center hidden sm:table-cell">
                              <span className={`inline-flex px-2 py-1 rounded text-[10px] font-mono ${
                                trade.status === "filled" ? "bg-green-500/20 text-green-400" :
                                trade.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-gray-800 text-gray-400"
                              }`}>
                                {trade.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "logs" && (
              <div className="bg-[#0a0a0f] border border-gray-800/50 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between bg-[#12121a]">
                  <h2 className="text-sm font-semibold text-white font-mono">System Logs</h2>
                  <span className="text-xs text-gray-500 font-mono">{logs.length} entries</span>
                </div>
                <div className="font-mono text-xs max-h-[600px] overflow-auto">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="px-6 py-2 hover:bg-gray-900/50 transition-colors border-b border-gray-900/50 flex gap-4"
                    >
                      <span className="text-gray-600 flex-shrink-0 w-20">
                        {formatTime(log.created_at)}
                      </span>
                      <span className={`flex-shrink-0 w-16 ${
                        log.level === "error" ? "text-red-400" :
                        log.level === "warning" ? "text-yellow-400" :
                        log.level === "decision" ? "text-purple-400" :
                        "text-blue-400"
                      }`}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-gray-300 flex-1">{log.action}</span>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <span className="text-gray-600 truncate max-w-[300px]">
                          {JSON.stringify(log.details)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 mt-8">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="font-mono">Paper Trading Simulation</span>
              <span>•</span>
              <span>Thompson Sampling Allocation</span>
              <span>•</span>
              <span>Auto-refresh 10s</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="font-mono">Connected</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  label, 
  value, 
  change, 
  subtext, 
  isPositive, 
  size = "normal",
  trend,
}: { 
  label: string; 
  value: string; 
  change?: number;
  subtext?: string;
  isPositive?: boolean;
  size?: "normal" | "large";
  trend?: "up" | "down" | "flat";
}) {
  return (
    <div className={`${size === "large" ? "col-span-1" : ""}`}>
      <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`font-mono font-semibold ${
          size === "large" ? "text-xl" : "text-lg"
        } ${
          isPositive === true ? "text-green-400" :
          isPositive === false ? "text-red-400" : "text-white"
        }`}>
          {value}
        </p>
        {trend && trend !== "flat" && (
          <span className={`flex items-center ${trend === "up" ? "text-green-400" : "text-red-400"}`}>
            {trend === "up" ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </span>
        )}
      </div>
      {change !== undefined && (
        <p className={`text-xs font-mono ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </p>
      )}
      {subtext && (
        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{subtext}</p>
      )}
    </div>
  );
}
