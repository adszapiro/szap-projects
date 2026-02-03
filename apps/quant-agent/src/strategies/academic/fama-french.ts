/**
 * Fama-French 5-Factor Strategy
 * 
 * Based on: "A Five-Factor Asset Pricing Model" by Fama and French (2014)
 * 
 * The strategy tilts portfolio toward factors with positive expected premiums:
 * - Market (beta)
 * - Size (small caps outperform large caps)
 * - Value (high B/M outperform low B/M)
 * - Profitability (robust profits outperform weak)
 * - Investment (conservative firms outperform aggressive)
 */

import {
  FamaFrenchFactors,
  FactorExposures,
  fetchFamaFrenchFactors,
  getFactorMomentum,
  estimateFactorExposures,
  expectedFactorReturn,
  FACTOR_ETFS,
  HISTORICAL_FACTOR_PREMIUMS,
} from "../../data/french-factors.js";
import { mean, standardDeviation } from "../../utils/statistics.js";

export interface FFConfig {
  // Factor tilt weights (-1 to +1, 0 = neutral)
  sizeTilt: number;        // Positive = small cap tilt
  valueTilt: number;       // Positive = value tilt
  qualityTilt: number;     // Positive = quality tilt
  investmentTilt: number;  // Positive = conservative tilt
  
  // Dynamic factor timing
  useFactorMomentum: boolean;  // Tilt toward recently strong factors
  momentumLookback: number;     // Days to calculate factor momentum
  
  // Risk controls
  maxFactorTilt: number;       // Maximum absolute tilt (default: 0.5)
  rebalanceThreshold: number;  // Min change to trigger rebalance (default: 0.1)
}

const DEFAULT_CONFIG: FFConfig = {
  sizeTilt: 0.2,          // Slight small cap tilt
  valueTilt: 0.3,         // Moderate value tilt
  qualityTilt: 0.3,       // Moderate quality tilt  
  investmentTilt: 0.1,    // Slight conservative tilt
  useFactorMomentum: true,
  momentumLookback: 60,
  maxFactorTilt: 0.5,
  rebalanceThreshold: 0.1,
};

/**
 * Calculate optimal factor tilts based on current regime
 */
export function calculateFactorTilts(
  factorData: FamaFrenchFactors[],
  config: Partial<FFConfig> = {}
): Record<string, number> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  let tilts = {
    size: cfg.sizeTilt,
    value: cfg.valueTilt,
    quality: cfg.qualityTilt,
    investment: cfg.investmentTilt,
  };
  
  // Apply factor momentum if enabled
  if (cfg.useFactorMomentum && factorData.length >= cfg.momentumLookback) {
    const momentum = getFactorMomentum(factorData, cfg.momentumLookback);
    
    // Increase tilts toward factors with positive recent returns
    const momentumScale = 0.3;  // How much to adjust based on momentum
    
    tilts.size += Math.sign(momentum.smb) * Math.min(Math.abs(momentum.smb) * 10, 0.2) * momentumScale;
    tilts.value += Math.sign(momentum.hml) * Math.min(Math.abs(momentum.hml) * 10, 0.2) * momentumScale;
    tilts.quality += Math.sign(momentum.rmw) * Math.min(Math.abs(momentum.rmw) * 10, 0.2) * momentumScale;
    tilts.investment += Math.sign(momentum.cma) * Math.min(Math.abs(momentum.cma) * 10, 0.2) * momentumScale;
  }
  
  // Clamp to maximum tilts
  for (const key of Object.keys(tilts) as Array<keyof typeof tilts>) {
    tilts[key] = Math.max(-cfg.maxFactorTilt, Math.min(cfg.maxFactorTilt, tilts[key]));
  }
  
  return tilts;
}

/**
 * Score an asset based on factor alignment
 */
export function scoreAssetByFactors(
  symbol: string,
  targetTilts: Record<string, number>
): number {
  const exposures = estimateFactorExposures(symbol);
  
  // Calculate alignment score
  let score = 0;
  
  score += exposures.size * targetTilts.size;
  score += exposures.value * targetTilts.value;
  score += exposures.quality * targetTilts.quality;
  score += exposures.investment * targetTilts.investment;
  
  return score;
}

/**
 * Generate portfolio weights based on factor tilts
 */
export function generateFactorPortfolio(
  tilts: Record<string, number>
): Array<{ symbol: string; weight: number; reason: string }> {
  const portfolio: Array<{ symbol: string; weight: number; reason: string }> = [];
  
  // Base market allocation
  const baseMarketWeight = 0.4;
  portfolio.push({
    symbol: FACTOR_ETFS.market,
    weight: baseMarketWeight,
    reason: "Market beta exposure",
  });
  
  // Size tilt
  if (tilts.size > 0.1) {
    portfolio.push({
      symbol: FACTOR_ETFS.smallCap,
      weight: tilts.size * 0.3,
      reason: `Small cap tilt (${(tilts.size * 100).toFixed(0)}%)`,
    });
  } else if (tilts.size < -0.1) {
    portfolio.push({
      symbol: FACTOR_ETFS.largeCap,
      weight: Math.abs(tilts.size) * 0.3,
      reason: `Large cap tilt (${(tilts.size * 100).toFixed(0)}%)`,
    });
  }
  
  // Value/Growth tilt
  if (tilts.value > 0.1) {
    portfolio.push({
      symbol: FACTOR_ETFS.value,
      weight: tilts.value * 0.3,
      reason: `Value tilt (${(tilts.value * 100).toFixed(0)}%)`,
    });
  } else if (tilts.value < -0.1) {
    portfolio.push({
      symbol: FACTOR_ETFS.growth,
      weight: Math.abs(tilts.value) * 0.3,
      reason: `Growth tilt (${(tilts.value * 100).toFixed(0)}%)`,
    });
  }
  
  // Quality tilt
  if (tilts.quality > 0.1) {
    portfolio.push({
      symbol: FACTOR_ETFS.quality,
      weight: tilts.quality * 0.2,
      reason: `Quality tilt (${(tilts.quality * 100).toFixed(0)}%)`,
    });
  }
  
  // Investment/Low-vol tilt
  if (tilts.investment > 0.1) {
    portfolio.push({
      symbol: FACTOR_ETFS.lowVol,
      weight: tilts.investment * 0.2,
      reason: `Low-vol/conservative tilt (${(tilts.investment * 100).toFixed(0)}%)`,
    });
  }
  
  // Normalize weights to sum to 1
  const totalWeight = portfolio.reduce((sum, p) => sum + p.weight, 0);
  for (const p of portfolio) {
    p.weight /= totalWeight;
  }
  
  return portfolio;
}

/**
 * Generate trading signal based on Fama-French factors
 */
export function generateFFSignal(
  symbol: string,
  prices: number[],
  currentPosition: { qty: number; avgEntryPrice: number } | null,
  factorData: FamaFrenchFactors[],
  config: Partial<FFConfig> = {}
): { type: "buy" | "sell" | "hold"; confidence: number; reason: string } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Get current factor tilts
  const tilts = calculateFactorTilts(factorData, cfg);
  
  // Score this asset
  const assetExposures = estimateFactorExposures(symbol);
  const alignmentScore = scoreAssetByFactors(symbol, tilts);
  
  // Calculate expected return based on factor model
  const expectedReturn = expectedFactorReturn(assetExposures);
  
  // Generate signal based on alignment and expected return
  const confidence = Math.min(0.5 + Math.abs(alignmentScore) * 0.5, 0.85);
  
  // Format factor exposures for reason
  const expStr = `β:${assetExposures.beta.toFixed(1)} sz:${assetExposures.size.toFixed(1)} val:${assetExposures.value.toFixed(1)}`;
  
  if (alignmentScore > 0.3 && expectedReturn > 0.04) {
    if (!currentPosition) {
      return {
        type: "buy",
        confidence,
        reason: `FF Factor: Aligned (${alignmentScore.toFixed(2)}) | E[R]=${(expectedReturn * 100).toFixed(1)}% | ${expStr}`,
      };
    }
    return {
      type: "hold",
      confidence: 0.6,
      reason: `FF Factor: Maintaining aligned position | ${expStr}`,
    };
  }
  
  if (alignmentScore < -0.2 && currentPosition) {
    return {
      type: "sell",
      confidence: 0.75,
      reason: `FF Factor: Misaligned (${alignmentScore.toFixed(2)}) | ${expStr}`,
    };
  }
  
  // Position management
  if (currentPosition) {
    const currentPrice = prices[prices.length - 1];
    const pnl = ((currentPrice - currentPosition.avgEntryPrice) / currentPosition.avgEntryPrice) * 100;
    
    // Take profit at expected return achieved
    if (pnl > expectedReturn * 100 * 1.5) {
      return {
        type: "sell",
        confidence: 0.7,
        reason: `FF Factor: Target reached +${pnl.toFixed(1)}%`,
      };
    }
    
    // Stop loss
    if (pnl < -8) {
      return {
        type: "sell",
        confidence: 0.85,
        reason: `FF Factor: Stop loss ${pnl.toFixed(1)}%`,
      };
    }
  }
  
  return {
    type: "hold",
    confidence: 0.4,
    reason: `FF Factor: Neutral alignment (${alignmentScore.toFixed(2)}) | ${expStr}`,
  };
}

/**
 * Generate strategy code string for database storage
 */
export function getFFStrategyCode(config: Partial<FFConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  return `
// Fama-French 5-Factor Strategy (AGGRESSIVE PAPER TRADING)
// Tilts: Size=${cfg.sizeTilt}, Value=${cfg.valueTilt}, Quality=${cfg.qualityTilt}

function generateSignal(data, position) {
  const prices = data.close;
  const len = prices.length;

  if (len < 25) {
    return { type: "hold", confidence: 0, reason: "FF: Insufficient data" };
  }

  // Calculate simple factor proxies from price data
  const window = Math.min(60, len - 1);
  const returns = [];
  for (let i = len - window; i < len; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const volatility = Math.sqrt(returns.reduce((a, b) => a + b * b, 0) / returns.length);
  const sharpe = volatility > 0 ? (avgReturn * 252) / (volatility * Math.sqrt(252)) : 0;

  // Calculate momentum as quality proxy (use available window)
  const momWindow = Math.min(60, len - 1);
  const mom = (prices[len-1] - prices[len - momWindow]) / prices[len - momWindow];

  // Factor-based signal (more aggressive)
  const qualityScore = sharpe * 0.5 + (mom > 0 ? 0.4 : -0.1);

  // Entry signal (lowered threshold)
  if (!position && qualityScore > 0.1) {
    const conf = Math.min(0.4 + qualityScore * 0.4, 0.9);
    return {
      type: "buy",
      confidence: conf,
      reason: "FF Factor: Quality=" + qualityScore.toFixed(2) + " Sharpe=" + sharpe.toFixed(2)
    };
  }

  // Exit on deteriorating quality
  if (position && qualityScore < -0.1) {
    return { type: "sell", confidence: 0.75, reason: "FF Factor: Quality deteriorating" };
  }

  // Position management (tighter stops for paper trading)
  if (position) {
    const pnl = ((prices[len-1] - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 8) return { type: "sell", confidence: 0.7, reason: "FF Profit: +" + pnl.toFixed(1) + "%" };
    if (pnl < -5) return { type: "sell", confidence: 0.85, reason: "FF Stop: " + pnl.toFixed(1) + "%" };
  }

  return { type: "hold", confidence: 0.3, reason: "FF Factor: Quality=" + qualityScore.toFixed(2) };
}`;
}
