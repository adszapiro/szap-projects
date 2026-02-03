/**
 * Time-Series Efficient Factors Strategy
 * 
 * Based on: "Time-Series Efficient Factors" by Ehsani & Linnainmaa (2025)
 * 
 * Key insight: Apply momentum and volatility management ON TOP OF traditional factors.
 * This achieves 64% higher Sharpe ratios than original factors.
 * 
 * The strategy:
 * 1. Take a factor (e.g., value, momentum, size)
 * 2. Apply time-series momentum to the factor itself
 * 3. Scale exposure inversely to factor volatility
 */

import { 
  realizedVolatility, 
  volatilityScalingFactor, 
  rollingVolatility,
  volatilityRegime,
} from "../../utils/volatility.js";
import { 
  mean, 
  standardDeviation, 
  cumulativeReturn,
  rollingReturns,
  sharpeRatio,
} from "../../utils/statistics.js";

export interface TSEfficientConfig {
  // Factor momentum parameters
  factorMomentumLookback: number;  // Days to calculate factor momentum (default: 126)
  factorMomentumThreshold: number; // Threshold for positive momentum (default: 0)
  
  // Volatility management
  volLookback: number;             // Days for volatility calculation (default: 21)
  targetVolatility: number;        // Target annualized volatility (default: 0.15)
  maxLeverage: number;             // Maximum leverage (default: 2.0)
  minLeverage: number;             // Minimum leverage (default: 0.2)
  
  // Combination
  momentumWeight: number;          // Weight on momentum signal (default: 0.5)
  volMgmtWeight: number;           // Weight on vol management (default: 0.5)
}

const DEFAULT_CONFIG: TSEfficientConfig = {
  factorMomentumLookback: 126,     // ~6 months
  factorMomentumThreshold: 0,
  volLookback: 21,                  // ~1 month
  targetVolatility: 0.15,           // 15% target vol
  maxLeverage: 2.0,
  minLeverage: 0.2,
  momentumWeight: 0.5,
  volMgmtWeight: 0.5,
};

export interface TSEfficientSignal {
  rawFactorSignal: number;         // Original factor signal (-1 to +1)
  momentumAdjusted: number;        // After momentum filter
  volScaled: number;               // After volatility scaling
  finalSignal: number;             // Combined signal
  scalingFactor: number;           // Position size multiplier
}

/**
 * Apply time-series momentum filter to a factor
 * Only take factor exposure when factor has positive trailing returns
 */
export function applyFactorMomentum(
  factorReturns: number[],
  lookback: number,
  threshold: number = 0
): number {
  if (factorReturns.length < lookback) {
    return 0;
  }
  
  const recentReturns = factorReturns.slice(-lookback);
  const totalReturn = recentReturns.reduce((a, b) => a + b, 0);
  
  // Binary momentum filter
  return totalReturn > threshold ? 1 : 0;
}

/**
 * Calculate volatility scaling multiplier
 * Scale inversely to realized volatility
 */
export function calculateVolScaling(
  returns: number[],
  config: Partial<TSEfficientConfig> = {}
): number {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (returns.length < cfg.volLookback) {
    return 1.0;
  }
  
  const recentReturns = returns.slice(-cfg.volLookback);
  const vol = standardDeviation(recentReturns) * Math.sqrt(252);  // Annualize
  
  if (vol <= 0) return 1.0;
  
  const scale = cfg.targetVolatility / vol;
  return Math.max(cfg.minLeverage, Math.min(cfg.maxLeverage, scale));
}

/**
 * Generate time-series efficient factor signal
 * Combines momentum filter with volatility management
 */
export function generateTSEfficientSignal(
  prices: number[],
  rawFactorExposure: number,  // -1 to +1, the base factor signal
  config: Partial<TSEfficientConfig> = {}
): TSEfficientSignal {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const returns = rollingReturns(prices);
  
  // Step 1: Apply momentum filter to the factor
  const factorMomentum = applyFactorMomentum(returns, cfg.factorMomentumLookback, cfg.factorMomentumThreshold);
  const momentumAdjusted = rawFactorExposure * factorMomentum;
  
  // Step 2: Calculate volatility scaling
  const volScale = calculateVolScaling(returns, cfg);
  const volScaled = rawFactorExposure * volScale;
  
  // Step 3: Combine momentum filter and vol scaling
  // Weighted combination as per the paper
  const finalSignal = (
    cfg.momentumWeight * momentumAdjusted +
    cfg.volMgmtWeight * volScaled
  );
  
  return {
    rawFactorSignal: rawFactorExposure,
    momentumAdjusted,
    volScaled,
    finalSignal,
    scalingFactor: volScale,
  };
}

/**
 * Generate trading signal using TS Efficient Factors approach
 */
export function generateTSEfficientTradeSignal(
  symbol: string,
  prices: number[],
  currentPosition: { qty: number; avgEntryPrice: number } | null,
  config: Partial<TSEfficientConfig> = {}
): { type: "buy" | "sell" | "hold"; confidence: number; reason: string; scale: number } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (prices.length < cfg.factorMomentumLookback + cfg.volLookback) {
    return { type: "hold", confidence: 0, reason: "TSEF: Insufficient data", scale: 1 };
  }
  
  // Calculate base factor signal from price momentum
  const returns = rollingReturns(prices);
  const momentum6m = cumulativeReturn(prices.slice(-cfg.factorMomentumLookback));
  const momentum1m = cumulativeReturn(prices.slice(-21));
  
  // Raw factor signal based on momentum
  const rawSignal = momentum6m > 0 ? (momentum1m > 0 ? 1 : 0.5) : (momentum1m > 0 ? -0.5 : -1);
  
  // Generate TS Efficient signal
  const signal = generateTSEfficientSignal(prices, rawSignal, cfg);
  
  // Calculate confidence
  const confidence = Math.min(0.5 + Math.abs(signal.finalSignal) * 0.3, 0.85);
  
  // Format reason
  const reason = `TSEF: raw=${rawSignal.toFixed(2)} mom=${signal.momentumAdjusted.toFixed(2)} vol=${signal.scalingFactor.toFixed(2)}x final=${signal.finalSignal.toFixed(2)}`;
  
  // Generate trade signal
  if (signal.finalSignal > 0.3) {
    if (!currentPosition) {
      return { type: "buy", confidence, reason, scale: signal.scalingFactor };
    }
    return { type: "hold", confidence: 0.6, reason: `TSEF: Holding, ${reason}`, scale: signal.scalingFactor };
  }
  
  if (signal.finalSignal < -0.3) {
    if (currentPosition) {
      return { type: "sell", confidence, reason: `TSEF Exit: ${reason}`, scale: signal.scalingFactor };
    }
    return { type: "hold", confidence: 0.6, reason: `TSEF: Avoiding, ${reason}`, scale: signal.scalingFactor };
  }
  
  // Position management
  if (currentPosition) {
    const currentPrice = prices[prices.length - 1];
    const pnl = ((currentPrice - currentPosition.avgEntryPrice) / currentPosition.avgEntryPrice) * 100;
    
    // Tighter stops in high vol regime
    const vol = realizedVolatility(prices.slice(-cfg.volLookback));
    const regime = volatilityRegime(vol, rollingVolatility(prices, cfg.volLookback).filter(v => !isNaN(v)));
    
    const stopLoss = regime === "high" || regime === "extreme" ? -4 : -6;
    const takeProfit = regime === "high" || regime === "extreme" ? 6 : 10;
    
    if (pnl > takeProfit) {
      return { type: "sell", confidence: 0.75, reason: `TSEF Profit: +${pnl.toFixed(1)}% (${regime} vol)`, scale: signal.scalingFactor };
    }
    if (pnl < stopLoss) {
      return { type: "sell", confidence: 0.85, reason: `TSEF Stop: ${pnl.toFixed(1)}% (${regime} vol)`, scale: signal.scalingFactor };
    }
    
    // Exit on momentum loss even before stop
    if (signal.momentumAdjusted <= 0 && pnl < 0) {
      return { type: "sell", confidence: 0.7, reason: `TSEF: Momentum lost, P&L ${pnl.toFixed(1)}%`, scale: signal.scalingFactor };
    }
  }
  
  return { type: "hold", confidence: 0.4, reason, scale: signal.scalingFactor };
}

/**
 * Generate strategy code for database storage
 */
export function getTSEfficientStrategyCode(config: Partial<TSEfficientConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  return `
// Time-Series Efficient Factors (AGGRESSIVE PAPER TRADING)
// Momentum lookback: ${cfg.factorMomentumLookback}d, Target vol: ${cfg.targetVolatility * 100}%

function generateSignal(data, position) {
  const prices = data.close;
  const len = prices.length;

  // Reduced data requirement
  if (len < 30) {
    return { type: "hold", confidence: 0, reason: "TSEF: Insufficient data" };
  }

  // Calculate returns
  const returns = [];
  for (let i = 1; i < len; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }

  // Adaptive lookbacks based on available data
  const momLookback = Math.min(${cfg.factorMomentumLookback}, len - 5);
  const volLookback = Math.min(${cfg.volLookback}, len - 1);

  // Factor momentum
  const momReturns = returns.slice(-momLookback);
  const totalMom = momReturns.reduce((a, b) => a + b, 0);
  const momFilter = totalMom > 0 ? 1 : 0.5; // More permissive

  // Volatility scaling
  const volReturns = returns.slice(-volLookback);
  const vol = Math.sqrt(volReturns.reduce((a, b) => a + b * b, 0) / volReturns.length) * Math.sqrt(252);
  const volScale = Math.max(${cfg.minLeverage}, Math.min(${cfg.maxLeverage}, ${cfg.targetVolatility} / vol));

  // Base signal from recent momentum (adaptive window)
  const recentWindow = Math.min(22, len - 1);
  const recentMom = (prices[len-1] - prices[len - recentWindow]) / prices[len - recentWindow];
  const rawSignal = recentMom > 0 ? 1 : -1;

  // Combined signal
  const finalSignal = rawSignal * momFilter * ${cfg.momentumWeight} + rawSignal * volScale * ${cfg.volMgmtWeight};
  const conf = Math.min(0.4 + Math.abs(finalSignal) * 0.4, 0.9);

  // Entry (lowered threshold)
  if (!position && finalSignal > 0.1) {
    return { type: "buy", confidence: conf, reason: "TSEF: signal=" + finalSignal.toFixed(2) + " vol=" + volScale.toFixed(2) + "x" };
  }

  // Exit
  if (position && finalSignal < -0.1) {
    return { type: "sell", confidence: 0.8, reason: "TSEF Exit: signal=" + finalSignal.toFixed(2) };
  }

  // Position management (tighter for paper trading)
  if (position) {
    const pnl = ((prices[len-1] - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    const dynStop = vol > 0.3 ? -3 : -5;
    const dynTarget = vol > 0.3 ? 5 : 8;

    if (pnl > dynTarget) return { type: "sell", confidence: 0.75, reason: "TSEF Profit: +" + pnl.toFixed(1) + "%" };
    if (pnl < dynStop) return { type: "sell", confidence: 0.85, reason: "TSEF Stop: " + pnl.toFixed(1) + "%" };
  }

  return { type: "hold", confidence: 0.3, reason: "TSEF: signal=" + finalSignal.toFixed(2) };
}`;
}

/**
 * Calculate Sharpe improvement from TS Efficient transformation
 */
export function measureTSEfficientImprovement(
  rawReturns: number[],
  tsEfficientReturns: number[]
): { rawSharpe: number; tseSharpe: number; improvement: number } {
  const rawSharpe = sharpeRatio(rawReturns);
  const tseSharpe = sharpeRatio(tsEfficientReturns);
  const improvement = tseSharpe > 0 && rawSharpe > 0 
    ? (tseSharpe - rawSharpe) / rawSharpe 
    : 0;
    
  return { rawSharpe, tseSharpe, improvement };
}
