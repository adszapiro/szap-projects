/**
 * Time-Series Momentum (TSMOM) Strategy
 * 
 * Based on: "Time Series Momentum" by Moskowitz, Ooi, and Pedersen
 * (Journal of Financial Economics, 2012)
 * 
 * Core insight: An asset's own past return predicts its future return.
 * Go long if trailing return is positive, short/flat if negative.
 * Scale positions by inverse volatility to target consistent risk.
 */

import { cumulativeReturn, rollingReturns, mean } from "../../utils/statistics.js";
import {
  realizedVolatility,
  volatilityScalingFactor,
  ewmaVolatility,
  volAdjustedPositionSize,
} from "../../utils/volatility.js";

export interface TSMOMConfig {
  lookbackPeriods: number[];    // Multiple lookback windows (default: [21, 63, 126, 252])
  volatilityLookback: number;   // Days for vol calculation (default: 60)
  targetVolatility: number;     // Target annualized vol (default: 0.40 = 40%)
  useVolScaling: boolean;       // Apply volatility scaling (default: true)
  maxLeverage: number;          // Maximum position size multiple (default: 2.0)
  combinationMethod: "average" | "vote" | "weighted"; // How to combine signals
}

const DEFAULT_CONFIG: TSMOMConfig = {
  lookbackPeriods: [21, 63, 126, 252],  // 1, 3, 6, 12 months
  volatilityLookback: 60,
  targetVolatility: 0.40,                // 40% as in original paper
  useVolScaling: true,
  maxLeverage: 2.0,
  combinationMethod: "average",
};

/**
 * Calculate time-series momentum signal for a single lookback period
 * Returns: -1 (short/flat), 0 (neutral), +1 (long)
 */
export function calculateTSMOMSignal(
  prices: number[],
  lookbackPeriod: number
): number {
  if (prices.length < lookbackPeriod + 1) {
    return 0;
  }
  
  const startIdx = prices.length - lookbackPeriod - 1;
  const currentPrice = prices[prices.length - 1];
  const pastPrice = prices[startIdx];
  
  if (pastPrice <= 0) return 0;
  
  const returnVal = (currentPrice - pastPrice) / pastPrice;
  
  // Simple binary signal as in the paper
  return returnVal > 0 ? 1 : -1;
}

/**
 * Calculate combined TSMOM signal across multiple lookback periods
 */
export function combinedTSMOMSignal(
  prices: number[],
  config: Partial<TSMOMConfig> = {}
): { signal: number; signals: number[]; returns: number[] } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const signals: number[] = [];
  const returns: number[] = [];
  
  for (const period of cfg.lookbackPeriods) {
    const signal = calculateTSMOMSignal(prices, period);
    signals.push(signal);
    
    // Also track actual returns for weighting
    if (prices.length >= period + 1) {
      const ret = (prices[prices.length - 1] - prices[prices.length - period - 1]) / 
                  prices[prices.length - period - 1];
      returns.push(ret);
    } else {
      returns.push(0);
    }
  }
  
  let combinedSignal: number;
  
  switch (cfg.combinationMethod) {
    case "vote":
      // Majority vote
      const sum = signals.reduce((a, b) => a + b, 0);
      combinedSignal = sum > 0 ? 1 : sum < 0 ? -1 : 0;
      break;
      
    case "weighted":
      // Weight by inverse lookback (shorter = higher weight)
      let weightedSum = 0;
      let totalWeight = 0;
      for (let i = 0; i < signals.length; i++) {
        const weight = 1 / cfg.lookbackPeriods[i];
        weightedSum += signals[i] * weight;
        totalWeight += weight;
      }
      combinedSignal = totalWeight > 0 ? weightedSum / totalWeight : 0;
      break;
      
    case "average":
    default:
      // Simple average
      combinedSignal = mean(signals);
      break;
  }
  
  return { signal: combinedSignal, signals, returns };
}

/**
 * Calculate volatility-scaled position size
 * Key innovation from Moskowitz et al.
 */
export function calculateTSMOMPositionSize(
  prices: number[],
  baseSize: number,
  config: Partial<TSMOMConfig> = {}
): number {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (!cfg.useVolScaling) {
    return baseSize;
  }
  
  const vol = realizedVolatility(prices.slice(-cfg.volatilityLookback));
  
  if (vol <= 0) return baseSize;
  
  // Scale inversely to volatility to achieve target vol
  const scale = volatilityScalingFactor(vol, cfg.targetVolatility, cfg.maxLeverage);
  
  return baseSize * scale;
}

/**
 * Generate trading signal for TSMOM strategy
 */
export function generateTSMOMSignal(
  symbol: string,
  prices: number[],
  currentPosition: { qty: number; avgEntryPrice: number } | null,
  config: Partial<TSMOMConfig> = {}
): { type: "buy" | "sell" | "hold"; confidence: number; reason: string; positionScale: number } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (prices.length < Math.max(...cfg.lookbackPeriods) + cfg.volatilityLookback) {
    return { 
      type: "hold", 
      confidence: 0, 
      reason: "Insufficient data for TSMOM",
      positionScale: 1.0
    };
  }
  
  // Get combined signal
  const { signal, signals, returns } = combinedTSMOMSignal(prices, cfg);
  
  // Calculate volatility-scaled position size
  const vol = realizedVolatility(prices.slice(-cfg.volatilityLookback));
  const positionScale = cfg.useVolScaling 
    ? volatilityScalingFactor(vol, cfg.targetVolatility, cfg.maxLeverage)
    : 1.0;
  
  // Format individual signals for reason
  const signalStr = signals.map((s, i) => `${cfg.lookbackPeriods[i]}d:${s > 0 ? "+" : s < 0 ? "-" : "0"}`).join(", ");
  
  // Calculate confidence based on signal strength and agreement
  const agreement = Math.abs(signals.reduce((a, b) => a + b, 0)) / signals.length;
  const confidence = Math.min(0.5 + agreement * 0.3, 0.85);
  
  // Generate signal
  if (signal > 0.3) {
    // Positive momentum - go long
    if (!currentPosition) {
      return {
        type: "buy",
        confidence,
        reason: `TSMOM Long: ${signalStr} | Vol-scale: ${positionScale.toFixed(2)}x`,
        positionScale,
      };
    }
    return {
      type: "hold",
      confidence: 0.6,
      reason: `TSMOM Holding long: ${signalStr}`,
      positionScale,
    };
  } else if (signal < -0.3) {
    // Negative momentum - go flat (or short if allowed)
    if (currentPosition) {
      return {
        type: "sell",
        confidence,
        reason: `TSMOM Exit: Negative momentum ${signalStr}`,
        positionScale,
      };
    }
    return {
      type: "hold",
      confidence: 0.6,
      reason: `TSMOM Flat: ${signalStr}`,
      positionScale,
    };
  }
  
  // Neutral zone
  if (currentPosition) {
    const currentPrice = prices[prices.length - 1];
    const pnl = ((currentPrice - currentPosition.avgEntryPrice) / currentPosition.avgEntryPrice) * 100;
    
    // Exit on profit if signal weakening
    if (pnl > 8 && signal < 0.1) {
      return {
        type: "sell",
        confidence: 0.7,
        reason: `TSMOM Profit exit: +${pnl.toFixed(1)}%, signal fading`,
        positionScale,
      };
    }
    
    // Stop loss
    if (pnl < -6) {
      return {
        type: "sell",
        confidence: 0.85,
        reason: `TSMOM Stop: ${pnl.toFixed(1)}%`,
        positionScale,
      };
    }
  }
  
  return {
    type: "hold",
    confidence: 0.4,
    reason: `TSMOM Neutral: ${signalStr}`,
    positionScale,
  };
}

/**
 * Generate strategy code string for database storage
 */
export function getTSMOMStrategyCode(config: Partial<TSMOMConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  return `
// Moskowitz-Ooi-Pedersen Time-Series Momentum
// Lookbacks: ${cfg.lookbackPeriods.join(", ")} days | Target Vol: ${cfg.targetVolatility * 100}%

function generateSignal(data, position) {
  const prices = data.close;
  const len = prices.length;
  
  if (len < 260) {
    return { type: "hold", confidence: 0, reason: "TSMOM: Insufficient data" };
  }
  
  // Calculate momentum for each lookback
  const lookbacks = [${cfg.lookbackPeriods.join(", ")}];
  let signalSum = 0;
  const details = [];
  
  for (const lb of lookbacks) {
    const ret = (prices[len - 1] - prices[len - lb - 1]) / prices[len - lb - 1];
    const sig = ret > 0 ? 1 : -1;
    signalSum += sig;
    details.push(lb + "d:" + (ret > 0 ? "+" : "-"));
  }
  
  const avgSignal = signalSum / lookbacks.length;
  const agreement = Math.abs(signalSum) / lookbacks.length;
  
  // Calculate volatility for position scaling
  const returns = [];
  for (let i = len - 60; i < len; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const vol = Math.sqrt(returns.reduce((a, b) => a + b * b, 0) / returns.length) * Math.sqrt(252);
  const volScale = Math.min(${cfg.targetVolatility} / vol, ${cfg.maxLeverage}).toFixed(2);
  
  // Go long on positive momentum
  if (avgSignal > 0.3 && !position) {
    const conf = Math.min(0.5 + agreement * 0.3, 0.85);
    return { type: "buy", confidence: conf, reason: "TSMOM: " + details.join(", ") + " [" + volScale + "x]" };
  }
  
  // Exit on negative momentum
  if (avgSignal < -0.3 && position) {
    return { type: "sell", confidence: 0.8, reason: "TSMOM Exit: " + details.join(", ") };
  }
  
  // Position management
  if (position) {
    const pnl = ((prices[len-1] - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 8 && avgSignal < 0.2) return { type: "sell", confidence: 0.75, reason: "TSMOM Profit: +" + pnl.toFixed(1) + "%" };
    if (pnl < -6) return { type: "sell", confidence: 0.85, reason: "TSMOM Stop: " + pnl.toFixed(1) + "%" };
  }
  
  return { type: "hold", confidence: 0.4, reason: "TSMOM: " + details.join(", ") };
}`;
}

/**
 * TSMOM signal strength indicator
 * Returns a normalized score from -1 to +1
 */
export function tsmomStrength(prices: number[], config: Partial<TSMOMConfig> = {}): number {
  const { signal } = combinedTSMOMSignal(prices, config);
  return Math.max(-1, Math.min(1, signal));
}
