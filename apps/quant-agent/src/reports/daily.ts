import { getSupabase, log, getTodaysTrades, getRecentTrades, AssetClass } from "../db.js";
import { getSimulatedAccountValue } from "../simulator.js";
import { getLearningStats } from "../tournament/learner.js";
import { getStrategyRankings } from "../bandit/thompson.js";

// Lazy initialization to avoid module-level supabase creation
const getDb = () => getSupabase();

export interface DailySummary {
  date: string;
  portfolioValue: number;
  cashBalance: number;
  totalPnl: number;
  dayPnl: number;
  dayPnlPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  bestTrade: {
    symbol: string;
    pnl: number;
  } | null;
  worstTrade: {
    symbol: string;
    pnl: number;
  } | null;
  topStrategy: {
    name: string;
    winRate: number;
    pnl: number;
  } | null;
  assetBreakdown: {
    stocks: { trades: number; pnl: number };
    crypto: { trades: number; pnl: number };
  };
  convergenceScore: number;
}

export async function generateDailySummary(): Promise<DailySummary> {
  const today = new Date().toISOString().split("T")[0];
  
  // Get account value
  const accountValue = await getSimulatedAccountValue();
  
  // Get today's trades
  const todayTrades = await getTodaysTrades();
  
  // Get all-time trades for context
  const allTrades = await getRecentTrades(1000);
  
  // Calculate today's metrics
  const dayPnl = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalPnl = allTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const dayPnlPercent = (dayPnl / accountValue.totalValue) * 100;
  
  // Win/loss
  const winningTrades = todayTrades.filter(t => t.pnl && t.pnl > 0).length;
  const losingTrades = todayTrades.filter(t => t.pnl && t.pnl < 0).length;
  const winRate = todayTrades.length > 0 ? (winningTrades / todayTrades.length) * 100 : 0;
  
  // Best and worst trades
  const sortedByPnl = todayTrades.filter(t => t.pnl !== null).sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
  const bestTrade = sortedByPnl.length > 0 
    ? { symbol: sortedByPnl[0].symbol, pnl: sortedByPnl[0].pnl || 0 }
    : null;
  const worstTrade = sortedByPnl.length > 0
    ? { symbol: sortedByPnl[sortedByPnl.length - 1].symbol, pnl: sortedByPnl[sortedByPnl.length - 1].pnl || 0 }
    : null;
  
  // Asset breakdown
  const stockTrades = todayTrades.filter(t => t.asset_class === "stock");
  const cryptoTrades = todayTrades.filter(t => t.asset_class === "crypto");
  
  const assetBreakdown = {
    stocks: {
      trades: stockTrades.length,
      pnl: stockTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    },
    crypto: {
      trades: cryptoTrades.length,
      pnl: cryptoTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    },
  };
  
  // Get strategy rankings
  const rankings = await getStrategyRankings();
  const stats = await getLearningStats();
  
  // Get strategy names
  const topRanking = rankings[0];
  let topStrategy = null;
  
  if (topRanking) {
    const { data: strategyData } = await getDb()
      .from("strategies")
      .select("name")
      .eq("id", topRanking.strategyId)
      .single();
    
    topStrategy = {
      name: strategyData?.name || topRanking.strategyId.slice(0, 8),
      winRate: topRanking.expectedWinRate * 100,
      pnl: topRanking.totalPnl,
    };
  }
  
  return {
    date: today,
    portfolioValue: accountValue.totalValue,
    cashBalance: accountValue.cash,
    totalPnl,
    dayPnl,
    dayPnlPercent,
    totalTrades: todayTrades.length,
    winningTrades,
    losingTrades,
    winRate,
    bestTrade,
    worstTrade,
    topStrategy,
    assetBreakdown,
    convergenceScore: stats.convergenceScore,
  };
}

export async function saveDailyReport(summary: DailySummary): Promise<void> {
  const { error } = await getDb().from("daily_reports").upsert({
    date: summary.date,
    portfolio_value: summary.portfolioValue,
    cash_balance: summary.cashBalance,
    total_pnl: summary.totalPnl,
    day_pnl: summary.dayPnl,
    day_pnl_percent: summary.dayPnlPercent,
    total_trades: summary.totalTrades,
    winning_trades: summary.winningTrades,
    losing_trades: summary.losingTrades,
    win_rate: summary.winRate,
    best_trade: summary.bestTrade,
    worst_trade: summary.worstTrade,
    top_strategy: summary.topStrategy,
    asset_breakdown: summary.assetBreakdown,
    convergence_score: summary.convergenceScore,
  }, { onConflict: "date" });
  
  if (error) {
    console.error("Failed to save daily report:", error);
    throw error;
  }
}

export function formatDailySummary(summary: DailySummary): string {
  const isPositive = summary.dayPnl >= 0;
  const emoji = isPositive ? "📈" : "📉";
  const pnlSign = isPositive ? "+" : "";
  
  let report = `\n${emoji} DAILY TRADING SUMMARY - ${summary.date}\n`;
  report += "═══════════════════════════════════════════════\n\n";
  
  report += "💰 PORTFOLIO STATUS\n";
  report += `   Portfolio Value: $${summary.portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n`;
  report += `   Cash Balance: $${summary.cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n`;
  report += `   Today's P&L: ${pnlSign}$${summary.dayPnl.toFixed(2)} (${pnlSign}${summary.dayPnlPercent.toFixed(2)}%)\n`;
  report += `   All-Time P&L: ${summary.totalPnl >= 0 ? "+" : ""}$${summary.totalPnl.toFixed(2)}\n\n`;
  
  report += "📊 TODAY'S ACTIVITY\n";
  report += `   Total Trades: ${summary.totalTrades}\n`;
  report += `   Winning: ${summary.winningTrades} | Losing: ${summary.losingTrades}\n`;
  report += `   Win Rate: ${summary.winRate.toFixed(1)}%\n\n`;
  
  report += "📈 ASSET BREAKDOWN\n";
  report += `   Stocks: ${summary.assetBreakdown.stocks.trades} trades, `;
  report += `P&L: ${summary.assetBreakdown.stocks.pnl >= 0 ? "+" : ""}$${summary.assetBreakdown.stocks.pnl.toFixed(2)}\n`;
  report += `   Crypto: ${summary.assetBreakdown.crypto.trades} trades, `;
  report += `P&L: ${summary.assetBreakdown.crypto.pnl >= 0 ? "+" : ""}$${summary.assetBreakdown.crypto.pnl.toFixed(2)}\n\n`;
  
  if (summary.bestTrade) {
    report += "🏆 NOTABLE TRADES\n";
    report += `   Best: ${summary.bestTrade.symbol} (+$${summary.bestTrade.pnl.toFixed(2)})\n`;
    if (summary.worstTrade && summary.worstTrade.pnl < 0) {
      report += `   Worst: ${summary.worstTrade.symbol} ($${summary.worstTrade.pnl.toFixed(2)})\n`;
    }
    report += "\n";
  }
  
  if (summary.topStrategy) {
    report += "🎯 TOP STRATEGY\n";
    report += `   ${summary.topStrategy.name}\n`;
    report += `   Win Rate: ${summary.topStrategy.winRate.toFixed(1)}%\n`;
    report += `   Total P&L: ${summary.topStrategy.pnl >= 0 ? "+" : ""}$${summary.topStrategy.pnl.toFixed(2)}\n\n`;
  }
  
  report += `🔬 System Convergence: ${(summary.convergenceScore * 100).toFixed(1)}%\n`;
  report += "═══════════════════════════════════════════════\n";
  
  return report;
}

export async function runDailyReportCycle(): Promise<void> {
  console.log("\n📋 Generating daily summary report...");
  
  try {
    const summary = await generateDailySummary();
    await saveDailyReport(summary);
    
    const formattedReport = formatDailySummary(summary);
    console.log(formattedReport);
    
    await log("info", "daily_report_generated", {
      date: summary.date,
      portfolioValue: summary.portfolioValue,
      dayPnl: summary.dayPnl,
      totalTrades: summary.totalTrades,
      winRate: summary.winRate,
    });
    
    console.log("✅ Daily report saved to database\n");
  } catch (error) {
    console.error("❌ Failed to generate daily report:", error);
    await log("error", "daily_report_failed", { error: String(error) });
  }
}
