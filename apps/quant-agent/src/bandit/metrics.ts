/**
 * Performance Metrics for Strategy Evaluation
 */

import { getTradesByStrategy } from "../db.js";

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgWinPnl: number;
  avgLossPnl: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

/**
 * Calculate comprehensive performance metrics for a strategy
 */
export async function calculateMetrics(strategyId: string): Promise<PerformanceMetrics> {
  const trades = await getTradesByStrategy(strategyId);
  
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0.5, // Neutral prior
      totalPnl: 0,
      avgPnl: 0,
      avgWinPnl: 0,
      avgLossPnl: 0,
      profitFactor: 1,
      sharpeRatio: 0,
      maxDrawdown: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
    };
  }

  // Filter trades with PnL data
  const tradesWithPnl = trades.filter(t => t.pnl !== null && t.pnl !== undefined);
  
  const winningTrades = tradesWithPnl.filter(t => t.pnl > 0);
  const losingTrades = tradesWithPnl.filter(t => t.pnl <= 0);
  
  const totalPnl = tradesWithPnl.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalWinPnl = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLossPnl = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  
  // Calculate Sharpe ratio (simplified, using PnL as returns)
  const pnls = tradesWithPnl.map(t => t.pnl || 0);
  const avgPnl = pnls.length > 0 ? totalPnl / pnls.length : 0;
  const stdPnl = calculateStdDev(pnls);
  const sharpeRatio = stdPnl > 0 ? (avgPnl / stdPnl) * Math.sqrt(252) : 0; // Annualized
  
  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let cumPnl = 0;
  
  for (const trade of tradesWithPnl) {
    cumPnl += trade.pnl || 0;
    if (cumPnl > peak) peak = cumPnl;
    const drawdown = peak > 0 ? (peak - cumPnl) / peak : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Calculate consecutive wins/losses
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  
  for (const trade of tradesWithPnl) {
    if (trade.pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    }
  }

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: tradesWithPnl.length > 0 ? winningTrades.length / tradesWithPnl.length : 0.5,
    totalPnl,
    avgPnl,
    avgWinPnl: winningTrades.length > 0 ? totalWinPnl / winningTrades.length : 0,
    avgLossPnl: losingTrades.length > 0 ? totalLossPnl / losingTrades.length : 0,
    profitFactor: totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? Infinity : 1,
    sharpeRatio,
    maxDrawdown,
    consecutiveWins: maxWinStreak,
    consecutiveLosses: maxLossStreak,
  };
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

/**
 * Score a strategy based on multiple factors
 * Higher score = better strategy
 */
export function calculateCompositeScore(metrics: PerformanceMetrics): number {
  // Weights for different factors
  const weights = {
    winRate: 0.25,
    sharpeRatio: 0.30,
    profitFactor: 0.20,
    drawdown: 0.15,
    consistency: 0.10,
  };

  // Normalize each metric to 0-1 range
  const normalizedWinRate = Math.min(metrics.winRate, 1);
  const normalizedSharpe = Math.min(Math.max(metrics.sharpeRatio / 3, 0), 1); // Cap at 3.0
  const normalizedProfitFactor = Math.min(metrics.profitFactor / 3, 1); // Cap at 3.0
  const normalizedDrawdown = 1 - Math.min(metrics.maxDrawdown, 1); // Lower is better
  
  // Consistency: low consecutive losses
  const normalizedConsistency = 1 - Math.min(metrics.consecutiveLosses / 10, 1);

  const score = 
    weights.winRate * normalizedWinRate +
    weights.sharpeRatio * normalizedSharpe +
    weights.profitFactor * normalizedProfitFactor +
    weights.drawdown * normalizedDrawdown +
    weights.consistency * normalizedConsistency;

  return score;
}

/**
 * Determine if a trade is a "win" for bandit purposes
 * Can use different criteria beyond just positive PnL
 */
export function isWinningTrade(
  pnl: number,
  expectedPnl: number = 0,
  method: "positive" | "beat_expectation" | "risk_adjusted" = "positive"
): boolean {
  switch (method) {
    case "positive":
      return pnl > 0;
    
    case "beat_expectation":
      return pnl > expectedPnl;
    
    case "risk_adjusted":
      // Consider small losses as neutral if within acceptable range
      return pnl > -0.005; // -0.5% threshold
    
    default:
      return pnl > 0;
  }
}
