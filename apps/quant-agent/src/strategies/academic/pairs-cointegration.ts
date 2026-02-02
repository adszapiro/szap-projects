/**
 * Pairs Trading with Cointegration Strategy
 * 
 * Based on: Vidyamurthy "Pairs Trading" and Gatev, Goetzmann, Rouwenhorst research
 * 
 * Core insight: Find pairs of assets that are cointegrated (share a long-run equilibrium).
 * When the spread deviates from equilibrium, bet on mean reversion.
 * 
 * Particularly effective for crypto pairs (BTC/ETH, SOL/AVAX, etc.)
 */

import {
  testCointegration,
  calculateSpread,
  spreadZScore,
  pairsSignal,
  calculateHalfLife,
  findCointegatedPairs,
  linearRegression,
} from "../../utils/cointegration.js";
import { standardDeviation, mean } from "../../utils/statistics.js";

export interface PairsConfig {
  // Cointegration parameters
  formationPeriod: number;       // Days to estimate hedge ratio (default: 60)
  minHalfLife: number;           // Minimum half-life for trade (default: 5)
  maxHalfLife: number;           // Maximum half-life (default: 50)
  criticalADF: number;           // ADF critical value (default: -2.86)
  
  // Trading parameters
  entryZScore: number;           // Z-score to enter trade (default: 2.0)
  exitZScore: number;            // Z-score to exit trade (default: 0.5)
  stopLossZScore: number;        // Z-score for stop loss (default: 4.0)
  
  // Position sizing
  maxSpreadDeviation: number;    // Max z-score before force exit (default: 5.0)
  lookbackZScore: number;        // Lookback for z-score calculation (default: 20)
}

const DEFAULT_CONFIG: PairsConfig = {
  formationPeriod: 60,
  minHalfLife: 5,
  maxHalfLife: 50,
  criticalADF: -2.86,
  entryZScore: 2.0,
  exitZScore: 0.5,
  stopLossZScore: 4.0,
  maxSpreadDeviation: 5.0,
  lookbackZScore: 20,
};

export interface PairPosition {
  pair: [string, string];
  hedgeRatio: number;
  intercept: number;
  direction: "long_spread" | "short_spread";
  entryZScore: number;
  entryTime: Date;
}

export interface PairAnalysis {
  pair: [string, string];
  isCointegrated: boolean;
  adfStat: number;
  hedgeRatio: number;
  intercept: number;
  halfLife: number;
  currentZScore: number;
  correlation: number;
  signal: ReturnType<typeof pairsSignal>;
}

/**
 * Analyze a pair for cointegration and generate signal
 */
export function analyzePair(
  symbol1: string,
  symbol2: string,
  prices1: number[],
  prices2: number[],
  config: Partial<PairsConfig> = {}
): PairAnalysis {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Test cointegration
  const cointTest = testCointegration(prices1, prices2, cfg.criticalADF);
  
  // Calculate current spread
  const spread = calculateSpread(prices1, prices2, cointTest.hedgeRatio, cointTest.intercept);
  
  // Calculate z-score
  const zScore = spreadZScore(spread, cfg.lookbackZScore);
  
  // Generate signal
  const signal = pairsSignal(zScore, cfg.entryZScore, cfg.exitZScore);
  
  return {
    pair: [symbol1, symbol2],
    isCointegrated: cointTest.isCointegrated,
    adfStat: cointTest.adfStat,
    hedgeRatio: cointTest.hedgeRatio,
    intercept: cointTest.intercept,
    halfLife: cointTest.halfLife,
    currentZScore: zScore,
    correlation: cointTest.correlation,
    signal,
  };
}

/**
 * Generate trading signal for pairs strategy
 * 
 * For a pair (X, Y) with hedge ratio β:
 * - Spread = Y - β*X
 * - Long spread = Long Y, Short X (when spread is low)
 * - Short spread = Short Y, Long X (when spread is high)
 * 
 * Since we can only go long in paper trading, we implement:
 * - "Long spread" by going long Y (the dependent asset)
 * - "Short spread" by going long X (the independent asset)
 */
export function generatePairsSignal(
  symbol: string,
  pairSymbol: string,
  prices: number[],
  pairPrices: number[],
  currentPosition: { qty: number; avgEntryPrice: number } | null,
  config: Partial<PairsConfig> = {}
): { 
  type: "buy" | "sell" | "hold"; 
  confidence: number; 
  reason: string;
  hedgeRatio?: number;
  zScore?: number;
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Need enough data for formation period
  if (prices.length < cfg.formationPeriod || pairPrices.length < cfg.formationPeriod) {
    return { type: "hold", confidence: 0, reason: "Pairs: Insufficient data" };
  }
  
  // Analyze the pair
  const analysis = analyzePair(symbol, pairSymbol, prices, pairPrices, cfg);
  
  // Check if pair is valid for trading
  if (!analysis.isCointegrated) {
    if (currentPosition) {
      return {
        type: "sell",
        confidence: 0.7,
        reason: `Pairs: Cointegration broken (ADF=${analysis.adfStat.toFixed(2)})`,
        hedgeRatio: analysis.hedgeRatio,
        zScore: analysis.currentZScore,
      };
    }
    return {
      type: "hold",
      confidence: 0.5,
      reason: `Pairs: Not cointegrated (ADF=${analysis.adfStat.toFixed(2)})`,
      hedgeRatio: analysis.hedgeRatio,
      zScore: analysis.currentZScore,
    };
  }
  
  // Check half-life validity
  if (analysis.halfLife < cfg.minHalfLife || analysis.halfLife > cfg.maxHalfLife) {
    return {
      type: "hold",
      confidence: 0.4,
      reason: `Pairs: Half-life out of range (${analysis.halfLife.toFixed(1)} days)`,
      hedgeRatio: analysis.hedgeRatio,
      zScore: analysis.currentZScore,
    };
  }
  
  // Stop loss check
  if (Math.abs(analysis.currentZScore) > cfg.stopLossZScore) {
    if (currentPosition) {
      return {
        type: "sell",
        confidence: 0.9,
        reason: `Pairs: Stop loss z=${analysis.currentZScore.toFixed(2)}`,
        hedgeRatio: analysis.hedgeRatio,
        zScore: analysis.currentZScore,
      };
    }
  }
  
  const { action, confidence } = analysis.signal;
  
  // Translate pairs signal to trading action
  // This assumes we're evaluating the Y asset (symbol)
  // Long spread = Long Y when z-score negative (spread below mean)
  // Short spread = avoid Y when z-score positive (spread above mean)
  
  if (action === "long_spread") {
    // Spread is below mean, expect Y to increase relative to X
    if (!currentPosition) {
      return {
        type: "buy",
        confidence,
        reason: `Pairs Long: z=${analysis.currentZScore.toFixed(2)} β=${analysis.hedgeRatio.toFixed(2)} HL=${analysis.halfLife.toFixed(0)}d`,
        hedgeRatio: analysis.hedgeRatio,
        zScore: analysis.currentZScore,
      };
    }
    return {
      type: "hold",
      confidence: 0.6,
      reason: `Pairs: Holding long spread z=${analysis.currentZScore.toFixed(2)}`,
      hedgeRatio: analysis.hedgeRatio,
      zScore: analysis.currentZScore,
    };
  }
  
  if (action === "short_spread") {
    // Spread is above mean, expect Y to decrease relative to X
    // If we have position in Y, exit
    if (currentPosition) {
      return {
        type: "sell",
        confidence,
        reason: `Pairs Exit: z=${analysis.currentZScore.toFixed(2)} spread overextended`,
        hedgeRatio: analysis.hedgeRatio,
        zScore: analysis.currentZScore,
      };
    }
    return {
      type: "hold",
      confidence: 0.6,
      reason: `Pairs: Avoiding, spread high z=${analysis.currentZScore.toFixed(2)}`,
      hedgeRatio: analysis.hedgeRatio,
      zScore: analysis.currentZScore,
    };
  }
  
  if (action === "close") {
    // Spread returned to mean
    if (currentPosition) {
      return {
        type: "sell",
        confidence,
        reason: `Pairs Close: z=${analysis.currentZScore.toFixed(2)} mean reversion complete`,
        hedgeRatio: analysis.hedgeRatio,
        zScore: analysis.currentZScore,
      };
    }
  }
  
  return {
    type: "hold",
    confidence: 0.4,
    reason: `Pairs: z=${analysis.currentZScore.toFixed(2)} in neutral zone`,
    hedgeRatio: analysis.hedgeRatio,
    zScore: analysis.currentZScore,
  };
}

/**
 * Get best crypto pairs for trading
 */
export const CRYPTO_PAIRS = [
  ["BTC/USD", "ETH/USD"],
  ["ETH/USD", "SOL/USD"],
  ["SOL/USD", "AVAX/USD"],
  ["LINK/USD", "UNI/USD"],
  ["BTC/USD", "SOL/USD"],
];

/**
 * Generate strategy code for pairs trading
 */
export function getPairsStrategyCode(
  pairSymbol: string,
  config: Partial<PairsConfig> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  return `
// Pairs Trading with Cointegration
// Pair: THIS vs ${pairSymbol}
// Entry z: ${cfg.entryZScore}, Exit z: ${cfg.exitZScore}

function generateSignal(data, position) {
  const prices = data.close;
  const len = prices.length;
  
  if (len < ${cfg.formationPeriod}) {
    return { type: "hold", confidence: 0, reason: "Pairs: Insufficient data" };
  }
  
  // Calculate trailing correlation as cointegration proxy
  // (In production, would use actual pair prices)
  const returns = [];
  for (let i = len - 20; i < len; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const std = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length);
  
  // Use price deviation from SMA as z-score proxy
  const sma = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const priceDeviation = (prices[len-1] - sma) / sma;
  const zScore = std > 0 ? priceDeviation / std : 0;
  
  // Entry: Large deviation (expect mean reversion)
  if (!position && zScore < -${cfg.entryZScore}) {
    const conf = Math.min(0.5 + Math.abs(zScore) * 0.15, 0.85);
    return { 
      type: "buy", 
      confidence: conf, 
      reason: "Pairs: z=" + zScore.toFixed(2) + " below mean"
    };
  }
  
  // Exit: Reversion to mean or stop loss
  if (position) {
    if (Math.abs(zScore) < ${cfg.exitZScore}) {
      return { type: "sell", confidence: 0.8, reason: "Pairs: z=" + zScore.toFixed(2) + " mean reversion" };
    }
    if (zScore > ${cfg.stopLossZScore}) {
      return { type: "sell", confidence: 0.9, reason: "Pairs: z=" + zScore.toFixed(2) + " stop loss" };
    }
    
    const pnl = ((prices[len-1] - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 5) return { type: "sell", confidence: 0.75, reason: "Pairs profit: +" + pnl.toFixed(1) + "%" };
    if (pnl < -4) return { type: "sell", confidence: 0.9, reason: "Pairs stop: " + pnl.toFixed(1) + "%" };
  }
  
  return { type: "hold", confidence: 0.4, reason: "Pairs: z=" + zScore.toFixed(2) };
}`;
}

/**
 * Find all tradable pairs from a list of symbols
 */
export async function findTradablePairs(
  getPrices: (symbol: string) => Promise<number[]>,
  symbols: string[],
  config: Partial<PairsConfig> = {}
): Promise<PairAnalysis[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const priceData = new Map<string, number[]>();
  
  // Fetch all prices
  for (const symbol of symbols) {
    try {
      const prices = await getPrices(symbol);
      if (prices.length >= cfg.formationPeriod) {
        priceData.set(symbol, prices);
      }
    } catch (error) {
      console.error(`Failed to get prices for ${symbol}`);
    }
  }
  
  // Analyze all pairs
  const results: PairAnalysis[] = [];
  const symbolList = Array.from(priceData.keys());
  
  for (let i = 0; i < symbolList.length; i++) {
    for (let j = i + 1; j < symbolList.length; j++) {
      const sym1 = symbolList[i];
      const sym2 = symbolList[j];
      const prices1 = priceData.get(sym1)!;
      const prices2 = priceData.get(sym2)!;
      
      const analysis = analyzePair(sym1, sym2, prices1, prices2, cfg);
      
      if (analysis.isCointegrated && 
          analysis.halfLife >= cfg.minHalfLife && 
          analysis.halfLife <= cfg.maxHalfLife) {
        results.push(analysis);
      }
    }
  }
  
  // Sort by ADF stat (most cointegrated first)
  results.sort((a, b) => a.adfStat - b.adfStat);
  
  return results;
}
