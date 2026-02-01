import { OHLCV } from "./types";

export interface RiskMetrics {
  volatility: number;           // Annualized volatility
  beta: number;                 // Beta vs benchmark
  sharpeRatio: number;          // Risk-adjusted return
  sortinoRatio: number;         // Downside risk-adjusted return
  var95: number;                // 95% Value at Risk (daily)
  var99: number;                // 99% Value at Risk (daily)
  maxDrawdown: number;          // Maximum drawdown
  maxDrawdownDuration: number;  // Days in max drawdown
  calmarRatio: number;          // Return / Max Drawdown
}

export interface CorrelationResult {
  symbol1: string;
  symbol2: string;
  correlation: number;
}

/**
 * Calculate daily returns from price data
 */
export function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

/**
 * Calculate annualized volatility
 */
export function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  
  // Annualize (252 trading days)
  return dailyVol * Math.sqrt(252);
}

/**
 * Calculate beta vs benchmark
 */
export function calculateBeta(assetReturns: number[], benchmarkReturns: number[]): number {
  if (assetReturns.length !== benchmarkReturns.length || assetReturns.length < 2) {
    return 1;
  }

  const n = assetReturns.length;
  const meanAsset = assetReturns.reduce((a, b) => a + b, 0) / n;
  const meanBenchmark = benchmarkReturns.reduce((a, b) => a + b, 0) / n;

  let covariance = 0;
  let benchmarkVariance = 0;

  for (let i = 0; i < n; i++) {
    const assetDev = assetReturns[i] - meanAsset;
    const benchmarkDev = benchmarkReturns[i] - meanBenchmark;
    covariance += assetDev * benchmarkDev;
    benchmarkVariance += benchmarkDev * benchmarkDev;
  }

  if (benchmarkVariance === 0) return 1;
  return covariance / benchmarkVariance;
}

/**
 * Calculate Sharpe Ratio
 */
export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.04): number {
  if (returns.length < 2) return 0;

  const dailyRf = riskFreeRate / 252;
  const excessReturns = returns.map(r => r - dailyRf);
  
  const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const variance = excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcess, 2), 0) / excessReturns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  
  // Annualize
  return (meanExcess / stdDev) * Math.sqrt(252);
}

/**
 * Calculate Sortino Ratio (uses downside deviation)
 */
export function calculateSortinoRatio(returns: number[], riskFreeRate: number = 0.04): number {
  if (returns.length < 2) return 0;

  const dailyRf = riskFreeRate / 252;
  const excessReturns = returns.map(r => r - dailyRf);
  const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;

  // Only consider negative returns for downside deviation
  const negativeReturns = excessReturns.filter(r => r < 0);
  if (negativeReturns.length === 0) return 0;

  const downsideVariance = negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length;
  const downsideStdDev = Math.sqrt(downsideVariance);

  if (downsideStdDev === 0) return 0;
  
  return (meanExcess / downsideStdDev) * Math.sqrt(252);
}

/**
 * Calculate Value at Risk using historical simulation
 */
export function calculateVaR(returns: number[], confidence: number = 0.95): number {
  if (returns.length < 10) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  
  return Math.abs(sorted[index]) * 100; // Return as percentage
}

/**
 * Calculate maximum drawdown and duration
 */
export function calculateMaxDrawdown(prices: number[]): { maxDrawdown: number; duration: number } {
  if (prices.length < 2) return { maxDrawdown: 0, duration: 0 };

  let peak = prices[0];
  let maxDrawdown = 0;
  let maxDuration = 0;
  let currentDuration = 0;
  let drawdownStart = 0;

  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) {
      peak = prices[i];
      currentDuration = 0;
      drawdownStart = i;
    } else {
      const drawdown = (peak - prices[i]) / peak;
      currentDuration = i - drawdownStart;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDuration = currentDuration;
      }
    }
  }

  return { maxDrawdown: maxDrawdown * 100, duration: maxDuration };
}

/**
 * Calculate correlation between two price series
 */
export function calculateCorrelation(prices1: number[], prices2: number[]): number {
  const returns1 = calculateReturns(prices1);
  const returns2 = calculateReturns(prices2);
  
  const n = Math.min(returns1.length, returns2.length);
  if (n < 2) return 0;

  const r1 = returns1.slice(-n);
  const r2 = returns2.slice(-n);

  const mean1 = r1.reduce((a, b) => a + b, 0) / n;
  const mean2 = r2.reduce((a, b) => a + b, 0) / n;

  let covariance = 0;
  let var1 = 0;
  let var2 = 0;

  for (let i = 0; i < n; i++) {
    const dev1 = r1[i] - mean1;
    const dev2 = r2[i] - mean2;
    covariance += dev1 * dev2;
    var1 += dev1 * dev1;
    var2 += dev2 * dev2;
  }

  const denominator = Math.sqrt(var1 * var2);
  if (denominator === 0) return 0;

  return covariance / denominator;
}

/**
 * Calculate all risk metrics for a price series
 */
export function calculateRiskMetrics(
  data: OHLCV[],
  benchmarkData?: OHLCV[]
): RiskMetrics {
  const prices = data.map(d => d.close);
  const returns = calculateReturns(prices);
  
  const volatility = calculateVolatility(returns);
  const sharpeRatio = calculateSharpeRatio(returns);
  const sortinoRatio = calculateSortinoRatio(returns);
  const var95 = calculateVaR(returns, 0.95);
  const var99 = calculateVaR(returns, 0.99);
  const { maxDrawdown, duration: maxDrawdownDuration } = calculateMaxDrawdown(prices);

  // Calculate beta if benchmark provided
  let beta = 1;
  if (benchmarkData && benchmarkData.length > 0) {
    const benchmarkPrices = benchmarkData.map(d => d.close);
    const benchmarkReturns = calculateReturns(benchmarkPrices);
    beta = calculateBeta(returns, benchmarkReturns);
  }

  // Calmar ratio = annualized return / max drawdown
  const totalReturn = (prices[prices.length - 1] - prices[0]) / prices[0];
  const years = data.length / 252;
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;
  const calmarRatio = maxDrawdown > 0 ? (annualizedReturn * 100) / maxDrawdown : 0;

  return {
    volatility,
    beta,
    sharpeRatio,
    sortinoRatio,
    var95,
    var99,
    maxDrawdown,
    maxDrawdownDuration,
    calmarRatio,
  };
}

/**
 * Build correlation matrix for multiple assets
 */
export function buildCorrelationMatrix(
  assets: { symbol: string; prices: number[] }[]
): CorrelationResult[] {
  const results: CorrelationResult[] = [];

  for (let i = 0; i < assets.length; i++) {
    for (let j = i; j < assets.length; j++) {
      const correlation = i === j ? 1 : calculateCorrelation(assets[i].prices, assets[j].prices);
      results.push({
        symbol1: assets[i].symbol,
        symbol2: assets[j].symbol,
        correlation,
      });
    }
  }

  return results;
}
