import { Trade, OHLCV } from "./types";

export interface AttributionResult {
  // By timing
  timingAttribution: {
    period: string;
    return: number;
    contribution: number;
  }[];
  
  // By trade
  tradeAttribution: {
    entryDate: string;
    exitDate: string;
    return: number;
    contribution: number;
    holdingDays: number;
  }[];
  
  // Summary stats
  summary: {
    totalReturn: number;
    bestTrade: { date: string; return: number };
    worstTrade: { date: string; return: number };
    avgWinningTrade: number;
    avgLosingTrade: number;
    profitFactor: number;
    avgHoldingPeriod: number;
  };
}

/**
 * Calculate performance attribution from trades
 */
export function calculateAttribution(
  trades: Trade[],
  data: OHLCV[],
  initialCapital: number
): AttributionResult {
  const tradePairs: { buy: Trade; sell: Trade }[] = [];
  
  // Pair up buy and sell trades
  for (let i = 0; i < trades.length - 1; i += 2) {
    if (trades[i].type === "buy" && trades[i + 1]?.type === "sell") {
      tradePairs.push({ buy: trades[i], sell: trades[i + 1] });
    }
  }

  // Calculate return for each trade
  const tradeReturns = tradePairs.map((pair) => {
    const ret = (pair.sell.price - pair.buy.price) / pair.buy.price;
    const buyDate = new Date(pair.buy.date);
    const sellDate = new Date(pair.sell.date);
    const holdingDays = Math.ceil((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      entryDate: pair.buy.date,
      exitDate: pair.sell.date,
      return: ret * 100,
      holdingDays,
      value: pair.buy.value,
    };
  });

  // Calculate contribution (weighted by capital at time of trade)
  let runningCapital = initialCapital;
  const tradeAttribution = tradeReturns.map((trade) => {
    const contribution = (trade.return / 100) * (trade.value / initialCapital) * 100;
    runningCapital *= (1 + trade.return / 100);
    return {
      entryDate: trade.entryDate,
      exitDate: trade.exitDate,
      return: trade.return,
      contribution,
      holdingDays: trade.holdingDays,
    };
  });

  // Calculate timing attribution by month
  const monthlyReturns = new Map<string, { returns: number[]; capital: number }>();
  
  tradeAttribution.forEach((trade) => {
    const month = trade.exitDate.slice(0, 7); // YYYY-MM
    if (!monthlyReturns.has(month)) {
      monthlyReturns.set(month, { returns: [], capital: 0 });
    }
    const monthData = monthlyReturns.get(month)!;
    monthData.returns.push(trade.return);
    monthData.capital += trade.contribution;
  });

  const timingAttribution = Array.from(monthlyReturns.entries())
    .map(([period, data]) => ({
      period,
      return: data.returns.reduce((a, b) => a + b, 0) / data.returns.length,
      contribution: data.capital,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Calculate summary stats
  const winningTrades = tradeAttribution.filter((t) => t.return > 0);
  const losingTrades = tradeAttribution.filter((t) => t.return < 0);
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.return, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.return, 0));
  
  const totalReturn = tradeAttribution.reduce((sum, t) => sum + t.contribution, 0);
  
  const bestTrade = tradeAttribution.length > 0
    ? tradeAttribution.reduce((best, t) => t.return > best.return ? t : best)
    : { entryDate: "", return: 0 };
  
  const worstTrade = tradeAttribution.length > 0
    ? tradeAttribution.reduce((worst, t) => t.return < worst.return ? t : worst)
    : { entryDate: "", return: 0 };

  const summary = {
    totalReturn,
    bestTrade: { date: bestTrade.entryDate, return: bestTrade.return },
    worstTrade: { date: worstTrade.entryDate, return: worstTrade.return },
    avgWinningTrade: winningTrades.length > 0
      ? grossProfit / winningTrades.length
      : 0,
    avgLosingTrade: losingTrades.length > 0
      ? grossLoss / losingTrades.length
      : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avgHoldingPeriod: tradeAttribution.length > 0
      ? tradeAttribution.reduce((sum, t) => sum + t.holdingDays, 0) / tradeAttribution.length
      : 0,
  };

  return {
    timingAttribution,
    tradeAttribution,
    summary,
  };
}

/**
 * Historical scenarios for stress testing
 */
export interface Scenario {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  expectedImpact: string;
}

export const HISTORICAL_SCENARIOS: Scenario[] = [
  {
    name: "2008 Financial Crisis",
    description: "Lehman Brothers collapse and global financial meltdown",
    startDate: "2008-09-01",
    endDate: "2009-03-31",
    expectedImpact: "Severe losses for most assets",
  },
  {
    name: "2020 COVID Crash",
    description: "Pandemic-induced market crash and recovery",
    startDate: "2020-02-19",
    endDate: "2020-04-30",
    expectedImpact: "Sharp decline followed by rapid recovery",
  },
  {
    name: "2022 Rate Hikes",
    description: "Federal Reserve aggressive interest rate increases",
    startDate: "2022-01-01",
    endDate: "2022-12-31",
    expectedImpact: "Tech and growth stocks underperform",
  },
  {
    name: "2018 Crypto Winter",
    description: "Cryptocurrency market crash after 2017 boom",
    startDate: "2018-01-01",
    endDate: "2018-12-31",
    expectedImpact: "Crypto assets down 80%+",
  },
  {
    name: "2015 China Slowdown",
    description: "Chinese market volatility and yuan devaluation",
    startDate: "2015-06-01",
    endDate: "2016-02-28",
    expectedImpact: "Global equity decline",
  },
  {
    name: "2011 Debt Crisis",
    description: "European sovereign debt crisis and US downgrade",
    startDate: "2011-07-01",
    endDate: "2011-10-31",
    expectedImpact: "Flight to safety, equity volatility",
  },
];

export interface ScenarioResult {
  scenario: Scenario;
  return: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
}
