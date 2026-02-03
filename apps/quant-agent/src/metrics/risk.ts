/**
 * Risk Metrics Module
 * Calculates key portfolio and strategy risk metrics
 */

import { getSupabase, getRecentTrades } from "../db.js";

export interface RiskMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  volatility: number;
  winLossRatio: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  calmarRatio: number;
}

export interface StrategyRiskMetrics extends RiskMetrics {
  strategyId: string;
  strategyName: string;
  totalTrades: number;
  totalPnl: number;
}

const RISK_FREE_RATE = 0.05; // 5% annual risk-free rate
const ANNUALIZATION_FACTOR = Math.sqrt(252); // For daily returns

/**
 * Calculate portfolio-level risk metrics from trade history
 */
export async function calculatePortfolioRiskMetrics(
  initialCapital: number = 100000
): Promise<RiskMetrics> {
  const trades = await getRecentTrades(1000);
  
  if (trades.length === 0) {
    return getEmptyMetrics();
  }
  
  // Get daily P&L series
  const dailyPnl = aggregateDailyPnL(trades);
  const returns = dailyPnl.map(pnl => pnl / initialCapital);
  
  return calculateRiskMetricsFromReturns(returns, trades);
}

/**
 * Calculate risk metrics for a specific strategy
 */
export async function calculateStrategyRiskMetrics(
  strategyId: string,
  initialCapital: number = 100000
): Promise<StrategyRiskMetrics | null> {
  const { data: strategy } = await getSupabase()
    .from("strategies")
    .select("name")
    .eq("id", strategyId)
    .single();
  
  const { data: trades } = await getSupabase()
    .from("agent_trades")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("created_at", { ascending: true });
  
  if (!trades || trades.length === 0) {
    return null;
  }
  
  const dailyPnl = aggregateDailyPnL(trades);
  const returns = dailyPnl.map(pnl => pnl / (initialCapital * 0.1)); // Per strategy capital
  
  const metrics = calculateRiskMetricsFromReturns(returns, trades);
  
  return {
    ...metrics,
    strategyId,
    strategyName: strategy?.name || strategyId,
    totalTrades: trades.length,
    totalPnl: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
  };
}

/**
 * Core metrics calculation from returns series
 */
function calculateRiskMetricsFromReturns(
  returns: number[],
  trades: Array<{ pnl?: number | null }>
): RiskMetrics {
  if (returns.length === 0) {
    return getEmptyMetrics();
  }
  
  // Basic stats
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  // Sharpe Ratio: (Mean Return - Risk Free) / Std Dev * Annualization
  const dailyRiskFree = RISK_FREE_RATE / 252;
  const sharpeRatio = volatility > 0 
    ? ((meanReturn - dailyRiskFree) / volatility) * ANNUALIZATION_FACTOR 
    : 0;
  
  // Sortino Ratio: Use only downside deviation
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.length > 0
    ? downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length
    : 0;
  const downsideDeviation = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDeviation > 0
    ? ((meanReturn - dailyRiskFree) / downsideDeviation) * ANNUALIZATION_FACTOR
    : 0;
  
  // Max Drawdown
  const { maxDrawdown, maxDrawdownPercent } = calculateMaxDrawdown(trades);
  
  // Calmar Ratio: Annual Return / Max Drawdown
  const annualReturn = meanReturn * 252;
  const calmarRatio = maxDrawdownPercent > 0 ? annualReturn / maxDrawdownPercent : 0;
  
  // Win/Loss Stats
  const winningTrades = trades.filter(t => t.pnl && t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl && t.pnl < 0);
  
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
  
  const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  
  const winLossRatio = averageLoss > 0 ? averageWin / averageLoss : averageWin;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;
  
  // Expectancy: (Win% * Avg Win) - (Loss% * Avg Loss)
  const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
  const lossRate = 1 - winRate;
  const expectancy = (winRate * averageWin) - (lossRate * averageLoss);
  
  return {
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    maxDrawdownPercent,
    volatility: volatility * ANNUALIZATION_FACTOR, // Annualized volatility
    winLossRatio,
    profitFactor,
    averageWin,
    averageLoss,
    expectancy,
    calmarRatio,
  };
}

/**
 * Calculate max drawdown from trades
 */
function calculateMaxDrawdown(
  trades: Array<{ pnl?: number | null }>,
  initialCapital: number = 100000
): { maxDrawdown: number; maxDrawdownPercent: number } {
  let peak = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let currentValue = initialCapital;
  
  for (const trade of trades) {
    currentValue += (trade.pnl || 0);
    
    if (currentValue > peak) {
      peak = currentValue;
    }
    
    const drawdown = peak - currentValue;
    const drawdownPercent = (drawdown / peak) * 100;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }
  }
  
  return { maxDrawdown, maxDrawdownPercent };
}

/**
 * Aggregate trades by day and return daily P&L
 */
function aggregateDailyPnL(
  trades: Array<{ created_at: string; pnl?: number | null }>
): number[] {
  const dailyMap = new Map<string, number>();
  
  for (const trade of trades) {
    const date = trade.created_at.split("T")[0];
    const current = dailyMap.get(date) || 0;
    dailyMap.set(date, current + (trade.pnl || 0));
  }
  
  // Sort by date and return values
  const sortedDates = Array.from(dailyMap.keys()).sort();
  return sortedDates.map(date => dailyMap.get(date) || 0);
}

function getEmptyMetrics(): RiskMetrics {
  return {
    sharpeRatio: 0,
    sortinoRatio: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    volatility: 0,
    winLossRatio: 0,
    profitFactor: 0,
    averageWin: 0,
    averageLoss: 0,
    expectancy: 0,
    calmarRatio: 0,
  };
}

/**
 * Save risk metrics to the database for portfolio display
 */
export async function saveRiskMetricsSnapshot(
  metrics: RiskMetrics
): Promise<void> {
  const { error } = await getSupabase()
    .from("risk_metrics_snapshots")
    .insert({
      date: new Date().toISOString().split("T")[0],
      sharpe_ratio: metrics.sharpeRatio,
      sortino_ratio: metrics.sortinoRatio,
      max_drawdown: metrics.maxDrawdown,
      max_drawdown_percent: metrics.maxDrawdownPercent,
      volatility: metrics.volatility,
      win_loss_ratio: metrics.winLossRatio,
      profit_factor: metrics.profitFactor,
      expectancy: metrics.expectancy,
      calmar_ratio: metrics.calmarRatio,
    });
  
  if (error) {
    console.error("Failed to save risk metrics:", error);
  }
}
