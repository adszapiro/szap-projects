import { config } from "dotenv";
config({ path: ".env.local", override: true });

import cron from "node-cron";
import { executeSandboxed } from "./sandbox.js";
import { debateStrategy, analyzeAndLearn, validateStrategy } from "./brain/orchestrator.js";
import {
  saveStrategy,
  updateStrategyStatus,
  getActiveStrategies,
  getRecentTrades,
  getTodaysTrades,
  saveDailySnapshot,
  log,
  AssetClass,
  initializeStrategyPerformance,
} from "./db.js";
import {
  getAccount,
  getPositions,
  getBars,
  isMarketOpen,
  placeOrder,
  calculatePositionSize,
  getCryptoAssets,
  getCryptoBars,
  getAssetBars,
  isCryptoSymbol,
  isCryptoTradingAvailable,
} from "./executor.js";
import {
  placeSimulatedOrder,
  calculateSimulatedPositionSize,
  getSimulatedPosition,
  getSimulatedAccountValue,
  logSimulatedStatus,
} from "./simulator.js";
import {
  recordError,
  clearSuccessfulStrategy,
  getHealthStatus,
} from "./healer.js";

// Tournament system imports
import { runStockTournament, runCryptoTournament, printLeaderboard } from "./tournament/runner.js";
import { runLearningCycle, generateReport } from "./tournament/learner.js";
import { getBanditStats, sampleAllocation } from "./bandit/thompson.js";
import { runDailyReportCycle } from "./reports/daily.js";
import { runHealthCheckCycle } from "./tournament/health-monitor.js";

// Tournament mode flag
const TOURNAMENT_MODE = process.env.TOURNAMENT_MODE !== "false"; // Default: enabled

// Default crypto symbols to trade (can be fetched dynamically)
const CRYPTO_SYMBOLS = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "DOGE/USD",
  "AVAX/USD",
  "LINK/USD",
  "UNI/USD",
  "AAVE/USD",
  "LTC/USD",
  "BCH/USD",
  "DOT/USD",
  "MATIC/USD",
  "ATOM/USD",
  "XLM/USD",
  "ALGO/USD",
];

// Default stock symbols
const STOCK_SYMBOLS = ["SPY", "QQQ", "IWM"];

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

// Validate data before strategy execution
function validateData(data: { close: number[]; high: number[]; low: number[]; open: number[]; volume: number[] }): boolean {
  if (!data) return false;
  if (!Array.isArray(data.close) || data.close.length < 10) return false;
  if (!Array.isArray(data.high) || data.high.length < 10) return false;
  if (!Array.isArray(data.low) || data.low.length < 10) return false;
  if (!Array.isArray(data.open) || data.open.length < 10) return false;
  // Volume can be 0 for crypto from CoinGecko
  return true;
}

// Execute a strategy in sandboxed VM and return signal
function executeStrategy(
  code: string,
  data: { close: number[]; high: number[]; low: number[]; open: number[]; volume: number[] },
  position: { qty: number; avgEntryPrice: number; side: string } | null
): { type: "buy" | "sell" | "hold"; confidence: number; reason: string } {
  if (!validateData(data)) {
    return { type: "hold", confidence: 0, reason: "Insufficient data for analysis" };
  }
  return executeSandboxed(code, data, position);
}

// =====================
// STOCK TRADING CYCLE
// =====================
async function runStockCycle(): Promise<void> {
  const cycleStart = Date.now();
  const assetClass: AssetClass = "stock";
  
  try {
    await log("info", "stock_cycle_started", { timestamp: new Date().toISOString(), tournament_mode: TOURNAMENT_MODE });
    
    // Check if agent is enabled
    if (process.env.AGENT_ENABLED !== "true") {
      await log("info", "agent_disabled", {});
      return;
    }
    
    // Check market status - stocks only trade during market hours
    const marketOpen = await isMarketOpen();
    if (!marketOpen) {
      await log("info", "market_closed", { asset_class: assetClass });
      
      // If market just closed, run end-of-day analysis
      const now = new Date();
      if (now.getHours() === 16 && now.getMinutes() < 30) {
        await runEndOfDayAnalysis(assetClass);
      }
      return;
    }
    
    // Check daily loss guardrail
    const account = await getAccount();
    const dailyPnl = account.equity - account.last_equity;
    const dailyPnlPercent = (dailyPnl / account.last_equity) * 100;
    const maxDailyLoss = parseFloat(process.env.AGENT_MAX_DAILY_LOSS_PERCENT || "5");
    
    if (dailyPnlPercent < -maxDailyLoss) {
      await log("warning", "daily_loss_limit_hit", { dailyPnlPercent, maxDailyLoss, asset_class: assetClass });
      return;
    }
    
    // TOURNAMENT MODE: Use bandit-weighted execution
    if (TOURNAMENT_MODE) {
      const result = await runStockTournament();
      const cycleDuration = Date.now() - cycleStart;
      await log("info", "stock_tournament_completed", { 
        duration_ms: cycleDuration,
        strategies_run: result.strategiesRun,
        signals: result.signalsGenerated,
        trades: result.tradesExecuted,
      });
      return;
    }
    
    // LEGACY MODE: Original execution
    // Get current positions
    const positions = await getPositions();
    const stockPositions = positions.filter(p => !p.symbol.includes("/"));
    await log("info", "stock_positions_checked", { count: stockPositions.length, positions: stockPositions.map(p => p.symbol) });
    
    // Get active stock strategies
    const strategies = await getActiveStrategies(assetClass);
    
    if (strategies.length === 0) {
      await log("info", "no_stock_strategies", { action: "generating_new" });
      await generateNewStrategy(assetClass, STOCK_SYMBOLS);
      return;
    }
    
    // Execute each active strategy
    await executeStrategies(strategies, positions, assetClass);
    
    const cycleDuration = Date.now() - cycleStart;
    await log("info", "stock_cycle_completed", { duration_ms: cycleDuration });
    
  } catch (error) {
    await log("error", "stock_cycle_failed", { error: String(error) });
  }
}

// =====================
// CRYPTO TRADING CYCLE
// =====================
async function runCryptoCycle(): Promise<void> {
  const cycleStart = Date.now();
  const assetClass: AssetClass = "crypto";
  
  try {
    // Determine trading mode
    const useSimulation = !isCryptoTradingAvailable();
    const tradingMode = isCryptoTradingAvailable() ? "REAL_TRADING" : "SIMULATED_PAPER";
    await log("info", "crypto_cycle_started", { timestamp: new Date().toISOString(), mode: tradingMode, tournament_mode: TOURNAMENT_MODE });
    
    // Check if agent is enabled
    if (process.env.AGENT_ENABLED !== "true") {
      await log("info", "agent_disabled", {});
      return;
    }
    
    // No market hours check for crypto - trades 24/7!
    
    // Check daily loss guardrail
    if (useSimulation) {
      // Check simulated portfolio
      const simAccount = await getSimulatedAccountValue();
      const simPnlPercent = ((simAccount.totalValue - 50000) / 50000) * 100; // Compare to starting capital
      const maxDailyLoss = parseFloat(process.env.AGENT_MAX_DAILY_LOSS_PERCENT || "5");
      
      if (simPnlPercent < -maxDailyLoss) {
        await log("warning", "simulated_loss_limit_hit", { 
          pnl_percent: simPnlPercent, 
          max_loss: maxDailyLoss, 
          mode: "SIMULATED" 
        });
        return;
      }
    } else {
      const account = await getAccount();
      const dailyPnl = account.equity - account.last_equity;
      const dailyPnlPercent = (dailyPnl / account.last_equity) * 100;
      const maxDailyLoss = parseFloat(process.env.AGENT_MAX_DAILY_LOSS_PERCENT || "5");
      
      if (dailyPnlPercent < -maxDailyLoss) {
        await log("warning", "daily_loss_limit_hit", { dailyPnlPercent, maxDailyLoss, asset_class: assetClass });
        return;
      }
    }
    
    // TOURNAMENT MODE: Use bandit-weighted execution
    if (TOURNAMENT_MODE) {
      const result = await runCryptoTournament();
      const cycleDuration = Date.now() - cycleStart;
      await log("info", "crypto_tournament_completed", { 
        duration_ms: cycleDuration,
        mode: tradingMode,
        strategies_run: result.strategiesRun,
        signals: result.signalsGenerated,
        trades: result.tradesExecuted,
      });
      return;
    }
    
    // LEGACY MODE: Original execution
    // Get current positions
    let positions: any[] = [];
    if (!useSimulation) {
      positions = await getPositions();
      const cryptoPositions = positions.filter(p => p.symbol.includes("/") || CRYPTO_SYMBOLS.some(cs => cs.replace("/", "") === p.symbol));
      await log("info", "crypto_positions_checked", { count: cryptoPositions.length, positions: cryptoPositions.map(p => p.symbol) });
    } else {
      // Log simulated positions status
      await logSimulatedStatus();
    }
    
    // Get active crypto strategies
    const strategies = await getActiveStrategies(assetClass);
    
    if (strategies.length === 0) {
      await log("info", "no_crypto_strategies", { action: "generating_new" });
      await generateNewStrategy(assetClass, CRYPTO_SYMBOLS.slice(0, 5)); // Start with top 5
      return;
    }
    
    // Execute each active strategy (uses simulation if Alpaca crypto not available)
    await executeStrategies(strategies, positions, assetClass);
    
    const cycleDuration = Date.now() - cycleStart;
    await log("info", "crypto_cycle_completed", { duration_ms: cycleDuration, mode: tradingMode });
    
  } catch (error) {
    await log("error", "crypto_cycle_failed", { error: String(error) });
  }
}

// =====================
// SHARED STRATEGY EXECUTION
// =====================
async function executeStrategies(
  strategies: Awaited<ReturnType<typeof getActiveStrategies>>,
  positions: any[],
  assetClass: AssetClass
): Promise<void> {
  for (const strategy of strategies) {
    try {
      // Get symbols for this strategy (default based on asset class)
      const symbols = strategy.symbols || (assetClass === "crypto" ? ["BTC/USD"] : ["SPY"]);
      
      for (const symbol of symbols) {
        // Get market data
        const data = await getAssetBars(symbol, "1Day", 60);
        
        if (data.close.length === 0) {
          await log("warning", "no_data", { symbol, strategy_id: strategy.id });
          continue;
        }
        
        // Check if we have a position (handle crypto symbol format)
        // For crypto without Alpaca, check simulated positions
        let positionInfo: { qty: number; avgEntryPrice: number; side: string } | null = null;
        
        if (isCryptoSymbol(symbol) && !isCryptoTradingAvailable()) {
          // Use simulated position
          const simPosition = getSimulatedPosition(symbol);
          if (simPosition) {
            positionInfo = {
              qty: simPosition.qty,
              avgEntryPrice: simPosition.avgEntryPrice,
              side: simPosition.side,
            };
          }
        } else {
          // Use real Alpaca position
          const positionSymbol = isCryptoSymbol(symbol) ? symbol.replace("/", "") : symbol;
          const position = positions.find(p => p.symbol === positionSymbol);
          if (position) {
            positionInfo = {
              qty: parseFloat(position.qty),
              avgEntryPrice: parseFloat(position.avg_entry_price),
              side: position.side,
            };
          }
        }
        
        // Execute strategy
        const signal = executeStrategy(strategy.code, data, positionInfo);
        
        // Track errors for self-healing
        if (signal.reason.startsWith("Error:")) {
          await recordError(strategy.id, signal.reason, symbol);
        } else if (signal.type !== "hold" || signal.confidence > 0) {
          // Strategy executed successfully
          clearSuccessfulStrategy(strategy.id);
        }
        
        await log("decision", "signal_generated", {
          strategy_id: strategy.id,
          strategy_name: strategy.name,
          symbol,
          asset_class: assetClass,
          signal,
        });
        
        // Act on signal - lowered threshold to 0.5 for more active trading
        if (signal.type !== "hold" && signal.confidence >= 0.5) {
          // Check if we can actually trade this asset
          const canTradeReal = assetClass === "stock" || isCryptoTradingAvailable();
          
          if (assetClass === "crypto" && !canTradeReal) {
            // Use SIMULATION MODE for crypto when Alpaca isn't available
            await log("info", "crypto_using_simulation", {
              symbol,
              signal,
              mode: "SIMULATED_PAPER_TRADING",
            });
            
            // Get simulated position
            const simPosition = getSimulatedPosition(symbol);
            
            if (signal.type === "buy" && !simPosition) {
              try {
                // 25% position size for aggressive paper trading
                const qty = await calculateSimulatedPositionSize(symbol, 25);
                if (qty > 0) {
                  const result = await placeSimulatedOrder({
                    symbol,
                    qty,
                    side: "buy",
                    strategy_id: strategy.id,
                    reasoning: signal.reason,
                  });
                  await log("decision", "simulated_order_executed", {
                    symbol,
                    side: "buy",
                    qty,
                    price: result.price,
                  });
                }
              } catch (error) {
                await log("warning", "simulated_order_failed", {
                  symbol,
                  side: "buy",
                  error: String(error),
                });
              }
            } else if (signal.type === "sell" && simPosition) {
              try {
                const result = await placeSimulatedOrder({
                  symbol,
                  qty: simPosition.qty,
                  side: "sell",
                  strategy_id: strategy.id,
                  reasoning: signal.reason,
                });
                await log("decision", "simulated_order_executed", {
                  symbol,
                  side: "sell",
                  qty: simPosition.qty,
                  price: result.price,
                  pnl: result.pnl,
                });
              } catch (error) {
                await log("warning", "simulated_order_failed", {
                  symbol,
                  side: "sell",
                  error: String(error),
                });
              }
            }
          } else {
            // Real trading (stocks or available crypto) - aggressive paper trading
            if (signal.type === "buy" && !positionInfo) {
              const qty = await calculatePositionSize(symbol, 20);
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
        }
      }
    } catch (error) {
      await log("error", "strategy_execution_failed", {
        strategy_id: strategy.id,
        asset_class: assetClass,
        error: String(error),
      });
    }
  }
}

// Generate a new strategy via model debate
async function generateNewStrategy(
  assetClass: AssetClass = "stock",
  symbols: string[] = ["SPY"]
): Promise<void> {
  try {
    await log("info", "strategy_generation_started", { asset_class: assetClass, symbols });
    
    // Get market context for the first symbol
    const primarySymbol = symbols[0];
    const data = await getAssetBars(primarySymbol, "1Day", 30);
    
    if (data.close.length === 0) {
      await log("warning", "no_market_data", { symbol: primarySymbol });
      return;
    }
    
    const lastPrice = data.close[data.close.length - 1];
    const priceChange = ((lastPrice - data.close[0]) / data.close[0]) * 100;
    const volatility = calculateVolatility(data.close);
    
    const assetLabel = assetClass === "crypto" ? "CRYPTO" : "STOCK";
    const marketContext = `
${primarySymbol} is ${priceChange > 0 ? "up" : "down"} ${Math.abs(priceChange).toFixed(2)}% over the last 30 days.
Current price: $${lastPrice.toFixed(2)}
Recent volatility: ${volatility.toFixed(2)}%
Asset class: ${assetClass.toUpperCase()}
Target symbols: ${symbols.join(", ")}
`;
    
    // Create asset-specific requirements
    const requirements = assetClass === "crypto"
      ? `Create a CRYPTO trading strategy for ${symbols.join(", ")}. Consider 24/7 trading, higher volatility, and crypto-specific patterns. Focus on momentum, volume, and RSI. Use appropriate stop losses for crypto's volatility.`
      : `Create a STOCK trading strategy for ${symbols.join(", ")}. Focus on technical indicators, market hours patterns, and clear entry/exit rules with controlled risk.`;
    
    // Run debate with asset class
    const debate = await debateStrategy(requirements, marketContext, assetClass);
    
    if (!debate.finalStrategy) {
      await log("warning", "strategy_generation_failed", { reason: "no_code_extracted", asset_class: assetClass });
      return;
    }
    
    // Validate with both models
    const validation = await validateStrategy(debate.finalStrategy);
    
    await log("info", "strategy_validated", {
      approved: validation.approved,
      claude_score: validation.claudeScore,
      openai_score: validation.openaiScore,
      concerns: validation.concerns,
      asset_class: assetClass,
    });
    
    if (!validation.approved) {
      await log("warning", "strategy_rejected", { reason: "low_scores", validation, asset_class: assetClass });
      return;
    }
    
    // Save strategy with asset class and symbols
    const strategyId = await saveStrategy(
      `${assetClass.toUpperCase()}-Strategy-${Date.now()}`,
      `Generated via debate. Claude: ${validation.claudeScore}/10, OpenAI: ${validation.openaiScore}/10`,
      debate.finalStrategy,
      "consensus",
      assetClass,
      symbols
    );
    
    // TODO: Run backtest before deploying
    // For now, mark as deployed
    await updateStrategyStatus(strategyId, "deployed");
    
    await log("decision", "strategy_deployed", { strategy_id: strategyId, asset_class: assetClass, symbols });
    
  } catch (error) {
    await log("error", "strategy_generation_error", { error: String(error), asset_class: assetClass });
  }
}

// End of day analysis (or periodic for crypto)
async function runEndOfDayAnalysis(assetClass: AssetClass = "stock"): Promise<void> {
  try {
    await log("info", "eod_analysis_started", { asset_class: assetClass });
    
    // Get today's trades
    const allTrades = await getTodaysTrades();
    
    // Filter by asset class
    const trades = allTrades.filter(t => {
      const isCrypto = t.symbol.includes("/") || t.asset_class === "crypto";
      return assetClass === "crypto" ? isCrypto : !isCrypto;
    });
    
    if (trades.length > 0) {
      // Analyze trades with both models
      const tradeData = trades.map(t => ({
        symbol: t.symbol,
        side: t.side,
        pnl: t.pnl || 0,
        reasoning: t.reasoning || "",
      }));
      
      await analyzeAndLearn(tradeData, assetClass);
    }
    
    // Save daily snapshot (combined for now)
    const account = await getAccount();
    const dailyPnl = account.equity - account.last_equity;
    
    const strategies = await getActiveStrategies();
    const winningTrades = allTrades.filter(t => (t.pnl || 0) > 0).length;
    
    await saveDailySnapshot({
      portfolio_value: account.portfolio_value,
      daily_pnl: dailyPnl,
      daily_pnl_percent: (dailyPnl / account.last_equity) * 100,
      total_pnl: account.equity - 100000, // Assuming started with 100k
      total_pnl_percent: ((account.equity - 100000) / 100000) * 100,
      active_strategies: strategies.length,
      trades_today: allTrades.length,
      win_rate_today: allTrades.length > 0 ? winningTrades / allTrades.length : 0,
    });
    
    await log("info", "eod_analysis_completed", {
      trades_analyzed: trades.length,
      daily_pnl: dailyPnl,
      asset_class: assetClass,
    });
    
  } catch (error) {
    await log("error", "eod_analysis_failed", { error: String(error), asset_class: assetClass });
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
  console.log(`Tournament Mode: ${TOURNAMENT_MODE ? "ENABLED" : "DISABLED"}`);
  console.log(`Trading: STOCKS + CRYPTO (24/7)`);
  
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
  console.log(`📈 Stock symbols: ${STOCK_SYMBOLS.join(", ")}`);
  console.log(`🪙 Crypto symbols: ${CRYPTO_SYMBOLS.slice(0, 5).join(", ")}... (${CRYPTO_SYMBOLS.length} total)`);
  
  // Initialize tournament system
  if (TOURNAMENT_MODE) {
    console.log("\n🏆 TOURNAMENT MODE ACTIVE");
    console.log("   Strategies compete for capital allocation");
    console.log("   Thompson Sampling bandit learns from results");
    
    // Initialize performance tracking for existing strategies
    const allStrategies = await getActiveStrategies();
    for (const strategy of allStrategies) {
      await initializeStrategyPerformance(strategy.id, 1 / allStrategies.length);
    }
    console.log(`   Initialized ${allStrategies.length} strategies for tournament`);
    
    // Sample initial allocation
    const allocations = await sampleAllocation();
    console.log(`   Initial allocations sampled for ${allocations.size} strategies`);
  }
  
  // Run initial cycles
  console.log("\n🚀 Running initial stock cycle...");
  await runStockCycle();
  
  console.log("\n🚀 Running initial crypto cycle...");
  await runCryptoCycle();
  
  // Print initial leaderboard if in tournament mode
  if (TOURNAMENT_MODE) {
    await printLeaderboard();
  }
  
  // =====================
  // SCHEDULE CRON JOBS
  // =====================
  
  // Safe wrapper that catches errors and logs them
  const safeRun = async <T>(name: string, fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      console.error(`❌ [${name}] Error:`, error);
      await log("error", `${name}_failed`, { error: String(error) });
      return undefined;
    }
  };
  
  // STOCKS: Every 5 minutes during market hours (9AM-4PM ET, Mon-Fri)
  cron.schedule("*/5 9-16 * * 1-5", async () => {
    console.log(`\n📈 [STOCKS] Scheduled cycle at ${new Date().toISOString()}`);
    await safeRun("stock_cycle", runStockCycle);
  }, {
    timezone: "America/New_York",
  });
  
  // CRYPTO: Every 5 minutes, 24/7 (crypto never sleeps!)
  cron.schedule("*/5 * * * *", async () => {
    console.log(`\n🪙 [CRYPTO] Scheduled cycle at ${new Date().toISOString()}`);
    await safeRun("crypto_cycle", runCryptoCycle);
  });
  
  // End-of-day analysis for stocks at 4:30 PM ET on weekdays
  cron.schedule("30 16 * * 1-5", async () => {
    console.log(`\n📊 [STOCKS] End-of-day analysis at ${new Date().toISOString()}`);
    await safeRun("stock_eod", async () => {
      await runEndOfDayAnalysis("stock");
      if (TOURNAMENT_MODE) {
        await runLearningCycle();
        const report = await generateReport();
        console.log(report);
      }
    });
  }, {
    timezone: "America/New_York",
  });
  
  // Daily analysis for crypto at midnight UTC
  cron.schedule("0 0 * * *", async () => {
    console.log(`\n📊 [CRYPTO] Daily analysis at ${new Date().toISOString()}`);
    await safeRun("crypto_daily", async () => {
      await runEndOfDayAnalysis("crypto");
      if (TOURNAMENT_MODE) {
        await runLearningCycle();
        await printLeaderboard();
      }
    });
  });
  
  // Tournament learning cycle: Every hour
  if (TOURNAMENT_MODE) {
    cron.schedule("0 * * * *", async () => {
      console.log(`\n🎓 [TOURNAMENT] Learning cycle at ${new Date().toISOString()}`);
      await safeRun("learning_cycle", runLearningCycle);
    });
  }
  
  // Heartbeat log every hour to confirm agent is alive
  cron.schedule("30 * * * *", async () => {
    const status = getHealthStatus();
    const successRate = 100 - (status.recentErrorRate * 100);
    console.log(`💓 [HEARTBEAT] Agent alive - Errors: ${status.totalErrors}, Success: ${successRate.toFixed(0)}%`);
    await log("info", "heartbeat", { 
      totalErrors: status.totalErrors,
      recentErrorRate: status.recentErrorRate,
      successRate: successRate,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Daily summary report: 5 PM ET (after market close), Mon-Fri
  cron.schedule("0 17 * * 1-5", async () => {
    console.log(`\n📋 [REPORT] Generating daily summary at ${new Date().toISOString()}`);
    await safeRun("daily_report", runDailyReportCycle);
  });
  
  // Weekend summary: 11 PM UTC on Sunday
  cron.schedule("0 23 * * 0", async () => {
    console.log(`\n📋 [REPORT] Generating weekend summary at ${new Date().toISOString()}`);
    await safeRun("weekend_report", runDailyReportCycle);
  });
  
  // Strategy health check: Every 4 hours
  cron.schedule("0 */4 * * *", async () => {
    console.log(`\n🏥 [HEALTH] Running strategy health check at ${new Date().toISOString()}`);
    await safeRun("health_check", runHealthCheckCycle);
  });
  
  console.log("\n📅 Cron schedules configured:");
  console.log("   📈 STOCKS: Every 15 min, 9AM-4PM ET, Mon-Fri");
  console.log("   🪙 CRYPTO: Every 5 min, 24/7 (AGGRESSIVE MODE)");
  console.log("   📊 Stock EOD: 4:30 PM ET, Mon-Fri");
  console.log("   📊 Crypto Daily: Midnight UTC");
  console.log("   📋 Daily Report: 5 PM ET, Mon-Fri");
  console.log("   🏥 Health Check: Every 4 hours");
  if (TOURNAMENT_MODE) {
    console.log("   🏆 Tournament Learning: Every hour");
  }
  console.log("\n🤖 Agent is running. Press Ctrl+C to stop.");
}

// Run with crash recovery
async function startWithRecovery() {
  let restarts = 0;
  const MAX_RESTARTS = 5;
  
  while (restarts < MAX_RESTARTS) {
    try {
      await main();
      break; // Normal exit
    } catch (error) {
      restarts++;
      console.error(`\n💥 Agent crashed (attempt ${restarts}/${MAX_RESTARTS}):`, error);
      
      if (restarts < MAX_RESTARTS) {
        console.log(`⏳ Restarting in 30 seconds...`);
        await new Promise(r => setTimeout(r, 30000));
      } else {
        console.error(`❌ Max restarts reached. Agent stopped.`);
        process.exit(1);
      }
    }
  }
}

startWithRecovery();
