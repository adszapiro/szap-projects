// Trading Bot Types

export interface Strategy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  symbol: string;
  side: "long" | "short" | "both";
  positionSize: number; // Percentage of portfolio (0-100)
  maxPositionSize: number; // Max dollar amount
  stopLoss?: number; // Percentage
  takeProfit?: number; // Percentage
  code: string; // Strategy code (JavaScript)
}

export interface Signal {
  type: "buy" | "sell" | "hold";
  symbol: string;
  price: number;
  timestamp: string;
  confidence: number; // 0-1
  reason: string;
  strategyId: string;
}

export interface TradeLog {
  id: string;
  timestamp: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  pnl?: number;
  pnlPercent?: number;
  strategyId: string;
  status: "pending" | "filled" | "cancelled" | "failed";
  orderId?: string;
}

export interface PortfolioSnapshot {
  timestamp: string;
  portfolioValue: number;
  cash: number;
  equity: number;
  buyingPower: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  totalPnl: number;
  totalPnlPercent: number;
}

export interface BotConfig {
  enabled: boolean;
  tradingHoursOnly: boolean;
  maxDailyLoss: number; // Percentage
  maxDailyTrades: number;
  paperTrading: boolean;
}

export interface BotStatus {
  isRunning: boolean;
  lastHeartbeat: string;
  activeStrategies: number;
  openPositions: number;
  todaysTrades: number;
  todaysPnl: number;
  isMarketOpen: boolean;
  nextMarketOpen?: string;
  nextMarketClose?: string;
}

// Default strategies
export const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: "sma-crossover",
    name: "SMA Crossover",
    description: "Buy when 20 SMA crosses above 50 SMA, sell when it crosses below",
    enabled: false,
    symbol: "SPY",
    side: "long",
    positionSize: 10,
    maxPositionSize: 10000,
    stopLoss: 2,
    takeProfit: 5,
    code: `
// SMA Crossover Strategy
function generateSignal(data, position) {
  const sma20 = SMA(data.close, 20);
  const sma50 = SMA(data.close, 50);
  
  const current20 = sma20[sma20.length - 1];
  const prev20 = sma20[sma20.length - 2];
  const current50 = sma50[sma50.length - 1];
  const prev50 = sma50[sma50.length - 2];
  
  // Golden cross (buy signal)
  if (prev20 < prev50 && current20 > current50) {
    return { type: 'buy', confidence: 0.8, reason: 'Golden cross detected' };
  }
  
  // Death cross (sell signal)
  if (prev20 > prev50 && current20 < current50) {
    return { type: 'sell', confidence: 0.8, reason: 'Death cross detected' };
  }
  
  return { type: 'hold', confidence: 0.5, reason: 'No crossover' };
}
    `.trim(),
  },
  {
    id: "rsi-mean-reversion",
    name: "RSI Mean Reversion",
    description: "Buy when RSI < 30 (oversold), sell when RSI > 70 (overbought)",
    enabled: false,
    symbol: "AAPL",
    side: "both",
    positionSize: 5,
    maxPositionSize: 5000,
    stopLoss: 3,
    takeProfit: 6,
    code: `
// RSI Mean Reversion Strategy
function generateSignal(data, position) {
  const rsi = RSI(data.close, 14);
  const currentRSI = rsi[rsi.length - 1];
  
  // Oversold - buy
  if (currentRSI < 30) {
    return { 
      type: 'buy', 
      confidence: (30 - currentRSI) / 30, 
      reason: 'RSI oversold at ' + currentRSI.toFixed(1) 
    };
  }
  
  // Overbought - sell
  if (currentRSI > 70) {
    return { 
      type: 'sell', 
      confidence: (currentRSI - 70) / 30, 
      reason: 'RSI overbought at ' + currentRSI.toFixed(1) 
    };
  }
  
  return { type: 'hold', confidence: 0.5, reason: 'RSI neutral at ' + currentRSI.toFixed(1) };
}
    `.trim(),
  },
  {
    id: "momentum",
    name: "Momentum",
    description: "Buy strong upward momentum, sell on momentum loss",
    enabled: false,
    symbol: "QQQ",
    side: "long",
    positionSize: 15,
    maxPositionSize: 15000,
    stopLoss: 2.5,
    takeProfit: 7,
    code: `
// Momentum Strategy
function generateSignal(data, position) {
  const closes = data.close;
  const len = closes.length;
  
  // Calculate 10-day momentum
  const momentum = (closes[len-1] - closes[len-11]) / closes[len-11] * 100;
  
  // Calculate 5-day rate of change
  const roc5 = (closes[len-1] - closes[len-6]) / closes[len-6] * 100;
  
  // Strong upward momentum
  if (momentum > 3 && roc5 > 1.5) {
    return { 
      type: 'buy', 
      confidence: Math.min(momentum / 10, 1), 
      reason: 'Strong momentum: ' + momentum.toFixed(2) + '%' 
    };
  }
  
  // Momentum loss
  if (momentum < -2 || roc5 < -1) {
    return { 
      type: 'sell', 
      confidence: Math.min(Math.abs(momentum) / 10, 1), 
      reason: 'Momentum loss: ' + momentum.toFixed(2) + '%' 
    };
  }
  
  return { type: 'hold', confidence: 0.5, reason: 'Momentum neutral' };
}
    `.trim(),
  },
];
