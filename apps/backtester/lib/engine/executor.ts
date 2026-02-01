import { OHLCV, BacktestResult, PerformanceMetrics, Trade } from "../types";
import { createTradingContext, createIndicatorFunctions } from "./context";

export interface ExecutionResult {
  success: boolean;
  result?: BacktestResult;
  error?: string;
}

/**
 * Execute a user-defined strategy on historical data
 */
export function executeStrategy(
  code: string,
  data: OHLCV[],
  initialCapital: number
): ExecutionResult {
  try {
    // Create trading context
    const context = createTradingContext(data, initialCapital);
    const indicators = createIndicatorFunctions();

    // Create a function from the code
    // The code should define a function called 'strategy'
    const wrappedCode = `
      ${code}
      
      if (typeof strategy === 'function') {
        strategy(data, indicators, context);
      } else {
        throw new Error('No strategy function defined');
      }
    `;

    // Execute the code in a limited context
    // Note: This is not a true sandbox, but provides some isolation
    const executeFn = new Function("data", "indicators", "context", wrappedCode);
    executeFn(data, indicators, context);

    // Close any remaining position
    if (context.position && context.shares > 0) {
      context.sell(data.length - 1);
    }

    // Calculate equity curve
    const equityCurve = calculateEquityCurve(data, context.trades, initialCapital);

    // Calculate performance metrics
    const metrics = calculateMetrics(context.trades, equityCurve, initialCapital);

    return {
      success: true,
      result: {
        trades: context.trades,
        equityCurve,
        metrics,
        priceData: data,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Strategy execution failed",
    };
  }
}

function calculateEquityCurve(
  data: OHLCV[],
  trades: Trade[],
  initialCapital: number
): { date: string; value: number }[] {
  const curve: { date: string; value: number }[] = [];
  let cash = initialCapital;
  let shares = 0;
  let tradeIndex = 0;

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];

    // Process any trades on this date
    while (tradeIndex < trades.length && trades[tradeIndex].date === bar.date) {
      const trade = trades[tradeIndex];
      if (trade.type === "buy") {
        cash -= trade.value;
        shares = trade.shares;
      } else {
        cash += trade.value;
        shares = 0;
      }
      tradeIndex++;
    }

    // Calculate portfolio value
    const portfolioValue = cash + shares * bar.close;
    curve.push({ date: bar.date, value: portfolioValue });
  }

  return curve;
}

function calculateMetrics(
  trades: Trade[],
  equityCurve: { date: string; value: number }[],
  initialCapital: number
): PerformanceMetrics {
  const finalValue =
    equityCurve.length > 0
      ? equityCurve[equityCurve.length - 1].value
      : initialCapital;

  const totalReturn = finalValue - initialCapital;
  const totalReturnPercent = (totalReturn / initialCapital) * 100;

  // Max drawdown
  let peak = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  for (const point of equityCurve) {
    if (point.value > peak) peak = point.value;
    const drawdown = peak - point.value;
    const drawdownPercent = (drawdown / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }
  }

  // Win rate
  const tradePairs: { buy: Trade; sell: Trade }[] = [];
  for (let i = 0; i < trades.length - 1; i += 2) {
    if (trades[i].type === "buy" && trades[i + 1]?.type === "sell") {
      tradePairs.push({ buy: trades[i], sell: trades[i + 1] });
    }
  }

  const winningTrades = tradePairs.filter(
    (p) => p.sell.price > p.buy.price
  ).length;
  const winRate =
    tradePairs.length > 0 ? (winningTrades / tradePairs.length) * 100 : 0;

  // Average trade duration
  let totalDays = 0;
  for (const pair of tradePairs) {
    const buyDate = new Date(pair.buy.date);
    const sellDate = new Date(pair.sell.date);
    totalDays += Math.ceil(
      (sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }
  const avgTradeDuration =
    tradePairs.length > 0 ? totalDays / tradePairs.length : 0;

  // Sharpe ratio
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prevValue = equityCurve[i - 1].value;
    const currValue = equityCurve[i].value;
    dailyReturns.push((currValue - prevValue) / prevValue);
  }

  let sharpeRatio = 0;
  if (dailyReturns.length > 0) {
    const avgReturn =
      dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      dailyReturns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 0) {
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
