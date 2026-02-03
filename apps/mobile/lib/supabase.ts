import { createClient } from "@supabase/supabase-js";
import Constants from 'expo-constants';

// Supabase client for mobile app - uses environment variables
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

export interface StrategyWithPerformance extends Strategy {
  performance?: StrategyPerformance;
  expectedWinRate: number;
  rank: number;
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

export async function getRecentTrades(limit = 50): Promise<AgentTrade[]> {
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

export async function getStrategiesWithPerformance(): Promise<StrategyWithPerformance[]> {
  const strategies = await getActiveStrategies();
  const performances = await getStrategyPerformances();
  
  const perfMap = new Map(performances.map(p => [p.strategy_id, p]));
  
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
  
  merged.sort((a, b) => (b.expectedWinRate || 0) - (a.expectedWinRate || 0));
  merged.forEach((s, i) => { s.rank = i + 1; });
  
  return merged;
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

  return {
    isRunning: diffMinutes < 20,
    lastActivity: data[0].created_at,
  };
}

export async function getPortfolioStats(): Promise<{
  portfolioValue: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  totalPnl: number;
  totalPnlPercent: number;
  tradesToday: number;
  winRate: number;
  activeStrategies: number;
}> {
  const snapshots = await getDailySnapshots(1);
  
  if (snapshots.length === 0) {
    return {
      portfolioValue: 100000,
      dailyPnl: 0,
      dailyPnlPercent: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      tradesToday: 0,
      winRate: 0.5,
      activeStrategies: 0,
    };
  }
  
  const latest = snapshots[0];
  return {
    portfolioValue: latest.portfolio_value,
    dailyPnl: latest.daily_pnl,
    dailyPnlPercent: latest.daily_pnl_percent,
    totalPnl: latest.total_pnl,
    totalPnlPercent: latest.total_pnl_percent,
    tradesToday: latest.trades_today,
    winRate: latest.win_rate_today,
    activeStrategies: latest.active_strategies,
  };
}
