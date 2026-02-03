/**
 * Strategy Health Monitor
 * Automatically pauses strategies that are performing poorly
 */

import { getSupabase, log, pauseStrategy, resumeStrategy } from "../db.js";
import { getStrategyRankings } from "../bandit/thompson.js";

// Thresholds for auto-pause
const MIN_TRADES_FOR_EVALUATION = 5; // Need at least 5 trades to evaluate
const MAX_LOSS_THRESHOLD = -500; // Pause if strategy lost more than $500
const MIN_WIN_RATE_THRESHOLD = 0.15; // Pause if win rate below 15%
const MAX_CONSECUTIVE_LOSSES = 5; // Pause after 5 consecutive losses

interface StrategyHealthStatus {
  strategyId: string;
  name: string;
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  shouldPause: boolean;
  reason: string | null;
}

/**
 * Check health of all strategies and auto-pause poor performers
 */
export async function checkStrategyHealth(): Promise<StrategyHealthStatus[]> {
  const supabase = getSupabase();
  const results: StrategyHealthStatus[] = [];
  
  // Get all deployed strategies with their performance
  const { data: strategies } = await supabase
    .from("strategies")
    .select("id, name, status")
    .eq("status", "deployed");
  
  if (!strategies || strategies.length === 0) {
    return results;
  }
  
  // Get performance data
  const { data: performances } = await supabase
    .from("strategy_performance")
    .select("*");
  
  const perfMap = new Map(performances?.map(p => [p.strategy_id, p]) || []);
  
  // Check each strategy
  for (const strategy of strategies) {
    const perf = perfMap.get(strategy.id);
    
    const status: StrategyHealthStatus = {
      strategyId: strategy.id,
      name: strategy.name,
      totalTrades: perf?.total_trades || 0,
      winRate: perf ? perf.winning_trades / Math.max(perf.total_trades, 1) : 0.5,
      totalPnl: perf?.total_pnl || 0,
      shouldPause: false,
      reason: null,
    };
    
    // Only evaluate if enough trades
    if (status.totalTrades >= MIN_TRADES_FOR_EVALUATION) {
      // Check loss threshold
      if (status.totalPnl < MAX_LOSS_THRESHOLD) {
        status.shouldPause = true;
        status.reason = `Total P&L ($${status.totalPnl.toFixed(2)}) below threshold ($${MAX_LOSS_THRESHOLD})`;
      }
      
      // Check win rate
      if (status.winRate < MIN_WIN_RATE_THRESHOLD) {
        status.shouldPause = true;
        status.reason = `Win rate (${(status.winRate * 100).toFixed(1)}%) below threshold (${MIN_WIN_RATE_THRESHOLD * 100}%)`;
      }
    }
    
    results.push(status);
    
    // Auto-pause if needed
    if (status.shouldPause) {
      try {
        await pauseStrategy(strategy.id);
        console.log(`⏸️ Auto-paused strategy "${strategy.name}": ${status.reason}`);
        
        await log("warning", "strategy_auto_paused", {
          strategyId: strategy.id,
          strategyName: strategy.name,
          reason: status.reason,
          totalTrades: status.totalTrades,
          winRate: status.winRate,
          totalPnl: status.totalPnl,
        });
      } catch (error) {
        console.error(`Failed to pause strategy ${strategy.name}:`, error);
      }
    }
  }
  
  return results;
}

/**
 * Check for strategies that have recovered and can be resumed
 */
export async function checkForRecovery(): Promise<string[]> {
  const supabase = getSupabase();
  const resumed: string[] = [];
  
  // Get paused strategies
  const { data: pausedStrategies } = await supabase
    .from("strategies")
    .select("id, name")
    .eq("status", "paused");
  
  if (!pausedStrategies || pausedStrategies.length === 0) {
    return resumed;
  }
  
  // Get rankings to see if market conditions might have changed
  const rankings = await getStrategyRankings();
  
  // If average win rate has improved significantly, consider resuming
  const avgWinRate = rankings.length > 0
    ? rankings.reduce((sum, r) => sum + r.expectedWinRate, 0) / rankings.length
    : 0.5;
  
  // Only resume if market seems favorable (avg win rate > 45%)
  if (avgWinRate > 0.45) {
    // Resume strategies that were paused for more than 24 hours
    // (This gives time for market conditions to change)
    const { data: pauseLogs } = await supabase
      .from("agent_logs")
      .select("details")
      .eq("action", "strategy_auto_paused")
      .order("created_at", { ascending: false })
      .limit(50);
    
    const recentlyPaused = new Set(
      pauseLogs?.map(l => (l.details as any)?.strategyId).filter(Boolean) || []
    );
    
    for (const strategy of pausedStrategies) {
      // Don't auto-resume recently paused strategies
      if (recentlyPaused.has(strategy.id)) {
        continue;
      }
      
      try {
        await resumeStrategy(strategy.id);
        resumed.push(strategy.name);
        console.log(`▶️ Auto-resumed strategy "${strategy.name}" - market conditions improved`);
        
        await log("info", "strategy_auto_resumed", {
          strategyId: strategy.id,
          strategyName: strategy.name,
          avgWinRate,
        });
      } catch (error) {
        console.error(`Failed to resume strategy ${strategy.name}:`, error);
      }
    }
  }
  
  return resumed;
}

/**
 * Print health summary
 */
export async function printHealthSummary(): Promise<void> {
  const statuses = await checkStrategyHealth();
  
  const healthy = statuses.filter(s => !s.shouldPause);
  const unhealthy = statuses.filter(s => s.shouldPause);
  const needsEvaluation = statuses.filter(s => s.totalTrades < MIN_TRADES_FOR_EVALUATION);
  
  console.log("\n🏥 STRATEGY HEALTH REPORT");
  console.log("═══════════════════════════════════════");
  console.log(`Total Strategies: ${statuses.length}`);
  console.log(`   Healthy: ${healthy.length}`);
  console.log(`   Unhealthy (paused): ${unhealthy.length}`);
  console.log(`   Needs more trades: ${needsEvaluation.length}`);
  
  if (unhealthy.length > 0) {
    console.log("\n⚠️ Unhealthy Strategies:");
    unhealthy.forEach(s => {
      console.log(`   ${s.name}: ${s.reason}`);
    });
  }
  
  console.log("═══════════════════════════════════════\n");
}

/**
 * Run full health check cycle
 */
export async function runHealthCheckCycle(): Promise<void> {
  console.log("\n🏥 Running strategy health check...");
  
  // Check and pause unhealthy strategies
  const healthStatuses = await checkStrategyHealth();
  const pausedCount = healthStatuses.filter(s => s.shouldPause).length;
  
  // Check for recovery opportunities
  const resumed = await checkForRecovery();
  
  console.log(`   Checked ${healthStatuses.length} strategies`);
  if (pausedCount > 0) {
    console.log(`   Auto-paused ${pausedCount} underperforming strategies`);
  }
  if (resumed.length > 0) {
    console.log(`   Auto-resumed ${resumed.length} strategies`);
  }
  
  await log("info", "health_check_completed", {
    strategiesChecked: healthStatuses.length,
    paused: pausedCount,
    resumed: resumed.length,
  });
}
