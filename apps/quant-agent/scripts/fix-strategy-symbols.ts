/**
 * Fix strategies with empty or missing symbols
 * Assigns default symbols based on asset class
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

// Default symbols for each asset class
const DEFAULT_STOCK_SYMBOLS = ["SPY", "QQQ", "IWM", "XLK", "XLE", "GLD"];
const DEFAULT_CRYPTO_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD", "LINK/USD", "DOGE/USD"];

async function fixStrategySymbols() {
  console.log("🔧 Fixing strategies with empty symbols...\n");

  // Get all deployed strategies
  const { data: strategies, error } = await supabase
    .from("strategies")
    .select("id, name, asset_class, symbols")
    .eq("status", "deployed");

  if (error) {
    console.error("Error fetching strategies:", error);
    return;
  }

  console.log(`Found ${strategies?.length || 0} deployed strategies\n`);

  let fixedCount = 0;
  let alreadyOkCount = 0;

  for (const strategy of strategies || []) {
    const hasValidSymbols = strategy.symbols &&
                           Array.isArray(strategy.symbols) &&
                           strategy.symbols.length > 0;

    if (hasValidSymbols) {
      alreadyOkCount++;
      continue;
    }

    // Assign default symbols based on asset class
    const defaultSymbols = strategy.asset_class === "crypto"
      ? DEFAULT_CRYPTO_SYMBOLS
      : DEFAULT_STOCK_SYMBOLS;

    console.log(`❌ ${strategy.name} (${strategy.asset_class}) - Empty symbols, assigning: ${defaultSymbols.join(", ")}`);

    const { error: updateError } = await supabase
      .from("strategies")
      .update({ symbols: defaultSymbols })
      .eq("id", strategy.id);

    if (updateError) {
      console.error(`   Failed to update: ${updateError.message}`);
    } else {
      fixedCount++;
    }
  }

  console.log(`\n✅ Summary:`);
  console.log(`   Already OK: ${alreadyOkCount}`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Total: ${strategies?.length || 0}`);

  // Also ensure all strategies have performance records
  console.log("\n🔧 Ensuring all strategies have performance records...");

  for (const strategy of strategies || []) {
    // Check if performance record exists
    const { data: perf } = await supabase
      .from("strategy_performance")
      .select("id")
      .eq("strategy_id", strategy.id)
      .single();

    if (!perf) {
      console.log(`   Creating performance record for: ${strategy.name}`);
      await supabase.from("strategy_performance").insert({
        strategy_id: strategy.id,
        alpha: 1,
        beta: 1,
        total_trades: 0,
        winning_trades: 0,
        total_pnl: 0,
        current_weight: 0.1,
      });
    }
  }

  console.log("\n✅ Done!");
}

fixStrategySymbols().catch(console.error);
