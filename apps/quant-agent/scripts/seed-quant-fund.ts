/**
 * QUANT FUND STYLE - Multiple Competing Strategies
 * Like Jane Street / Point72 - many algos compete for capital allocation
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// =====================================================
// STOCK STRATEGIES - SPY, QQQ, IWM
// =====================================================
const STOCK_STRATEGIES = [
  {
    name: "SPY Momentum",
    description: "Trades SPY based on momentum signals",
    asset_class: "stock",
    symbols: ["SPY"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const prevPrice = data.close[len - 2];
  const change = ((price - prevPrice) / prevPrice) * 100;
  
  if (!position && change > 0.2) {
    return { type: "buy", confidence: 0.7, reason: "SPY momentum: +" + change.toFixed(2) + "%" };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 1) return { type: "sell", confidence: 0.8, reason: "SPY profit: +" + pnl.toFixed(2) + "%" };
    if (pnl < -0.8) return { type: "sell", confidence: 0.9, reason: "SPY stop: " + pnl.toFixed(2) + "%" };
  }
  return { type: "hold", confidence: 0.3, reason: "Waiting" };
}`,
  },
  {
    name: "QQQ Tech Rider",
    description: "Rides tech momentum via QQQ",
    asset_class: "stock",
    symbols: ["QQQ"],
    code: `
function generateSignal(data, position) {
  const ema8 = EMA(data.close, 8);
  const i = data.close.length - 1;
  const price = data.close[i];
  
  if (!position && price > ema8[i] * 1.001) {
    return { type: "buy", confidence: 0.72, reason: "QQQ above EMA8" };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 1.5) return { type: "sell", confidence: 0.8, reason: "QQQ profit: +" + pnl.toFixed(2) + "%" };
    if (price < ema8[i] * 0.995) return { type: "sell", confidence: 0.85, reason: "QQQ below EMA8" };
  }
  return { type: "hold", confidence: 0.3, reason: "Neutral" };
}`,
  },
  {
    name: "IWM Small Cap Play",
    description: "Small cap momentum with IWM",
    asset_class: "stock",
    symbols: ["IWM"],
    code: `
function generateSignal(data, position) {
  const rsi = RSI(data.close, 14);
  const i = data.close.length - 1;
  const currentRSI = rsi[i];
  const price = data.close[i];
  
  if (!position && currentRSI < 50 && currentRSI > 35) {
    return { type: "buy", confidence: 0.68, reason: "IWM RSI entry: " + currentRSI.toFixed(0) };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 1.2) return { type: "sell", confidence: 0.75, reason: "IWM profit" };
    if (currentRSI > 60) return { type: "sell", confidence: 0.7, reason: "IWM RSI exit" };
    if (pnl < -1) return { type: "sell", confidence: 0.9, reason: "IWM stop" };
  }
  return { type: "hold", confidence: 0.3, reason: "RSI: " + currentRSI.toFixed(0) };
}`,
  },
  {
    name: "Index Rotation",
    description: "Rotates between SPY and QQQ based on momentum",
    asset_class: "stock",
    symbols: ["SPY", "QQQ"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const price5ago = data.close[len - 6] || data.close[0];
  const weeklyChange = ((price - price5ago) / price5ago) * 100;
  
  if (!position && weeklyChange > 0.5) {
    return { type: "buy", confidence: 0.7, reason: "Weekly momentum: +" + weeklyChange.toFixed(2) + "%" };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 2) return { type: "sell", confidence: 0.8, reason: "Rotation profit" };
    if (weeklyChange < -0.3) return { type: "sell", confidence: 0.75, reason: "Momentum fading" };
    if (pnl < -1.5) return { type: "sell", confidence: 0.9, reason: "Stop loss" };
  }
  return { type: "hold", confidence: 0.3, reason: "Weekly: " + weeklyChange.toFixed(2) + "%" };
}`,
  },
];

// =====================================================
// CRYPTO STRATEGIES - More Aggressive
// =====================================================
const CRYPTO_STRATEGIES = [
  {
    name: "BTC Scalper",
    description: "Quick BTC scalps",
    asset_class: "crypto",
    symbols: ["BTC/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const rsi = RSI(data.close, 7);
  const r = rsi[len - 1];
  
  if (!position && r < 55) {
    return { type: "buy", confidence: 0.65, reason: "BTC scalp entry RSI: " + r.toFixed(0) };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 1) return { type: "sell", confidence: 0.8, reason: "BTC scalp win: +" + pnl.toFixed(2) + "%" };
    if (pnl < -1.5) return { type: "sell", confidence: 0.95, reason: "BTC scalp stop" };
    if (r > 58) return { type: "sell", confidence: 0.7, reason: "BTC RSI exit" };
  }
  return { type: "hold", confidence: 0.3, reason: "RSI: " + r.toFixed(0) };
}`,
  },
  {
    name: "ETH Momentum",
    description: "ETH momentum following",
    asset_class: "crypto",
    symbols: ["ETH/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const prevPrice = data.close[len - 2];
  const change = ((price - prevPrice) / prevPrice) * 100;
  
  if (!position && change > 0.3) {
    return { type: "buy", confidence: 0.68, reason: "ETH momentum: +" + change.toFixed(2) + "%" };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 2) return { type: "sell", confidence: 0.8, reason: "ETH profit" };
    if (change < -0.5) return { type: "sell", confidence: 0.75, reason: "ETH momentum loss" };
    if (pnl < -2) return { type: "sell", confidence: 0.9, reason: "ETH stop" };
  }
  return { type: "hold", confidence: 0.3, reason: "Change: " + change.toFixed(2) + "%" };
}`,
  },
  {
    name: "SOL Breakout",
    description: "SOL breakout trader",
    asset_class: "crypto",
    symbols: ["SOL/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const high5 = Math.max(...data.high.slice(-6, -1));
  
  if (!position && price > high5) {
    return { type: "buy", confidence: 0.72, reason: "SOL breakout above " + high5.toFixed(2) };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 3) return { type: "sell", confidence: 0.8, reason: "SOL profit: +" + pnl.toFixed(2) + "%" };
    if (pnl < -2.5) return { type: "sell", confidence: 0.9, reason: "SOL stop" };
  }
  return { type: "hold", confidence: 0.3, reason: "Waiting for breakout" };
}`,
  },
  {
    name: "Altcoin Rotation",
    description: "Rotates between altcoins",
    asset_class: "crypto",
    symbols: ["AVAX/USD", "LINK/USD", "DOGE/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const ema13 = EMA(data.close, 13);
  const e = ema13[len - 1];
  
  if (!position && price > e * 1.005) {
    return { type: "buy", confidence: 0.65, reason: "Alt above EMA13" };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 4) return { type: "sell", confidence: 0.8, reason: "Alt profit: +" + pnl.toFixed(2) + "%" };
    if (price < e * 0.98) return { type: "sell", confidence: 0.75, reason: "Alt below EMA" };
    if (pnl < -3) return { type: "sell", confidence: 0.9, reason: "Alt stop" };
  }
  return { type: "hold", confidence: 0.3, reason: "Watching" };
}`,
  },
  {
    name: "Crypto Mean Reversion",
    description: "Buys dips, sells rips",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD"],
    code: `
function generateSignal(data, position) {
  const sma20 = SMA(data.close, 20);
  const i = data.close.length - 1;
  const price = data.close[i];
  const ma = sma20[i];
  const deviation = ((price - ma) / ma) * 100;
  
  if (!position && deviation < -2) {
    return { type: "buy", confidence: 0.7, reason: "Mean reversion buy: " + deviation.toFixed(2) + "% below MA" };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (deviation > 0.5) return { type: "sell", confidence: 0.75, reason: "Mean reversion hit" };
    if (pnl > 3) return { type: "sell", confidence: 0.8, reason: "MR profit" };
    if (pnl < -4) return { type: "sell", confidence: 0.9, reason: "MR stop" };
  }
  return { type: "hold", confidence: 0.3, reason: "Dev: " + deviation.toFixed(2) + "%" };
}`,
  },
  {
    name: "Always In Market",
    description: "Always has a position",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD", "SOL/USD"],
    code: `
function generateSignal(data, position) {
  const price = data.close[data.close.length - 1];
  
  if (!position) {
    return { type: "buy", confidence: 0.6, reason: "Entering at $" + price.toFixed(2) };
  }
  
  const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
  if (pnl > 2.5) return { type: "sell", confidence: 0.85, reason: "Target: +" + pnl.toFixed(2) + "%" };
  if (pnl < -2) return { type: "sell", confidence: 0.9, reason: "Stop: " + pnl.toFixed(2) + "%" };
  
  return { type: "hold", confidence: 0.4, reason: "P&L: " + pnl.toFixed(2) + "%" };
}`,
  },
  {
    name: "Triple RSI",
    description: "Uses RSI 7, 14, 21 confluence",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD"],
    code: `
function generateSignal(data, position) {
  const rsi7 = RSI(data.close, 7);
  const rsi14 = RSI(data.close, 14);
  const i = data.close.length - 1;
  const r7 = rsi7[i], r14 = rsi14[i];
  const price = data.close[i];
  
  // Buy when short RSI < long RSI and both below 50
  if (!position && r7 < 50 && r14 < 55) {
    return { type: "buy", confidence: 0.68, reason: "RSI confluence: " + r7.toFixed(0) + "/" + r14.toFixed(0) };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (r7 > 55 && r14 > 50) return { type: "sell", confidence: 0.75, reason: "RSI exit" };
    if (pnl > 2) return { type: "sell", confidence: 0.8, reason: "Profit" };
    if (pnl < -1.5) return { type: "sell", confidence: 0.9, reason: "Stop" };
  }
  return { type: "hold", confidence: 0.3, reason: "RSI7: " + r7.toFixed(0) };
}`,
  },
  {
    name: "Volatility Trader",
    description: "Trades on volatility spikes",
    asset_class: "crypto",
    symbols: ["SOL/USD", "AVAX/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const high = data.high[len - 1];
  const low = data.low[len - 1];
  const range = ((high - low) / low) * 100;
  
  // High volatility + closing near high = bullish
  if (!position && range > 3 && price > (high + low) / 2) {
    return { type: "buy", confidence: 0.7, reason: "Volatility spike: " + range.toFixed(2) + "% range" };
  }
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl > 3) return { type: "sell", confidence: 0.8, reason: "Vol profit" };
    if (pnl < -2) return { type: "sell", confidence: 0.9, reason: "Vol stop" };
  }
  return { type: "hold", confidence: 0.3, reason: "Range: " + range.toFixed(2) + "%" };
}`,
  },
];

async function seedStrategies() {
  console.log("🏦 QUANT FUND STRATEGY SEEDING");
  console.log("================================\n");

  // Deactivate all existing
  await supabase
    .from("strategies")
    .update({ status: "inactive" })
    .eq("status", "deployed");
  console.log("✓ Deactivated old strategies\n");

  // Seed stock strategies
  console.log("📈 STOCK STRATEGIES:");
  for (const s of STOCK_STRATEGIES) {
    const { error } = await supabase.from("strategies").insert({
      name: s.name,
      description: s.description,
      code: s.code.trim(),
      source_model: "quant-fund",
      status: "deployed",
      asset_class: s.asset_class,
      symbols: s.symbols,
    });
    console.log(error ? `  ✗ ${s.name}: ${error.message}` : `  ✓ ${s.name} → ${s.symbols.join(", ")}`);
  }

  // Seed crypto strategies  
  console.log("\n🪙 CRYPTO STRATEGIES:");
  for (const s of CRYPTO_STRATEGIES) {
    const { error } = await supabase.from("strategies").insert({
      name: s.name,
      description: s.description,
      code: s.code.trim(),
      source_model: "quant-fund",
      status: "deployed",
      asset_class: s.asset_class,
      symbols: s.symbols,
    });
    console.log(error ? `  ✗ ${s.name}: ${error.message}` : `  ✓ ${s.name} → ${s.symbols.join(", ")}`);
  }

  console.log("\n================================");
  console.log(`🚀 DEPLOYED: ${STOCK_STRATEGIES.length} stock + ${CRYPTO_STRATEGIES.length} crypto = ${STOCK_STRATEGIES.length + CRYPTO_STRATEGIES.length} total strategies`);
  console.log("   All strategies competing for alpha!");
}

seedStrategies().catch(console.error);
