/**
 * Crypto Trading Simulator
 * 
 * Simulates paper trading for crypto when Alpaca crypto isn't available.
 * Uses real prices from CoinGecko to track simulated P&L.
 */

import { saveTrade, updateTrade, log } from "./db.js";
import { getLatestCryptoPrice } from "./executor.js";

// In-memory simulated positions (persisted to Supabase)
interface SimulatedPosition {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  side: "long";
  entryTime: Date;
  tradeId: string;
}

// Simulated portfolio starting capital for crypto
const SIMULATED_CRYPTO_CAPITAL = 50000; // $50k simulated

// In-memory state (reloaded from DB on restart)
let simulatedPositions: Map<string, SimulatedPosition> = new Map();
let simulatedCash = SIMULATED_CRYPTO_CAPITAL;

/**
 * Get simulated position for a symbol
 */
export function getSimulatedPosition(symbol: string): SimulatedPosition | null {
  return simulatedPositions.get(symbol) || null;
}

/**
 * Get all simulated positions
 */
export function getAllSimulatedPositions(): SimulatedPosition[] {
  return Array.from(simulatedPositions.values());
}

/**
 * Get simulated account value
 */
export async function getSimulatedAccountValue(): Promise<{
  cash: number;
  positionsValue: number;
  totalValue: number;
  unrealizedPnl: number;
}> {
  let positionsValue = 0;
  let unrealizedPnl = 0;

  for (const position of simulatedPositions.values()) {
    try {
      const currentPrice = await getLatestCryptoPrice(position.symbol);
      const marketValue = position.qty * currentPrice;
      const costBasis = position.qty * position.avgEntryPrice;
      
      positionsValue += marketValue;
      unrealizedPnl += marketValue - costBasis;
    } catch (error) {
      // If price fetch fails, use entry price
      positionsValue += position.qty * position.avgEntryPrice;
    }
  }

  return {
    cash: simulatedCash,
    positionsValue,
    totalValue: simulatedCash + positionsValue,
    unrealizedPnl,
  };
}

/**
 * Execute a simulated order
 */
export async function placeSimulatedOrder(params: {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  strategy_id?: string;
  reasoning?: string;
}): Promise<{ orderId: string; tradeId: string; price: number; pnl?: number }> {
  const { symbol, qty, side, strategy_id, reasoning } = params;
  
  // Get current price
  const price = await getLatestCryptoPrice(symbol);
  const orderValue = qty * price;
  
  let pnl: number | undefined;
  
  if (side === "buy") {
    // Check if we have enough cash
    if (orderValue > simulatedCash) {
      throw new Error(`Insufficient simulated cash: need $${orderValue.toFixed(2)}, have $${simulatedCash.toFixed(2)}`);
    }
    
    // Deduct cash
    simulatedCash -= orderValue;
    
    // Add or update position
    const existingPosition = simulatedPositions.get(symbol);
    if (existingPosition) {
      // Average into position
      const totalQty = existingPosition.qty + qty;
      const totalCost = (existingPosition.qty * existingPosition.avgEntryPrice) + orderValue;
      existingPosition.qty = totalQty;
      existingPosition.avgEntryPrice = totalCost / totalQty;
    } else {
      // New position - save trade first to get tradeId
      const tradeId = await saveTrade({
        strategy_id,
        symbol,
        side,
        qty,
        price,
        order_id: `SIM-${Date.now()}`,
        reasoning: `[SIMULATED] ${reasoning || ""}`,
        asset_class: "crypto",
      });
      
      simulatedPositions.set(symbol, {
        symbol,
        qty,
        avgEntryPrice: price,
        side: "long",
        entryTime: new Date(),
        tradeId,
      });
      
      await log("decision", "simulated_buy", {
        symbol,
        qty,
        price,
        value: orderValue,
        remaining_cash: simulatedCash,
        reasoning,
      });
      
      return { orderId: `SIM-${Date.now()}`, tradeId, price };
    }
  } else {
    // Sell
    const position = simulatedPositions.get(symbol);
    if (!position) {
      throw new Error(`No simulated position to sell for ${symbol}`);
    }
    
    if (qty > position.qty) {
      throw new Error(`Cannot sell ${qty}, only have ${position.qty} of ${symbol}`);
    }
    
    // Calculate P&L
    const costBasis = qty * position.avgEntryPrice;
    const saleValue = qty * price;
    pnl = saleValue - costBasis;
    const pnlPercent = (pnl / costBasis) * 100;
    
    // Add cash back
    simulatedCash += saleValue;
    
    // Update or remove position
    if (qty >= position.qty) {
      simulatedPositions.delete(symbol);
    } else {
      position.qty -= qty;
    }
    
    // Save trade
    const tradeId = await saveTrade({
      strategy_id,
      symbol,
      side,
      qty,
      price,
      order_id: `SIM-${Date.now()}`,
      reasoning: `[SIMULATED] ${reasoning || ""}`,
      asset_class: "crypto",
    });
    
    // Update with P&L
    await updateTrade(tradeId, {
      status: "filled",
      pnl,
      pnl_percent: pnlPercent,
      filled_at: new Date().toISOString(),
    });
    
    await log("decision", "simulated_sell", {
      symbol,
      qty,
      price,
      pnl,
      pnl_percent: pnlPercent,
      remaining_cash: simulatedCash,
      reasoning,
    });
    
    return { orderId: `SIM-${Date.now()}`, tradeId, price, pnl };
  }
  
  // For averaged buys
  const tradeId = await saveTrade({
    strategy_id,
    symbol,
    side,
    qty,
    price,
    order_id: `SIM-${Date.now()}`,
    reasoning: `[SIMULATED] ${reasoning || ""}`,
    asset_class: "crypto",
  });
  
  await log("decision", "simulated_buy", {
    symbol,
    qty,
    price,
    value: orderValue,
    remaining_cash: simulatedCash,
    reasoning,
  });
  
  return { orderId: `SIM-${Date.now()}`, tradeId, price };
}

/**
 * Calculate simulated position size
 */
export async function calculateSimulatedPositionSize(
  symbol: string,
  percentOfPortfolio: number
): Promise<number> {
  const account = await getSimulatedAccountValue();
  const price = await getLatestCryptoPrice(symbol);
  const targetValue = account.totalValue * (percentOfPortfolio / 100);
  
  // Don't exceed available cash
  const maxValue = Math.min(targetValue, simulatedCash);
  return maxValue / price;
}

/**
 * Get simulated daily P&L
 */
export async function getSimulatedDailyPnl(): Promise<{
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
}> {
  const account = await getSimulatedAccountValue();
  
  // Calculate unrealized P&L
  const unrealizedPnl = account.unrealizedPnl;
  
  // Realized P&L would come from closed trades today
  // For now, just use unrealized
  return {
    realizedPnl: 0, // TODO: Sum from today's closed trades
    unrealizedPnl,
    totalPnl: unrealizedPnl,
  };
}

/**
 * Log simulated portfolio status
 */
export async function logSimulatedStatus(): Promise<void> {
  const account = await getSimulatedAccountValue();
  const positions = getAllSimulatedPositions();
  
  await log("info", "simulated_portfolio_status", {
    cash: account.cash,
    positions_value: account.positionsValue,
    total_value: account.totalValue,
    unrealized_pnl: account.unrealizedPnl,
    open_positions: positions.length,
    positions: positions.map(p => ({
      symbol: p.symbol,
      qty: p.qty,
      entry: p.avgEntryPrice,
    })),
  });
}
