import { config } from "dotenv";
config({ path: ".env.local" });

import cron from "node-cron";
import { debateStrategy, analyzeAndLearn, validateStrategy } from "./brain/orchestrator.js";
import {
  saveStrategy,
  updateStrategyStatus,
  getActiveStrategies,
  getRecentTrades,
  getTodaysTrades,
  saveDailySnapshot,
  log,
} from "./db.js";
import {
  getAccount,
  getPositions,
  getBars,
  isMarketOpen,
  placeOrder,
  calculatePositionSize,
} from "./executor.js";

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

// Execute a strategy and return signal
function executeStrategy(
  code: string,
  data: { close: number[]; high: number[]; low: number[]; open: number[]; volume: number[] },
  position: { qty: number; avgEntryPrice: number; side: string } | null
): { type: "buy" | "sell" | "hold"; confidence: number; reason: string } {
  try {
    // Create function from code string
    const strategyFn = new Function("data", "position", "SMA", "EMA", "RSI", `
      ${code}
      return generateSignal(data, position);
    `);
    
    return strategyFn(data, position, SMA, EMA, RSI);
  } catch (error) {
    console.error("Strategy execution error:", error);
    return { type: "hold", confidence: 0, reason: `Error: ${error}` };
  }
}

// Main agent loop
async function runAgentCycle(): Promise<void> {
  const cycleStart = Date.now();
  
  try {
    await log("info", "cycle_started", { timestamp: new Date().toISOString() });
    
    // Check if agent is enabled
    if (process.env.AGENT_ENABLED !== "true") {
      await log("info", "agent_disabled", {});
      return;
    }
    
    // Check market status
    const marketOpen = await isMarketOpen();
    if (!marketOpen) {
      await log("info", "market_closed", {});
      
      // If market just closed, run end-of-day analysis
      const now = new Date();
      if (now.getHours() === 16 && now.getMinutes() < 30) {
        await runEndOfDayAnalysis();
      }
      return;
    }
    
    // Get account status
    const account = await getAccount();
    const dailyPnl = account.equity - account.last_equity;
    const dailyPnlPercent = (dailyPnl / account.last_equity) * 100;
    
    // Check daily loss guardrail
    const maxDailyLoss = parseFloat(process.env.AGENT_MAX_DAILY_LOSS_PERCENT || "5");
    if (dailyPnlPercent < -maxDailyLoss) {
      await log("warning", "daily_loss_limit_hit", { dailyPnlPercent, maxDailyLoss });
      return;
    }
    
    // Get current positions
    const positions = await getPositions();
    await log("info", "positions_checked", { count: positions.length, positions: positions.map(p => p.symbol) });
    
    // Get active strategies
    const strategies = await getActiveStrategies();
    
    if (strategies.length === 0) {
      // No active strategies - generate new ones
      await log("info", "no_strategies", { action: "generating_new" });
      await generateNewStrategy();
      return;
    }
    
    // Execute each active strategy
    for (const strategy of strategies) {
      try {
        // Get market data for the strategy's symbol (default to SPY)
        const symbol = "SPY"; // TODO: Extract from strategy
        const data = await getBars(symbol, "1Day", 60);
        
        // Check if we have a position
        const position = positions.find(p => p.symbol === symbol);
        const positionInfo = position
          ? {
              qty: parseFloat(position.qty),
              avgEntryPrice: parseFloat(position.avg_entry_price),
              side: position.side,
            }
          : null;
        
        // Execute strategy
        const signal = executeStrategy(strategy.code, data, positionInfo);
        
        await log("decision", "signal_generated", {
          strategy_id: strategy.id,
          strategy_name: strategy.name,
          symbol,
          signal,
        });
        
        // Act on signal
        if (signal.type !== "hold" && signal.confidence >= 0.7) {
          const minSharpe = parseFloat(process.env.AGENT_MIN_SHARPE || "1.0");
          
          // Check if we should trade
          if (signal.type === "buy" && !positionInfo) {
            const qty = await calculatePositionSize(symbol, 10);
            if (qty > 0) {
              await placeOrder({
                symbol,
                qty,
                side: "buy",
                strategy_id: strategy.id,
                reasoning: signal.reason,
              });
            }
          } else if (signal.type === "sell" && positionInfo) {
            await placeOrder({
              symbol,
              qty: positionInfo.qty,
              side: "sell",
              strategy_id: strategy.id,
              reasoning: signal.reason,
            });
          }
        }
      } catch (error) {
        await log("error", "strategy_execution_failed", {
          strategy_id: strategy.id,
          error: String(error),
        });
      }
    }
    
    const cycleDuration = Date.now() - cycleStart;
    await log("info", "cycle_completed", { duration_ms: cycleDuration });
    
  } catch (error) {
    await log("error", "cycle_failed", { error: String(error) });
  }
}

// Generate a new strategy via model debate
async function generateNewStrategy(): Promise<void> {
  try {
    await log("info", "strategy_generation_started", {});
    
    // Get market context
    const spyData = await getBars("SPY", "1Day", 30);
    const lastPrice = spyData.close[spyData.close.length - 1];
    const priceChange = ((lastPrice - spyData.close[0]) / spyData.close[0]) * 100;
    
    const marketContext = `
SPY is ${priceChange > 0 ? "up" : "down"} ${Math.abs(priceChange).toFixed(2)}% over the last 30 days.
Current price: $${lastPrice.toFixed(2)}
Recent volatility: ${calculateVolatility(spyData.close).toFixed(2)}%
`;
    
    // Run debate
    const debate = await debateStrategy(
      "Create a trading strategy for SPY ETF that can generate consistent returns with controlled risk. Focus on technical indicators and clear entry/exit rules.",
      marketContext
    );
    
    if (!debate.finalStrategy) {
      await log("warning", "strategy_generation_failed", { reason: "no_code_extracted" });
      return;
    }
    
    // Validate with both models
    const validation = await validateStrategy(debate.finalStrategy);
    
    await log("info", "strategy_validated", {
      approved: validation.approved,
      claude_score: validation.claudeScore,
      openai_score: validation.openaiScore,
      concerns: validation.concerns,
    });
    
    if (!validation.approved) {
      await log("warning", "strategy_rejected", { reason: "low_scores", validation });
      return;
    }
    
    // Save strategy
    const strategyId = await saveStrategy(
      `Auto-Strategy-${Date.now()}`,
      `Generated via debate. Claude: ${validation.claudeScore}/10, OpenAI: ${validation.openaiScore}/10`,
      debate.finalStrategy,
      "consensus"
    );
    
    // TODO: Run backtest before deploying
    // For now, mark as deployed
    await updateStrategyStatus(strategyId, "deployed");
    
    await log("decision", "strategy_deployed", { strategy_id: strategyId });
    
  } catch (error) {
    await log("error", "strategy_generation_error", { error: String(error) });
  }
}

// End of day analysis
async function runEndOfDayAnalysis(): Promise<void> {
  try {
    await log("info", "eod_analysis_started", {});
    
    // Get today's trades
    const trades = await getTodaysTrades();
    
    if (trades.length > 0) {
      // Analyze trades with both models
      const tradeData = trades.map(t => ({
        symbol: t.symbol,
        side: t.side,
        pnl: t.pnl || 0,
        reasoning: t.reasoning || "",
      }));
      
      await analyzeAndLearn(tradeData);
    }
    
    // Save daily snapshot
    const account = await getAccount();
    const dailyPnl = account.equity - account.last_equity;
    
    const strategies = await getActiveStrategies();
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
    
    await saveDailySnapshot({
      portfolio_value: account.portfolio_value,
      daily_pnl: dailyPnl,
      daily_pnl_percent: (dailyPnl / account.last_equity) * 100,
      total_pnl: account.equity - 100000, // Assuming started with 100k
      total_pnl_percent: ((account.equity - 100000) / 100000) * 100,
      active_strategies: strategies.length,
      trades_today: trades.length,
      win_rate_today: trades.length > 0 ? winningTrades / trades.length : 0,
    });
    
    await log("info", "eod_analysis_completed", {
      trades_analyzed: trades.length,
      daily_pnl: dailyPnl,
    });
    
  } catch (error) {
    await log("error", "eod_analysis_failed", { error: String(error) });
  }
}

// Helper: Calculate volatility
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
}

// Main entry point
async function main(): Promise<void> {
  console.log("🤖 Quant Agent Starting...");
  console.log(`Mode: ${process.env.ALPACA_PAPER === "true" ? "PAPER TRADING" : "LIVE TRADING"}`);
  console.log(`Agent Enabled: ${process.env.AGENT_ENABLED}`);
  
  // Validate environment
  const required = [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "SUPABASE_URL",
    "ALPACA_API_KEY",
    "ALPACA_SECRET_KEY",
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`❌ Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }
  
  console.log("✅ Environment validated");
  
  // Run initial cycle
  console.log("🚀 Running initial cycle...");
  await runAgentCycle();
  
  // Schedule cron job - every 15 minutes during market hours
  // Market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
  cron.schedule("*/15 9-16 * * 1-5", async () => {
    console.log(`\n⏰ Scheduled cycle at ${new Date().toISOString()}`);
    await runAgentCycle();
  }, {
    timezone: "America/New_York",
  });
  
  console.log("📅 Cron scheduled: Every 15 min, 9AM-4PM ET, Mon-Fri");
  console.log("🤖 Agent is running. Press Ctrl+C to stop.");
}

main().catch(console.error);
