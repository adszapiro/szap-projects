/**
 * Continuous Learning Module
 * Updates bandit parameters and tracks convergence
 */

import { getSupabase, getActiveStrategies, log } from "../db.js";
import { updateBandit, getBanditStats, getStrategyRankings, getExpectedWinRates } from "../bandit/thompson.js";
import { calculateMetrics, calculateCompositeScore, isWinningTrade } from "../bandit/metrics.js";

export interface LearningStats {
  timestamp: Date;
  totalStrategies: number;
  totalTrades: number;
  convergenceScore: number;  // How stable are the rankings (0-1)
  topStrategies: string[];
  recentChanges: StrategyChange[];
}

export interface StrategyChange {
  strategyId: string;
  metric: string;
  oldValue: number;
  newValue: number;
  changePercent: number;
}

// Store historical rankings for convergence calculation
let rankingsHistory: Array<Map<string, number>> = [];
const MAX_HISTORY = 100;

/**
 * Process completed trades and update bandit
 */
export async function processCompletedTrades(): Promise<number> {
  // Get trades from today that haven't been processed for bandit update
  const today = new Date().toISOString().split("T")[0];
  
  const { data: trades, error } = await getSupabase()
    .from("agent_trades")
    .select("*")
    .gte("created_at", today)
    .eq("side", "sell")  // Only process sell trades (closed positions)
    .is("bandit_processed", null);

  if (error || !trades) {
    console.error("Failed to fetch trades for learning:", error);
    return 0;
  }

  let processed = 0;
  
  for (const trade of trades) {
    if (!trade.strategy_id || trade.pnl === null) continue;
    
    const won = isWinningTrade(trade.pnl);
    await updateBandit(trade.strategy_id, won, trade.pnl);
    
    // Mark as processed (if column exists)
    try {
      await getSupabase()
        .from("agent_trades")
        .update({ bandit_processed: true })
        .eq("id", trade.id);
    } catch {
      // Column might not exist, that's ok
    }
    
    processed++;
  }

  if (processed > 0) {
    await log("info", "bandit_updated", { tradesProcessed: processed });
  }

  return processed;
}

/**
 * Calculate convergence score
 * How stable are the strategy rankings over time?
 */
export async function calculateConvergence(): Promise<number> {
  const rankings = await getStrategyRankings();
  
  // Create rank map
  const currentRanks = new Map<string, number>();
  rankings.forEach((r, i) => currentRanks.set(r.strategyId, i + 1));
  
  // Store in history
  rankingsHistory.push(currentRanks);
  if (rankingsHistory.length > MAX_HISTORY) {
    rankingsHistory.shift();
  }
  
  // Need at least 10 snapshots to calculate convergence
  if (rankingsHistory.length < 10) {
    return 0;
  }
  
  // Calculate rank stability over recent history
  const recentHistory = rankingsHistory.slice(-10);
  let totalVariance = 0;
  let strategyCount = 0;
  
  for (const strategyId of currentRanks.keys()) {
    const ranks = recentHistory
      .map(h => h.get(strategyId))
      .filter((r): r is number => r !== undefined);
    
    if (ranks.length >= 5) {
      const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
      const variance = ranks.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ranks.length;
      totalVariance += variance;
      strategyCount++;
    }
  }
  
  // Lower variance = higher convergence
  const avgVariance = strategyCount > 0 ? totalVariance / strategyCount : 10;
  const convergence = Math.max(0, 1 - (avgVariance / 10));
  
  return convergence;
}

/**
 * Get learning statistics
 */
export async function getLearningStats(): Promise<LearningStats> {
  const banditStats = await getBanditStats();
  const rankings = await getStrategyRankings();
  const convergence = await calculateConvergence();
  
  // Get top 3 strategies
  const topStrategies = rankings.slice(0, 3).map(r => r.strategyId);
  
  return {
    timestamp: new Date(),
    totalStrategies: banditStats.totalArms,
    totalTrades: banditStats.totalTrades,
    convergenceScore: convergence,
    topStrategies,
    recentChanges: [],  // Would track significant changes
  };
}

/**
 * Decay old data to prevent stale strategies from dominating
 * Slowly regress alpha/beta toward prior (1, 1)
 */
export async function decayOldData(decayRate: number = 0.01): Promise<void> {
  const { data: performances, error } = await getSupabase()
    .from("strategy_performance")
    .select("*");

  if (error || !performances) return;

  for (const perf of performances) {
    // Only decay if we have significant data
    if (perf.total_trades < 20) continue;
    
    // Exponential decay toward prior
    const newAlpha = 1 + (perf.alpha - 1) * (1 - decayRate);
    const newBeta = 1 + (perf.beta - 1) * (1 - decayRate);
    
    await getSupabase()
      .from("strategy_performance")
      .update({
        alpha: newAlpha,
        beta: newBeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", perf.id);
  }

  await log("info", "bandit_decay_applied", { decayRate });
}

/**
 * Identify underperforming strategies that should be retired
 */
export async function identifyUnderperformers(
  minTrades: number = 50,
  minWinRate: number = 0.35
): Promise<string[]> {
  const rankings = await getStrategyRankings();
  
  const underperformers = rankings.filter(r => 
    r.totalTrades >= minTrades && 
    r.expectedWinRate < minWinRate
  );
  
  return underperformers.map(u => u.strategyId);
}

/**
 * Run full learning cycle
 */
export async function runLearningCycle(): Promise<LearningStats> {
  await log("info", "learning_cycle_started", {});
  
  // 1. Process any completed trades
  const processed = await processCompletedTrades();
  
  // 2. Apply decay to prevent staleness
  await decayOldData(0.005);  // Very slow decay
  
  // 3. Calculate stats
  const stats = await getLearningStats();
  
  // 4. Log results
  await log("info", "learning_cycle_completed", {
    tradesProcessed: processed,
    convergence: stats.convergenceScore,
    topStrategies: stats.topStrategies,
  });
  
  return stats;
}

/**
 * Generate learning report
 */
export async function generateReport(): Promise<string> {
  const stats = await getLearningStats();
  const rankings = await getStrategyRankings();
  
  let report = "\n📊 TOURNAMENT LEARNING REPORT\n";
  report += "═══════════════════════════════════════\n\n";
  
  report += `📈 Overview\n`;
  report += `   Total Strategies: ${stats.totalStrategies}\n`;
  report += `   Total Trades: ${stats.totalTrades}\n`;
  report += `   Convergence: ${(stats.convergenceScore * 100).toFixed(1)}%\n\n`;
  
  report += `🏆 Top Performers\n`;
  for (const r of rankings.slice(0, 5)) {
    report += `   ${r.rank}. ${r.strategyId.slice(0, 8)}... `;
    report += `WR: ${(r.expectedWinRate * 100).toFixed(1)}% `;
    report += `Trades: ${r.totalTrades} `;
    report += `PnL: $${r.totalPnl.toFixed(2)} `;
    report += `Weight: ${(r.currentWeight * 100).toFixed(1)}%\n`;
  }
  
  report += `\n📉 Bottom Performers\n`;
  for (const r of rankings.slice(-3)) {
    report += `   ${r.rank}. ${r.strategyId.slice(0, 8)}... `;
    report += `WR: ${(r.expectedWinRate * 100).toFixed(1)}%\n`;
  }
  
  report += "\n═══════════════════════════════════════\n";
  
  return report;
}
