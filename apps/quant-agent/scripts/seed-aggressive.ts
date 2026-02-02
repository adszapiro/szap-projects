/**
 * Seed AGGRESSIVE trading strategies that will actually trade
 * These are designed to generate more signals for demo/testing
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
);

// AGGRESSIVE strategies designed to trade frequently
const STRATEGIES = [
  {
    name: "Aggressive RSI Trader",
    description: "Buys on RSI < 55, sells on RSI > 50 with position",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD", "SOL/USD"],
    code: `
function generateSignal(data, position) {
  const rsi = RSI(data.close, 14);
  const currentRSI = rsi[rsi.length - 1];
  
  // Very aggressive - buy almost always if no position
  if (!position && currentRSI < 55) {
    return { type: "buy", confidence: 0.75, reason: "RSI entry: " + currentRSI.toFixed(1) };
  }
  
  // Sell quickly for small gains
  if (position) {
    const pnl = ((data.close[data.close.length-1] - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 1.5) return { type: "sell", confidence: 0.8, reason: "Quick profit: +" + pnl.toFixed(1) + "%" };
    if (pnl < -2) return { type: "sell", confidence: 0.9, reason: "Cut loss: " + pnl.toFixed(1) + "%" };
    if (currentRSI > 52) return { type: "sell", confidence: 0.7, reason: "RSI exit: " + currentRSI.toFixed(1) };
  }
  
  return { type: "hold", confidence: 0.3, reason: "RSI: " + currentRSI.toFixed(1) };
}`,
  },
  {
    name: "Quick Momentum",
    description: "Trades any positive momentum",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const prevPrice = data.close[len - 2];
  const change = ((price - prevPrice) / prevPrice) * 100;
  
  // Buy on any green candle
  if (!position && change > 0.1) {
    return { type: "buy", confidence: 0.7, reason: "Momentum entry: +" + change.toFixed(2) + "%" };
  }
  
  // Quick exits
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 2) return { type: "sell", confidence: 0.85, reason: "Profit target: +" + pnl.toFixed(1) + "%" };
    if (pnl < -1.5) return { type: "sell", confidence: 0.9, reason: "Stop loss: " + pnl.toFixed(1) + "%" };
    if (change < -0.3) return { type: "sell", confidence: 0.75, reason: "Momentum fading" };
  }
  
  return { type: "hold", confidence: 0.3, reason: "Change: " + change.toFixed(2) + "%" };
}`,
  },
  {
    name: "EMA Momentum Rider",
    description: "Buys when price above short EMA",
    asset_class: "crypto",
    symbols: ["SOL/USD", "AVAX/USD", "LINK/USD"],
    code: `
function generateSignal(data, position) {
  const ema5 = EMA(data.close, 5);
  const i = data.close.length - 1;
  const price = data.close[i];
  const ema = ema5[i];
  
  // Buy when price is just above EMA
  if (!position && price > ema) {
    return { type: "buy", confidence: 0.72, reason: "Price above EMA5" };
  }
  
  // Sell when price drops below EMA or profit
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 2.5) return { type: "sell", confidence: 0.8, reason: "Take profit: +" + pnl.toFixed(1) + "%" };
    if (price < ema * 0.99) return { type: "sell", confidence: 0.75, reason: "Price below EMA" };
    if (pnl < -2) return { type: "sell", confidence: 0.9, reason: "Stop: " + pnl.toFixed(1) + "%" };
  }
  
  return { type: "hold", confidence: 0.3, reason: "Waiting" };
}`,
  },
  {
    name: "Scalp Machine",
    description: "Rapid fire scalping with tiny targets",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD", "SOL/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const rsi = RSI(data.close, 7);
  const currentRSI = rsi[len - 1];
  
  // Enter frequently
  if (!position && currentRSI < 60) {
    return { type: "buy", confidence: 0.65, reason: "Scalp entry RSI: " + currentRSI.toFixed(0) };
  }
  
  // Exit quickly with tiny profit
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 0.8) return { type: "sell", confidence: 0.85, reason: "Scalp win: +" + pnl.toFixed(2) + "%" };
    if (pnl < -1) return { type: "sell", confidence: 0.95, reason: "Scalp stop: " + pnl.toFixed(2) + "%" };
    if (currentRSI > 55) return { type: "sell", confidence: 0.7, reason: "RSI exit" };
  }
  
  return { type: "hold", confidence: 0.3, reason: "RSI: " + currentRSI.toFixed(0) };
}`,
  },
  {
    name: "Always Trading Bot",
    description: "Designed to always have a position",
    asset_class: "crypto", 
    symbols: ["BTC/USD", "ETH/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  
  // Always buy if no position
  if (!position) {
    return { type: "buy", confidence: 0.6, reason: "Entering market at $" + price.toFixed(2) };
  }
  
  // Only sell for profit or loss
  const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
  
  if (pnl > 3) {
    return { type: "sell", confidence: 0.85, reason: "Target hit: +" + pnl.toFixed(1) + "%" };
  }
  if (pnl < -2.5) {
    return { type: "sell", confidence: 0.9, reason: "Stop triggered: " + pnl.toFixed(1) + "%" };
  }
  
  return { type: "hold", confidence: 0.4, reason: "P&L: " + pnl.toFixed(2) + "%" };
}`,
  },
  {
    name: "Dip Buyer",
    description: "Buys every red candle, sells any green",
    asset_class: "crypto",
    symbols: ["SOL/USD", "DOGE/USD", "AVAX/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const prevPrice = data.close[len - 2];
  const change = ((price - prevPrice) / prevPrice) * 100;
  
  // Buy on red candles
  if (!position && change < 0) {
    return { type: "buy", confidence: 0.7, reason: "Buying dip: " + change.toFixed(2) + "%" };
  }
  
  // Sell on green or stop
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 1.5 && change > 0) return { type: "sell", confidence: 0.8, reason: "Green candle exit: +" + pnl.toFixed(1) + "%" };
    if (pnl < -2) return { type: "sell", confidence: 0.9, reason: "Stop: " + pnl.toFixed(1) + "%" };
  }
  
  return { type: "hold", confidence: 0.3, reason: "Watching" };
}`,
  },
];

async function seedStrategies() {
  console.log("Deactivating old strategies and seeding aggressive ones...\n");

  // Deactivate all existing strategies
  const { error: deactivateError } = await supabase
    .from("strategies")
    .update({ status: "inactive" })
    .eq("status", "deployed");

  if (deactivateError) {
    console.log("Note:", deactivateError.message);
  } else {
    console.log("✅ Deactivated old strategies");
  }

  for (const strategy of STRATEGIES) {
    const { data, error } = await supabase
      .from("strategies")
      .insert({
        name: strategy.name,
        description: strategy.description,
        code: strategy.code.trim(),
        source_model: "aggressive",
        status: "deployed",
        asset_class: strategy.asset_class,
        symbols: strategy.symbols,
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ ${strategy.name}:`, error.message);
    } else {
      console.log(`✅ ${strategy.name} (${strategy.symbols.join(", ")})`);
    }
  }

  console.log("\n🚀 Seeded", STRATEGIES.length, "AGGRESSIVE strategies");
  console.log("   These will generate trades much more frequently!");
}

seedStrategies().catch(console.error);
