import { OHLCV, StrategyParams, StrategyType } from './types';
import { sma, rsi, macd, bollingerBands } from './indicators';

// Signal: 1 = buy, -1 = sell, 0 = hold
export type Signal = 1 | -1 | 0;

/**
 * Generate trading signals based on strategy
 */
export function generateSignals(
  data: OHLCV[],
  strategy: StrategyType,
  params: StrategyParams
): Signal[] {
  const prices = data.map(d => d.close);
  
  switch (strategy) {
    case 'sma_crossover':
      return smaCrossoverSignals(prices, params);
    case 'rsi':
      return rsiSignals(prices, params);
    case 'macd':
      return macdSignals(prices, params);
    case 'bollinger':
      return bollingerSignals(prices, params);
    default:
      return prices.map(() => 0);
  }
}

/**
 * SMA Crossover Strategy
 * Buy when fast SMA crosses above slow SMA
 * Sell when fast SMA crosses below slow SMA
 */
function smaCrossoverSignals(prices: number[], params: StrategyParams): Signal[] {
  const fastPeriod = params.fastPeriod || 10;
  const slowPeriod = params.slowPeriod || 50;
  
  const fastSma = sma(prices, fastPeriod);
  const slowSma = sma(prices, slowPeriod);
  
  const signals: Signal[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0 || fastSma[i] === null || slowSma[i] === null || 
        fastSma[i - 1] === null || slowSma[i - 1] === null) {
      signals.push(0);
      continue;
    }
    
    const prevFast = fastSma[i - 1]!;
    const prevSlow = slowSma[i - 1]!;
    const currFast = fastSma[i]!;
    const currSlow = slowSma[i]!;
    
    // Bullish crossover: fast crosses above slow
    if (prevFast <= prevSlow && currFast > currSlow) {
      signals.push(1);
    }
    // Bearish crossover: fast crosses below slow
    else if (prevFast >= prevSlow && currFast < currSlow) {
      signals.push(-1);
    }
    else {
      signals.push(0);
    }
  }
  
  return signals;
}

/**
 * RSI Strategy
 * Buy when RSI goes below oversold level
 * Sell when RSI goes above overbought level
 */
function rsiSignals(prices: number[], params: StrategyParams): Signal[] {
  const period = params.period || 14;
  const oversold = params.oversold || 30;
  const overbought = params.overbought || 70;
  
  const rsiValues = rsi(prices, period);
  
  const signals: Signal[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0 || rsiValues[i] === null || rsiValues[i - 1] === null) {
      signals.push(0);
      continue;
    }
    
    const prevRsi = rsiValues[i - 1]!;
    const currRsi = rsiValues[i]!;
    
    // Buy when RSI crosses up through oversold
    if (prevRsi <= oversold && currRsi > oversold) {
      signals.push(1);
    }
    // Sell when RSI crosses down through overbought
    else if (prevRsi >= overbought && currRsi < overbought) {
      signals.push(-1);
    }
    else {
      signals.push(0);
    }
  }
  
  return signals;
}

/**
 * MACD Strategy
 * Buy on bullish crossover (MACD crosses above signal)
 * Sell on bearish crossover (MACD crosses below signal)
 */
function macdSignals(prices: number[], params: StrategyParams): Signal[] {
  const fastPeriod = params.fastPeriod || 12;
  const slowPeriod = params.slowPeriod || 26;
  const signalPeriod = params.signalPeriod || 9;
  
  const { macd: macdLine, signal: signalLine } = macd(prices, fastPeriod, slowPeriod, signalPeriod);
  
  const signals: Signal[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0 || macdLine[i] === null || signalLine[i] === null ||
        macdLine[i - 1] === null || signalLine[i - 1] === null) {
      signals.push(0);
      continue;
    }
    
    const prevMacd = macdLine[i - 1]!;
    const prevSignal = signalLine[i - 1]!;
    const currMacd = macdLine[i]!;
    const currSignal = signalLine[i]!;
    
    // Bullish crossover
    if (prevMacd <= prevSignal && currMacd > currSignal) {
      signals.push(1);
    }
    // Bearish crossover
    else if (prevMacd >= prevSignal && currMacd < currSignal) {
      signals.push(-1);
    }
    else {
      signals.push(0);
    }
  }
  
  return signals;
}

/**
 * Bollinger Bands Strategy
 * Buy when price touches lower band
 * Sell when price touches upper band
 */
function bollingerSignals(prices: number[], params: StrategyParams): Signal[] {
  const period = params.period || 20;
  const stdDev = params.stdDev || 2;
  
  const { upper, lower } = bollingerBands(prices, period, stdDev);
  
  const signals: Signal[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (upper[i] === null || lower[i] === null) {
      signals.push(0);
      continue;
    }
    
    const price = prices[i];
    const upperBand = upper[i]!;
    const lowerBand = lower[i]!;
    
    // Buy when price is at or below lower band
    if (price <= lowerBand) {
      signals.push(1);
    }
    // Sell when price is at or above upper band
    else if (price >= upperBand) {
      signals.push(-1);
    }
    else {
      signals.push(0);
    }
  }
  
  return signals;
}

/**
 * Strategy configuration for UI
 */
export const strategyConfigs: Record<StrategyType, {
  name: string;
  description: string;
  params: { key: string; label: string; default: number; min: number; max: number }[];
}> = {
  sma_crossover: {
    name: 'SMA Crossover',
    description: 'Buy when fast SMA crosses above slow SMA, sell when it crosses below',
    params: [
      { key: 'fastPeriod', label: 'Fast Period', default: 10, min: 2, max: 50 },
      { key: 'slowPeriod', label: 'Slow Period', default: 50, min: 10, max: 200 },
    ],
  },
  rsi: {
    name: 'RSI',
    description: 'Buy when oversold, sell when overbought',
    params: [
      { key: 'period', label: 'Period', default: 14, min: 2, max: 50 },
      { key: 'oversold', label: 'Oversold Level', default: 30, min: 10, max: 40 },
      { key: 'overbought', label: 'Overbought Level', default: 70, min: 60, max: 90 },
    ],
  },
  macd: {
    name: 'MACD',
    description: 'Buy on bullish crossover, sell on bearish crossover',
    params: [
      { key: 'fastPeriod', label: 'Fast Period', default: 12, min: 2, max: 50 },
      { key: 'slowPeriod', label: 'Slow Period', default: 26, min: 10, max: 100 },
      { key: 'signalPeriod', label: 'Signal Period', default: 9, min: 2, max: 50 },
    ],
  },
  bollinger: {
    name: 'Bollinger Bands',
    description: 'Buy at lower band, sell at upper band',
    params: [
      { key: 'period', label: 'Period', default: 20, min: 5, max: 100 },
      { key: 'stdDev', label: 'Std Deviations', default: 2, min: 1, max: 4 },
    ],
  },
};
