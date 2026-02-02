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
