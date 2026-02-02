"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, TrendingUp, TrendingDown, BarChart3, Clock, ArrowLeft } from "lucide-react";

interface PortfolioHistory {
  timestamp: string;
  portfolioValue: number;
  pnl: number;
  pnlPercent: number;
}

interface DailyStats {
  date: string;
  startValue: number;
  endValue: number;
  pnl: number;
  pnlPercent: number;
  trades: number;
  winRate: number;
}

export default function DashboardPage() {
  const [history, setHistory] = useState<PortfolioHistory[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      // Simulate portfolio history (in production, this would come from Alpaca's portfolio history endpoint)
      const mockHistory: PortfolioHistory[] = [];
      const now = Date.now();
      let value = 100000;

      for (let i = 30; i >= 0; i--) {
        const change = (Math.random() - 0.48) * 0.02; // Slight upward bias
        value = value * (1 + change);
        mockHistory.push({
          timestamp: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
          portfolioValue: value,
          pnl: value - 100000,
          pnlPercent: ((value - 100000) / 100000) * 100,
        });
      }

      setHistory(mockHistory);

      // Generate daily stats
      const stats: DailyStats[] = mockHistory.slice(-7).map((h, i, arr) => ({
        date: new Date(h.timestamp).toLocaleDateString(),
        startValue: i > 0 ? arr[i - 1].portfolioValue : 100000,
        endValue: h.portfolioValue,
        pnl: h.portfolioValue - (i > 0 ? arr[i - 1].portfolioValue : 100000),
        pnlPercent:
          ((h.portfolioValue - (i > 0 ? arr[i - 1].portfolioValue : 100000)) /
            (i > 0 ? arr[i - 1].portfolioValue : 100000)) *
          100,
        trades: Math.floor(Math.random() * 10) + 1,
        winRate: Math.random() * 40 + 40,
      }));

      setDailyStats(stats);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const currentValue = history[history.length - 1]?.portfolioValue || 100000;
  const totalPnl = currentValue - 100000;
  const totalPnlPercent = (totalPnl / 100000) * 100;
  const isProfitable = totalPnl >= 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Performance Dashboard</h1>
            <p className="text-[var(--text-secondary)]">
              Track your trading performance over time
            </p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            Back to Trading
          </a>
          <a
            href="https://alexszapiro.com"
            className="flex items-center gap-2 px-4 py-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Portfolio
          </a>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-[var(--bg-secondary)] rounded-lg"></div>
            <div className="h-64 bg-[var(--bg-secondary)] rounded-lg"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-[var(--accent-blue)]" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Portfolio Value
                  </span>
                </div>
                <span className="text-2xl font-bold">
                  {formatCurrency(currentValue)}
                </span>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-2">
                  {isProfitable ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-[var(--text-secondary)]">
                    Total P&L
                  </span>
                </div>
                <span
                  className={`text-2xl font-bold ${
                    isProfitable ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatCurrency(totalPnl)}
                </span>
                <span
                  className={`text-sm ml-2 ${
                    isProfitable ? "text-green-500" : "text-red-500"
                  }`}
                >
                  ({totalPnlPercent.toFixed(2)}%)
                </span>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-[var(--accent-purple)]" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Win Rate (7d)
                  </span>
                </div>
                <span className="text-2xl font-bold">
                  {(
                    dailyStats.reduce((a, b) => a + b.winRate, 0) /
                    dailyStats.length
                  ).toFixed(1)}
                  %
                </span>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[var(--accent-yellow)]" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Trades (7d)
                  </span>
                </div>
                <span className="text-2xl font-bold">
                  {dailyStats.reduce((a, b) => a + b.trades, 0)}
                </span>
              </div>
            </div>

            {/* Equity Curve */}
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">Equity Curve (30 days)</h2>
              <div className="h-64 flex items-end gap-1">
                {history.map((h, i) => {
                  const minVal = Math.min(...history.map((x) => x.portfolioValue));
                  const maxVal = Math.max(...history.map((x) => x.portfolioValue));
                  const range = maxVal - minVal || 1;
                  const height = ((h.portfolioValue - minVal) / range) * 100;
                  const isPrev = i > 0 && h.portfolioValue >= history[i - 1].portfolioValue;

                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t transition-all hover:opacity-80"
                      style={{
                        height: `${Math.max(height, 5)}%`,
                        backgroundColor: isPrev
                          ? "var(--accent-green)"
                          : "var(--accent-red)",
                      }}
                      title={`${new Date(h.timestamp).toLocaleDateString()}: ${formatCurrency(h.portfolioValue)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* Daily Performance Table */}
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
              <div className="p-4 border-b border-[var(--border-color)]">
                <h2 className="font-semibold">Daily Performance (Last 7 Days)</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-right p-3 font-medium">Start Value</th>
                    <th className="text-right p-3 font-medium">End Value</th>
                    <th className="text-right p-3 font-medium">P&L</th>
                    <th className="text-right p-3 font-medium">Return</th>
                    <th className="text-right p-3 font-medium">Trades</th>
                    <th className="text-right p-3 font-medium">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.reverse().map((day) => {
                    const dayProfitable = day.pnl >= 0;
                    return (
                      <tr
                        key={day.date}
                        className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                      >
                        <td className="p-3">{day.date}</td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(day.startValue)}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(day.endValue)}
                        </td>
                        <td
                          className={`p-3 text-right font-mono ${
                            dayProfitable ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {formatCurrency(day.pnl)}
                        </td>
                        <td
                          className={`p-3 text-right font-mono ${
                            dayProfitable ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {day.pnlPercent.toFixed(2)}%
                        </td>
                        <td className="p-3 text-right">{day.trades}</td>
                        <td className="p-3 text-right">{day.winRate.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
