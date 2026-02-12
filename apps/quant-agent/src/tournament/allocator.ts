/**
 * Capital Allocator
 * Determines position sizes based on bandit weights and risk management
 */

import { getCurrentWeights, getStrategyRankings } from "../bandit/thompson.js";
import { getAccount } from "../executor.js";
import { getSimulatedAccountValue } from "../simulator.js";

export interface AllocationConfig {
  minAllocation: number;      // Minimum per strategy (default: 0.05 = 5%)
  maxAllocation: number;      // Maximum per strategy (default: 0.30 = 30%)
  cashReserve: number;        // Keep as cash (default: 0.10 = 10%)
  maxPositions: number;       // Max concurrent positions (default: 10)
  riskScaling: boolean;       // Scale by volatility (default: true)
}

const DEFAULT_CONFIG: AllocationConfig = {
  minAllocation: 0.01,
  maxAllocation: 0.50,
  cashReserve: 0.03,
  maxPositions: 20,
  riskScaling: true,
};

/**
 * Get position size for a strategy based on bandit allocation
 */
export async function getPositionSize(
  strategyId: string,
  assetClass: "stock" | "crypto",
  config: Partial<AllocationConfig> = {}
): Promise<number> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Get account value
  const simAccount = await getSimulatedAccountValue();
  const accountValue = assetClass === "crypto" 
    ? simAccount.totalValue
    : (await getAccount()).portfolio_value;
  
  // Get current allocation weight
  const weights = await getCurrentWeights();
  const weight = weights.get(strategyId) || cfg.minAllocation;
  
  // Apply constraints
  const constrainedWeight = Math.max(
    cfg.minAllocation,
    Math.min(cfg.maxAllocation, weight)
  );
  
  // Calculate available capital (after cash reserve)
  const availableCapital = accountValue * (1 - cfg.cashReserve);
  
  return availableCapital * constrainedWeight;
}

/**
 * Get allocation for all active strategies
 */
export async function getAllAllocations(
  assetClass: "stock" | "crypto",
  config: Partial<AllocationConfig> = {}
): Promise<Map<string, number>> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const simAccount2 = await getSimulatedAccountValue();
  const accountValue = assetClass === "crypto"
    ? simAccount2.totalValue
    : (await getAccount()).portfolio_value;
  
  const availableCapital = accountValue * (1 - cfg.cashReserve);
  const weights = await getCurrentWeights();
  const allocations = new Map<string, number>();
  
  // Apply constraints and calculate dollar amounts
  let totalWeight = 0;
  const constrainedWeights = new Map<string, number>();
  
  for (const [strategyId, weight] of weights) {
    const constrained = Math.max(
      cfg.minAllocation,
      Math.min(cfg.maxAllocation, weight)
    );
    constrainedWeights.set(strategyId, constrained);
    totalWeight += constrained;
  }
  
  // Normalize and convert to dollar amounts
  for (const [strategyId, weight] of constrainedWeights) {
    const normalizedWeight = totalWeight > 0 ? weight / totalWeight : 1 / constrainedWeights.size;
    allocations.set(strategyId, availableCapital * normalizedWeight);
  }
  
  return allocations;
}

/**
 * Check if we should trade a strategy (based on allocation and ranking)
 */
export async function shouldTrade(
  strategyId: string,
  signalConfidence: number,
  minConfidence: number = 0.5
): Promise<{ shouldTrade: boolean; reason: string }> {
  // Basic confidence check
  if (signalConfidence < minConfidence) {
    return { shouldTrade: false, reason: `Confidence ${signalConfidence} < ${minConfidence}` };
  }
  
  // Get rankings
  const rankings = await getStrategyRankings();
  const ranking = rankings.find(r => r.strategyId === strategyId);
  
  if (!ranking) {
    // New strategy - always allow to gather data
    return { shouldTrade: true, reason: "New strategy - collecting data" };
  }
  
  // Allow if in top half or has few trades (exploration)
  if (ranking.rank <= rankings.length / 2 || ranking.totalTrades < 10) {
    return { shouldTrade: true, reason: `Rank ${ranking.rank}/${rankings.length}` };
  }
  
  // For bottom half with enough trades, be more selective
  if (signalConfidence >= 0.7) {
    return { shouldTrade: true, reason: "High confidence override" };
  }
  
  return { 
    shouldTrade: false, 
    reason: `Low rank (${ranking.rank}) and moderate confidence (${signalConfidence})` 
  };
}

/**
 * Calculate Kelly Criterion optimal bet size
 * f* = (bp - q) / b
 * where b = odds, p = probability of winning, q = probability of losing
 */
export function kellySize(
  winProbability: number,
  avgWin: number,
  avgLoss: number,
  fraction: number = 0.25  // Use fraction of Kelly for safety
): number {
  if (avgLoss <= 0 || winProbability <= 0 || winProbability >= 1) {
    return 0;
  }
  
  const b = avgWin / avgLoss;  // Odds
  const p = winProbability;
  const q = 1 - p;
  
  const kelly = (b * p - q) / b;
  
  // Use fractional Kelly and clamp to reasonable range
  return Math.max(0, Math.min(fraction * kelly, 0.25));
}

/**
 * Get recommended position sizes based on Kelly Criterion
 */
export async function getKellyAllocations(
  config: Partial<AllocationConfig> = {}
): Promise<Map<string, number>> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rankings = await getStrategyRankings();
  const allocations = new Map<string, number>();
  
  for (const strategy of rankings) {
    // Estimate win probability from expected rate
    const winProb = strategy.expectedWinRate;
    
    // Use fixed avg win/loss ratio (could be calculated from actual trades)
    const avgWin = 1.5;
    const avgLoss = 1.0;
    
    const kelly = kellySize(winProb, avgWin, avgLoss, 0.25);
    const constrained = Math.max(
      cfg.minAllocation,
      Math.min(cfg.maxAllocation, kelly)
    );
    
    allocations.set(strategy.strategyId, constrained);
  }
  
  // Normalize to sum to 1
  const total = Array.from(allocations.values()).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const [id, alloc] of allocations) {
      allocations.set(id, alloc / total);
    }
  }
  
  return allocations;
}
