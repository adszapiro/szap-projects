/**
 * Debug why strategies have 0 trades
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

async function debug() {
  console.log("🔍 Debugging strategies with 0 trades...\n");

  // Get all strategies with their performance
  const { data: strategies } = await supabase
    .from("strategies")
    .select(`
      id,
      name,
      asset_class,
      symbols,
      code,
      status
    `)
    .eq("status", "deployed");

  const { data: performances } = await supabase
    .from("strategy_performance")
    .select("strategy_id, total_trades, total_pnl, current_weight");

  const perfMap = new Map(performances?.map(p => [p.strategy_id, p]) || []);

  // Find strategies with 0 trades
  const zeroTradeStrategies = strategies?.filter(s => {
    const perf = perfMap.get(s.id);
    return !perf || perf.total_trades === 0;
  }) || [];

  console.log(`Found ${zeroTradeStrategies.length} strategies with 0 trades:\n`);

  for (const strategy of zeroTradeStrategies.slice(0, 10)) {
    const perf = perfMap.get(strategy.id);
    console.log(`📊 ${strategy.name}`);
    console.log(`   Asset Class: ${strategy.asset_class}`);
    console.log(`   Symbols: ${JSON.stringify(strategy.symbols)}`);
    console.log(`   Symbols Count: ${strategy.symbols?.length || 0}`);
    console.log(`   Performance Record: ${perf ? "EXISTS" : "MISSING"}`);
    console.log(`   Current Weight: ${perf?.current_weight || "N/A"}`);
    console.log(`   Code Length: ${strategy.code?.length || 0} chars`);

    // Check if code looks valid
    const hasGenerateSignal = strategy.code?.includes("generateSignal");
    const hasReturn = strategy.code?.includes("return");
    console.log(`   Has generateSignal: ${hasGenerateSignal}`);
    console.log(`   Has return: ${hasReturn}`);
    console.log("");
  }

  // Check trade counts distribution
  console.log("\n📈 Trade Count Distribution:");
  const tradeCounts = performances?.map(p => p.total_trades) || [];
  const withTrades = tradeCounts.filter(t => t > 0);
  const withZero = tradeCounts.filter(t => t === 0);

  console.log(`   With trades: ${withTrades.length}`);
  console.log(`   With 0 trades: ${withZero.length}`);
  console.log(`   Total: ${tradeCounts.length}`);

  if (withTrades.length > 0) {
    console.log(`\n   Top 5 trade counts: ${withTrades.sort((a,b) => b-a).slice(0,5).join(", ")}`);
    console.log(`   Bottom 5 (non-zero): ${withTrades.sort((a,b) => a-b).slice(0,5).join(", ")}`);
  }

  // Check recent logs for any errors related to these strategies
  console.log("\n🔍 Checking recent agent logs for errors...");
  const { data: logs } = await supabase
    .from("agent_logs")
    .select("event_type, message, context")
    .in("event_type", ["error", "strategy_error", "execution_error"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (logs && logs.length > 0) {
    console.log(`\nRecent errors:`);
    for (const log of logs) {
      console.log(`   [${log.event_type}] ${log.message || JSON.stringify(log.context)?.slice(0, 100)}`);
    }
  } else {
    console.log("   No recent errors found");
  }
}

debug().catch(console.error);
