import { OHLCV } from "./types";
import { calculateReturns, calculateCorrelation } from "./risk";

export interface OptimizationResult {
  weights: { symbol: string; weight: number }[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

export interface EfficientFrontierPoint {
  volatility: number;
  return: number;
  weights: { symbol: string; weight: number }[];
}

/**
 * Calculate mean annual return from daily prices
 */
function calculateMeanReturn(prices: number[]): number {
  const returns = calculateReturns(prices);
  if (returns.length === 0) return 0;
  const dailyMean = returns.reduce((a, b) => a + b, 0) / returns.length;
  return dailyMean * 252; // Annualize
}

/**
 * Calculate annual volatility from daily prices
 */
function calculateAnnualVolatility(prices: number[]): number {
  const returns = calculateReturns(prices);
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  
  return dailyVol * Math.sqrt(252);
}

/**
 * Calculate portfolio return given weights
 */
function portfolioReturn(weights: number[], returns: number[]): number {
  return weights.reduce((sum, w, i) => sum + w * returns[i], 0);
}

/**
 * Calculate portfolio volatility given weights and covariance matrix
 */
function portfolioVolatility(weights: number[], covMatrix: number[][]): number {
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return Math.sqrt(variance);
}

/**
 * Build covariance matrix from price data
 */
function buildCovarianceMatrix(pricesArray: number[][]): number[][] {
  const n = pricesArray.length;
  const returnsArray = pricesArray.map(prices => calculateReturns(prices));
  
  // Find minimum length
  const minLen = Math.min(...returnsArray.map(r => r.length));
  const trimmedReturns = returnsArray.map(r => r.slice(-minLen));
  
  // Calculate means
  const means = trimmedReturns.map(returns => 
    returns.reduce((a, b) => a + b, 0) / returns.length
  );
  
  // Build covariance matrix
  const covMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let cov = 0;
      for (let k = 0; k < minLen; k++) {
        cov += (trimmedReturns[i][k] - means[i]) * (trimmedReturns[j][k] - means[j]);
      }
      covMatrix[i][j] = (cov / minLen) * 252; // Annualize
    }
  }
  
  return covMatrix;
}

/**
 * Generate random weights that sum to 1
 */
function randomWeights(n: number): number[] {
  const weights = Array(n).fill(0).map(() => Math.random());
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

/**
 * Monte Carlo optimization - find optimal portfolio
 */
export function optimizePortfolio(
  assets: { symbol: string; prices: number[] }[],
  numSimulations: number = 5000,
  riskFreeRate: number = 0.04
): {
  maxSharpe: OptimizationResult;
  minVolatility: OptimizationResult;
  efficientFrontier: EfficientFrontierPoint[];
} {
  const n = assets.length;
  
  // Calculate expected returns and covariance
  const expectedReturns = assets.map(a => calculateMeanReturn(a.prices));
  const covMatrix = buildCovarianceMatrix(assets.map(a => a.prices));
  
  let maxSharpe: OptimizationResult = {
    weights: [],
    expectedReturn: 0,
    volatility: Infinity,
    sharpeRatio: -Infinity,
  };
  
  let minVolatility: OptimizationResult = {
    weights: [],
    expectedReturn: 0,
    volatility: Infinity,
    sharpeRatio: -Infinity,
  };
  
  const allResults: EfficientFrontierPoint[] = [];
  
  // Run Monte Carlo simulations
  for (let sim = 0; sim < numSimulations; sim++) {
    const weights = randomWeights(n);
    
    const ret = portfolioReturn(weights, expectedReturns);
    const vol = portfolioVolatility(weights, covMatrix);
    const sharpe = vol > 0 ? (ret - riskFreeRate) / vol : 0;
    
    const result: EfficientFrontierPoint = {
      volatility: vol * 100,
      return: ret * 100,
      weights: assets.map((a, i) => ({ symbol: a.symbol, weight: weights[i] })),
    };
    
    allResults.push(result);
    
    // Track max Sharpe
    if (sharpe > maxSharpe.sharpeRatio) {
      maxSharpe = {
        weights: result.weights,
        expectedReturn: ret * 100,
        volatility: vol * 100,
        sharpeRatio: sharpe,
      };
    }
    
    // Track min volatility
    if (vol < minVolatility.volatility) {
      minVolatility = {
        weights: result.weights,
        expectedReturn: ret * 100,
        volatility: vol * 100,
        sharpeRatio: sharpe,
      };
    }
  }
  
  // Build efficient frontier (filter to only efficient portfolios)
  const sortedByVol = [...allResults].sort((a, b) => a.volatility - b.volatility);
  const efficientFrontier: EfficientFrontierPoint[] = [];
  let maxReturnSoFar = -Infinity;
  
  for (const point of sortedByVol) {
    if (point.return >= maxReturnSoFar) {
      efficientFrontier.push(point);
      maxReturnSoFar = point.return;
    }
  }
  
  return {
    maxSharpe,
    minVolatility,
    efficientFrontier,
  };
}

/**
 * Equal weight portfolio
 */
export function equalWeightPortfolio(
  assets: { symbol: string; prices: number[] }[]
): OptimizationResult {
  const n = assets.length;
  const weight = 1 / n;
  
  const expectedReturns = assets.map(a => calculateMeanReturn(a.prices));
  const covMatrix = buildCovarianceMatrix(assets.map(a => a.prices));
  const weights = Array(n).fill(weight);
  
  const ret = portfolioReturn(weights, expectedReturns);
  const vol = portfolioVolatility(weights, covMatrix);
  const sharpe = vol > 0 ? (ret - 0.04) / vol : 0;
  
  return {
    weights: assets.map(a => ({ symbol: a.symbol, weight })),
    expectedReturn: ret * 100,
    volatility: vol * 100,
    sharpeRatio: sharpe,
  };
}

/**
 * Risk parity portfolio (equal risk contribution)
 */
export function riskParityPortfolio(
  assets: { symbol: string; prices: number[] }[]
): OptimizationResult {
  const n = assets.length;
  
  // Calculate individual volatilities
  const volatilities = assets.map(a => calculateAnnualVolatility(a.prices));
  
  // Inverse volatility weighting
  const invVols = volatilities.map(v => v > 0 ? 1 / v : 0);
  const sumInvVols = invVols.reduce((a, b) => a + b, 0);
  const weights = invVols.map(iv => sumInvVols > 0 ? iv / sumInvVols : 1 / n);
  
  const expectedReturns = assets.map(a => calculateMeanReturn(a.prices));
  const covMatrix = buildCovarianceMatrix(assets.map(a => a.prices));
  
  const ret = portfolioReturn(weights, expectedReturns);
  const vol = portfolioVolatility(weights, covMatrix);
  const sharpe = vol > 0 ? (ret - 0.04) / vol : 0;
  
  return {
    weights: assets.map((a, i) => ({ symbol: a.symbol, weight: weights[i] })),
    expectedReturn: ret * 100,
    volatility: vol * 100,
    sharpeRatio: sharpe,
  };
}
