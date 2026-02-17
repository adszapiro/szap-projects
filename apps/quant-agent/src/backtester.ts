/**
 * Rapid backtester for AI-generated strategies.
 * Simulates trades over historical OHLCV data using the sandbox,
 * then calculates key metrics to gate deployment.
 */

import { executeSandboxed, type StrategyData, type StrategyPosition } from "./sandbox.js";

export interface BacktestResult {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  passed: boolean;
  reason: string;
}

const MIN_BARS_FOR_BACKTEST = 30;

/**
 * Run a rapid backtest on a strategy using historical OHLCV data.
 * Walks through the data with a sliding window, executing the strategy
 * at each bar and simulating trades.
 */
export function runBacktest(
  code: string,
  data: StrategyData,
  options: { stopLoss?: number; takeProfit?: number } = {}
): BacktestResult {
  const stopLoss = options.stopLoss ?? 0.08;
  const takeProfit = options.takeProfit ?? 0.15;

  const totalBars = data.close.length;
  if (totalBars < MIN_BARS_FOR_BACKTEST) {
    return {
      totalTrades: 0, wins: 0, losses: 0, winRate: 0,
      totalReturn: 0, maxDrawdown: 0, sharpeRatio: 0, profitFactor: 0,
      passed: false, reason: `Insufficient data: ${totalBars} bars (need ${MIN_BARS_FOR_BACKTEST})`,
    };
  }

  // Use first 20 bars as warmup, then walk forward
  const warmup = 20;
  let position: StrategyPosition | null = null;
  let entryPrice = 0;
  const tradeReturns: number[] = [];
  const dailyReturns: number[] = [];
  let equity = 10000;
  let peakEquity = equity;
  let maxDrawdown = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  for (let i = warmup; i < totalBars; i++) {
    const windowData: StrategyData = {
      open: data.open.slice(0, i + 1),
      high: data.high.slice(0, i + 1),
      low: data.low.slice(0, i + 1),
      close: data.close.slice(0, i + 1),
      volume: data.volume.slice(0, i + 1),
    };

    const currentPrice = data.close[i];
    const prevPrice = data.close[i - 1];
    const dailyReturn = prevPrice > 0 ? (currentPrice - prevPrice) / prevPrice : 0;

    // Check stop-loss / take-profit if in position
    if (position) {
      const pnlPct = (currentPrice - entryPrice) / entryPrice;

      if (pnlPct <= -stopLoss || pnlPct >= takeProfit) {
        // Exit position
        const tradeReturn = pnlPct;
        tradeReturns.push(tradeReturn);
        if (tradeReturn > 0) grossProfit += tradeReturn;
        else grossLoss += Math.abs(tradeReturn);

        equity *= (1 + tradeReturn);
        position = null;
        entryPrice = 0;
        dailyReturns.push(tradeReturn);
        continue;
      }
    }

    // Execute strategy
    const signal = executeSandboxed(code, windowData, position, 500);

    if (signal.type === "buy" && !position && signal.confidence > 0.3) {
      // Enter long
      position = { qty: 1, avgEntryPrice: currentPrice };
      entryPrice = currentPrice;
      dailyReturns.push(0);
    } else if (signal.type === "sell" && position) {
      // Exit position
      const tradeReturn = (currentPrice - entryPrice) / entryPrice;
      tradeReturns.push(tradeReturn);
      if (tradeReturn > 0) grossProfit += tradeReturn;
      else grossLoss += Math.abs(tradeReturn);

      equity *= (1 + tradeReturn);
      position = null;
      entryPrice = 0;
      dailyReturns.push(tradeReturn);
    } else {
      // Track equity change if in position
      if (position) {
        dailyReturns.push(dailyReturn);
        equity *= (1 + dailyReturn);
      } else {
        dailyReturns.push(0);
      }
    }

    // Track drawdown
    if (equity > peakEquity) peakEquity = equity;
    const dd = peakEquity > 0 ? (peakEquity - equity) / peakEquity : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Close any open position at last price
  if (position) {
    const lastPrice = data.close[totalBars - 1];
    const tradeReturn = (lastPrice - entryPrice) / entryPrice;
    tradeReturns.push(tradeReturn);
    if (tradeReturn > 0) grossProfit += tradeReturn;
    else grossLoss += Math.abs(tradeReturn);
    equity *= (1 + tradeReturn);
  }

  const wins = tradeReturns.filter(r => r > 0).length;
  const losses = tradeReturns.filter(r => r <= 0).length;
  const totalTrades = tradeReturns.length;
  const winRate = totalTrades > 0 ? wins / totalTrades : 0;
  const totalReturn = (equity - 10000) / 10000;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Sharpe ratio (annualized, assuming daily returns)
  const meanReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
    : 0;
  const variance = dailyReturns.length > 1
    ? dailyReturns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / (dailyReturns.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

  // Deployment gate: Sharpe > 0 and max drawdown < 30%
  const passed = sharpeRatio > 0 && maxDrawdown < 0.30 && totalTrades >= 3;
  let reason = "Passed";
  if (!passed) {
    const reasons: string[] = [];
    if (sharpeRatio <= 0) reasons.push(`Sharpe ${sharpeRatio.toFixed(2)} <= 0`);
    if (maxDrawdown >= 0.30) reasons.push(`Drawdown ${(maxDrawdown * 100).toFixed(1)}% >= 30%`);
    if (totalTrades < 3) reasons.push(`Only ${totalTrades} trades (need 3+)`);
    reason = reasons.join(", ");
  }

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    totalReturn,
    maxDrawdown,
    sharpeRatio,
    profitFactor,
    passed,
    reason,
  };
}
