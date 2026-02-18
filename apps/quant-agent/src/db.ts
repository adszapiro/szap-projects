import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabase;
}

// Types
export type AssetClass = "stock" | "crypto";

export interface Strategy {
  id: string;
  name: string;
  description: string;
  code: string;
  source_model: string;
  status: string;
  asset_class: AssetClass;
  symbols: string[];
  paper_id?: string;
  created_at: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  source: string;
  pdf_url?: string;
  pdf_storage_path?: string;
  abstract?: string;
  key_insights: string[];
  status: "pending" | "extracted" | "active";
  created_at: string;
}

export interface StrategyPerformance {
  id: string;
  strategy_id: string;
  alpha: number;       // Beta distribution param (successes)
  beta: number;        // Beta distribution param (failures)
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  current_weight: number;
  updated_at: string;
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
  asset_class: AssetClass;
  confidence: number;
  wins: number;
  losses: number;
}

// Strategies
export async function saveStrategy(
  name: string,
  description: string,
  code: string,
  sourceModel: string,
  assetClass: AssetClass = "stock",
  symbols: string[] = ["SPY"]
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("strategies")
    .insert({ 
      name, 
      description, 
      code, 
      source_model: sourceModel,
      asset_class: assetClass,
      symbols,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateStrategyStatus(id: string, status: string): Promise<void> {
  const { error } = await getSupabase()
    .from("strategies")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function pauseStrategy(id: string): Promise<void> {
  await updateStrategyStatus(id, "paused");
  await log("info", "strategy_paused", { strategyId: id });
}

export async function resumeStrategy(id: string): Promise<void> {
  await updateStrategyStatus(id, "deployed");
  await log("info", "strategy_resumed", { strategyId: id });
}

export async function getStrategyById(id: string): Promise<Strategy | null> {
  const { data, error } = await getSupabase()
    .from("strategies")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

export async function getActiveStrategies(assetClass?: AssetClass): Promise<Strategy[]> {
  let query = getSupabase()
    .from("strategies")
    .select("*")
    .eq("status", "deployed");
  
  if (assetClass) {
    query = query.eq("asset_class", assetClass);
  }
  
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Backtest Results
export async function saveBacktestResult(result: Omit<BacktestResult, "id">): Promise<string> {
  const { data, error } = await getSupabase()
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
  asset_class?: AssetClass;
}): Promise<string> {
  const { data, error } = await getSupabase()
    .from("agent_trades")
    .insert({
      ...trade,
      asset_class: trade.asset_class || (trade.symbol.includes("/") ? "crypto" : "stock"),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateTrade(
  id: string,
  updates: { status?: string; pnl?: number; pnl_percent?: number; filled_at?: string }
): Promise<void> {
  const { error } = await getSupabase()
    .from("agent_trades")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function getTodayTradeCount(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { count, error } = await getSupabase()
    .from("agent_trades")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today);
  if (error) return 0;
  return count || 0;
}

export async function getRecentTrades(limit: number = 50): Promise<any[]> {
  const { data, error } = await getSupabase()
    .from("agent_trades")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getRecentTradesForStrategy(strategyId: string, limit: number = 20): Promise<any[]> {
  const { data, error } = await getSupabase()
    .from("agent_trades")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getTopPerformingStrategies(assetClass: AssetClass, limit: number = 3): Promise<Strategy[]> {
  // Join strategies with performance data, return top performers by total_pnl
  const { data: performances, error: perfError } = await getSupabase()
    .from("strategy_performance")
    .select("strategy_id, total_pnl, total_trades, winning_trades")
    .gte("total_trades", 5)
    .order("total_pnl", { ascending: false })
    .limit(limit * 2); // Fetch extra to filter by asset class

  if (perfError || !performances || performances.length === 0) return [];

  const strategies: Strategy[] = [];
  for (const perf of performances) {
    const { data: strategy, error } = await getSupabase()
      .from("strategies")
      .select("*")
      .eq("id", perf.strategy_id)
      .eq("asset_class", assetClass)
      .eq("status", "deployed")
      .single();

    if (!error && strategy) {
      strategies.push(strategy);
      if (strategies.length >= limit) break;
    }
  }
  return strategies;
}

export async function getLearningsForAssetClass(assetClass: AssetClass, limit: number = 20): Promise<ChildLearning[]> {
  const { data, error } = await getSupabase()
    .from("child_learnings")
    .select("*")
    .eq("asset_class", assetClass)
    .order("confidence", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

export async function getTodaysTrades(): Promise<any[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await getSupabase()
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
  const { error } = await getSupabase().from("model_debates").insert({
    session_id: sessionId,
    role,
    content,
    context,
  });

  if (error) throw error;
}

// Child Learnings
export async function getTopPatterns(limit: number = 10, assetClass?: AssetClass): Promise<ChildLearning[]> {
  let query = getSupabase()
    .from("child_learnings")
    .select("*");
  
  if (assetClass) {
    query = query.eq("asset_class", assetClass);
  }
  
  const { data, error } = await query
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
  asset_class?: AssetClass;
}): Promise<void> {
  const { error } = await getSupabase().from("child_learnings").insert({
    ...learning,
    source_model: learning.source_model || "consensus",
    asset_class: learning.asset_class || "stock",
  });

  if (error) throw error;
}

export async function updateLearningConfidence(
  id: string,
  won: boolean
): Promise<void> {
  // Get current values
  const { data, error: fetchError } = await getSupabase()
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

  const { error } = await getSupabase()
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
  const { error } = await getSupabase().from("agent_logs").insert({
    level,
    action,
    details,
  });

  if (error) console.error("Failed to log:", error);
  
  // Also console log
  const prefix = { info: "ℹ️", warning: "⚠️", error: "❌", decision: "🎯" }[level];
  console.log(`${prefix} [${action}]`, details ? JSON.stringify(details) : "");
}

// ============================================
// RESEARCH PAPERS
// ============================================

export async function savePaper(paper: {
  title: string;
  authors?: string[];
  year?: number;
  source?: string;
  pdf_url?: string;
  pdf_storage_path?: string;
  abstract?: string;
  key_insights?: string[];
}): Promise<string> {
  const { data, error } = await getSupabase()
    .from("research_papers")
    .insert({
      ...paper,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updatePaperStatus(id: string, status: string): Promise<void> {
  const { error } = await getSupabase()
    .from("research_papers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function getPaper(id: string): Promise<ResearchPaper | null> {
  const { data, error } = await getSupabase()
    .from("research_papers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getAllPapers(): Promise<ResearchPaper[]> {
  const { data, error } = await getSupabase()
    .from("research_papers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getActivePapers(): Promise<ResearchPaper[]> {
  const { data, error } = await getSupabase()
    .from("research_papers")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getStrategiesByPaper(paperId: string): Promise<Strategy[]> {
  const { data, error } = await getSupabase()
    .from("strategies")
    .select("*")
    .eq("paper_id", paperId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// STRATEGY PERFORMANCE (Bandit)
// ============================================

export async function getStrategyPerformance(strategyId: string): Promise<StrategyPerformance | null> {
  const { data, error } = await getSupabase()
    .from("strategy_performance")
    .select("*")
    .eq("strategy_id", strategyId)
    .single();

  if (error) return null;
  return data;
}

export async function getAllStrategyPerformances(): Promise<StrategyPerformance[]> {
  const { data, error } = await getSupabase()
    .from("strategy_performance")
    .select("*")
    .order("current_weight", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function initializeStrategyPerformance(
  strategyId: string,
  initialWeight: number = 0.1
): Promise<void> {
  const { error } = await getSupabase()
    .from("strategy_performance")
    .upsert({
      strategy_id: strategyId,
      alpha: 1,
      beta: 1,
      total_trades: 0,
      winning_trades: 0,
      total_pnl: 0,
      current_weight: initialWeight,
      updated_at: new Date().toISOString(),
    }, { onConflict: "strategy_id" });

  if (error) throw error;
}

export async function updateStrategyPerformance(
  strategyId: string,
  won: boolean | null,  // null = trade opened (BUY), true/false = trade closed (SELL)
  pnl: number
): Promise<void> {
  // Get current performance
  const { data, error: fetchError } = await getSupabase()
    .from("strategy_performance")
    .select("*")
    .eq("strategy_id", strategyId)
    .single();

  if (fetchError || !data) {
    // Initialize if doesn't exist
    await initializeStrategyPerformance(strategyId);
    return updateStrategyPerformance(strategyId, won, pnl);
  }

  // Update bandit parameters (Thompson Sampling)
  // PnL-weighted: big wins/losses count more than tiny ones (capped 0.5-3x)
  const pnlScale = Math.min(3, Math.max(0.5, 1 + Math.abs(pnl) / 100));
  const newAlpha = won === true ? data.alpha + pnlScale : data.alpha;
  const newBeta = won === false ? data.beta + pnlScale : data.beta;

  const { error } = await getSupabase()
    .from("strategy_performance")
    .update({
      alpha: newAlpha,
      beta: newBeta,
      total_trades: won !== null ? data.total_trades + 1 : data.total_trades,
      winning_trades: won === true ? data.winning_trades + 1 : data.winning_trades,
      total_pnl: data.total_pnl + pnl,
      updated_at: new Date().toISOString(),
    })
    .eq("strategy_id", strategyId);

  if (error) throw error;
}

export async function updateStrategyWeights(
  weights: Map<string, number>
): Promise<void> {
  for (const [strategyId, weight] of weights) {
    const { error } = await getSupabase()
      .from("strategy_performance")
      .update({
        current_weight: weight,
        updated_at: new Date().toISOString(),
      })
      .eq("strategy_id", strategyId);

    if (error) {
      console.error(`Failed to update weight for ${strategyId}:`, error.message);
    }
  }
}

export async function getTradesByStrategy(
  strategyId: string,
  limit: number = 100
): Promise<any[]> {
  const { data, error } = await getSupabase()
    .from("agent_trades")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
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
  
  const { error } = await getSupabase()
    .from("daily_snapshots")
    .upsert({ date: today, ...snapshot }, { onConflict: "date" });

  if (error) throw error;
}
