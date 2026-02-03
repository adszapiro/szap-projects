/**
 * Jegadeesh-Titman Cross-Sectional Momentum Strategy
 * 
 * Based on: "Returns to Buying Winners and Selling Losers: Implications for 
 * Stock Market Efficiency" (Journal of Finance, 1993)
 * 
 * Core insight: Buy recent winners, sell/avoid recent losers over 3-12 month horizons.
 * This strategy ranks assets by trailing returns and goes long the top performers.
 */

import { cumulativeReturn, percentileRank } from "../../utils/statistics.js";
import { realizedVolatility, volatilityScalingFactor } from "../../utils/volatility.js";

export interface MomentumAsset {
  symbol: string;
  prices: number[];
  momentum: number;
  rank: number;
  volatility: number;
}

export interface JTConfig {
  lookbackPeriod: number;      // Formation period in days (default: 252 for 12 months)
  holdingPeriod: number;       // Not used in signal gen, but for reference
  topDecile: number;           // Top X% to go long (default: 0.3 = top 30%)
  bottomDecile: number;        // Bottom X% to avoid/short (default: 0.3)
  useVolScaling: boolean;      // Apply volatility scaling (default: true)
  targetVol: number;           // Target volatility for scaling (default: 0.15)
}

const DEFAULT_CONFIG: JTConfig = {
  lookbackPeriod: 252,         // ~12 months of trading days
  holdingPeriod: 63,           // ~3 months (for reference)
  topDecile: 0.3,              // Top 30%
  bottomDecile: 0.3,           // Bottom 30%
  useVolScaling: true,
  targetVol: 0.15,
};

/**
 * Calculate momentum score for a single asset
 * Uses cumulative return over the lookback period
 * Skips the most recent month to avoid short-term reversal
 */
export function calculateMomentum(
  prices: number[],
  lookbackPeriod: number = 252,
  skipRecent: number = 21  // Skip most recent month (short-term reversal)
): number {
  if (prices.length < lookbackPeriod + skipRecent) {
    return 0;
  }
  
  // Get prices from t-lookback to t-skipRecent
  const startIdx = prices.length - lookbackPeriod - skipRecent;
  const endIdx = prices.length - skipRecent;
  
  const startPrice = prices[startIdx];
  const endPrice = prices[endIdx];
  
  if (startPrice <= 0) return 0;
  
  return (endPrice - startPrice) / startPrice;
}

/**
 * Rank assets by momentum and return sorted results
 */
export function rankAssetsByMomentum(
  assets: Array<{ symbol: string; prices: number[] }>,
  config: Partial<JTConfig> = {}
): MomentumAsset[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Calculate momentum for each asset
  const withMomentum: MomentumAsset[] = assets.map(asset => ({
    symbol: asset.symbol,
    prices: asset.prices,
    momentum: calculateMomentum(asset.prices, cfg.lookbackPeriod),
    rank: 0,
    volatility: realizedVolatility(asset.prices.slice(-cfg.lookbackPeriod)),
  }));
  
  // Sort by momentum descending
  withMomentum.sort((a, b) => b.momentum - a.momentum);
  
  // Assign ranks (1 = highest momentum)
  withMomentum.forEach((asset, idx) => {
    asset.rank = idx + 1;
  });
  
  return withMomentum;
}

/**
 * Generate trading signal for a single asset based on J-T momentum
 * 
 * @param symbol Asset symbol
 * @param prices Price history for this asset
 * @param allAssetsMomentum Pre-calculated momentum rankings for the universe
 * @param currentPosition Current position (null if none)
 * @param config Strategy configuration
 */
export function generateJTSignal(
  symbol: string,
  prices: number[],
  allAssetsMomentum: MomentumAsset[],
  currentPosition: { qty: number; avgEntryPrice: number } | null,
  config: Partial<JTConfig> = {}
): { type: "buy" | "sell" | "hold"; confidence: number; reason: string } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Find this asset in the rankings
  const assetRanking = allAssetsMomentum.find(a => a.symbol === symbol);
  
  if (!assetRanking) {
    return { type: "hold", confidence: 0, reason: "Asset not in momentum universe" };
  }
  
  const totalAssets = allAssetsMomentum.length;
  const percentilePosition = assetRanking.rank / totalAssets;
  
  // Top decile = go long
  if (percentilePosition <= cfg.topDecile) {
    if (!currentPosition) {
      // Calculate confidence based on how strong the momentum is
      const confidence = Math.min(0.5 + assetRanking.momentum * 2, 0.9);
      
      // Apply volatility scaling to reason
      let reason = `JT Momentum: Top ${(percentilePosition * 100).toFixed(0)}% (${(assetRanking.momentum * 100).toFixed(1)}% return)`;
      
      if (cfg.useVolScaling) {
        const volScale = volatilityScalingFactor(assetRanking.volatility, cfg.targetVol);
        reason += ` [vol-scaled: ${volScale.toFixed(2)}x]`;
      }
      
      return { type: "buy", confidence, reason };
    }
    return { type: "hold", confidence: 0.6, reason: "Maintaining momentum position" };
  }
  
  // Bottom decile = exit or avoid
  if (percentilePosition >= (1 - cfg.bottomDecile)) {
    if (currentPosition) {
      return {
        type: "sell",
        confidence: 0.8,
        reason: `JT Momentum: Bottom ${((1 - percentilePosition) * 100).toFixed(0)}% - exit loser`,
      };
    }
    return { type: "hold", confidence: 0.7, reason: "Avoiding momentum loser" };
  }
  
  // Middle zone - hold if have position, don't enter new
  if (currentPosition) {
    const currentPrice = prices[prices.length - 1];
    const pnl = ((currentPrice - currentPosition.avgEntryPrice) / currentPosition.avgEntryPrice) * 100;
    
    // Exit if dropped out of top half
    if (percentilePosition > 0.5) {
      return {
        type: "sell",
        confidence: 0.6,
        reason: `JT Momentum: Dropped to ${(percentilePosition * 100).toFixed(0)}% percentile`,
      };
    }
  }
  
  return { type: "hold", confidence: 0.4, reason: `JT Momentum: Middle zone (${(percentilePosition * 100).toFixed(0)}%)` };
}

/**
 * Generate strategy code string for database storage
 * This creates a self-contained function that can be executed by the agent
 */
export function getJTStrategyCode(config: Partial<JTConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  return `
// Jegadeesh-Titman Cross-Sectional Momentum (AGGRESSIVE PAPER TRADING)
// Lookback: ${cfg.lookbackPeriod} days, Top: ${cfg.topDecile * 100}%

function generateSignal(data, position) {
  const prices = data.close;
  const len = prices.length;

  // Reduced data requirement
  if (len < 30) {
    return { type: "hold", confidence: 0, reason: "Insufficient data for JT momentum" };
  }

  // Adaptive lookback based on available data
  const skipDays = Math.min(21, Math.floor(len / 4));
  const lookback = Math.min(${cfg.lookbackPeriod}, len - skipDays - 1);

  // Calculate momentum (skip recent days to avoid reversal)
  const startIdx = len - lookback - skipDays;
  const endIdx = len - skipDays;
  const momentum = (prices[endIdx] - prices[startIdx]) / prices[startIdx];

  // Calculate volatility for position sizing
  const volWindow = Math.min(${cfg.lookbackPeriod}, len - 1);
  const returns = [];
  for (let i = len - volWindow; i < len; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const vol = Math.sqrt(returns.reduce((a, b) => a + b * b, 0) / returns.length) * Math.sqrt(252);

  // Entry: ANY positive momentum (lowered from 0.1)
  if (!position && momentum > 0.02) {
    const confidence = Math.min(0.4 + momentum * 3, 0.9);
    return {
      type: "buy",
      confidence,
      reason: "JT Momentum: " + (momentum * 100).toFixed(1) + "% trailing return"
    };
  }

  // Exit: Momentum turned negative
  if (position && momentum < -0.02) {
    return {
      type: "sell",
      confidence: 0.8,
      reason: "JT Momentum: Turned negative (" + (momentum * 100).toFixed(1) + "%)"
    };
  }

  // Hold with position
  if (position) {
    const currentPrice = prices[len - 1];
    const pnl = ((currentPrice - position.avgEntryPrice) / position.avgEntryPrice) * 100;

    // Take profit at 7% (tighter for more trades)
    if (pnl > 7) {
      return { type: "sell", confidence: 0.75, reason: "JT Profit target: +" + pnl.toFixed(1) + "%" };
    }
    // Stop loss at 4% (tighter)
    if (pnl < -4) {
      return { type: "sell", confidence: 0.9, reason: "JT Stop loss: " + pnl.toFixed(1) + "%" };
    }
  }

  return { type: "hold", confidence: 0.3, reason: "JT Momentum: " + (momentum * 100).toFixed(1) + "%" };
}`;
}

/**
 * Prepare J-T momentum for all assets in universe
 * Call this before generating individual signals
 */
export async function prepareJTMomentumUniverse(
  getPrices: (symbol: string) => Promise<number[]>,
  symbols: string[],
  config: Partial<JTConfig> = {}
): Promise<MomentumAsset[]> {
  const assets: Array<{ symbol: string; prices: number[] }> = [];
  
  for (const symbol of symbols) {
    try {
      const prices = await getPrices(symbol);
      if (prices.length > 0) {
        assets.push({ symbol, prices });
      }
    } catch (error) {
      console.error(`Failed to get prices for ${symbol}:`, error);
    }
  }
  
  return rankAssetsByMomentum(assets, config);
}
