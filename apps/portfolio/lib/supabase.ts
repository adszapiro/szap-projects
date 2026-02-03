import { createClient } from "@supabase/supabase-js";

// Public client for read-only access to quant agent data
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// Types for quant agent data
export interface DailySnapshot {
  id: string;
  date: string;
  portfolio_value: number;
  daily_pnl: number;
  daily_pnl_percent: number;
  total_pnl: number;
  total_pnl_percent: number;
  active_strategies: number;
  trades_today: number;
  win_rate_today: number;
  created_at: string;
}

export interface AgentTrade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  status: string;
  pnl: number | null;
  pnl_percent: number | null;
  reasoning: string | null;
  asset_class: "stock" | "crypto";
  created_at: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  status: string;
  asset_class: "stock" | "crypto";
  symbols: string[];
  created_at: string;
}

export interface AgentLog {
  id: string;
  level: "info" | "warning" | "error" | "decision";
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  source: string;
  pdf_url?: string;
  abstract?: string;
  key_insights: string[];
  status: "pending" | "extracted" | "active";
  created_at: string;
}

export interface StrategyPerformance {
  id: string;
  strategy_id: string;
  alpha: number;
  beta: number;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  current_weight: number;
  updated_at: string;
}

export interface DailyReport {
  id: string;
  date: string;
  portfolio_value: number;
  cash_balance: number;
  total_pnl: number;
  day_pnl: number;
  day_pnl_percent: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  best_trade: { symbol: string; pnl: number } | null;
  worst_trade: { symbol: string; pnl: number } | null;
  top_strategy: { name: string; winRate: number; pnl: number } | null;
  asset_breakdown: {
    stocks: { trades: number; pnl: number };
    crypto: { trades: number; pnl: number };
  };
  convergence_score: number;
  created_at: string;
}

export interface StrategyWithPerformance extends Strategy {
  performance?: StrategyPerformance;
  expectedWinRate?: number;
  rank?: number;
}

// Fetch functions
export async function getDailySnapshots(limit = 30): Promise<DailySnapshot[]> {
  const { data, error } = await supabase
    .from("daily_snapshots")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching snapshots:", error);
    return [];
  }
  return data || [];
}

export async function getRecentTrades(limit = 20): Promise<AgentTrade[]> {
  const { data, error } = await supabase
    .from("agent_trades")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching trades:", error);
    return [];
  }
  return data || [];
}

export async function getDailyReports(limit = 30): Promise<DailyReport[]> {
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching daily reports:", error);
    return [];
  }
  return data || [];
}

export async function getActiveStrategies(): Promise<Strategy[]> {
  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("status", "deployed")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching strategies:", error);
    return [];
  }
  return data || [];
}

export async function getRecentLogs(limit = 50): Promise<AgentLog[]> {
  const { data, error } = await supabase
    .from("agent_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
  return data || [];
}

export async function getAgentStatus(): Promise<{
  isRunning: boolean;
  lastActivity: string | null;
}> {
  const { data, error } = await supabase
    .from("agent_logs")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return { isRunning: false, lastActivity: null };
  }

  const lastActivity = new Date(data[0].created_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastActivity.getTime()) / 1000 / 60;

  // Consider running if last activity was within 20 minutes
  return {
    isRunning: diffMinutes < 20,
    lastActivity: data[0].created_at,
  };
}

// Research Papers
export async function getResearchPapers(): Promise<ResearchPaper[]> {
  const { data, error } = await supabase
    .from("research_papers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching papers:", error);
    return [];
  }
  return data || [];
}

// Strategy Performance (for leaderboard)
export async function getStrategyPerformances(): Promise<StrategyPerformance[]> {
  const { data, error } = await supabase
    .from("strategy_performance")
    .select("*")
    .order("current_weight", { ascending: false });

  if (error) {
    console.error("Error fetching performance:", error);
    return [];
  }
  return data || [];
}

// Strategies with their performance data (joined)
export async function getStrategiesWithPerformance(): Promise<StrategyWithPerformance[]> {
  // Get strategies
  const strategies = await getActiveStrategies();
  const performances = await getStrategyPerformances();
  
  // Create performance map
  const perfMap = new Map(performances.map(p => [p.strategy_id, p]));
  
  // Merge and calculate rankings
  const merged: StrategyWithPerformance[] = strategies.map(s => {
    const perf = perfMap.get(s.id);
    const expectedWinRate = perf 
      ? perf.alpha / (perf.alpha + perf.beta)
      : 0.5;
    
    return {
      ...s,
      performance: perf,
      expectedWinRate,
      rank: 0,
    };
  });
  
  // Sort by expected win rate and assign ranks
  merged.sort((a, b) => (b.expectedWinRate || 0) - (a.expectedWinRate || 0));
  merged.forEach((s, i) => { s.rank = i + 1; });
  
  return merged;
}

// Tournament stats
export async function getTournamentStats(): Promise<{
  totalStrategies: number;
  totalPapers: number;
  averageWinRate: number;
  topPerformer: string | null;
  totalTrades: number;
}> {
  const [strategies, papers, performances] = await Promise.all([
    getActiveStrategies(),
    getResearchPapers(),
    getStrategyPerformances(),
  ]);
  
  const avgWinRate = performances.length > 0
    ? performances.reduce((sum, p) => sum + p.alpha / (p.alpha + p.beta), 0) / performances.length
    : 0.5;
  
  const topPerformer = performances.length > 0
    ? performances.sort((a, b) => 
        (b.alpha / (b.alpha + b.beta)) - (a.alpha / (a.alpha + a.beta))
      )[0]?.strategy_id || null
    : null;
  
  const totalTrades = performances.reduce((sum, p) => sum + p.total_trades, 0);
  
  return {
    totalStrategies: strategies.length,
    totalPapers: papers.length,
    averageWinRate: avgWinRate,
    topPerformer,
    totalTrades,
  };
}
