/**
 * Thompson Sampling Multi-Armed Bandit
 * 
 * Used to dynamically allocate capital to strategies based on performance.
 * Each strategy is an "arm" with a Beta distribution representing our
 * belief about its win probability.
 */

import {
  getAllStrategyPerformances,
  getStrategyPerformance,
  updateStrategyPerformance,
  updateStrategyWeights,
  StrategyPerformance,
} from "../db.js";
import { getCachedRiskScores, adjustWeightsWithScores } from "../ml/risk-scorer.js";

/**
 * Sample from Beta distribution using the inverse transform method
 * Approximation using the ratio of gamma variates
 */
function sampleBeta(alpha: number, beta: number): number {
  // Use the fact that Beta(a,b) = Gamma(a,1) / (Gamma(a,1) + Gamma(b,1))
  const gammaA = sampleGamma(alpha);
  const gammaB = sampleGamma(beta);
  return gammaA / (gammaA + gammaB);
}

/**
 * Sample from Gamma distribution using Marsaglia's method
 */
function sampleGamma(shape: number): number {
  if (shape < 1) {
    return sampleGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }
  
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  
  while (true) {
    let x, v;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    
    v = v * v * v;
    const u = Math.random();
    
    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }
    
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Standard normal random variate using Box-Muller
 */
function randn(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export interface StrategyArm {
  strategyId: string;
  strategyName: string;
  alpha: number;      // Successes + 1
  beta: number;       // Failures + 1
  totalTrades: number;
  winRate: number;
  totalPnl: number;
}

/**
 * Get all strategy arms from the database
 */
export async function getStrategyArms(): Promise<StrategyArm[]> {
  const performances = await getAllStrategyPerformances();
  
  return performances.map(p => ({
    strategyId: p.strategy_id,
    strategyName: p.strategy_id, // Will be enriched with strategy data
    alpha: p.alpha,
    beta: p.beta,
    totalTrades: p.total_trades,
    winRate: p.total_trades > 0 ? p.winning_trades / p.total_trades : 0.5,
    totalPnl: p.total_pnl,
  }));
}

/**
 * Compute fractional Kelly weight for a strategy arm
 * Uses arm's actual win rate and estimated payoff ratio from total PnL
 */
function kellyWeight(arm: StrategyArm): number {
  const p = arm.winRate;
  const q = 1 - p;

  if (p <= 0 || p >= 1 || arm.totalTrades < 5) {
    return 0; // Not enough data for Kelly
  }

  // Estimate payoff ratio from realized PnL
  // avgTradeReturn ≈ totalPnl / totalTrades, scale to a per-dollar b ratio
  const avgTradeReturn = arm.totalPnl / arm.totalTrades;
  // b = avgWin / avgLoss; proxy: winning trades earned (p * totalPnl / p) vs avg loss
  // Safer: assume avgLoss = 1 unit, avgWin = (totalPnl / wins) if positive
  const wins = p * arm.totalTrades;
  const losses = q * arm.totalTrades;
  const grossWinEstimate = Math.max(avgTradeReturn * arm.totalTrades + losses, 0);
  const avgWin = wins > 0 ? grossWinEstimate / wins : 1;
  const avgLoss = 1.0;

  const b = Math.max(avgWin / avgLoss, 0.1);
  const kelly = (b * p - q) / b;

  // Fractional Kelly (25%) capped at 0.25 per strategy
  return Math.max(0, Math.min(0.25 * kelly, 0.25));
}

/**
 * Sample allocation weights using Thompson Sampling + Kelly Criterion blend
 *
 * Algorithm:
 * 1. Thompson: Sample Beta(alpha, beta) → softmax → 70% of final weight
 * 2. Kelly: Fractional Kelly from win rate + PnL history → 30% of final weight
 * 3. Apply ML risk scores on top
 */
export async function sampleAllocation(): Promise<Map<string, number>> {
  const arms = await getStrategyArms();

  if (arms.length === 0) {
    return new Map();
  }

  // ── Thompson component ──────────────────────────────────────────────────
  const samples = arms.map(arm => ({
    strategyId: arm.strategyId,
    sample: sampleBeta(arm.alpha, arm.beta),
  }));

  // Temperature-controlled softmax: lower T = more exploitative
  // Winners get concentrated capital, losers get near-zero
  const TEMPERATURE = 0.5;
  const logSamples = samples.map(s => ({
    id: s.strategyId,
    logVal: Math.log(Math.max(s.sample, 1e-10)),
  }));
  const maxLog = Math.max(...logSamples.map(s => s.logVal));
  const expScaled = logSamples.map(s => ({
    id: s.id,
    exp: Math.exp((s.logVal - maxLog) / TEMPERATURE),
  }));
  const sumExp = expScaled.reduce((s, e) => s + e.exp, 0);

  const thompsonWeights = new Map<string, number>();
  for (const s of expScaled) {
    thompsonWeights.set(s.id, s.exp / sumExp);
  }

  // ── Kelly component ─────────────────────────────────────────────────────
  const kellyRaw = new Map<string, number>();
  let kellySum = 0;
  for (const arm of arms) {
    const k = kellyWeight(arm);
    kellyRaw.set(arm.strategyId, k);
    kellySum += k;
  }

  const kellyWeights = new Map<string, number>();
  if (kellySum > 0) {
    for (const [id, k] of kellyRaw) {
      kellyWeights.set(id, k / kellySum);
    }
  } else {
    // Not enough trade data — fall back to uniform Kelly (effectively pure Thompson)
    for (const arm of arms) {
      kellyWeights.set(arm.strategyId, 1 / arms.length);
    }
  }

  // ── Blend 70% Thompson + 30% Kelly ──────────────────────────────────────
  const THOMPSON_WEIGHT = 0.70;
  const KELLY_WEIGHT = 0.30;

  const blended = new Map<string, number>();
  for (const arm of arms) {
    const t = thompsonWeights.get(arm.strategyId) ?? 0;
    const k = kellyWeights.get(arm.strategyId) ?? 0;
    blended.set(arm.strategyId, THOMPSON_WEIGHT * t + KELLY_WEIGHT * k);
  }

  // ── Apply ML risk scores ─────────────────────────────────────────────────
  let finalWeights = blended;
  try {
    const riskScores = await getCachedRiskScores();
    if (riskScores.size > 0) {
      finalWeights = adjustWeightsWithScores(blended, riskScores);
    }
  } catch {
    // Risk scorer unavailable — use blended weights
  }

  // Persist weights to database
  await updateStrategyWeights(finalWeights);

  return finalWeights;
}

/**
 * Update bandit after a trade completes
 */
export async function updateBandit(
  strategyId: string,
  won: boolean,
  pnl: number
): Promise<void> {
  await updateStrategyPerformance(strategyId, won, pnl);
}

/**
 * Get the expected win probability for each strategy
 * (Mean of the Beta distribution)
 */
export async function getExpectedWinRates(): Promise<Map<string, number>> {
  const arms = await getStrategyArms();
  const rates = new Map<string, number>();
  
  for (const arm of arms) {
    // Expected value of Beta(alpha, beta) is alpha / (alpha + beta)
    const expected = arm.alpha / (arm.alpha + arm.beta);
    rates.set(arm.strategyId, expected);
  }
  
  return rates;
}

/**
 * Get current allocation weights from database
 */
export async function getCurrentWeights(): Promise<Map<string, number>> {
  const performances = await getAllStrategyPerformances();
  const weights = new Map<string, number>();
  
  for (const p of performances) {
    weights.set(p.strategy_id, p.current_weight);
  }
  
  return weights;
}

/**
 * Calculate confidence interval for each strategy's win rate
 * Using Beta distribution quantiles
 */
export async function getConfidenceIntervals(
  confidence: number = 0.95
): Promise<Map<string, { lower: number; upper: number; mean: number }>> {
  const arms = await getStrategyArms();
  const intervals = new Map();
  
  const alpha_ci = (1 - confidence) / 2;
  
  for (const arm of arms) {
    // Approximate CI using normal approximation for large n
    const mean = arm.alpha / (arm.alpha + arm.beta);
    const variance = (arm.alpha * arm.beta) / 
                     (Math.pow(arm.alpha + arm.beta, 2) * (arm.alpha + arm.beta + 1));
    const std = Math.sqrt(variance);
    const z = 1.96; // 95% CI
    
    intervals.set(arm.strategyId, {
      lower: Math.max(0, mean - z * std),
      upper: Math.min(1, mean + z * std),
      mean,
    });
  }
  
  return intervals;
}

/**
 * Get strategy rankings by expected performance
 */
export async function getStrategyRankings(): Promise<Array<{
  strategyId: string;
  expectedWinRate: number;
  totalTrades: number;
  totalPnl: number;
  currentWeight: number;
  rank: number;
}>> {
  const arms = await getStrategyArms();
  const weights = await getCurrentWeights();
  
  const rankings = arms.map(arm => ({
    strategyId: arm.strategyId,
    expectedWinRate: arm.alpha / (arm.alpha + arm.beta),
    totalTrades: arm.totalTrades,
    totalPnl: arm.totalPnl,
    currentWeight: weights.get(arm.strategyId) || 0,
    rank: 0,
  }));
  
  // Sort by expected win rate descending
  rankings.sort((a, b) => b.expectedWinRate - a.expectedWinRate);
  
  // Assign ranks
  rankings.forEach((r, i) => {
    r.rank = i + 1;
  });
  
  return rankings;
}

/**
 * Check if we should explore (try underperforming strategies) or exploit (use best)
 * Uses Upper Confidence Bound (UCB) as a secondary metric
 */
export function shouldExplore(
  totalRounds: number,
  armPulls: number,
  explorationRate: number = 2.0
): boolean {
  if (armPulls === 0) return true; // Always try untested arms
  
  const ucbBonus = Math.sqrt((explorationRate * Math.log(totalRounds)) / armPulls);
  
  // Explore if UCB bonus is significant
  return ucbBonus > 0.1;
}

/**
 * Get bandit statistics for logging/dashboard
 */
export async function getBanditStats(): Promise<{
  totalArms: number;
  totalTrades: number;
  averageWinRate: number;
  bestStrategy: { id: string; winRate: number } | null;
  worstStrategy: { id: string; winRate: number } | null;
}> {
  const arms = await getStrategyArms();
  
  if (arms.length === 0) {
    return {
      totalArms: 0,
      totalTrades: 0,
      averageWinRate: 0,
      bestStrategy: null,
      worstStrategy: null,
    };
  }
  
  const totalTrades = arms.reduce((sum, a) => sum + a.totalTrades, 0);
  const avgWinRate = arms.reduce((sum, a) => sum + a.winRate, 0) / arms.length;
  
  const sorted = [...arms].sort((a, b) => b.winRate - a.winRate);
  
  return {
    totalArms: arms.length,
    totalTrades,
    averageWinRate: avgWinRate,
    bestStrategy: sorted[0] ? { id: sorted[0].strategyId, winRate: sorted[0].winRate } : null,
    worstStrategy: sorted[sorted.length - 1] 
      ? { id: sorted[sorted.length - 1].strategyId, winRate: sorted[sorted.length - 1].winRate } 
      : null,
  };
}
