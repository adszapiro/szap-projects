/**
 * Tournament Runner
 * Executes all strategies in parallel with weighted allocation from the bandit
 */

import { getActiveStrategies, saveTrade, updateTrade, log, Strategy, AssetClass, updateStrategyPerformance, saveDailySnapshot, getStrategyPerformance } from "../db.js";
import { sampleAllocation, updateBandit, getBanditStats, getCurrentWeights } from "../bandit/thompson.js";
import { isWinningTrade } from "../bandit/metrics.js";
import { getBars, getCryptoBars, placeOrder, getPositions, getAccount } from "../executor.js";
import { getSimulatedPosition, placeSimulatedOrder, getSimulatedAccountValue } from "../simulator.js";
import { analyzeAndLearnFromLoss, recordWin } from "./loss-learner.js";
import { updateStrategyRiskScore } from "../ml/risk-scorer.js";

// Volatility-based position sizing
function calculateVolatility(prices: number[]): number {
  if (prices.length < 20) return 0.02; // Default 2% daily volatility
  
  // Calculate daily returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  
  // Use last 20 days for recent volatility
  const recentReturns = returns.slice(-20);
  const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
  const variance = recentReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentReturns.length;
  
  return Math.sqrt(variance); // Daily volatility
}

// Adjust position size based on volatility (target 1% portfolio risk per trade)
function adjustPositionForVolatility(
  basePositionValue: number,
  volatility: number,
  targetRisk: number = 0.01 // 1% of portfolio at risk
): number {
  const TARGET_VOLATILITY = 0.02; // 2% daily volatility baseline
  
  if (volatility <= 0) return basePositionValue;
  
  // Scale position inversely with volatility
  // Higher volatility = smaller position
  const volAdjustment = TARGET_VOLATILITY / volatility;
  
  // Clamp adjustment between 0.25x and 2x
  const clampedAdjustment = Math.max(0.25, Math.min(2, volAdjustment));
  
  return basePositionValue * clampedAdjustment;
}

/**
 * Drawdown recovery: reduce allocation for strategies in drawdown.
 * Returns a multiplier (0 = skip, 0.5 = half, 1 = full).
 */
async function getDrawdownMultiplier(strategyId: string): Promise<{ multiplier: number; reason?: string }> {
  const perf = await getStrategyPerformance(strategyId);
  if (!perf || perf.total_trades < 3) return { multiplier: 1 };

  const maxDd = perf.max_drawdown ?? 0;
  const winRate = perf.total_trades > 0 ? perf.winning_trades / perf.total_trades : 0.5;

  // Severe drawdown (>25%) — skip this cycle entirely
  if (maxDd > 0.25) {
    return { multiplier: 0, reason: `drawdown ${(maxDd * 100).toFixed(1)}% > 25%` };
  }
  // Moderate drawdown (>15%) — halve allocation
  if (maxDd > 0.15) {
    return { multiplier: 0.5, reason: `drawdown ${(maxDd * 100).toFixed(1)}% > 15%` };
  }
  // Very low win rate with enough trades — halve allocation
  if (perf.total_trades >= 5 && winRate < 0.25) {
    return { multiplier: 0.5, reason: `win rate ${(winRate * 100).toFixed(0)}% < 25%` };
  }
  return { multiplier: 1 };
}

import { executeSandboxed, type StrategySignalResult } from "../sandbox.js";

export interface TournamentResult {
  cycle: "stock" | "crypto";
  timestamp: Date;
  strategiesRun: number;
  signalsGenerated: number;
  tradesExecuted: number;
  allocations: Map<string, number>;
  results: StrategyResult[];
}

export interface StrategyResult {
  strategyId: string;
  strategyName: string;
  symbol: string;
  signal: { type: string; confidence: number; reason: string };
  allocation: number;
  tradeExecuted: boolean;
  tradeId?: string;
  error?: string;
}

/**
 * Execute a single strategy's code in a sandboxed VM
 */
function executeStrategyCode(
  code: string,
  data: { open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] },
  position: { qty: number; avgEntryPrice: number } | null
): StrategySignalResult {
  return executeSandboxed(code, data, position);
}

/**
 * Run tournament for stocks
 */
export async function runStockTournament(): Promise<TournamentResult> {
  const timestamp = new Date();
  await log("info", "stock_tournament_started", { timestamp });
  
  const results: StrategyResult[] = [];
  let signalsGenerated = 0;
  let tradesExecuted = 0;
  
  // Get all active stock strategies
  const strategies = await getActiveStrategies("stock");
  
  if (strategies.length === 0) {
    return {
      cycle: "stock",
      timestamp,
      strategiesRun: 0,
      signalsGenerated: 0,
      tradesExecuted: 0,
      allocations: new Map(),
      results: [],
    };
  }
  
  // Sample allocation from bandit
  const allocations = await sampleAllocation();
  
  // Get current positions with error handling
  let positions: Awaited<ReturnType<typeof getPositions>>;
  let accountValue: number;
  
  try {
    positions = await getPositions();
  } catch (error) {
    await log("error", "failed_to_get_positions", { error: String(error) });
    console.error("❌ Failed to get positions from Alpaca:", error);
    return {
      cycle: "stock",
      timestamp,
      strategiesRun: 0,
      signalsGenerated: 0,
      tradesExecuted: 0,
      allocations: new Map(),
      results: [],
    };
  }
  
  try {
    const account = await getAccount();
    accountValue = account.portfolio_value;
  } catch (error) {
    await log("error", "failed_to_get_account", { error: String(error) });
    console.error("❌ Failed to get account from Alpaca:", error);
    return {
      cycle: "stock",
      timestamp,
      strategiesRun: 0,
      signalsGenerated: 0,
      tradesExecuted: 0,
      allocations: new Map(),
      results: [],
    };
  }
  
  const positionMap = new Map(positions.map(p => [p.symbol, p]));
  
  // Track symbols already traded this cycle to prevent multiple sells/buys
  const soldSymbols = new Set<string>();
  const boughtSymbols = new Set<string>();
  
  // Epsilon-greedy exploration: 25% chance to allow lower confidence trades (aggressive paper trading)
  const EPSILON = 0.25;
  
  // Run each strategy
  for (const strategy of strategies) {
    const baseAllocation = allocations.get(strategy.id) || 0.1;

    // Drawdown recovery: reduce or skip allocation for struggling strategies
    const { multiplier: ddMultiplier, reason: ddReason } = await getDrawdownMultiplier(strategy.id);
    if (ddMultiplier === 0) {
      await log("info", "strategy_skipped_drawdown", { strategy: strategy.name, reason: ddReason });
      continue;
    }
    const allocation = baseAllocation * ddMultiplier;
    const maxPositionValue = accountValue * allocation;

    for (const symbol of strategy.symbols) {
      try {
        // Get market data (1Day bars, request 300 days)
        const bars = await getBars(symbol, "1Day", 300);
        if (!bars || !bars.close || bars.close.length < 20) {
          results.push({
            strategyId: strategy.id,
            strategyName: strategy.name,
            symbol,
            signal: { type: "hold", confidence: 0, reason: "Insufficient data" },
            allocation,
            tradeExecuted: false,
          });
          continue;
        }
        
        // Data is already in correct format from getBars
        const data = bars;
        
        // Get current position (only count LONG positions, not shorts)
        const position = positionMap.get(symbol);
        const positionQty = position ? parseFloat(position.qty) : 0;
        // Only set positionData if we have a LONG position (qty > 0)
        const positionData = (position && positionQty > 0) ? {
          qty: positionQty,
          avgEntryPrice: parseFloat(position.avg_entry_price),
        } : null;
        
        // STOP-LOSS CHECK: Use strategy-defined stop-loss, or default 8% for stocks
        const DEFAULT_STOP_LOSS = 8; // Let strategies breathe more
        const currentPrice = data.close[data.close.length - 1];

        if (positionData && positionData.avgEntryPrice > 0 && !soldSymbols.has(symbol)) {
          const unrealizedPnlPercent = ((currentPrice - positionData.avgEntryPrice) / positionData.avgEntryPrice) * 100;

          if (unrealizedPnlPercent <= -DEFAULT_STOP_LOSS) {
            console.log(`🛑 [STOCK] STOP-LOSS TRIGGERED: ${symbol} at ${unrealizedPnlPercent.toFixed(2)}%`);
            try {
              const result = await placeOrder({
                symbol,
                qty: positionData.qty,
                side: "sell",
                strategy_id: strategy.id,
                reasoning: `[STOP-LOSS] Unrealized loss ${unrealizedPnlPercent.toFixed(2)}% exceeded ${DEFAULT_STOP_LOSS}% threshold`,
              });

              soldSymbols.add(symbol);
              tradesExecuted++;
              
              // Calculate and save P&L
              const pnl = (currentPrice - positionData.avgEntryPrice) * positionData.qty;
              const costBasis = positionData.avgEntryPrice * positionData.qty;
              const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
              
              await updateTrade(result.tradeId, {
                status: "filled",
                pnl,
                pnl_percent: pnlPercent,
                filled_at: new Date().toISOString(),
              });

              const won = isWinningTrade(pnl);
              await updateBandit(strategy.id, won, pnl);
              updateStrategyRiskScore(strategy.id).catch(() => {});

              await log("warning", "stop_loss_triggered", {
                symbol,
                strategy: strategy.name,
                entryPrice: positionData.avgEntryPrice,
                exitPrice: currentPrice,
                unrealizedPnlPercent,
                pnl,
              });

              results.push({
                strategyId: strategy.id,
                strategyName: strategy.name,
                symbol,
                signal: { type: "sell", confidence: 1, reason: "Stop-loss triggered" },
                allocation,
                tradeExecuted: true,
                tradeId: result.tradeId,
              });
              continue; // Skip strategy execution since we forced a sell
            } catch (error) {
              console.error(`❌ [STOCK] Stop-loss sell failed for ${symbol}:`, error);
              // Mark as sold to prevent strategy from attempting another sell
              soldSymbols.add(symbol);
              continue; // Skip strategy execution to prevent double-sell
            }
          }
        }
        
        // Execute strategy
        const signal = executeStrategyCode(strategy.code, data, positionData);
        signalsGenerated++;
        
        await log("decision", "tournament_signal", {
          strategy: strategy.name,
          symbol,
          signal,
          allocation,
        });
        
        // Execute trade if confidence threshold met (0.15 for aggressive paper trading)
        const CONFIDENCE_THRESHOLD = 0.15;
        let tradeExecuted = false;
        let tradeId: string | undefined;
        
        // Epsilon-greedy: 10% chance to explore with lower confidence signals
        const shouldExplore = Math.random() < EPSILON;
        const minConfidenceForExplore = 0.1; // Minimum confidence for exploration trades
        const meetsThreshold = signal.confidence >= CONFIDENCE_THRESHOLD;
        const meetsExploreThreshold = shouldExplore && signal.confidence >= minConfidenceForExplore;
        
        if (signal.type === "buy" && (meetsThreshold || meetsExploreThreshold) && !positionData && !boughtSymbols.has(symbol)) {
          const buyPrice = data.close[data.close.length - 1];
          
          // Volatility-adjusted position sizing
          const volatility = calculateVolatility(data.close);
          const adjustedPositionValue = adjustPositionForVolatility(maxPositionValue, volatility);
          const qty = Math.floor(adjustedPositionValue / buyPrice);
          
          console.log(`🔄 [STOCK] Attempting BUY: ${symbol} qty=${qty} @ $${buyPrice.toFixed(2)} (vol=${(volatility*100).toFixed(1)}%, adj=${(adjustedPositionValue/maxPositionValue*100).toFixed(0)}%)`);
          
          if (qty > 0) {
            try {
              const result = await placeOrder({
                symbol,
                qty,
                side: "buy",
                strategy_id: strategy.id,
                reasoning: `[Tournament] ${signal.reason}`,
              });
              tradeId = result.tradeId;
              tradeExecuted = true;
              tradesExecuted++;
              boughtSymbols.add(symbol);  // Mark as bought this cycle
              console.log(`✅ [STOCK] BUY executed: ${symbol} orderId=${result.orderId}`);
              // Track BUY trade (P&L determined on SELL)
              await updateStrategyPerformance(strategy.id, null, 0);
            } catch (error) {
              console.error(`❌ [STOCK] BUY failed for ${symbol}:`, error);
            }
          } else {
            console.log(`⚠️ [STOCK] BUY skipped: qty=${qty}`);
          }
        } else if (signal.type === "sell" && (meetsThreshold || meetsExploreThreshold) && positionData && positionData.qty > 0 && !soldSymbols.has(symbol)) {
          const currentPrice = data.close[data.close.length - 1];
          console.log(`🔄 [STOCK] Attempting SELL: ${symbol} qty=${positionData.qty} @ $${currentPrice.toFixed(2)}`);
          try {
            const result = await placeOrder({
              symbol,
              qty: positionData.qty,
              side: "sell",
              strategy_id: strategy.id,
              reasoning: `[Tournament] ${signal.reason}`,
            });
            tradeId = result.tradeId;
            tradeExecuted = true;
            tradesExecuted++;
            soldSymbols.add(symbol);  // Mark as sold this cycle
            console.log(`✅ [STOCK] SELL executed: ${symbol} orderId=${result.orderId}`);
            
            // Calculate P&L
            const pnl = (currentPrice - positionData.avgEntryPrice) * positionData.qty;
            const costBasis = positionData.avgEntryPrice * positionData.qty;
            const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
            
            // PERSIST P&L TO DATABASE - This was missing!
            await updateTrade(tradeId, {
              status: "filled",
              pnl,
              pnl_percent: pnlPercent,
              filled_at: new Date().toISOString(),
            });
            console.log(`💰 [STOCK] P&L persisted: ${symbol} = ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);

            // Update bandit with result
            const won = isWinningTrade(pnl);
            await updateBandit(strategy.id, won, pnl);
            updateStrategyRiskScore(strategy.id).catch(() => {});

            // ACTIVE LEARNING: Analyze losses in real-time
            if (!won && pnl < 0) {
              await analyzeAndLearnFromLoss(
                strategy.id,
                symbol,
                pnl,
                positionData.avgEntryPrice,
                currentPrice,
                1,  // holding period estimate
                signal
              );
            } else {
              recordWin(strategy.id);
            }
          } catch (error) {
            console.error(`❌ [STOCK] SELL failed for ${symbol}:`, error);
          }
        }
        
        results.push({
          strategyId: strategy.id,
          strategyName: strategy.name,
          symbol,
          signal,
          allocation,
          tradeExecuted,
          tradeId,
        });
        
      } catch (error) {
        results.push({
          strategyId: strategy.id,
          strategyName: strategy.name,
          symbol,
          signal: { type: "hold", confidence: 0, reason: "Error" },
          allocation,
          tradeExecuted: false,
          error: String(error),
        });
      }
    }
  }
  
  await log("info", "stock_tournament_completed", {
    strategiesRun: strategies.length,
    signalsGenerated,
    tradesExecuted,
  });
  
  return {
    cycle: "stock",
    timestamp,
    strategiesRun: strategies.length,
    signalsGenerated,
    tradesExecuted,
    allocations,
    results,
  };
}

/**
 * Run tournament for crypto (simulated)
 */
export async function runCryptoTournament(): Promise<TournamentResult> {
  const timestamp = new Date();
  await log("info", "crypto_tournament_started", { timestamp });
  
  const results: StrategyResult[] = [];
  let signalsGenerated = 0;
  let tradesExecuted = 0;
  
  // Get all active crypto strategies
  const strategies = await getActiveStrategies("crypto");
  
  if (strategies.length === 0) {
    return {
      cycle: "crypto",
      timestamp,
      strategiesRun: 0,
      signalsGenerated: 0,
      tradesExecuted: 0,
      allocations: new Map(),
      results: [],
    };
  }
  
  // Sample allocation from bandit
  const allocations = await sampleAllocation();
  
  // Get account value
  const accountData = await getSimulatedAccountValue();
  const accountValue = accountData.totalValue;
  
  // Epsilon-greedy exploration: 25% chance to allow lower confidence trades (aggressive paper trading)
  const EPSILON = 0.25;
  
  // Run each strategy
  for (const strategy of strategies) {
    const baseAllocation = allocations.get(strategy.id) || 0.1;

    // Drawdown recovery: reduce or skip allocation for struggling strategies
    const { multiplier: ddMultiplier, reason: ddReason } = await getDrawdownMultiplier(strategy.id);
    if (ddMultiplier === 0) {
      await log("info", "strategy_skipped_drawdown", { strategy: strategy.name, reason: ddReason });
      continue;
    }
    const allocation = baseAllocation * ddMultiplier;
    const maxPositionValue = accountValue * allocation;

    for (const symbol of strategy.symbols) {
      try {
        // Get market data (1Day bars, 365 days for strategies needing long lookbacks)
        const bars = await getCryptoBars(symbol, "1Day", 365);
        if (!bars || !bars.close || bars.close.length < 10) {
          results.push({
            strategyId: strategy.id,
            strategyName: strategy.name,
            symbol,
            signal: { type: "hold", confidence: 0, reason: "Insufficient data" },
            allocation,
            tradeExecuted: false,
          });
          continue;
        }
        
        // Data is already in correct format from getCryptoBars
        const data = bars;
        
        // Get current position
        const position = getSimulatedPosition(symbol);
        const positionData = position ? {
          qty: position.qty,
          avgEntryPrice: position.avgEntryPrice,
        } : null;
        
        // STOP-LOSS CHECK: Use strategy-defined stop-loss, or default 12% for crypto
        const DEFAULT_CRYPTO_STOP_LOSS = 12;
        const currentPrice = data.close[data.close.length - 1];

        if (positionData && positionData.avgEntryPrice > 0) {
          const unrealizedPnlPercent = ((currentPrice - positionData.avgEntryPrice) / positionData.avgEntryPrice) * 100;

          if (unrealizedPnlPercent <= -DEFAULT_CRYPTO_STOP_LOSS) {
            console.log(`🛑 STOP-LOSS TRIGGERED: ${symbol} at ${unrealizedPnlPercent.toFixed(2)}%`);
            try {
              const orderResult = await placeSimulatedOrder({
                symbol,
                side: "sell",
                qty: positionData.qty,
                strategy_id: strategy.id,
                reasoning: `[STOP-LOSS] Unrealized loss ${unrealizedPnlPercent.toFixed(2)}% exceeded ${DEFAULT_CRYPTO_STOP_LOSS}% threshold`,
              });
              
              tradesExecuted++;
              const pnl = orderResult.pnl || 0;
              const won = isWinningTrade(pnl);
              await updateBandit(strategy.id, won, pnl);
              updateStrategyRiskScore(strategy.id).catch(() => {});

              await log("warning", "stop_loss_triggered", {
                symbol,
                strategy: strategy.name,
                entryPrice: positionData.avgEntryPrice,
                exitPrice: currentPrice,
                unrealizedPnlPercent,
                pnl,
              });
              
              results.push({
                strategyId: strategy.id,
                strategyName: strategy.name,
                symbol,
                signal: { type: "sell", confidence: 1, reason: "Stop-loss triggered" },
                allocation,
                tradeExecuted: true,
                tradeId: orderResult.tradeId,
              });
              continue; // Skip strategy execution since we forced a sell
            } catch (error) {
              console.error(`❌ Stop-loss sell failed for ${symbol}:`, error);
              continue; // Skip strategy execution to prevent double-sell
            }
          }
        }
        
        // Execute strategy
        const signal = executeStrategyCode(strategy.code, data, positionData);
        signalsGenerated++;
        
        await log("decision", "tournament_signal", {
          strategy: strategy.name,
          symbol,
          signal,
          allocation,
        });
        
        // Execute trade if confidence threshold met (0.15 for aggressive paper trading)
        const CONFIDENCE_THRESHOLD = 0.15;
        let tradeExecuted = false;
        let tradeId: string | undefined;
        
        // Epsilon-greedy: 10% chance to explore with lower confidence signals
        const shouldExplore = Math.random() < EPSILON;
        const minConfidenceForExplore = 0.1; // Minimum confidence for exploration trades
        const meetsThreshold = signal.confidence >= CONFIDENCE_THRESHOLD;
        const meetsExploreThreshold = shouldExplore && signal.confidence >= minConfidenceForExplore;
        
        if (signal.type === "buy" && (meetsThreshold || meetsExploreThreshold) && !positionData) {
          const buyPrice = data.close[data.close.length - 1];
          
          // Volatility-adjusted position sizing
          const volatility = calculateVolatility(data.close);
          const adjustedPositionValue = adjustPositionForVolatility(maxPositionValue, volatility);
          const qty = adjustedPositionValue / buyPrice;
          
          console.log(`🔄 Attempting BUY: ${symbol} qty=${qty.toFixed(4)} @ $${buyPrice.toFixed(2)} (vol=${(volatility*100).toFixed(1)}%, adj=${(adjustedPositionValue/maxPositionValue*100).toFixed(0)}%)`);
          
          if (qty > 0 && buyPrice > 0) {
            try {
              const orderResult = await placeSimulatedOrder({
                symbol,
                side: "buy",
                qty,
                strategy_id: strategy.id,
                reasoning: `[Tournament] ${signal.reason}`,
              });
              tradeId = orderResult.tradeId;
              tradeExecuted = true;
              tradesExecuted++;
              console.log(`✅ BUY executed: ${symbol} tradeId=${tradeId}`);
              // Track BUY trade (P&L determined on SELL)
              await updateStrategyPerformance(strategy.id, null, 0);
            } catch (error) {
              console.error(`❌ BUY failed for ${symbol}:`, error);
            }
          } else {
            console.log(`⚠️ BUY skipped: qty=${qty}, price=${buyPrice}`);
          }
        } else if (signal.type === "sell" && (meetsThreshold || meetsExploreThreshold) && positionData) {
          const entryPrice = positionData.avgEntryPrice;
          const exitPrice = data.close[data.close.length - 1];
          const orderResult = await placeSimulatedOrder({
            symbol,
            side: "sell",
            qty: positionData.qty,
            strategy_id: strategy.id,
            reasoning: `[Tournament] ${signal.reason}`,
          });
          
          tradeId = orderResult.tradeId;
          tradeExecuted = true;
          tradesExecuted++;

          // Calculate and persist P&L
          const pnl = orderResult.pnl || ((exitPrice - entryPrice) * positionData.qty);
          const costBasis = entryPrice * positionData.qty;
          const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
          await updateTrade(tradeId, {
            status: "filled",
            pnl,
            pnl_percent: pnlPercent,
            filled_at: new Date().toISOString(),
          });

          const won = isWinningTrade(pnl);
          await updateBandit(strategy.id, won, pnl);
          updateStrategyRiskScore(strategy.id).catch(() => {});

          // ACTIVE LEARNING: Analyze losses in real-time
          if (!won && pnl < 0) {
            await analyzeAndLearnFromLoss(
              strategy.id,
              symbol,
              pnl,
              entryPrice,
              exitPrice,
              1,  // holding period estimate
              signal
            );
          } else {
            recordWin(strategy.id);
          }
        }
        
        results.push({
          strategyId: strategy.id,
          strategyName: strategy.name,
          symbol,
          signal,
          allocation,
          tradeExecuted,
          tradeId,
        });
        
      } catch (error) {
        results.push({
          strategyId: strategy.id,
          strategyName: strategy.name,
          symbol,
          signal: { type: "hold", confidence: 0, reason: "Error" },
          allocation,
          tradeExecuted: false,
          error: String(error),
        });
      }
    }
  }
  
  await log("info", "crypto_tournament_completed", {
    strategiesRun: strategies.length,
    signalsGenerated,
    tradesExecuted,
  });
  
  return {
    cycle: "crypto",
    timestamp,
    strategiesRun: strategies.length,
    signalsGenerated,
    tradesExecuted,
    allocations,
    results,
  };
}

/**
 * Print tournament leaderboard
 */
export async function printLeaderboard(): Promise<void> {
  const stats = await getBanditStats();
  const weights = await getCurrentWeights();
  
  console.log("\n🏆 TOURNAMENT LEADERBOARD");
  console.log("═══════════════════════════════════════");
  console.log(`Total Strategies: ${stats.totalArms}`);
  console.log(`Total Trades: ${stats.totalTrades}`);
  console.log(`Average Win Rate: ${(stats.averageWinRate * 100).toFixed(1)}%`);
  
  if (stats.bestStrategy) {
    console.log(`\n🥇 Best: ${stats.bestStrategy.id.slice(0, 8)}... (${(stats.bestStrategy.winRate * 100).toFixed(1)}% win rate)`);
  }
  if (stats.worstStrategy) {
    console.log(`🥉 Worst: ${stats.worstStrategy.id.slice(0, 8)}... (${(stats.worstStrategy.winRate * 100).toFixed(1)}% win rate)`);
  }
  
  console.log("\n📊 Current Allocations:");
  const sortedWeights = Array.from(weights.entries()).sort((a, b) => b[1] - a[1]);
  for (const [id, weight] of sortedWeights.slice(0, 5)) {
    console.log(`   ${id.slice(0, 8)}...: ${(weight * 100).toFixed(1)}%`);
  }
  console.log("═══════════════════════════════════════\n");
}
