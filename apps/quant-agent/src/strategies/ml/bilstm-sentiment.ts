/**
 * BiLSTM + FinBERT Sentiment Fusion Strategy
 * 
 * Based on: arXiv 2409.18895 (September 2024)
 * "A Multisource Fusion Framework for Bitcoin Price Prediction"
 * 
 * Key insight: Combine Twitter/X sentiment (via FinBERT) with technical 
 * indicators using BiLSTM for time-series modeling. Claims ~96.8% accuracy.
 * 
 * This implementation provides:
 * 1. Sentiment analysis framework (uses heuristic when API unavailable)
 * 2. Technical feature fusion
 * 3. BiLSTM-style sequential pattern detection
 */

import { rsi, ema, sma, mean, standardDeviation, rollingReturns } from "../../utils/statistics.js";
import { realizedVolatility, ewmaVolatility } from "../../utils/volatility.js";

export interface SentimentConfig {
  // Sentiment parameters
  sentimentWeight: number;       // Weight of sentiment in final signal (default: 0.3)
  technicalWeight: number;       // Weight of technicals (default: 0.7)
  sentimentLookback: number;     // Days to average sentiment (default: 3)
  
  // Technical parameters
  rsiPeriod: number;
  emaShort: number;
  emaLong: number;
  volLookback: number;
  
  // Sequence modeling
  sequenceLength: number;        // Look at last N periods for patterns
  patternThreshold: number;      // Min pattern strength
  
  // Trading
  bullishThreshold: number;      // Signal > this = bullish
  bearishThreshold: number;      // Signal < this = bearish
}

const DEFAULT_CONFIG: SentimentConfig = {
  sentimentWeight: 0.3,
  technicalWeight: 0.7,
  sentimentLookback: 3,
  rsiPeriod: 14,
  emaShort: 9,
  emaLong: 21,
  volLookback: 20,
  sequenceLength: 5,
  patternThreshold: 0.6,
  bullishThreshold: 0.2,
  bearishThreshold: -0.2,
};

export interface SentimentData {
  score: number;           // -1 to +1 (negative to positive)
  confidence: number;      // 0 to 1
  volume: number;          // Number of posts/tweets analyzed
  source: "finbert" | "heuristic" | "api";
}

export interface FusedSignal {
  sentiment: number;
  technical: number;
  pattern: number;
  combined: number;
  confidence: number;
}

/**
 * Heuristic sentiment estimation based on price action
 * Used when actual sentiment API is unavailable
 * 
 * Research shows sentiment tends to lag/follow price action,
 * so we can estimate sentiment from recent momentum
 */
export function estimateSentimentFromPrice(
  prices: number[],
  volume?: number[],
  lookback: number = 5
): SentimentData {
  if (prices.length < lookback + 5) {
    return { score: 0, confidence: 0.3, volume: 0, source: "heuristic" };
  }
  
  // Recent momentum as sentiment proxy
  const recentReturn = (prices[prices.length - 1] - prices[prices.length - lookback - 1]) / 
                       prices[prices.length - lookback - 1];
  
  // Volatility of returns
  const returns = rollingReturns(prices.slice(-lookback * 2));
  const vol = standardDeviation(returns);
  
  // Higher momentum + lower volatility = stronger sentiment signal
  const momentumScore = Math.tanh(recentReturn * 10);  // -1 to +1
  
  // Volume trend (if available)
  let volumeScore = 0;
  if (volume && volume.length >= lookback) {
    const recentVol = mean(volume.slice(-lookback));
    const prevVol = mean(volume.slice(-lookback * 2, -lookback));
    volumeScore = prevVol > 0 ? (recentVol - prevVol) / prevVol : 0;
    volumeScore = Math.tanh(volumeScore * 2) * 0.3;  // Scale down volume impact
  }
  
  // Combine
  const score = momentumScore * 0.7 + volumeScore * 0.3;
  const confidence = 0.4 + Math.abs(momentumScore) * 0.3;  // 0.4 to 0.7
  
  return {
    score,
    confidence,
    volume: volume ? volume[volume.length - 1] : 0,
    source: "heuristic",
  };
}

/**
 * Calculate technical signal component
 */
export function calculateTechnicalSignal(
  prices: number[],
  config: Partial<SentimentConfig> = {}
): number {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const len = prices.length;
  
  if (len < 50) return 0;
  
  // RSI signal
  const rsiValues = rsi(prices, cfg.rsiPeriod);
  const currentRSI = rsiValues[len - 1];
  const rsiSignal = currentRSI < 30 ? 1 : currentRSI > 70 ? -1 : (50 - currentRSI) / 50;
  
  // EMA crossover signal
  const emaShortValues = ema(prices, cfg.emaShort);
  const emaLongValues = ema(prices, cfg.emaLong);
  const emaDiff = (emaShortValues[len - 1] - emaLongValues[len - 1]) / emaLongValues[len - 1];
  const emaSignal = Math.tanh(emaDiff * 20);
  
  // Momentum signal
  const mom5 = (prices[len - 1] - prices[len - 6]) / prices[len - 6];
  const momSignal = Math.tanh(mom5 * 10);
  
  // Volatility adjustment (reduce signal in high vol)
  const vol = realizedVolatility(prices.slice(-cfg.volLookback));
  const volAdj = Math.max(0.5, 1 - (vol - 0.3));  // Reduce signal when vol > 30%
  
  // Weighted combination
  const techSignal = (rsiSignal * 0.3 + emaSignal * 0.4 + momSignal * 0.3) * volAdj;
  
  return techSignal;
}

/**
 * Detect sequential patterns (BiLSTM-style)
 * Looks for momentum continuation or reversal patterns
 */
export function detectSequentialPattern(
  prices: number[],
  config: Partial<SentimentConfig> = {}
): { pattern: string; strength: number } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const len = prices.length;
  
  if (len < cfg.sequenceLength + 5) {
    return { pattern: "none", strength: 0 };
  }
  
  // Calculate daily returns for recent sequence
  const returns: number[] = [];
  for (let i = len - cfg.sequenceLength; i < len; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  
  // Detect patterns
  const positiveCount = returns.filter(r => r > 0).length;
  const negativeCount = returns.filter(r => r < 0).length;
  const avgReturn = mean(returns);
  
  // Momentum continuation pattern
  if (positiveCount >= cfg.sequenceLength - 1) {
    return { pattern: "bullish_continuation", strength: positiveCount / cfg.sequenceLength };
  }
  if (negativeCount >= cfg.sequenceLength - 1) {
    return { pattern: "bearish_continuation", strength: negativeCount / cfg.sequenceLength };
  }
  
  // Reversal pattern: sequence of downs followed by up (or vice versa)
  const firstHalf = returns.slice(0, Math.floor(cfg.sequenceLength / 2));
  const secondHalf = returns.slice(Math.floor(cfg.sequenceLength / 2));
  
  const firstHalfDown = firstHalf.filter(r => r < 0).length > firstHalf.length / 2;
  const secondHalfUp = secondHalf.filter(r => r > 0).length > secondHalf.length / 2;
  
  if (firstHalfDown && secondHalfUp) {
    return { pattern: "bullish_reversal", strength: 0.7 };
  }
  
  const firstHalfUp = firstHalf.filter(r => r > 0).length > firstHalf.length / 2;
  const secondHalfDown = secondHalf.filter(r => r < 0).length > secondHalf.length / 2;
  
  if (firstHalfUp && secondHalfDown) {
    return { pattern: "bearish_reversal", strength: 0.7 };
  }
  
  return { pattern: "mixed", strength: 0.3 };
}

/**
 * Fuse sentiment and technical signals
 */
export function fuseSignals(
  sentiment: SentimentData,
  technicalSignal: number,
  pattern: { pattern: string; strength: number },
  config: Partial<SentimentConfig> = {}
): FusedSignal {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Pattern signal
  let patternSignal = 0;
  if (pattern.pattern.includes("bullish")) {
    patternSignal = pattern.strength;
  } else if (pattern.pattern.includes("bearish")) {
    patternSignal = -pattern.strength;
  }
  
  // Weighted combination (BiLSTM-style fusion)
  const combined = (
    sentiment.score * cfg.sentimentWeight +
    technicalSignal * cfg.technicalWeight * 0.7 +
    patternSignal * cfg.technicalWeight * 0.3
  );
  
  // Confidence from agreement
  const signalAgreement = Math.sign(sentiment.score) === Math.sign(technicalSignal) ? 1.2 : 0.8;
  const confidence = Math.min(
    (sentiment.confidence + Math.abs(technicalSignal) * 0.5) * signalAgreement,
    0.9
  );
  
  return {
    sentiment: sentiment.score,
    technical: technicalSignal,
    pattern: patternSignal,
    combined,
    confidence,
  };
}

/**
 * Generate trading signal using BiLSTM + Sentiment approach
 */
export function generateSentimentSignal(
  symbol: string,
  prices: number[],
  volume: number[],
  currentPosition: { qty: number; avgEntryPrice: number } | null,
  externalSentiment?: SentimentData,  // From actual API when available
  config: Partial<SentimentConfig> = {}
): { type: "buy" | "sell" | "hold"; confidence: number; reason: string; signal?: FusedSignal } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (prices.length < 50) {
    return { type: "hold", confidence: 0, reason: "Sentiment: Insufficient data" };
  }
  
  // Get sentiment (from API or estimate)
  const sentiment = externalSentiment || estimateSentimentFromPrice(prices, volume, cfg.sentimentLookback);
  
  // Calculate technical signal
  const technical = calculateTechnicalSignal(prices, cfg);
  
  // Detect sequential pattern
  const pattern = detectSequentialPattern(prices, cfg);
  
  // Fuse signals
  const fused = fuseSignals(sentiment, technical, pattern, cfg);
  
  // Format reason
  const sentStr = sentiment.source === "finbert" ? "FinBERT" : "estimated";
  const reason = `Sentiment(${sentStr}): sent=${fused.sentiment.toFixed(2)} tech=${fused.technical.toFixed(2)} pattern=${pattern.pattern} combined=${fused.combined.toFixed(2)}`;
  
  // Generate signal
  if (fused.combined > cfg.bullishThreshold && fused.confidence > 0.5) {
    if (!currentPosition) {
      return {
        type: "buy",
        confidence: fused.confidence,
        reason: `BiLSTM Buy: ${reason}`,
        signal: fused,
      };
    }
    return {
      type: "hold",
      confidence: 0.6,
      reason: `BiLSTM Hold: ${reason}`,
      signal: fused,
    };
  }
  
  if (fused.combined < cfg.bearishThreshold && fused.confidence > 0.5) {
    if (currentPosition) {
      return {
        type: "sell",
        confidence: fused.confidence,
        reason: `BiLSTM Sell: ${reason}`,
        signal: fused,
      };
    }
    return {
      type: "hold",
      confidence: 0.6,
      reason: `BiLSTM Avoid: ${reason}`,
      signal: fused,
    };
  }
  
  // Position management
  if (currentPosition) {
    const currentPrice = prices[prices.length - 1];
    const pnl = ((currentPrice - currentPosition.avgEntryPrice) / currentPosition.avgEntryPrice) * 100;
    
    // Exit on sentiment reversal
    if (pnl > 0 && fused.sentiment < -0.3) {
      return {
        type: "sell",
        confidence: 0.7,
        reason: `BiLSTM: Sentiment reversed, P&L +${pnl.toFixed(1)}%`,
        signal: fused,
      };
    }
    
    // Standard stops
    if (pnl > 10) {
      return {
        type: "sell",
        confidence: 0.75,
        reason: `BiLSTM Profit: +${pnl.toFixed(1)}%`,
        signal: fused,
      };
    }
    if (pnl < -6) {
      return {
        type: "sell",
        confidence: 0.85,
        reason: `BiLSTM Stop: ${pnl.toFixed(1)}%`,
        signal: fused,
      };
    }
  }
  
  return {
    type: "hold",
    confidence: 0.4,
    reason: `BiLSTM Neutral: ${reason}`,
    signal: fused,
  };
}

/**
 * Generate strategy code for database storage
 */
export function getSentimentStrategyCode(config: Partial<SentimentConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  return `
// BiLSTM + FinBERT Sentiment Fusion (arXiv 2409.18895)
// Sentiment weight: ${cfg.sentimentWeight}, Technical: ${cfg.technicalWeight}

function generateSignal(data, position) {
  const prices = data.close;
  const volume = data.volume;
  const len = prices.length;
  
  if (len < 50) {
    return { type: "hold", confidence: 0, reason: "Sentiment: Insufficient data" };
  }
  
  // Estimate sentiment from price action (fallback when no API)
  const returns = [];
  for (let i = len - 5; i < len; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const recentMom = returns.reduce((a, b) => a + b, 0);
  const sentimentScore = Math.tanh(recentMom * 20);
  
  // Technical signal (RSI + EMA crossover)
  let gains = 0, losses = 0;
  for (let i = len - ${cfg.rsiPeriod}; i < len; i++) {
    const change = prices[i] - prices[i-1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const rsi = 100 - (100 / (1 + (losses === 0 ? 100 : gains / losses)));
  const rsiSignal = rsi < 30 ? 1 : rsi > 70 ? -1 : (50 - rsi) / 50;
  
  // EMA crossover
  const emaShort = prices.slice(-${cfg.emaShort}).reduce((a, b) => a + b, 0) / ${cfg.emaShort};
  const emaLong = prices.slice(-${cfg.emaLong}).reduce((a, b) => a + b, 0) / ${cfg.emaLong};
  const emaSignal = Math.tanh((emaShort - emaLong) / emaLong * 20);
  
  const technical = rsiSignal * 0.4 + emaSignal * 0.6;
  
  // Sequential pattern detection
  const positives = returns.filter(r => r > 0).length;
  const patternSignal = positives >= 4 ? 0.5 : positives <= 1 ? -0.5 : 0;
  
  // Fused signal
  const combined = sentimentScore * ${cfg.sentimentWeight} + technical * ${cfg.technicalWeight * 0.7} + patternSignal * ${cfg.technicalWeight * 0.3};
  const conf = Math.min(0.5 + Math.abs(combined) * 0.4, 0.85);
  
  // Entry
  if (!position && combined > ${cfg.bullishThreshold} && conf > 0.5) {
    return { type: "buy", confidence: conf, reason: "BiLSTM: sent=" + sentimentScore.toFixed(2) + " tech=" + technical.toFixed(2) };
  }
  
  // Exit
  if (position && combined < ${cfg.bearishThreshold} && conf > 0.5) {
    return { type: "sell", confidence: conf, reason: "BiLSTM Exit: combined=" + combined.toFixed(2) };
  }
  
  // Position management
  if (position) {
    const pnl = ((prices[len-1] - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 0 && sentimentScore < -0.3) return { type: "sell", confidence: 0.7, reason: "BiLSTM: Sentiment reversed" };
    if (pnl > 10) return { type: "sell", confidence: 0.75, reason: "BiLSTM Profit: +" + pnl.toFixed(1) + "%" };
    if (pnl < -6) return { type: "sell", confidence: 0.85, reason: "BiLSTM Stop: " + pnl.toFixed(1) + "%" };
  }
  
  return { type: "hold", confidence: 0.4, reason: "BiLSTM: combined=" + combined.toFixed(2) };
}`;
}
