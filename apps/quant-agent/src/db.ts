import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

// Types
export interface Strategy {
  id: string;
  name: string;
  description: string;
  code: string;
  source_model: string;
  status: string;
  created_at: string;
}

export interface BacktestResult {
  id: string;
  strategy_id: string;
  symbol: string;
  sharpe_ratio: number;
  max_drawdown: number;
  total_return: number;
  win_rate: number;
  total_trades: number;
}

export interface ChildLearning {
  id: string;
  pattern: string;
  context?: string;
  category?: string;
  source_model: string;
  confidence: number;
  wins: number;
  losses: number;
}

// Strategies
export async function saveStrategy(
  name: string,
  description: string,
  code: string,
  sourceModel: string
): Promise<string> {
  const { data, error } = await supabase
    .from("strategies")
    .insert({ name, description, code, source_model: sourceModel })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateStrategyStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("strategies")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function getActiveStrategies(): Promise<Strategy[]> {
  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("status", "deployed")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Backtest Results
export async function saveBacktestResult(result: Omit<BacktestResult, "id">): Promise<string> {
  const { data, error } = await supabase
    .from("backtest_results")
    .insert(result)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

// Trades
export async function saveTrade(trade: {
  strategy_id?: string;
  symbol: string;
  side: string;
  qty: number;
  price?: number;
  order_id?: string;
  reasoning?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("agent_trades")
    .insert(trade)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateTrade(
  id: string,
  updates: { status?: string; pnl?: number; pnl_percent?: number; filled_at?: string }
): Promise<void> {
  const { error } = await supabase
    .from("agent_trades")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function getRecentTrades(limit: number = 50): Promise<any[]> {
  const { data, error } = await supabase
    .from("agent_trades")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getTodaysTrades(): Promise<any[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("agent_trades")
    .select("*")
    .gte("created_at", today)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Model Debates
export async function saveDebate(
  sessionId: string,
  role: string,
  content: string,
  context?: object
): Promise<void> {
  const { error } = await supabase.from("model_debates").insert({
    session_id: sessionId,
    role,
    content,
    context,
  });

  if (error) throw error;
}

// Child Learnings
export async function getTopPatterns(limit: number = 10): Promise<ChildLearning[]> {
  const { data, error } = await supabase
    .from("child_learnings")
    .select("*")
    .order("confidence", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function saveLearning(learning: {
  pattern: string;
  context?: string;
  category?: string;
  confidence: number;
  source_model?: string;
}): Promise<void> {
  const { error } = await supabase.from("child_learnings").insert({
    ...learning,
    source_model: learning.source_model || "consensus",
  });

  if (error) throw error;
}

export async function updateLearningConfidence(
  id: string,
  won: boolean
): Promise<void> {
  // Get current values
  const { data, error: fetchError } = await supabase
    .from("child_learnings")
    .select("confidence, wins, losses")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  // Update based on outcome
  const newWins = won ? data.wins + 1 : data.wins;
  const newLosses = won ? data.losses : data.losses + 1;
  const total = newWins + newLosses;
  
  // Bayesian-style confidence update
  const newConfidence = total > 0 ? (newWins + 1) / (total + 2) : 0.5;

  const { error } = await supabase
    .from("child_learnings")
    .update({
      confidence: newConfidence,
      wins: newWins,
      losses: newLosses,
      last_validated: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

// Agent Logs
export async function log(
  level: "info" | "warning" | "error" | "decision",
  action: string,
  details?: object
): Promise<void> {
  const { error } = await supabase.from("agent_logs").insert({
    level,
    action,
    details,
  });

  if (error) console.error("Failed to log:", error);
  
  // Also console log
  const prefix = { info: "ℹ️", warning: "⚠️", error: "❌", decision: "🎯" }[level];
  console.log(`${prefix} [${action}]`, details ? JSON.stringify(details) : "");
}

// Daily Snapshots
export async function saveDailySnapshot(snapshot: {
  portfolio_value: number;
  daily_pnl: number;
  daily_pnl_percent: number;
  total_pnl: number;
  total_pnl_percent: number;
  active_strategies: number;
  trades_today: number;
  win_rate_today: number;
  top_patterns?: object;
}): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  
  const { error } = await supabase
    .from("daily_snapshots")
    .upsert({ date: today, ...snapshot }, { onConflict: "date" });

  if (error) throw error;
}
