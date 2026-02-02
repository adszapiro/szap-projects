/**
 * Cointegration Testing and Pairs Trading Utilities
 * Based on Engle-Granger methodology and Gatev et al. research
 */

import { mean, standardDeviation, correlation } from "./statistics.js";

/**
 * Simple linear regression
 * Returns: { slope, intercept, rSquared }
 */
export function linearRegression(x: number[], y: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = x.length;
  if (n !== y.length || n < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }
  
  const meanX = mean(x);
  const meanY = mean(y);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denominator += (x[i] - meanX) * (x[i] - meanX);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  
  // Calculate R-squared
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssRes += Math.pow(y[i] - predicted, 2);
    ssTot += Math.pow(y[i] - meanY, 2);
  }
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  
  return { slope, intercept, rSquared };
}

/**
 * Calculate spread between two price series
 * spread = y - beta * x - alpha
 */
export function calculateSpread(
  pricesX: number[],
  pricesY: number[],
  beta?: number,
  alpha?: number
): number[] {
  const n = Math.min(pricesX.length, pricesY.length);
  
  // If beta/alpha not provided, calculate from regression
  if (beta === undefined || alpha === undefined) {
    const reg = linearRegression(pricesX.slice(0, n), pricesY.slice(0, n));
    beta = reg.slope;
    alpha = reg.intercept;
  }
  
  const spread: number[] = [];
  for (let i = 0; i < n; i++) {
    spread.push(pricesY[i] - beta * pricesX[i] - alpha);
  }
  
  return spread;
}

/**
 * Augmented Dickey-Fuller test statistic (simplified)
 * Tests if a time series is stationary (required for cointegration)
 * More negative = more likely stationary
 * Critical values at 5%: ~-2.86 for n=100
 */
export function adfTestStatistic(series: number[]): number {
  const n = series.length;
  if (n < 10) return 0;
  
  // Calculate first differences
  const diffs: number[] = [];
  for (let i = 1; i < n; i++) {
    diffs.push(series[i] - series[i - 1]);
  }
  
  // Lagged level
  const laggedLevel = series.slice(0, -1);
  
  // Regress differences on lagged level
  const reg = linearRegression(laggedLevel, diffs);
  
  // Calculate standard error (simplified)
  let residualSumSq = 0;
  for (let i = 0; i < diffs.length; i++) {
    const predicted = reg.slope * laggedLevel[i] + reg.intercept;
    residualSumSq += Math.pow(diffs[i] - predicted, 2);
  }
  const residualStd = Math.sqrt(residualSumSq / (diffs.length - 2));
  
  // Standard error of slope coefficient
  const meanLag = mean(laggedLevel);
  let sumSqDev = 0;
  for (const lag of laggedLevel) {
    sumSqDev += Math.pow(lag - meanLag, 2);
  }
  const slopeStdErr = residualStd / Math.sqrt(sumSqDev);
  
  // ADF statistic = coefficient / standard error
  return slopeStdErr !== 0 ? reg.slope / slopeStdErr : 0;
}

/**
 * Test if two price series are cointegrated
 * Uses Engle-Granger two-step method
 * @returns { isCointegrated, adfStat, hedgeRatio, halfLife }
 */
export function testCointegration(
  pricesX: number[],
  pricesY: number[],
  criticalValue: number = -2.86
): {
  isCointegrated: boolean;
  adfStat: number;
  hedgeRatio: number;
  intercept: number;
  halfLife: number;
  correlation: number;
} {
  const n = Math.min(pricesX.length, pricesY.length);
  const x = pricesX.slice(0, n);
  const y = pricesY.slice(0, n);
  
  // Step 1: Regress Y on X to get hedge ratio
  const reg = linearRegression(x, y);
  
  // Step 2: Calculate residuals (spread)
  const spread = calculateSpread(x, y, reg.slope, reg.intercept);
  
  // Step 3: Test residuals for stationarity
  const adfStat = adfTestStatistic(spread);
  const isCointegrated = adfStat < criticalValue;
  
  // Calculate half-life of mean reversion
  const halfLife = calculateHalfLife(spread);
  
  // Correlation between series
  const corr = correlation(x, y);
  
  return {
    isCointegrated,
    adfStat,
    hedgeRatio: reg.slope,
    intercept: reg.intercept,
    halfLife,
    correlation: corr,
  };
}

/**
 * Calculate half-life of mean reversion
 * How many periods for spread to revert halfway to mean
 */
export function calculateHalfLife(spread: number[]): number {
  const n = spread.length;
  if (n < 10) return Infinity;
  
  // Regress spread(t) - spread(t-1) on spread(t-1)
  const laggedSpread = spread.slice(0, -1);
  const spreadDiff: number[] = [];
  for (let i = 1; i < n; i++) {
    spreadDiff.push(spread[i] - spread[i - 1]);
  }
  
  const reg = linearRegression(laggedSpread, spreadDiff);
  
  // Half-life = -log(2) / log(1 + slope)
  // Since slope should be negative for mean reversion
  if (reg.slope >= 0) return Infinity;
  
  return -Math.log(2) / Math.log(1 + reg.slope);
}

/**
 * Calculate z-score of current spread
 */
export function spreadZScore(
  spread: number[],
  lookback: number = 20
): number {
  if (spread.length < lookback) return 0;
  
  const window = spread.slice(-lookback);
  const current = spread[spread.length - 1];
  const avg = mean(window);
  const std = standardDeviation(window);
  
  if (std === 0) return 0;
  return (current - avg) / std;
}

/**
 * Generate pairs trading signal
 * @param zScore Current z-score of spread
 * @param entryThreshold Z-score to enter trade (default 2.0)
 * @param exitThreshold Z-score to exit trade (default 0.5)
 */
export function pairsSignal(
  zScore: number,
  entryThreshold: number = 2.0,
  exitThreshold: number = 0.5
): {
  action: "long_spread" | "short_spread" | "close" | "hold";
  confidence: number;
} {
  const absZ = Math.abs(zScore);
  
  if (absZ >= entryThreshold) {
    // Enter trade: short spread if z > 0, long spread if z < 0
    const confidence = Math.min(0.5 + absZ * 0.1, 0.9);
    return {
      action: zScore > 0 ? "short_spread" : "long_spread",
      confidence,
    };
  }
  
  if (absZ <= exitThreshold) {
    return { action: "close", confidence: 0.8 };
  }
  
  return { action: "hold", confidence: 0.5 };
}

/**
 * Find best cointegrated pairs from a list of price series
 */
export function findCointegatedPairs(
  symbols: string[],
  priceData: Map<string, number[]>,
  minHalfLife: number = 5,
  maxHalfLife: number = 50
): Array<{
  pair: [string, string];
  adfStat: number;
  hedgeRatio: number;
  halfLife: number;
  correlation: number;
}> {
  const results: Array<{
    pair: [string, string];
    adfStat: number;
    hedgeRatio: number;
    halfLife: number;
    correlation: number;
  }> = [];
  
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const sym1 = symbols[i];
      const sym2 = symbols[j];
      const prices1 = priceData.get(sym1);
      const prices2 = priceData.get(sym2);
      
      if (!prices1 || !prices2) continue;
      
      const test = testCointegration(prices1, prices2);
      
      if (
        test.isCointegrated &&
        test.halfLife >= minHalfLife &&
        test.halfLife <= maxHalfLife
      ) {
        results.push({
          pair: [sym1, sym2],
          adfStat: test.adfStat,
          hedgeRatio: test.hedgeRatio,
          halfLife: test.halfLife,
          correlation: test.correlation,
        });
      }
    }
  }
  
  // Sort by ADF stat (more negative = stronger cointegration)
  results.sort((a, b) => a.adfStat - b.adfStat);
  
  return results;
}
