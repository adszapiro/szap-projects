/**
 * Seed multiple diverse trading strategies into Supabase
 * Run with: npx tsx scripts/seed-strategies.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
);

// Multiple diverse trading algorithms
const STRATEGIES = [
  {
    name: "RSI Oversold Bounce",
    description: "Buys when RSI drops below 30, sells when above 70",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD", "SOL/USD"],
    code: `
function generateSignal(data, position) {
  const rsi = RSI(data.close, 14);
  const currentRSI = rsi[rsi.length - 1];
  const prevRSI = rsi[rsi.length - 2];
  
  if (currentRSI < 35 && prevRSI < currentRSI) {
    return { type: "buy", confidence: 0.8, reason: "RSI oversold bounce: " + currentRSI.toFixed(1) };
  }
  if (position && currentRSI > 65) {
    return { type: "sell", confidence: 0.85, reason: "RSI overbought exit: " + currentRSI.toFixed(1) };
  }
  return { type: "hold", confidence: 0.5, reason: "RSI neutral: " + currentRSI.toFixed(1) };
}`,
  },
  {
    name: "Fast EMA Crossover",
    description: "Quick EMA 5/13 crossover for momentum",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD"],
    code: `
function generateSignal(data, position) {
  const ema5 = EMA(data.close, 5);
  const ema13 = EMA(data.close, 13);
  const i = data.close.length - 1;
  
  const bullishCross = ema5[i] > ema13[i] && ema5[i-1] <= ema13[i-1];
  const bearishCross = ema5[i] < ema13[i] && ema5[i-1] >= ema13[i-1];
  
  if (bullishCross) {
    return { type: "buy", confidence: 0.82, reason: "EMA5 crossed above EMA13" };
  }
  if (bearishCross && position) {
    return { type: "sell", confidence: 0.82, reason: "EMA5 crossed below EMA13" };
  }
  
  // Trend following
  if (ema5[i] > ema13[i] * 1.02 && !position) {
    return { type: "buy", confidence: 0.75, reason: "Strong uptrend continuation" };
  }
  
  return { type: "hold", confidence: 0.4, reason: "No crossover signal" };
}`,
  },
  {
    name: "Breakout Hunter",
    description: "Identifies and trades price breakouts",
    asset_class: "crypto",
    symbols: ["SOL/USD", "AVAX/USD", "LINK/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const lookback = 10;
  
  const recentHigh = Math.max(...data.high.slice(-lookback - 1, -1));
  const recentLow = Math.min(...data.low.slice(-lookback - 1, -1));
  const currentClose = data.close[len - 1];
  const prevClose = data.close[len - 2];
  
  // Breakout detection
  if (currentClose > recentHigh && prevClose <= recentHigh) {
    return { type: "buy", confidence: 0.85, reason: "Price broke above " + recentHigh.toFixed(2) };
  }
  
  // Breakdown - exit
  if (position && currentClose < recentLow) {
    return { type: "sell", confidence: 0.9, reason: "Price broke below support " + recentLow.toFixed(2) };
  }
  
  // Stop loss at 3%
  if (position && currentClose < position.avgEntryPrice * 0.97) {
    return { type: "sell", confidence: 0.95, reason: "Stop loss triggered" };
  }
  
  // Take profit at 5%
  if (position && currentClose > position.avgEntryPrice * 1.05) {
    return { type: "sell", confidence: 0.8, reason: "Take profit at 5%" };
  }
  
  return { type: "hold", confidence: 0.3, reason: "Waiting for breakout" };
}`,
  },
  {
    name: "Mean Reversion",
    description: "Trades deviations from moving average",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD"],
    code: `
function generateSignal(data, position) {
  const sma20 = SMA(data.close, 20);
  const i = data.close.length - 1;
  const price = data.close[i];
  const ma = sma20[i];
  
  if (!ma || isNaN(ma)) {
    return { type: "hold", confidence: 0, reason: "Insufficient data" };
  }
  
  const deviation = ((price - ma) / ma) * 100;
  
  // Buy when price is 3% below MA
  if (deviation < -3 && !position) {
    return { type: "buy", confidence: 0.78, reason: "Price " + Math.abs(deviation).toFixed(1) + "% below MA20" };
  }
  
  // Sell when price reverts to MA or goes 2% above
  if (position && deviation > 1) {
    return { type: "sell", confidence: 0.8, reason: "Mean reversion target hit" };
  }
  
  // Stop loss at 5%
  if (position && deviation < -5) {
    return { type: "sell", confidence: 0.9, reason: "Mean reversion stop loss" };
  }
  
  return { type: "hold", confidence: 0.4, reason: "Deviation: " + deviation.toFixed(1) + "%" };
}`,
  },
  {
    name: "Momentum Surge",
    description: "Catches strong momentum moves",
    asset_class: "crypto",
    symbols: ["SOL/USD", "DOGE/USD", "AVAX/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const prevPrice = data.close[len - 2];
  const price5ago = data.close[len - 6] || data.close[0];
  
  const dailyChange = ((price - prevPrice) / prevPrice) * 100;
  const weeklyChange = ((price - price5ago) / price5ago) * 100;
  
  // Strong momentum entry
  if (dailyChange > 2 && weeklyChange > 5 && !position) {
    return { type: "buy", confidence: 0.83, reason: "Strong momentum: +" + dailyChange.toFixed(1) + "% today" };
  }
  
  // Momentum continuation
  if (dailyChange > 1 && weeklyChange > 3 && !position) {
    return { type: "buy", confidence: 0.75, reason: "Momentum continuation" };
  }
  
  // Exit on momentum loss
  if (position && dailyChange < -2) {
    return { type: "sell", confidence: 0.85, reason: "Momentum reversed: " + dailyChange.toFixed(1) + "%" };
  }
  
  // Trailing stop at 4%
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl < -4) {
      return { type: "sell", confidence: 0.9, reason: "Trailing stop: " + pnl.toFixed(1) + "%" };
    }
    if (pnl > 8) {
      return { type: "sell", confidence: 0.8, reason: "Take profit: +" + pnl.toFixed(1) + "%" };
    }
  }
  
  return { type: "hold", confidence: 0.4, reason: "Daily: " + dailyChange.toFixed(1) + "%" };
}`,
  },
  {
    name: "Volume Spike",
    description: "Trades on unusual volume with price confirmation",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD", "SOL/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  
  // Calculate average volume (handle 0 volumes from CoinGecko)
  const volumes = data.volume.slice(-20);
  const validVolumes = volumes.filter(v => v > 0);
  const avgVolume = validVolumes.length > 0 
    ? validVolumes.reduce((a, b) => a + b, 0) / validVolumes.length 
    : 1;
  
  const currentVolume = data.volume[len - 1] || avgVolume;
  const volumeRatio = currentVolume / avgVolume;
  
  const price = data.close[len - 1];
  const prevPrice = data.close[len - 2];
  const priceChange = ((price - prevPrice) / prevPrice) * 100;
  
  // High volume + positive price = bullish
  if (volumeRatio > 1.5 && priceChange > 1 && !position) {
    return { type: "buy", confidence: 0.8, reason: "Volume spike (" + volumeRatio.toFixed(1) + "x) with +" + priceChange.toFixed(1) + "%" };
  }
  
  // High volume + negative price = exit
  if (position && volumeRatio > 1.5 && priceChange < -1) {
    return { type: "sell", confidence: 0.85, reason: "Bearish volume spike" };
  }
  
  // Simple stop loss
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl < -3) return { type: "sell", confidence: 0.9, reason: "Stop loss" };
    if (pnl > 6) return { type: "sell", confidence: 0.75, reason: "Take profit" };
  }
  
  return { type: "hold", confidence: 0.3, reason: "Vol ratio: " + volumeRatio.toFixed(1) };
}`,
  },
  {
    name: "Triple EMA Trend",
    description: "Uses 3 EMAs to confirm trend direction",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD", "LINK/USD"],
    code: `
function generateSignal(data, position) {
  const ema8 = EMA(data.close, 8);
  const ema21 = EMA(data.close, 21);
  const ema55 = EMA(data.close, 55);
  const i = data.close.length - 1;
  
  const e8 = ema8[i], e21 = ema21[i], e55 = ema55[i];
  const price = data.close[i];
  
  // Perfect bullish alignment: price > EMA8 > EMA21 > EMA55
  const bullish = price > e8 && e8 > e21 && e21 > e55;
  const bearish = price < e8 && e8 < e21 && e21 < e55;
  
  if (bullish && !position) {
    return { type: "buy", confidence: 0.85, reason: "Triple EMA bullish alignment" };
  }
  
  if (bearish && position) {
    return { type: "sell", confidence: 0.88, reason: "Triple EMA bearish alignment" };
  }
  
  // Early exit if EMA8 crosses below EMA21
  if (position && ema8[i] < ema21[i] && ema8[i-1] >= ema21[i-1]) {
    return { type: "sell", confidence: 0.8, reason: "EMA8/21 death cross" };
  }
  
  return { type: "hold", confidence: 0.4, reason: "Waiting for alignment" };
}`,
  },
  {
    name: "Scalper 1H",
    description: "Quick scalps on small moves",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD"],
    code: `
function generateSignal(data, position) {
  const len = data.close.length;
  const price = data.close[len - 1];
  const rsi = RSI(data.close, 7);
  const currentRSI = rsi[len - 1];
  
  // Quick RSI scalp
  if (currentRSI < 40 && !position) {
    return { type: "buy", confidence: 0.75, reason: "Quick RSI dip: " + currentRSI.toFixed(0) };
  }
  
  // Quick exit at RSI 55-60
  if (position && currentRSI > 55) {
    return { type: "sell", confidence: 0.78, reason: "Scalp exit RSI: " + currentRSI.toFixed(0) };
  }
  
  // Tight stops for scalping
  if (position) {
    const pnl = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (pnl < -1.5) return { type: "sell", confidence: 0.95, reason: "Scalp stop: " + pnl.toFixed(1) + "%" };
    if (pnl > 2) return { type: "sell", confidence: 0.85, reason: "Scalp profit: +" + pnl.toFixed(1) + "%" };
  }
  
  return { type: "hold", confidence: 0.3, reason: "RSI: " + currentRSI.toFixed(0) };
}`,
  },
];

async function seedStrategies() {
  console.log("Seeding strategies into Supabase...\n");

  // First, deactivate any existing strategies
  const { error: deactivateError } = await supabase
    .from("strategies")
    .update({ status: "inactive" })
    .neq("status", "inactive");

  if (deactivateError) {
    console.log("Note: Could not deactivate old strategies:", deactivateError.message);
  }

  for (const strategy of STRATEGIES) {
    const { data, error } = await supabase
      .from("strategies")
      .insert({
        name: strategy.name,
        description: strategy.description,
        code: strategy.code.trim(),
        source_model: "manual",
        status: "deployed",
        asset_class: strategy.asset_class,
        symbols: strategy.symbols,
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ Failed to insert ${strategy.name}:`, error.message);
    } else {
      console.log(`✅ Inserted: ${strategy.name} (${strategy.symbols.join(", ")})`);
    }
  }

  console.log("\n✅ Done! Seeded", STRATEGIES.length, "strategies");
}

seedStrategies().catch(console.error);
