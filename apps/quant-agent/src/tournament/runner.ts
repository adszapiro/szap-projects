/**
 * Tournament Runner
 * Executes all strategies in parallel with weighted allocation from the bandit
 */

import { getActiveStrategies, saveTrade, log, Strategy, AssetClass } from "../db.js";
import { sampleAllocation, updateBandit, getBanditStats, getCurrentWeights } from "../bandit/thompson.js";
import { isWinningTrade } from "../bandit/metrics.js";
import { getBars, getCryptoBars, placeOrder, getPositions, getAccount } from "../executor.js";
import { getSimulatedPosition, placeSimulatedOrder, getSimulatedAccountValue, SIMULATED_CRYPTO_CAPITAL } from "../simulator.js";

// Strategy execution helpers (copied from index.ts pattern)
const STRATEGY_HELPERS = `
  function SMA(arr, period) {
    if (arr.length < period) return arr[arr.length - 1] || 0;
    const slice = arr.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }
  function EMA(arr, period) {
    if (arr.length < period) return arr[arr.length - 1] || 0;
    const k = 2 / (period + 1);
    let ema = arr[0];
    for (let i = 1; i < arr.length; i++) {
      ema = arr[i] * k + ema * (1 - k);
    }
    return ema;
  }
  function RSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const rs = losses === 0 ? 100 : gains / losses;
    return 100 - (100 / (1 + rs));
  }
`;

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
 * Execute a single strategy's code
 */
function executeStrategyCode(
  code: string,
  data: { open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] },
  position: { qty: number; avgEntryPrice: number } | null
): { type: "buy" | "sell" | "hold"; confidence: number; reason: string } {
  try {
    // Wrap with safety checks
    const safeCode = `
      ${STRATEGY_HELPERS}
      
      // Validate data
      if (!data || !data.close || data.close.length === 0) {
        return { type: "hold", confidence: 0, reason: "No data available" };
      }
      
      ${code}
      
      // Call the strategy
      try {
        return generateSignal(data, position);
      } catch (e) {
        return { type: "hold", confidence: 0, reason: "Strategy error: " + e.message };
      }
    `;
    
    const fn = new Function("data", "position", safeCode);
    const result = fn(data, position);
    
    return {
      type: result?.type || "hold",
      confidence: typeof result?.confidence === "number" ? result.confidence : 0,
      reason: result?.reason || "No reason provided",
    };
  } catch (error) {
    return { type: "hold", confidence: 0, reason: `Execution error: ${error}` };
  }
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
  
  // Get current positions
  const positions = await getPositions();
  const positionMap = new Map(positions.map(p => [p.symbol, p]));
  
  // Get account value for position sizing
  const account = await getAccount();
  const accountValue = account.portfolio_value;
  
  // Run each strategy
  for (const strategy of strategies) {
    const allocation = allocations.get(strategy.id) || 0.1;
    const maxPositionValue = accountValue * allocation;
    
    for (const symbol of strategy.symbols) {
      try {
        // Get market data (1Day bars, request 300 days)
        const bars = await getBars(symbol, "1Day", 300);
        if (!bars || !bars.close || bars.close.length < 50) {
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
        
        // Execute strategy
        const signal = executeStrategyCode(strategy.code, data, positionData);
        signalsGenerated++;
        
        await log("decision", "tournament_signal", {
          strategy: strategy.name,
          symbol,
          signal,
          allocation,
        });
        
        // Execute trade if confidence threshold met (0.4 for more activity)
        const CONFIDENCE_THRESHOLD = 0.4;
        let tradeExecuted = false;
        let tradeId: string | undefined;
        
        if (signal.type === "buy" && signal.confidence >= CONFIDENCE_THRESHOLD && !positionData) {
          const currentPrice = data.close[data.close.length - 1];
          const qty = Math.floor(maxPositionValue / currentPrice);
          
          console.log(`🔄 [STOCK] Attempting BUY: ${symbol} qty=${qty} @ $${currentPrice.toFixed(2)} (maxPos=$${maxPositionValue.toFixed(0)})`);
          
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
              console.log(`✅ [STOCK] BUY executed: ${symbol} orderId=${result.orderId}`);
            } catch (error) {
              console.error(`❌ [STOCK] BUY failed for ${symbol}:`, error);
            }
          } else {
            console.log(`⚠️ [STOCK] BUY skipped: qty=${qty}`);
          }
        } else if (signal.type === "sell" && signal.confidence >= CONFIDENCE_THRESHOLD && positionData && positionData.qty > 0) {
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
            console.log(`✅ [STOCK] SELL executed: ${symbol} orderId=${result.orderId}`);
            
            // Update bandit with result
            const pnl = (currentPrice - positionData.avgEntryPrice) * positionData.qty;
            const won = isWinningTrade(pnl);
            await updateBandit(strategy.id, won, pnl);
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
  
  // Run each strategy
  for (const strategy of strategies) {
    const allocation = allocations.get(strategy.id) || 0.1;
    const maxPositionValue = accountValue * allocation;
    
    for (const symbol of strategy.symbols) {
      try {
        // Get market data (1Day bars, 100 days)
        const bars = await getCryptoBars(symbol, "1Day", 100);
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
        
        // Data is already in correct format from getCryptoBars
        const data = bars;
        
        // Get current position
        const position = getSimulatedPosition(symbol);
        const positionData = position ? {
          qty: position.qty,
          avgEntryPrice: position.avgEntryPrice,
        } : null;
        
        // Execute strategy
        const signal = executeStrategyCode(strategy.code, data, positionData);
        signalsGenerated++;
        
        await log("decision", "tournament_signal", {
          strategy: strategy.name,
          symbol,
          signal,
          allocation,
        });
        
        // Execute trade if confidence threshold met (0.4 for more activity)
        const CONFIDENCE_THRESHOLD = 0.4;
        let tradeExecuted = false;
        let tradeId: string | undefined;
        
        if (signal.type === "buy" && signal.confidence >= CONFIDENCE_THRESHOLD && !positionData) {
          const currentPrice = data.close[data.close.length - 1];
          const qty = maxPositionValue / currentPrice;
          
          console.log(`🔄 Attempting BUY: ${symbol} qty=${qty.toFixed(4)} @ $${currentPrice.toFixed(2)}`);
          
          if (qty > 0 && currentPrice > 0) {
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
            } catch (error) {
              console.error(`❌ BUY failed for ${symbol}:`, error);
            }
          } else {
            console.log(`⚠️ BUY skipped: qty=${qty}, price=${currentPrice}`);
          }
        } else if (signal.type === "sell" && signal.confidence >= CONFIDENCE_THRESHOLD && positionData) {
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
          
          // Update bandit with result (placeSimulatedOrder returns pnl for sells)
          const pnl = orderResult.pnl || 0;
          const won = isWinningTrade(pnl);
          await updateBandit(strategy.id, won, pnl);
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
