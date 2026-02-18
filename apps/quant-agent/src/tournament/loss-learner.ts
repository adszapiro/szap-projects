/**
 * Loss Learner - Active learning from losing trades
 * 
 * This module analyzes losing trades in real-time and:
 * 1. Immediately reduces allocation to losing strategies
 * 2. Tracks loss patterns to understand WHY strategies fail
 * 3. Can disable consistently failing strategies
 * 4. Generates insights for strategy improvement
 */

import { getSupabase, log, Strategy } from "../db.js";
import { updateStrategyPerformance } from "../db.js";

export interface LossAnalysis {
  strategyId: string;
  strategyName: string;
  symbol: string;
  pnl: number;
  reason: string;
  pattern: LossPattern;
  recommendation: LossRecommendation;
}

export type LossPattern = 
  | "trend_reversal"      // Bought at top / sold at bottom
  | "false_breakout"      // Signal was fakeout
  | "bad_timing"          // Right direction, wrong entry
  | "volatility_spike"    // Unexpected volatility
  | "regime_change"       // Market condition changed
  | "unknown";

export type LossRecommendation =
  | "reduce_allocation"   // Cut position size
  | "pause_strategy"      // Temporarily disable
  | "retire_strategy"     // Permanently disable
  | "adjust_parameters"   // Tweak strategy settings
  | "continue";           // Normal variance, keep running

interface StrategyLossStats {
  totalLosses: number;
  totalLossAmount: number;
  consecutiveLosses: number;
  lossRate: number;  // losses / total trades
  avgLossSize: number;
  maxLoss: number;
  lastLossTime: Date;
}

// Track consecutive losses in memory
const consecutiveLossTracker = new Map<string, number>();

/**
 * Analyze a losing trade and take action
 */
export async function analyzeAndLearnFromLoss(
  strategyId: string,
  symbol: string,
  pnl: number,
  entryPrice: number,
  exitPrice: number,
  holdingPeriod: number,  // in hours
  signal: { type: string; reason: string; confidence: number }
): Promise<LossAnalysis> {
  // Get strategy info
  const { data: strategy } = await getSupabase()
    .from("strategies")
    .select("name, code, symbols")
    .eq("id", strategyId)
    .single();

  const strategyName = strategy?.name || "Unknown";

  // Identify loss pattern
  const pattern = identifyLossPattern(entryPrice, exitPrice, pnl, holdingPeriod, signal);

  // Get historical loss stats
  const stats = await getStrategyLossStats(strategyId);
  
  // Update consecutive loss tracker
  const prevConsecutive = consecutiveLossTracker.get(strategyId) || 0;
  consecutiveLossTracker.set(strategyId, prevConsecutive + 1);
  const consecutiveLosses = prevConsecutive + 1;

  // Determine recommendation
  const recommendation = determineRecommendation(stats, consecutiveLosses, pnl);

  // Take action based on recommendation
  await executeRecommendation(strategyId, recommendation, stats);

  const analysis: LossAnalysis = {
    strategyId,
    strategyName,
    symbol,
    pnl,
    reason: signal.reason,
    pattern,
    recommendation,
  };

  // Log the learning
  await log("info", "loss_analyzed", {
    strategy: strategyName,
    symbol,
    pnl,
    pattern,
    recommendation,
    consecutiveLosses,
    totalLosses: stats.totalLosses + 1,
  });

  console.log(`📉 [LOSS LEARNER] ${strategyName}:`);
  console.log(`   Loss: $${pnl.toFixed(2)} on ${symbol}`);
  console.log(`   Pattern: ${pattern}`);
  console.log(`   Consecutive: ${consecutiveLosses}`);
  console.log(`   Action: ${recommendation}`);

  return analysis;
}

/**
 * Analyze a winning trade and extract what caused it.
 * Mirrors analyzeAndLearnFromLoss — the bot needs to know WHY it wins.
 */
export async function analyzeAndLearnFromWin(
  strategyId: string,
  symbol: string,
  pnl: number,
  entryPrice: number,
  exitPrice: number,
  holdingPeriod: number,
  signal: { type: string; reason: string; confidence: number }
): Promise<void> {
  consecutiveLossTracker.set(strategyId, 0);

  // Skip tiny wins (noise, not signal)
  if (pnl < 5) return;

  const priceChange = (exitPrice - entryPrice) / entryPrice;

  // Classify what made this trade win
  let pattern = "momentum_continuation";
  if (holdingPeriod < 2 && priceChange > 0.03) pattern = "quick_breakout";
  else if (holdingPeriod > 12) pattern = "trend_following";
  else if (signal.confidence >= 0.8) pattern = "high_confidence_signal";
  else if (priceChange > 0.05) pattern = "strong_directional_move";

  await log("info", "win_analyzed", {
    strategy_id: strategyId,
    symbol,
    pnl,
    pattern,
    confidence: signal.confidence,
    holdingPeriod,
    reason: signal.reason,
  });
}

/**
 * Called when a trade wins - reset consecutive loss counter (sync shortcut)
 */
export function recordWin(strategyId: string): void {
  consecutiveLossTracker.set(strategyId, 0);
}

/**
 * Identify what pattern caused the loss
 */
function identifyLossPattern(
  entryPrice: number,
  exitPrice: number,
  pnl: number,
  holdingPeriod: number,
  signal: { type: string; reason: string; confidence: number }
): LossPattern {
  const priceChange = (exitPrice - entryPrice) / entryPrice;

  // Large negative move in short time = volatility spike
  if (Math.abs(priceChange) > 0.05 && holdingPeriod < 2) {
    return "volatility_spike";
  }

  // Low confidence signal that failed = false breakout
  if (signal.confidence < 0.6 && Math.abs(pnl) > 100) {
    return "false_breakout";
  }

  // Bought and it went down (or sold and it went up) = trend reversal
  if (signal.type === "buy" && priceChange < -0.02) {
    return "trend_reversal";
  }
  if (signal.type === "sell" && priceChange > 0.02) {
    return "trend_reversal";
  }

  // Small loss = likely just bad timing
  if (Math.abs(pnl) < 50) {
    return "bad_timing";
  }

  return "unknown";
}

/**
 * Get historical loss statistics for a strategy
 */
async function getStrategyLossStats(strategyId: string): Promise<StrategyLossStats> {
  const { data: trades } = await getSupabase()
    .from("agent_trades")
    .select("pnl, created_at")
    .eq("strategy_id", strategyId)
    .eq("side", "sell")  // Only closed trades have P&L
    .order("created_at", { ascending: false })
    .limit(100);

  if (!trades || trades.length === 0) {
    return {
      totalLosses: 0,
      totalLossAmount: 0,
      consecutiveLosses: 0,
      lossRate: 0,
      avgLossSize: 0,
      maxLoss: 0,
      lastLossTime: new Date(),
    };
  }

  const losses = trades.filter(t => (t.pnl || 0) < 0);
  const totalLossAmount = losses.reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);

  return {
    totalLosses: losses.length,
    totalLossAmount,
    consecutiveLosses: consecutiveLossTracker.get(strategyId) || 0,
    lossRate: losses.length / trades.length,
    avgLossSize: losses.length > 0 ? totalLossAmount / losses.length : 0,
    maxLoss: losses.length > 0 ? Math.max(...losses.map(t => Math.abs(t.pnl || 0))) : 0,
    lastLossTime: losses.length > 0 ? new Date(losses[0].created_at) : new Date(),
  };
}

/**
 * Determine what action to take
 */
function determineRecommendation(
  stats: StrategyLossStats,
  consecutiveLosses: number,
  currentLoss: number
): LossRecommendation {
  // 7+ consecutive losses = pause the strategy
  if (consecutiveLosses >= 7) {
    return "pause_strategy";
  }

  // Loss rate > 80% with significant data = consider retiring
  if (stats.totalLosses >= 20 && stats.lossRate > 0.8) {
    return "retire_strategy";
  }

  // 3+ consecutive losses = reduce allocation
  if (consecutiveLosses >= 3) {
    return "reduce_allocation";
  }

  // Large single loss = reduce allocation
  if (Math.abs(currentLoss) > stats.avgLossSize * 2 && stats.avgLossSize > 0) {
    return "reduce_allocation";
  }

  // Otherwise, normal variance - continue
  return "continue";
}

/**
 * Execute the recommended action
 */
async function executeRecommendation(
  strategyId: string,
  recommendation: LossRecommendation,
  stats: StrategyLossStats
): Promise<void> {
  switch (recommendation) {
    case "reduce_allocation": {
      // Proportional weight reduction (15% cut per incident)
      // No manual beta manipulation — let Thompson's normal updates handle it
      const { data: perf } = await getSupabase()
        .from("strategy_performance")
        .select("current_weight")
        .eq("strategy_id", strategyId)
        .single();

      if (perf) {
        await getSupabase()
          .from("strategy_performance")
          .update({
            current_weight: Math.max(0.001, perf.current_weight * 0.85),
            updated_at: new Date().toISOString(),
          })
          .eq("strategy_id", strategyId);
      }
      break;
    }

    case "pause_strategy": {
      // Set weight to near-zero (don't delete, might recover)
      await getSupabase()
        .from("strategy_performance")
        .update({
          current_weight: 0.001,  // Minimal allocation
          updated_at: new Date().toISOString(),
        })
        .eq("strategy_id", strategyId);

      await log("info", "strategy_paused", { 
        strategy_id: strategyId,
        reason: "consecutive_losses",
        losses: stats.totalLosses,
      });
      break;
    }

    case "retire_strategy": {
      // Mark strategy as failed (but keep for analysis)
      await getSupabase()
        .from("strategies")
        .update({ status: "retired" })
        .eq("id", strategyId);

      await getSupabase()
        .from("strategy_performance")
        .update({
          current_weight: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("strategy_id", strategyId);

      await log("info", "strategy_retired", {
        strategy_id: strategyId,
        reason: "high_loss_rate",
        loss_rate: stats.lossRate,
        total_losses: stats.totalLosses,
      });
      break;
    }

    case "continue":
    default:
      // Normal operation - the standard bandit update handles this
      break;
  }
}

/**
 * Get summary of recent loss learning
 */
export async function getLossLearningSummary(): Promise<{
  strategiesPaused: number;
  strategiesRetired: number;
  totalLossesAnalyzed: number;
  commonPatterns: Map<LossPattern, number>;
}> {
  // Get recent loss logs
  const { data: logs } = await getSupabase()
    .from("agent_logs")
    .select("data")
    .eq("event_type", "loss_analyzed")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(100);

  const patterns = new Map<LossPattern, number>();
  let paused = 0;
  let retired = 0;

  for (const log of logs || []) {
    const data = log.data as any;
    if (data.pattern) {
      patterns.set(data.pattern, (patterns.get(data.pattern) || 0) + 1);
    }
    if (data.recommendation === "pause_strategy") paused++;
    if (data.recommendation === "retire_strategy") retired++;
  }

  return {
    strategiesPaused: paused,
    strategiesRetired: retired,
    totalLossesAnalyzed: logs?.length || 0,
    commonPatterns: patterns,
  };
}
