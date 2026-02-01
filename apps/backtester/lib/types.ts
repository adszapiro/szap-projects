// Core data types for the backtester

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  type: 'buy' | 'sell';
  date: string;
  price: number;
  shares: number;
  value: number;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: { date: string; value: number }[];
  metrics: PerformanceMetrics;
  priceData: OHLCV[];
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  winRate: number;
  numberOfTrades: number;
  avgTradeDuration: number;
  initialCapital: number;
  finalValue: number;
}

export interface StrategyParams {
  [key: string]: number;
}

export type StrategyType = 'sma_crossover' | 'rsi' | 'macd' | 'bollinger';

export interface BacktestConfig {
  symbol: string;
  assetType: 'stock' | 'crypto';
  strategy: StrategyType;
  params: StrategyParams;
  startDate: string;
  endDate: string;
  initialCapital: number;
}
