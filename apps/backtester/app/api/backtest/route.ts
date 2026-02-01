import { NextRequest, NextResponse } from "next/server";

// Helper functions for strategy execution
function SMA(arr: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = arr.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

function EMA(arr: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < arr.length; i++) {
    if (i === 0) {
      result.push(arr[0]);
    } else {
      result.push((arr[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

function RSI(arr: number[], period: number): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < arr.length; i++) {
    if (i === 0) {
      result.push(50);
      continue;
    }
    
    const change = arr[i] - arr[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
    
    if (i < period) {
      result.push(50);
    } else {
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  date: string;
  type: "buy" | "sell";
  price: number;
  shares: number;
  value: number;
  reason: string;
}

interface BacktestResult {
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  trades: Trade[];
}

// Execute a strategy string and return signal
function executeStrategy(
  code: string,
  data: { close: number[]; high: number[]; low: number[]; open: number[]; volume: number[] },
  position: { qty: number; avgEntryPrice: number; side: string } | null
): { type: "buy" | "sell" | "hold"; confidence: number; reason: string } {
  try {
    const strategyFn = new Function("data", "position", "SMA", "EMA", "RSI", `
      ${code}
      return generateSignal(data, position);
    `);
    
    return strategyFn(data, position, SMA, EMA, RSI);
  } catch (error) {
    return { type: "hold", confidence: 0, reason: `Error: ${error}` };
  }
}

// Run backtest
function runBacktest(
  strategyCode: string,
  data: OHLCV[],
  initialCapital: number = 100000
): BacktestResult {
  let capital = initialCapital;
  let shares = 0;
  let avgEntryPrice = 0;
  const trades: Trade[] = [];
  const dailyReturns: number[] = [];
  let prevCapital = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;

  for (let i = 50; i < data.length; i++) {
    // Prepare data up to current point
    const historicalData = {
      close: data.slice(0, i + 1).map(d => d.close),
      high: data.slice(0, i + 1).map(d => d.high),
      low: data.slice(0, i + 1).map(d => d.low),
      open: data.slice(0, i + 1).map(d => d.open),
      volume: data.slice(0, i + 1).map(d => d.volume),
    };

    const position = shares > 0
      ? { qty: shares, avgEntryPrice, side: "long" }
      : null;

    const signal = executeStrategy(strategyCode, historicalData, position);
    const currentPrice = data[i].close;

    // Execute signal
    if (signal.type === "buy" && shares === 0 && signal.confidence >= 0.5) {
      const sharesToBuy = Math.floor(capital * 0.95 / currentPrice);
      if (sharesToBuy > 0) {
        shares = sharesToBuy;
        avgEntryPrice = currentPrice;
        capital -= shares * currentPrice;
        trades.push({
          date: data[i].date,
          type: "buy",
          price: currentPrice,
          shares,
          value: shares * currentPrice,
          reason: signal.reason,
        });
      }
    } else if (signal.type === "sell" && shares > 0 && signal.confidence >= 0.5) {
      const saleValue = shares * currentPrice;
      capital += saleValue;
      trades.push({
        date: data[i].date,
        type: "sell",
        price: currentPrice,
        shares,
        value: saleValue,
        reason: signal.reason,
      });
      shares = 0;
      avgEntryPrice = 0;
    }

    // Track daily returns
    const totalValue = capital + shares * currentPrice;
    const dailyReturn = (totalValue - prevCapital) / prevCapital;
    dailyReturns.push(dailyReturn);
    prevCapital = totalValue;

    // Track drawdown
    if (totalValue > peak) peak = totalValue;
    const drawdown = (peak - totalValue) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Close any open position at end
  if (shares > 0) {
    const finalPrice = data[data.length - 1].close;
    capital += shares * finalPrice;
    trades.push({
      date: data[data.length - 1].date,
      type: "sell",
      price: finalPrice,
      shares,
      value: shares * finalPrice,
      reason: "End of backtest",
    });
    shares = 0;
  }

  // Calculate metrics
  const totalReturn = capital - initialCapital;
  const totalReturnPercent = (totalReturn / initialCapital) * 100;

  // Sharpe ratio
  const avgReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
    : 0;
  const stdReturn = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / dailyReturns.length)
    : 0;
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  // Win rate
  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  for (let i = 0; i < trades.length - 1; i += 2) {
    if (trades[i].type === "buy" && trades[i + 1]?.type === "sell") {
      const pnl = trades[i + 1].value - trades[i].value;
      if (pnl > 0) {
        wins++;
        grossProfit += pnl;
      } else {
        losses++;
        grossLoss += Math.abs(pnl);
      }
    }
  }

  const winRate = wins + losses > 0 ? wins / (wins + losses) : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  return {
    initialCapital,
    finalCapital: capital,
    totalReturn,
    totalReturnPercent,
    sharpeRatio,
    maxDrawdown: maxDrawdown * 100,
    winRate: winRate * 100,
    totalTrades: Math.floor(trades.length / 2),
    profitFactor,
    trades,
  };
}

// Fetch data from Yahoo Finance
async function fetchData(symbol: string, startDate: string, endDate: string): Promise<OHLCV[]> {
  const start = Math.floor(new Date(startDate).getTime() / 1000);
  const end = Math.floor(new Date(endDate).getTime() / 1000);
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d`;
  
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  
  if (!response.ok) throw new Error(`Failed to fetch data for ${symbol}`);
  
  const json = await response.json();
  const result = json.chart.result[0];
  
  if (!result?.timestamp) throw new Error("No data returned");
  
  const data: OHLCV[] = [];
  const quotes = result.indicators.quote[0];
  
  for (let i = 0; i < result.timestamp.length; i++) {
    if (quotes.close[i] !== null) {
      data.push({
        date: new Date(result.timestamp[i] * 1000).toISOString().split("T")[0],
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i] || 0,
      });
    }
  }
  
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategyCode, symbol = "SPY", startDate, endDate, initialCapital = 100000 } = body;

    if (!strategyCode) {
      return NextResponse.json({ error: "Missing strategyCode" }, { status: 400 });
    }

    // Default to last year if dates not provided
    const end = endDate || new Date().toISOString().split("T")[0];
    const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Fetch data
    const data = await fetchData(symbol, start, end);
    
    if (data.length < 60) {
      return NextResponse.json({ error: "Not enough data points" }, { status: 400 });
    }

    // Run backtest
    const result = runBacktest(strategyCode, data, initialCapital);

    return NextResponse.json({
      success: true,
      symbol,
      startDate: start,
      endDate: end,
      dataPoints: data.length,
      result,
    });
  } catch (error) {
    console.error("Backtest error:", error);
    return NextResponse.json(
      { error: "Backtest failed", message: String(error) },
      { status: 500 }
    );
  }
}
