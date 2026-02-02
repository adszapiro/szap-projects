/**
 * Volatility Scaling Utilities
 * Based on Moskowitz, Ooi, Pedersen (2012) and Ehsani & Linnainmaa (2025)
 */

import { standardDeviation, mean, rollingReturns } from "./statistics.js";

/**
 * Calculate realized volatility from prices
 * @param prices Array of prices
 * @param annualize Whether to annualize (default true)
 */
export function realizedVolatility(prices: number[], annualize: boolean = true): number {
  const returns = rollingReturns(prices);
  const vol = standardDeviation(returns);
  return annualize ? vol * Math.sqrt(252) : vol;
}

/**
 * Calculate exponentially weighted volatility
 * More responsive to recent moves (useful for risk management)
 * @param prices Array of prices
 * @param lambda Decay factor (0.94 is common for daily data)
 */
export function ewmaVolatility(prices: number[], lambda: number = 0.94): number {
  const returns = rollingReturns(prices);
  if (returns.length < 2) return 0;
  
  let variance = returns[0] * returns[0];
  
  for (let i = 1; i < returns.length; i++) {
    variance = lambda * variance + (1 - lambda) * returns[i] * returns[i];
  }
  
  return Math.sqrt(variance) * Math.sqrt(252); // Annualize
}

/**
 * Calculate volatility scaling factor
 * From Moskowitz et al. - scale positions inversely to volatility
 * @param currentVol Current realized volatility
 * @param targetVol Target volatility (default 15% annualized)
 * @param maxLeverage Maximum leverage allowed (default 2x)
 */
export function volatilityScalingFactor(
  currentVol: number,
  targetVol: number = 0.15,
  maxLeverage: number = 2.0
): number {
  if (currentVol <= 0) return 1;
  const scale = targetVol / currentVol;
  return Math.min(scale, maxLeverage);
}

/**
 * Calculate rolling volatility for a lookback period
 */
export function rollingVolatility(prices: number[], lookback: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < lookback) {
      result.push(NaN);
    } else {
      const window = prices.slice(i - lookback + 1, i + 1);
      result.push(realizedVolatility(window, true));
    }
  }
  
  return result;
}

/**
 * Volatility regime detection
 * Returns: "low", "normal", "high", "extreme"
 */
export function volatilityRegime(
  currentVol: number,
  historicalVols: number[]
): "low" | "normal" | "high" | "extreme" {
  const avgVol = mean(historicalVols.filter(v => !isNaN(v)));
  const ratio = currentVol / avgVol;
  
  if (ratio < 0.5) return "low";
  if (ratio < 1.5) return "normal";
  if (ratio < 2.5) return "high";
  return "extreme";
}

/**
 * Calculate Garman-Klass volatility estimator
 * More efficient than close-to-close, uses OHLC data
 */
export function garmanKlassVolatility(
  open: number[],
  high: number[],
  low: number[],
  close: number[]
): number {
  const n = open.length;
  if (n < 2) return 0;
  
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const hl = Math.log(high[i] / low[i]);
    const co = Math.log(close[i] / open[i]);
    sum += 0.5 * hl * hl - (2 * Math.log(2) - 1) * co * co;
  }
  
  return Math.sqrt(sum / n * 252);
}

/**
 * Calculate Parkinson volatility estimator
 * Uses high-low range
 */
export function parkinsonVolatility(high: number[], low: number[]): number {
  const n = high.length;
  if (n < 2) return 0;
  
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const hl = Math.log(high[i] / low[i]);
    sum += hl * hl;
  }
  
  return Math.sqrt(sum / (4 * n * Math.log(2)) * 252);
}

/**
 * Volatility-adjusted position size
 * Used in time-series momentum and factor strategies
 */
export function volAdjustedPositionSize(
  baseSize: number,
  assetVol: number,
  targetVol: number = 0.15,
  minSize: number = 0.1,
  maxSize: number = 3.0
): number {
  const scale = volatilityScalingFactor(assetVol, targetVol, maxSize);
  const adjustedSize = baseSize * scale;
  return Math.max(minSize, Math.min(adjustedSize, maxSize));
}
