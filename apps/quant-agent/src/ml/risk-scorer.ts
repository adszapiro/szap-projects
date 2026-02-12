/**
 * ML Risk Scorer
 *
 * Computes a composite risk-adjusted score per strategy using
 * Sharpe, Sortino, profit factor, expectancy, and max drawdown.
 * Adjusts Thompson Sampling weights so capital flows toward
 * strategies with better risk-adjusted returns.
 */

import { calculateStrategyRiskMetrics, type StrategyRiskMetrics } from "../metrics/risk.js";
import { getSupabase } from "../db.js";

// ── Score Weights ──────────────────────────────────────────
const SCORE_WEIGHTS = {
  sharpe: 0.30,
  sortino: 0.25,
  profitFactor: 0.20,
  expectancy: 0.15,
  maxDrawdown: 0.10,  // penalizes drawdown
};

const MIN_TRADES_FOR_SCORING = 5;

export interface StrategyRiskScore {
  strategyId: string;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdownPct: number;
  compositeScore: number;
  tradesUsed: number;
}

// ── Min-Max Normalization ──────────────────────────────────
function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map(v => (v - min) / (max - min));
}

// ── Composite Score ────────────────────────────────────────
/**
 * Calculate composite risk scores for all strategies that have
 * enough trade history. Returns a Map of strategyId → score (0-1).
 */
export async function calculateAllRiskScores(): Promise<Map<string, StrategyRiskScore>> {
  const { data: strategies } = await getSupabase()
    .from("strategies")
    .select("id")
    .in("status", ["deployed", "paused"]);

  if (!strategies || strategies.length === 0) {
    return new Map();
  }

  // Calculate risk metrics for each strategy
  const metricsResults: Array<{ id: string; metrics: StrategyRiskMetrics }> = [];

  for (const s of strategies) {
    const metrics = await calculateStrategyRiskMetrics(s.id);
    if (metrics && metrics.totalTrades >= MIN_TRADES_FOR_SCORING) {
      metricsResults.push({ id: s.id, metrics });
    }
  }

  if (metricsResults.length === 0) {
    return new Map();
  }

  // Extract raw values for normalization
  const sharpes = metricsResults.map(r => r.metrics.sharpeRatio);
  const sortinos = metricsResults.map(r => r.metrics.sortinoRatio);
  const profitFactors = metricsResults.map(r => Math.min(r.metrics.profitFactor, 10)); // cap outliers
  const expectancies = metricsResults.map(r => r.metrics.expectancy);
  const drawdowns = metricsResults.map(r => r.metrics.maxDrawdownPercent);

  // Normalize each metric to 0-1
  const nSharpe = minMaxNormalize(sharpes);
  const nSortino = minMaxNormalize(sortinos);
  const nPF = minMaxNormalize(profitFactors);
  const nExpectancy = minMaxNormalize(expectancies);
  const nDrawdown = minMaxNormalize(drawdowns);

  // Calculate composite scores
  const scores = new Map<string, StrategyRiskScore>();

  for (let i = 0; i < metricsResults.length; i++) {
    const { id, metrics } = metricsResults[i];

    const composite =
      SCORE_WEIGHTS.sharpe * nSharpe[i] +
      SCORE_WEIGHTS.sortino * nSortino[i] +
      SCORE_WEIGHTS.profitFactor * nPF[i] +
      SCORE_WEIGHTS.expectancy * nExpectancy[i] -
      SCORE_WEIGHTS.maxDrawdown * nDrawdown[i];

    // Clamp to 0-1
    const clampedScore = Math.max(0, Math.min(1, composite));

    scores.set(id, {
      strategyId: id,
      sharpeRatio: metrics.sharpeRatio,
      sortinoRatio: metrics.sortinoRatio,
      profitFactor: metrics.profitFactor,
      expectancy: metrics.expectancy,
      maxDrawdownPct: metrics.maxDrawdownPercent,
      compositeScore: clampedScore,
      tradesUsed: metrics.totalTrades,
    });
  }

  return scores;
}

// ── Weight Adjustment ──────────────────────────────────────
/**
 * Adjust Thompson Sampling weights using composite risk scores.
 *
 * adjustedWeight = thompsonWeight * (0.5 + 0.5 * compositeScore)
 *
 * - Score 1.0 (best): full Thompson weight
 * - Score 0.0 (worst): half Thompson weight
 * - No score (too few trades): unchanged
 */
export function adjustWeightsWithScores(
  thompsonWeights: Map<string, number>,
  riskScores: Map<string, StrategyRiskScore>,
): Map<string, number> {
  const adjusted = new Map<string, number>();

  for (const [strategyId, weight] of thompsonWeights) {
    const score = riskScores.get(strategyId);
    if (score) {
      // Scale weight by risk score: worst gets 0.5x, best gets 1.0x
      adjusted.set(strategyId, weight * (0.5 + 0.5 * score.compositeScore));
    } else {
      // Not enough trades — use Thompson weight as-is
      adjusted.set(strategyId, weight);
    }
  }

  // Re-normalize so weights sum to 1
  const total = Array.from(adjusted.values()).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const [id, w] of adjusted) {
      adjusted.set(id, w / total);
    }
  }

  return adjusted;
}

// ── Persistence ────────────────────────────────────────────
/**
 * Persist risk scores to database for dashboard display and
 * allocation decisions.
 */
export async function persistRiskScores(scores: Map<string, StrategyRiskScore>): Promise<void> {
  const supabase = getSupabase();

  for (const [, score] of scores) {
    const { error } = await supabase
      .from("strategy_risk_scores")
      .upsert({
        strategy_id: score.strategyId,
        sharpe_ratio: score.sharpeRatio,
        sortino_ratio: score.sortinoRatio,
        profit_factor: score.profitFactor,
        expectancy: score.expectancy,
        max_drawdown_pct: score.maxDrawdownPct,
        composite_score: score.compositeScore,
        trades_used: score.tradesUsed,
        updated_at: new Date().toISOString(),
      }, { onConflict: "strategy_id" });

    if (error) {
      console.error(`Failed to persist risk score for ${score.strategyId}:`, error.message);
    }
  }
}

// ── Single Strategy Update ─────────────────────────────────
/**
 * Recalculate and persist the risk score for a single strategy.
 * Called after each completed trade.
 */
export async function updateStrategyRiskScore(strategyId: string): Promise<void> {
  // We recalculate ALL scores because normalization is relative
  const scores = await calculateAllRiskScores();
  if (scores.size > 0) {
    await persistRiskScores(scores);
  }
}

// ── Get Cached Scores ──────────────────────────────────────
/**
 * Read persisted scores from DB. Used by Thompson Sampling
 * to adjust weights without recalculating every cycle.
 */
export async function getCachedRiskScores(): Promise<Map<string, StrategyRiskScore>> {
  const { data, error } = await getSupabase()
    .from("strategy_risk_scores")
    .select("*");

  if (error || !data) {
    return new Map();
  }

  const scores = new Map<string, StrategyRiskScore>();
  for (const row of data) {
    scores.set(row.strategy_id, {
      strategyId: row.strategy_id,
      sharpeRatio: row.sharpe_ratio,
      sortinoRatio: row.sortino_ratio,
      profitFactor: row.profit_factor,
      expectancy: row.expectancy,
      maxDrawdownPct: row.max_drawdown_pct,
      compositeScore: row.composite_score,
      tradesUsed: row.trades_used,
    });
  }

  return scores;
}
