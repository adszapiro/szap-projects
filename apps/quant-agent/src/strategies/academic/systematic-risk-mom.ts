/**
 * Systematic Risk Momentum Strategy
 * 
 * Based on: Li, Yuan, and Zhou (2024) - "Systematic Risk Momentum"
 * 
 * Key insight: Momentum in an asset's BETA (systematic risk) predicts future returns.
 * This is described as the "strongest momentum effect discovered."
 * 
 * Unlike traditional price momentum:
 * - Works at intraday through monthly frequencies
 * - Driven by changes in systematic risk exposure, not just returns
 * - Go long assets with rising betas, avoid assets with falling betas
 */

import { beta, rollingReturns, mean, standardDeviation, correlation } from "../../utils/statistics.js";
import { realizedVolatility } from "../../utils/volatility.js";

export interface SRMConfig {
  // Beta calculation
  betaLookback: number;          // Days to calculate current beta (default: 60)
  betaChangeLookback: number;    // Days to measure beta change (default: 20)
  benchmarkSymbol: string;       // Benchmark for beta (default: "SPY")
  
  // Signal generation
  betaChangeThreshold: number;   // Min beta change for signal (default: 0.1)
  minBeta: number;               // Minimum absolute beta (default: 0.5)
  maxBeta: number;               // Maximum absolute beta for risk control (default: 2.0)
  
  // Position sizing
  useVolScaling: boolean;        // Scale by inverse volatility (default: true)
  targetVol: number;             // Target volatility (default: 0.20)
}

const DEFAULT_CONFIG: SRMConfig = {
  betaLookback: 60,
  betaChangeLookback: 20,
  benchmarkSymbol: "SPY",
  betaChangeThreshold: 0.1,
  minBeta: 0.5,
  maxBeta: 2.0,
  useVolScaling: true,
  targetVol: 0.20,
};

export interface BetaAnalysis {
  currentBeta: number;
  previousBeta: number;
  betaChange: number;
  betaMomentum: "rising" | "falling" | "stable";
  volatility: number;
}

/**
 * Calculate rolling beta vs benchmark
 */
export function calculateRollingBeta(
  assetPrices: number[],
  benchmarkPrices: number[],
  lookback: number
): number {
  const minLen = Math.min(assetPrices.length, benchmarkPrices.length);
  
  if (minLen < lookback + 1) {
    return 1.0;  // Default to market beta
  }
  
  const assetReturns = rollingReturns(assetPrices.slice(-lookback - 1));
  const benchmarkReturns = rollingReturns(benchmarkPrices.slice(-lookback - 1));
  
  return beta(assetReturns, benchmarkReturns);
}

/**
 * Analyze beta dynamics for an asset
 */
export function analyzeBetaDynamics(
  assetPrices: number[],
  benchmarkPrices: number[],
  config: Partial<SRMConfig> = {}
): BetaAnalysis {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Calculate current beta
  const currentBeta = calculateRollingBeta(assetPrices, benchmarkPrices, cfg.betaLookback);
  
  // Calculate previous beta (from betaChangeLookback days ago)
  const prevAssetPrices = assetPrices.slice(0, -cfg.betaChangeLookback);
  const prevBenchmarkPrices = benchmarkPrices.slice(0, -cfg.betaChangeLookback);
  const previousBeta = calculateRollingBeta(prevAssetPrices, prevBenchmarkPrices, cfg.betaLookback);
  
  // Calculate beta change
  const betaChange = currentBeta - previousBeta;
  
  // Determine momentum direction
  let betaMomentum: "rising" | "falling" | "stable";
  if (betaChange > cfg.betaChangeThreshold) {
    betaMomentum = "rising";
  } else if (betaChange < -cfg.betaChangeThreshold) {
    betaMomentum = "falling";
  } else {
    betaMomentum = "stable";
  }
  
  // Calculate asset volatility
  const volatility = realizedVolatility(assetPrices.slice(-cfg.betaLookback));
  
  return {
    currentBeta,
    previousBeta,
    betaChange,
    betaMomentum,
    volatility,
  };
}

/**
 * Generate trading signal based on systematic risk momentum
 */
export function generateSRMSignal(
  symbol: string,
  assetPrices: number[],
  benchmarkPrices: number[],
  currentPosition: { qty: number; avgEntryPrice: number } | null,
  config: Partial<SRMConfig> = {}
): { type: "buy" | "sell" | "hold"; confidence: number; reason: string; beta: number; betaChange: number } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (assetPrices.length < cfg.betaLookback + cfg.betaChangeLookback || 
      benchmarkPrices.length < cfg.betaLookback + cfg.betaChangeLookback) {
    return { 
      type: "hold", 
      confidence: 0, 
      reason: "SRM: Insufficient data for beta calculation",
      beta: 1,
      betaChange: 0,
    };
  }
  
  // Analyze beta dynamics
  const analysis = analyzeBetaDynamics(assetPrices, benchmarkPrices, cfg);
  
  // Risk check - avoid extreme betas
  if (Math.abs(analysis.currentBeta) > cfg.maxBeta) {
    if (currentPosition) {
      return {
        type: "sell",
        confidence: 0.8,
        reason: `SRM: Beta too extreme (${analysis.currentBeta.toFixed(2)})`,
        beta: analysis.currentBeta,
        betaChange: analysis.betaChange,
      };
    }
    return {
      type: "hold",
      confidence: 0.6,
      reason: `SRM: Avoiding extreme beta (${analysis.currentBeta.toFixed(2)})`,
      beta: analysis.currentBeta,
      betaChange: analysis.betaChange,
    };
  }
  
  // Check minimum beta
  if (Math.abs(analysis.currentBeta) < cfg.minBeta) {
    return {
      type: "hold",
      confidence: 0.5,
      reason: `SRM: Beta too low (${analysis.currentBeta.toFixed(2)})`,
      beta: analysis.currentBeta,
      betaChange: analysis.betaChange,
    };
  }
  
  // Calculate confidence based on beta change magnitude
  const confidence = Math.min(0.5 + Math.abs(analysis.betaChange) * 2, 0.85);
  
  // Format reason
  const betaStr = `β=${analysis.currentBeta.toFixed(2)} Δβ=${analysis.betaChange > 0 ? "+" : ""}${analysis.betaChange.toFixed(2)}`;
  
  // Rising beta momentum - go long
  if (analysis.betaMomentum === "rising") {
    if (!currentPosition) {
      return {
        type: "buy",
        confidence,
        reason: `SRM Long: ${betaStr} (rising risk momentum)`,
        beta: analysis.currentBeta,
        betaChange: analysis.betaChange,
      };
    }
    return {
      type: "hold",
      confidence: 0.6,
      reason: `SRM: Holding rising beta | ${betaStr}`,
      beta: analysis.currentBeta,
      betaChange: analysis.betaChange,
    };
  }
  
  // Falling beta momentum - exit or avoid
  if (analysis.betaMomentum === "falling") {
    if (currentPosition) {
      return {
        type: "sell",
        confidence,
        reason: `SRM Exit: ${betaStr} (falling risk momentum)`,
        beta: analysis.currentBeta,
        betaChange: analysis.betaChange,
      };
    }
    return {
      type: "hold",
      confidence: 0.6,
      reason: `SRM: Avoiding falling beta | ${betaStr}`,
      beta: analysis.currentBeta,
      betaChange: analysis.betaChange,
    };
  }
  
  // Stable beta - position management
  if (currentPosition) {
    const currentPrice = assetPrices[assetPrices.length - 1];
    const pnl = ((currentPrice - currentPosition.avgEntryPrice) / currentPosition.avgEntryPrice) * 100;
    
    // Adjust targets by current beta
    const betaAdjustedTarget = 8 / analysis.currentBeta;  // Higher beta = lower target
    const betaAdjustedStop = -5 / analysis.currentBeta;
    
    if (pnl > betaAdjustedTarget) {
      return {
        type: "sell",
        confidence: 0.75,
        reason: `SRM Profit: +${pnl.toFixed(1)}% (β-adj target)`,
        beta: analysis.currentBeta,
        betaChange: analysis.betaChange,
      };
    }
    
    if (pnl < betaAdjustedStop) {
      return {
        type: "sell",
        confidence: 0.85,
        reason: `SRM Stop: ${pnl.toFixed(1)}% (β-adj stop)`,
        beta: analysis.currentBeta,
        betaChange: analysis.betaChange,
      };
    }
  }
  
  return {
    type: "hold",
    confidence: 0.4,
    reason: `SRM: ${betaStr} (stable)`,
    beta: analysis.currentBeta,
    betaChange: analysis.betaChange,
  };
}

/**
 * Generate strategy code for database storage
 */
export function getSRMStrategyCode(config: Partial<SRMConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  return `
// Systematic Risk Momentum (Li, Yuan, Zhou 2024)
// "The strongest momentum effect discovered"
// Beta lookback: ${cfg.betaLookback}d, Change lookback: ${cfg.betaChangeLookback}d

function generateSignal(data, position) {
  const prices = data.close;
  const len = prices.length;
  
  if (len < ${cfg.betaLookback + cfg.betaChangeLookback}) {
    return { type: "hold", confidence: 0, reason: "SRM: Insufficient data" };
  }
  
  // Calculate returns for beta estimation
  const returns = [];
  for (let i = len - ${cfg.betaLookback}; i < len; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  
  // Estimate beta via volatility ratio (simplified)
  // True beta would need benchmark returns
  const vol = Math.sqrt(returns.reduce((a, b) => a + b * b, 0) / returns.length);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  
  // Use return momentum as beta momentum proxy
  const recentReturns = returns.slice(-${cfg.betaChangeLookback});
  const earlierReturns = returns.slice(0, ${cfg.betaChangeLookback});
  
  const recentVol = Math.sqrt(recentReturns.reduce((a, b) => a + b * b, 0) / recentReturns.length);
  const earlierVol = Math.sqrt(earlierReturns.reduce((a, b) => a + b * b, 0) / earlierReturns.length);
  
  // Beta momentum = change in volatility (risk) exposure
  const betaChange = recentVol - earlierVol;
  const betaMom = betaChange > ${cfg.betaChangeThreshold / 10} ? "rising" : 
                  betaChange < -${cfg.betaChangeThreshold / 10} ? "falling" : "stable";
  
  const conf = Math.min(0.5 + Math.abs(betaChange) * 50, 0.85);
  
  // Rising risk momentum = go long
  if (!position && betaMom === "rising") {
    return { type: "buy", confidence: conf, reason: "SRM: Rising beta momentum Δ=" + (betaChange * 100).toFixed(1) + "%" };
  }
  
  // Falling risk momentum = exit
  if (position && betaMom === "falling") {
    return { type: "sell", confidence: conf, reason: "SRM: Falling beta momentum" };
  }
  
  // Position management
  if (position) {
    const pnl = ((prices[len-1] - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    const volAdj = vol * Math.sqrt(252);  // Annualized
    const target = 8 / Math.max(volAdj * 5, 1);  // Vol-adjusted target
    const stop = -5 / Math.max(volAdj * 5, 1);
    
    if (pnl > target) return { type: "sell", confidence: 0.75, reason: "SRM Profit: +" + pnl.toFixed(1) + "%" };
    if (pnl < stop) return { type: "sell", confidence: 0.85, reason: "SRM Stop: " + pnl.toFixed(1) + "%" };
  }
  
  return { type: "hold", confidence: 0.4, reason: "SRM: " + betaMom + " β momentum" };
}`;
}

/**
 * Rank assets by beta momentum for cross-sectional strategy
 */
export function rankByBetaMomentum(
  assets: Array<{ symbol: string; prices: number[] }>,
  benchmarkPrices: number[],
  config: Partial<SRMConfig> = {}
): Array<{ symbol: string; betaChange: number; currentBeta: number; rank: number }> {
  const results: Array<{ symbol: string; betaChange: number; currentBeta: number; rank: number }> = [];
  
  for (const asset of assets) {
    const analysis = analyzeBetaDynamics(asset.prices, benchmarkPrices, config);
    results.push({
      symbol: asset.symbol,
      betaChange: analysis.betaChange,
      currentBeta: analysis.currentBeta,
      rank: 0,
    });
  }
  
  // Sort by beta change descending (highest rising beta first)
  results.sort((a, b) => b.betaChange - a.betaChange);
  
  // Assign ranks
  results.forEach((r, i) => {
    r.rank = i + 1;
  });
  
  return results;
}
