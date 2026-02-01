"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Brain,
  Activity,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Zap,
  RefreshCw,
  Play,
  Pause,
  AlertTriangle,
} from "lucide-react";

interface AgentStatus {
  isRunning: boolean;
  lastCycle: string;
  activeStrategies: number;
  todaysTrades: number;
  todaysPnl: number;
  portfolioValue: number;
}

interface Debate {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

interface Learning {
  id: string;
  pattern: string;
  context: string;
  category: string;
  source_model: string;
  confidence: number;
  wins: number;
  losses: number;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  source_model: string;
  status: string;
  created_at: string;
}

export default function AgentDashboardPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [debates, setDebates] = useState<Debate[]>([]);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebateSession, setSelectedDebateSession] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // In production, these would be API calls to fetch from Supabase
      // For now, show placeholder data
      setStatus({
        isRunning: true,
        lastCycle: new Date().toISOString(),
        activeStrategies: 2,
        todaysTrades: 3,
        todaysPnl: 127.50,
        portfolioValue: 100127.50,
      });

      setLearnings([
        {
          id: "1",
          pattern: "RSI < 30 combined with volume spike indicates strong reversal",
          context: "Works best in trending markets with clear support levels",
          category: "entry",
          source_model: "consensus",
          confidence: 0.82,
          wins: 12,
          losses: 3,
        },
        {
          id: "2",
          pattern: "Avoid momentum trades in first 30 minutes of market open",
          context: "High volatility period, false signals common",
          category: "timing",
          source_model: "claude",
          confidence: 0.75,
          wins: 8,
          losses: 3,
        },
        {
          id: "3",
          pattern: "SMA 20/50 crossover with MACD confirmation",
          context: "More reliable than single indicator signals",
          category: "indicator",
          source_model: "openai",
          confidence: 0.68,
          wins: 5,
          losses: 2,
        },
      ]);

      setStrategies([
        {
          id: "1",
          name: "Auto-Strategy-RSI-Momentum",
          description: "Claude: 8/10, OpenAI: 9/10",
          source_model: "consensus",
          status: "deployed",
          created_at: new Date().toISOString(),
        },
      ]);

      setDebates([
        {
          id: "1",
          session_id: "abc123",
          role: "claude",
          content: "I propose an RSI-based mean reversion strategy...",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          session_id: "abc123",
          role: "openai",
          content: "I suggest adding volume confirmation to improve signal quality...",
          created_at: new Date().toISOString(),
        },
        {
          id: "3",
          session_id: "abc123",
          role: "consensus",
          content: "Final strategy combines RSI with volume spike detection...",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "claude":
        return "text-orange-400 bg-orange-500/10";
      case "openai":
        return "text-green-400 bg-green-500/10";
      case "consensus":
        return "text-blue-400 bg-blue-500/10";
      default:
        return "text-gray-400 bg-gray-500/10";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "entry":
        return "bg-green-500/20 text-green-400";
      case "exit":
        return "bg-red-500/20 text-red-400";
      case "timing":
        return "bg-yellow-500/20 text-yellow-400";
      case "risk":
        return "bg-purple-500/20 text-purple-400";
      case "indicator":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-green-500 rounded-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Quant Agent</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Claude + OpenAI Dual-Model System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              Back to Trading
            </a>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${status?.isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              <span className="text-xs text-[var(--text-secondary)]">Status</span>
            </div>
            <span className="text-lg font-semibold">
              {status?.isRunning ? "Running" : "Stopped"}
            </span>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-[var(--text-secondary)]">Strategies</span>
            </div>
            <span className="text-lg font-semibold">{status?.activeStrategies || 0}</span>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-[var(--text-secondary)]">Trades Today</span>
            </div>
            <span className="text-lg font-semibold">{status?.todaysTrades || 0}</span>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-2 mb-2">
              {(status?.todaysPnl || 0) >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs text-[var(--text-secondary)]">Today&apos;s P&L</span>
            </div>
            <span className={`text-lg font-semibold ${(status?.todaysPnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatCurrency(status?.todaysPnl || 0)}
            </span>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-[var(--text-secondary)]">Portfolio</span>
            </div>
            <span className="text-lg font-semibold">
              {formatCurrency(status?.portfolioValue || 100000)}
            </span>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-[var(--text-secondary)]">Learnings</span>
            </div>
            <span className="text-lg font-semibold">{learnings.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Child Model Learnings */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
              <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold">Child Model Learnings</h2>
              </div>
              <div className="divide-y divide-[var(--border-color)] max-h-96 overflow-y-auto">
                {learnings.map((learning) => (
                  <div key={learning.id} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p className="text-sm">{learning.pattern}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-green-400">{learning.wins}W</span>
                        <span className="text-xs text-[var(--text-muted)]">/</span>
                        <span className="text-xs text-red-400">{learning.losses}L</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(learning.category)}`}>
                        {learning.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(learning.source_model)}`}>
                        {learning.source_model}
                      </span>
                      <div className="flex-1" />
                      <div className="text-xs text-[var(--text-secondary)]">
                        Confidence: <span className="text-white font-medium">{(learning.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    {learning.context && (
                      <p className="text-xs text-[var(--text-muted)] mt-2 italic">{learning.context}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Model Debates */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
              <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-400" />
                <h2 className="font-semibold">Recent Model Debate</h2>
              </div>
              <div className="divide-y divide-[var(--border-color)] max-h-96 overflow-y-auto">
                {debates.map((debate) => (
                  <div key={debate.id} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${getRoleColor(debate.role)}`}>
                        {debate.role.toUpperCase()}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(debate.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{debate.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Strategies */}
          <div className="col-span-12">
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
              <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h2 className="font-semibold">Active Strategies</h2>
                </div>
              </div>
              <div className="divide-y divide-[var(--border-color)]">
                {strategies.map((strategy) => (
                  <div key={strategy.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{strategy.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(strategy.source_model)}`}>
                          {strategy.source_model}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          strategy.status === "deployed" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {strategy.status}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{strategy.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded transition-colors">
                        {strategy.status === "deployed" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                {strategies.length === 0 && (
                  <div className="p-8 text-center text-[var(--text-secondary)]">
                    No active strategies. The agent will generate one on the next cycle.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-500">Paper Trading Mode</p>
            <p className="text-sm text-[var(--text-secondary)]">
              This agent is running in paper trading mode. No real money is at risk.
              The dual-model system (Claude + OpenAI) debates strategies and learns from results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
