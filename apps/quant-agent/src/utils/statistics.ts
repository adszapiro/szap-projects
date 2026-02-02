/**
 * Statistical Utility Functions for Quantitative Strategies
 * Based on academic research requirements
 */

/**
 * Calculate simple return
 */
export function calculateReturn(current: number, previous: number): number {
  if (previous === 0) return 0;
  return (current - previous) / previous;
}

/**
 * Calculate cumulative return over a period
 */
export function cumulativeReturn(prices: number[]): number {
  if (prices.length < 2) return 0;
  const first = prices[0];
  const last = prices[prices.length - 1];
  if (first === 0) return 0;
  return (last - first) / first;
}

/**
 * Calculate rolling returns for each period
 */
export function rollingReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(calculateReturn(prices[i], prices[i - 1]));
  }
  return returns;
}

/**
 * Calculate mean of array
 */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squaredDiffs = arr.map(x => Math.pow(x - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Calculate z-score
 */
export function zScore(value: number, arr: number[]): number {
  const avg = mean(arr);
  const std = standardDeviation(arr);
  if (std === 0) return 0;
  return (value - avg) / std;
}

/**
 * Calculate rolling z-score for the last value
 */
export function rollingZScore(arr: number[], lookback: number): number {
  if (arr.length < lookback) return 0;
  const window = arr.slice(-lookback);
  const current = arr[arr.length - 1];
  return zScore(current, window);
}

/**
 * Calculate annualized volatility from daily returns
 * Uses sqrt(252) for trading days
 */
export function annualizedVolatility(dailyReturns: number[]): number {
  return standardDeviation(dailyReturns) * Math.sqrt(252);
}

/**
 * Calculate Sharpe ratio
 * @param returns Array of returns
 * @param riskFreeRate Annual risk-free rate (default 0.05 = 5%)
 */
export function sharpeRatio(returns: number[], riskFreeRate: number = 0.05): number {
  const avgReturn = mean(returns);
  const vol = standardDeviation(returns);
  if (vol === 0) return 0;
  // Annualize if daily returns
  const annualizedReturn = avgReturn * 252;
  const annualizedVol = vol * Math.sqrt(252);
  return (annualizedReturn - riskFreeRate) / annualizedVol;
}

/**
 * Calculate correlation between two arrays
 */
export function correlation(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length || arr1.length < 2) return 0;
  
  const mean1 = mean(arr1);
  const mean2 = mean(arr2);
  
  let numerator = 0;
  let sumSq1 = 0;
  let sumSq2 = 0;
  
  for (let i = 0; i < arr1.length; i++) {
    const diff1 = arr1[i] - mean1;
    const diff2 = arr2[i] - mean2;
    numerator += diff1 * diff2;
    sumSq1 += diff1 * diff1;
    sumSq2 += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(sumSq1 * sumSq2);
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Calculate beta (systematic risk) vs a benchmark
 */
export function beta(assetReturns: number[], benchmarkReturns: number[]): number {
  if (assetReturns.length !== benchmarkReturns.length || assetReturns.length < 2) return 1;
  
  const cov = covariance(assetReturns, benchmarkReturns);
  const benchmarkVar = variance(benchmarkReturns);
  
  if (benchmarkVar === 0) return 1;
  return cov / benchmarkVar;
}

/**
 * Calculate covariance
 */
export function covariance(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length || arr1.length < 2) return 0;
  
  const mean1 = mean(arr1);
  const mean2 = mean(arr2);
  
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    sum += (arr1[i] - mean1) * (arr2[i] - mean2);
  }
  
  return sum / (arr1.length - 1);
}

/**
 * Calculate variance
 */
export function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squaredDiffs = arr.map(x => Math.pow(x - avg, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1);
}

/**
 * Calculate percentile rank of a value in an array
 * Returns 0-100
 */
export function percentileRank(value: number, arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  let count = 0;
  for (const v of sorted) {
    if (v < value) count++;
  }
  return (count / arr.length) * 100;
}

/**
 * Calculate exponential moving average
 */
export function ema(arr: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < arr.length; i++) {
    if (i === 0) {
      result.push(arr[0]);
    } else {
      result.push((arr[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

/**
 * Calculate simple moving average
 */
export function sma(arr: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = arr.slice(i - period + 1, i + 1);
      result.push(mean(slice));
    }
  }
  return result;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function rsi(prices: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      result.push(50);
      continue;
    }
    
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
    
    if (i < period) {
      result.push(50);
    } else {
      const avgGain = mean(gains.slice(-period));
      const avgLoss = mean(losses.slice(-period));
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

/**
 * Calculate maximum drawdown
 */
export function maxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  let peak = prices[0];
  let maxDd = 0;
  
  for (const price of prices) {
    if (price > peak) peak = price;
    const dd = (peak - price) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  
  return maxDd;
}

/**
 * Rank values and return percentile rankings (0-1)
 */
export function rankPercentiles(values: number[]): number[] {
  const n = values.length;
  const indexed = values.map((v, i) => ({ value: v, index: i }));
  indexed.sort((a, b) => a.value - b.value);
  
  const ranks = new Array(n);
  for (let i = 0; i < n; i++) {
    ranks[indexed[i].index] = (i + 1) / n;
  }
  return ranks;
}
