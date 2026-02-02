import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

// More aggressive strategies that work with limited data
const AGGRESSIVE_STRATEGIES = [
  {
    name: "RSI Reversal",
    description: "Buy oversold, sell overbought based on RSI with 14-day lookback",
    asset_class: "stock",
    symbols: ["SPY", "QQQ", "IWM"],
    code: `
function generateSignal(data, position) {
  const prices = data.close;
  if (prices.length < 20) return { type: "hold", confidence: 0, reason: "Need more data" };
  
  const rsi = RSI(prices, 14);
  const sma20 = SMA(prices, 20);
  const current = prices[prices.length - 1];
  const trend = current > sma20 ? "up" : "down";
  
  if (!position) {
    if (rsi < 30 && trend === "up") {
      return { type: "buy", confidence: 0.75, reason: "RSI oversold (" + rsi.toFixed(0) + ") in uptrend" };
    }
    if (rsi < 25) {
      return { type: "buy", confidence: 0.8, reason: "RSI extremely oversold (" + rsi.toFixed(0) + ")" };
    }
  } else {
    if (rsi > 70) {
      return { type: "sell", confidence: 0.7, reason: "RSI overbought (" + rsi.toFixed(0) + ")" };
    }
    if (rsi > 80) {
      return { type: "sell", confidence: 0.85, reason: "RSI extremely overbought (" + rsi.toFixed(0) + ")" };
    }
  }
  
  return { type: "hold", confidence: 0.3, reason: "RSI neutral (" + rsi.toFixed(0) + ")" };
}`,
  },
  {
    name: "EMA Crossover Fast",
    description: "Fast EMA(8)/EMA(21) crossover strategy for quick trades",
    asset_class: "stock",
    symbols: ["SPY", "QQQ", "IWM"],
    code: `
function generateSignal(data, position) {
  const prices = data.close;
  if (prices.length < 25) return { type: "hold", confidence: 0, reason: "Need more data" };
  
  const ema8 = EMA(prices, 8);
  const ema21 = EMA(prices, 21);
  const ema8_prev = EMA(prices.slice(0, -1), 8);
  const ema21_prev = EMA(prices.slice(0, -1), 21);
  
  const crossUp = ema8_prev <= ema21_prev && ema8 > ema21;
  const crossDown = ema8_prev >= ema21_prev && ema8 < ema21;
  const spread = ((ema8 - ema21) / ema21 * 100).toFixed(2);
  
  if (!position && crossUp) {
    return { type: "buy", confidence: 0.7, reason: "EMA8/21 bullish cross, spread: " + spread + "%" };
  }
  if (!position && ema8 > ema21 * 1.005) {
    return { type: "buy", confidence: 0.6, reason: "EMA8 > EMA21, spread: " + spread + "%" };
  }
  if (position && crossDown) {
    return { type: "sell", confidence: 0.75, reason: "EMA8/21 bearish cross" };
  }
  if (position && ema8 < ema21 * 0.995) {
    return { type: "sell", confidence: 0.65, reason: "EMA8 < EMA21, spread: " + spread + "%" };
  }
  
  return { type: "hold", confidence: 0.3, reason: "No crossover, spread: " + spread + "%" };
}`,
  },
  {
    name: "Volume Breakout",
    description: "Enter on high volume breakouts above 20-day high",
    asset_class: "stock", 
    symbols: ["SPY", "QQQ", "IWM"],
    code: `
function generateSignal(data, position) {
  const prices = data.close;
  const volumes = data.volume;
  if (prices.length < 25) return { type: "hold", confidence: 0, reason: "Need more data" };
  
  const current = prices[prices.length - 1];
  const currentVol = volumes[volumes.length - 1];
  const high20 = Math.max(...prices.slice(-20, -1));
  const low20 = Math.min(...prices.slice(-20, -1));
  const avgVol = SMA(volumes.slice(-20), 20);
  const volRatio = currentVol / avgVol;
  
  if (!position) {
    if (current > high20 && volRatio > 1.5) {
      return { type: "buy", confidence: 0.8, reason: "Breakout above 20d high, vol " + volRatio.toFixed(1) + "x avg" };
    }
    if (current > high20 * 0.995) {
      return { type: "buy", confidence: 0.55, reason: "Near 20d high breakout" };
    }
  } else {
    if (current < low20) {
      return { type: "sell", confidence: 0.85, reason: "Broke below 20d low" };
    }
    const entryPrice = position.avgEntryPrice;
    const gain = (current - entryPrice) / entryPrice;
    if (gain > 0.03) {
      return { type: "sell", confidence: 0.6, reason: "Take profit at " + (gain * 100).toFixed(1) + "% gain" };
    }
    if (gain < -0.02) {
      return { type: "sell", confidence: 0.7, reason: "Stop loss at " + (gain * 100).toFixed(1) + "% loss" };
    }
  }
  
  return { type: "hold", confidence: 0.3, reason: "No breakout signal" };
}`,
  },
  {
    name: "Crypto Momentum",
    description: "Ride crypto momentum with volatility-adjusted sizing",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD", "SOL/USD"],
    code: `
function generateSignal(data, position) {
  const prices = data.close;
  if (prices.length < 30) return { type: "hold", confidence: 0, reason: "Need more data" };
  
  const current = prices[prices.length - 1];
  const sma7 = SMA(prices, 7);
  const sma25 = SMA(prices, 25);
  const rsi = RSI(prices, 14);
  
  const ret7d = (current - prices[prices.length - 8]) / prices[prices.length - 8] * 100;
  const trendUp = sma7 > sma25;
  
  if (!position) {
    if (trendUp && rsi < 65 && ret7d > 3) {
      return { type: "buy", confidence: 0.7, reason: "Bullish: SMA7>25, RSI " + rsi.toFixed(0) + ", 7d return " + ret7d.toFixed(1) + "%" };
    }
    if (rsi < 35 && ret7d < -10) {
      return { type: "buy", confidence: 0.65, reason: "Oversold bounce: RSI " + rsi.toFixed(0) + ", 7d return " + ret7d.toFixed(1) + "%" };
    }
  } else {
    if (rsi > 75) {
      return { type: "sell", confidence: 0.7, reason: "Overbought: RSI " + rsi.toFixed(0) };
    }
    if (!trendUp && rsi > 50) {
      return { type: "sell", confidence: 0.6, reason: "Trend reversal: SMA7<25" };
    }
    const gain = (current - position.avgEntryPrice) / position.avgEntryPrice * 100;
    if (gain > 8) {
      return { type: "sell", confidence: 0.65, reason: "Take profit at " + gain.toFixed(1) + "%" };
    }
    if (gain < -5) {
      return { type: "sell", confidence: 0.75, reason: "Stop loss at " + gain.toFixed(1) + "%" };
    }
  }
  
  return { type: "hold", confidence: 0.3, reason: "Neutral: RSI " + rsi.toFixed(0) + ", 7d " + ret7d.toFixed(1) + "%" };
}`,
  },
  {
    name: "Crypto Mean Reversion",
    description: "Fade extreme moves in crypto",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD", "SOL/USD", "DOGE/USD"],
    code: `
function generateSignal(data, position) {
  const prices = data.close;
  if (prices.length < 25) return { type: "hold", confidence: 0, reason: "Need more data" };
  
  const current = prices[prices.length - 1];
  const sma20 = SMA(prices, 20);
  const deviation = (current - sma20) / sma20 * 100;
  const rsi = RSI(prices, 14);
  
  if (!position) {
    if (deviation < -8 && rsi < 35) {
      return { type: "buy", confidence: 0.75, reason: "Mean reversion: " + deviation.toFixed(1) + "% below SMA20, RSI " + rsi.toFixed(0) };
    }
    if (deviation < -5 && rsi < 40) {
      return { type: "buy", confidence: 0.6, reason: "Approaching mean: " + deviation.toFixed(1) + "% below SMA20" };
    }
  } else {
    if (deviation > 5) {
      return { type: "sell", confidence: 0.7, reason: "Above mean: " + deviation.toFixed(1) + "% above SMA20" };
    }
    if (deviation > 0 && rsi > 60) {
      return { type: "sell", confidence: 0.55, reason: "Returned to mean: RSI " + rsi.toFixed(0) };
    }
    const gain = (current - position.avgEntryPrice) / position.avgEntryPrice * 100;
    if (gain > 5) {
      return { type: "sell", confidence: 0.6, reason: "Take profit: " + gain.toFixed(1) + "%" };
    }
    if (gain < -4) {
      return { type: "sell", confidence: 0.7, reason: "Stop loss: " + gain.toFixed(1) + "%" };
    }
  }
  
  return { type: "hold", confidence: 0.3, reason: "Deviation: " + deviation.toFixed(1) + "%, RSI " + rsi.toFixed(0) };
}`,
  },
  {
    name: "Altcoin Momentum",
    description: "Momentum strategy for altcoins with higher volatility tolerance",
    asset_class: "crypto",
    symbols: ["SOL/USD", "AVAX/USD", "DOGE/USD", "LINK/USD", "UNI/USD"],
    code: `
function generateSignal(data, position) {
  const prices = data.close;
  if (prices.length < 20) return { type: "hold", confidence: 0, reason: "Need more data" };
  
  const current = prices[prices.length - 1];
  const ema5 = EMA(prices, 5);
  const ema15 = EMA(prices, 15);
  const rsi = RSI(prices, 10);
  
  const ret3d = (current - prices[prices.length - 4]) / prices[prices.length - 4] * 100;
  
  if (!position) {
    if (ema5 > ema15 && rsi > 50 && rsi < 70 && ret3d > 2) {
      return { type: "buy", confidence: 0.7, reason: "Altcoin momentum: EMA5>15, RSI " + rsi.toFixed(0) + ", 3d " + ret3d.toFixed(1) + "%" };
    }
    if (rsi < 30 && ret3d < -15) {
      return { type: "buy", confidence: 0.65, reason: "Altcoin oversold bounce: RSI " + rsi.toFixed(0) };
    }
  } else {
    if (rsi > 80) {
      return { type: "sell", confidence: 0.8, reason: "Altcoin overbought: RSI " + rsi.toFixed(0) };
    }
    if (ema5 < ema15 * 0.98) {
      return { type: "sell", confidence: 0.65, reason: "Trend reversal: EMA5 < EMA15" };
    }
    const gain = (current - position.avgEntryPrice) / position.avgEntryPrice * 100;
    if (gain > 12) {
      return { type: "sell", confidence: 0.7, reason: "Take profit: " + gain.toFixed(1) + "%" };
    }
    if (gain < -8) {
      return { type: "sell", confidence: 0.75, reason: "Stop loss: " + gain.toFixed(1) + "%" };
    }
  }
  
  return { type: "hold", confidence: 0.3, reason: "Neutral: RSI " + rsi.toFixed(0) + ", 3d " + ret3d.toFixed(1) + "%" };
}`,
  },
];

async function main() {
  console.log("🔄 Adding aggressive trading strategies...\n");

  for (const strategy of AGGRESSIVE_STRATEGIES) {
    // Check if exists
    const { data: existing } = await supabase
      .from('strategies')
      .select('id')
      .eq('name', strategy.name)
      .single();

    if (existing) {
      // Update
      const { error } = await supabase
        .from('strategies')
        .update({
          description: strategy.description,
          code: strategy.code,
          symbols: strategy.symbols,
          status: 'deployed',
        })
        .eq('id', existing.id);

      if (error) {
        console.log(`❌ Failed to update ${strategy.name}: ${error.message}`);
      } else {
        console.log(`✅ Updated: ${strategy.name}`);
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('strategies')
        .insert({
          name: strategy.name,
          description: strategy.description,
          code: strategy.code,
          asset_class: strategy.asset_class,
          symbols: strategy.symbols,
          status: 'deployed',
          source_model: 'aggressive',
        })
        .select('id')
        .single();

      if (error) {
        console.log(`❌ Failed to insert ${strategy.name}: ${error.message}`);
      } else {
        console.log(`✅ Created: ${strategy.name} (${data?.id})`);
        
        // Initialize performance
        await supabase.from('strategy_performance').insert({
          strategy_id: data.id,
          alpha: 1,
          beta: 1,
          total_trades: 0,
          winning_trades: 0,
          total_pnl: 0,
          current_weight: 0.1,
        });
      }
    }
  }

  console.log("\n✅ Done! Restart the agent to use new strategies.");
}

main().catch(console.error);
