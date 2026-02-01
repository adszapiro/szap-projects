import { OHLCV, Trade, BacktestResult, BacktestConfig, PerformanceMetrics } from './types';
import { generateSignals, Signal } from './strategies';

/**
 * Run a backtest with the given configuration
 */
export function runBacktest(data: OHLCV[], config: BacktestConfig): BacktestResult {
  const signals = generateSignals(data, config.strategy, config.params);
  
  const trades: Trade[] = [];
  const equityCurve: { date: string; value: number }[] = [];
  
  let cash = config.initialCapital;
  let shares = 0;
  let position: 'long' | 'flat' = 'flat';
  let entryDate = '';
  let entryPrice = 0;
  
  // Simulate trading
  for (let i = 0; i < data.length; i++) {
    const bar = data[i];
    const signal = signals[i];
    const price = bar.close;
    
    // Calculate current portfolio value
    const portfolioValue = cash + shares * price;
    equityCurve.push({ date: bar.date, value: portfolioValue });
    
    // Execute signals
    if (signal === 1 && position === 'flat') {
      // Buy signal - go long
      shares = Math.floor(cash / price);
      if (shares > 0) {
        const value = shares * price;
        cash -= value;
        position = 'long';
        entryDate = bar.date;
        entryPrice = price;
        
        trades.push({
          type: 'buy',
          date: bar.date,
          price,
          shares,
          value,
        });
      }
    } else if (signal === -1 && position === 'long') {
      // Sell signal - close position
      const value = shares * price;
      cash += value;
      
      trades.push({
        type: 'sell',
        date: bar.date,
        price,
        shares,
        value,
      });
      
      shares = 0;
      position = 'flat';
    }
  }
  
  // Close any remaining position at end
  if (position === 'long' && shares > 0) {
    const lastBar = data[data.length - 1];
    const value = shares * lastBar.close;
    cash += value;
    
    trades.push({
      type: 'sell',
      date: lastBar.date,
      price: lastBar.close,
      shares,
      value,
    });
    
    shares = 0;
  }
  
  // Update final equity curve value
  if (equityCurve.length > 0) {
    equityCurve[equityCurve.length - 1].value = cash;
  }
  
  // Calculate metrics
  const metrics = calculateMetrics(trades, equityCurve, config.initialCapital);
  
  return {
    trades,
    equityCurve,
    metrics,
    priceData: data,
  };
}

/**
 * Calculate performance metrics
 */
function calculateMetrics(
  trades: Trade[],
  equityCurve: { date: string; value: number }[],
  initialCapital: number
): PerformanceMetrics {
  const finalValue = equityCurve.length > 0 
    ? equityCurve[equityCurve.length - 1].value 
    : initialCapital;
  
  const totalReturn = finalValue - initialCapital;
  const totalReturnPercent = (totalReturn / initialCapital) * 100;
  
  // Calculate max drawdown
  let peak = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  
  for (const point of equityCurve) {
    if (point.value > peak) {
      peak = point.value;
    }
    const drawdown = peak - point.value;
    const drawdownPercent = (drawdown / peak) * 100;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }
  }
  
  // Calculate win rate
  const tradePairs: { buy: Trade; sell: Trade }[] = [];
  for (let i = 0; i < trades.length - 1; i += 2) {
    if (trades[i].type === 'buy' && trades[i + 1]?.type === 'sell') {
      tradePairs.push({ buy: trades[i], sell: trades[i + 1] });
    }
  }
  
  const winningTrades = tradePairs.filter(p => p.sell.price > p.buy.price).length;
  const winRate = tradePairs.length > 0 ? (winningTrades / tradePairs.length) * 100 : 0;
  
  // Calculate average trade duration
  let totalDays = 0;
  for (const pair of tradePairs) {
    const buyDate = new Date(pair.buy.date);
    const sellDate = new Date(pair.sell.date);
    const days = Math.ceil((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
    totalDays += days;
  }
  const avgTradeDuration = tradePairs.length > 0 ? totalDays / tradePairs.length : 0;
  
  // Calculate Sharpe Ratio (simplified - daily returns)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prevValue = equityCurve[i - 1].value;
    const currValue = equityCurve[i].value;
    dailyReturns.push((currValue - prevValue) / prevValue);
  }
  
  let sharpeRatio = 0;
  if (dailyReturns.length > 0) {
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev > 0) {
      // Annualized Sharpe Ratio (assuming 252 trading days)
      sharpeRatio = (avgReturn / stdDev) * Math.sqrt(252);
    }
  }
  
  return {
    totalReturn,
    totalReturnPercent,
    sharpeRatio,
    maxDrawdown,
    maxDrawdownPercent,
    winRate,
    numberOfTrades: tradePairs.length,
    avgTradeDuration,
    initialCapital,
    finalValue,
  };
}
