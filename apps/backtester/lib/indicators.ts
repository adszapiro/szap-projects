// Technical Indicators Library

/**
 * Simple Moving Average (SMA)
 * Average of closing prices over a period
 */
export function sma(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  
  return result;
}

/**
 * Exponential Moving Average (EMA)
 * Weighted average giving more weight to recent prices
 */
export function ema(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  let previousEma = 0;
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First EMA is the SMA
      const slice = prices.slice(0, period);
      const sum = slice.reduce((a, b) => a + b, 0);
      previousEma = sum / period;
      result.push(previousEma);
    } else {
      // EMA = (Close - Previous EMA) * multiplier + Previous EMA
      const newEma: number = (prices[i] - previousEma) * multiplier + previousEma;
      result.push(newEma);
      previousEma = newEma;
    }
  }
  
  return result;
}

/**
 * Relative Strength Index (RSI)
 * Momentum oscillator measuring speed and magnitude of price changes
 * Values range from 0 to 100
 */
export function rsi(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // First value is null (no previous price)
  result.push(null);
  
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First RSI uses simple average
      const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    } else {
      // Subsequent RSI uses smoothed average
      const prevRsi = result[result.length - 1];
      if (prevRsi === null) {
        result.push(null);
        continue;
      }
      
      // Get previous averages from RS calculation
      const sliceStart = i - period + 1;
      const avgGain = gains.slice(sliceStart, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(sliceStart, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * Trend-following momentum indicator
 */
export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function macd(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const fastEma = ema(prices, fastPeriod);
  const slowEma = ema(prices, slowPeriod);
  
  // MACD Line = Fast EMA - Slow EMA
  const macdLine: (number | null)[] = fastEma.map((fast, i) => {
    const slow = slowEma[i];
    if (fast === null || slow === null) return null;
    return fast - slow;
  });
  
  // Signal Line = EMA of MACD Line
  const validMacd = macdLine.filter((v): v is number => v !== null);
  const signalEma = ema(validMacd, signalPeriod);
  
  // Map signal back to full length
  const signalLine: (number | null)[] = [];
  let signalIndex = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null) {
      signalLine.push(null);
    } else {
      signalLine.push(signalEma[signalIndex] ?? null);
      signalIndex++;
    }
  }
  
  // Histogram = MACD Line - Signal Line
  const histogram: (number | null)[] = macdLine.map((m, i) => {
    const s = signalLine[i];
    if (m === null || s === null) return null;
    return m - s;
  });
  
  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Bollinger Bands
 * Volatility indicator with upper and lower bands
 */
export interface BollingerResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function bollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerResult {
  const middle = sma(prices, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      // Calculate standard deviation
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = middle[i]!;
      const squaredDiffs = slice.map(p => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const sd = Math.sqrt(variance);
      
      upper.push(mean + stdDev * sd);
      lower.push(mean - stdDev * sd);
    }
  }
  
  return { upper, middle, lower };
}
