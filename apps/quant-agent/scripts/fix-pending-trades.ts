/**
 * Fix all PENDING trades - mark them as FILLED
 * Paper trading fills instantly, so pending status is a bug
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
);

async function fixPendingTrades() {
  console.log("🔧 Fixing pending trades...\n");

  // Get all trades that are pending or have null status
  const { data: trades, error: fetchError } = await supabase
    .from("agent_trades")
    .select("id, symbol, side, status, created_at")
    .or("status.is.null,status.eq.pending");

  if (fetchError) {
    console.error("Error fetching trades:", fetchError);
    return;
  }

  if (!trades || trades.length === 0) {
    console.log("✅ No pending trades to fix!");
    return;
  }

  console.log(`Found ${trades.length} pending trades:`);
  trades.forEach(t => {
    console.log(`  - ${t.side.toUpperCase()} ${t.symbol} (status: ${t.status || "null"})`);
  });

  // Update all to filled
  const { error: updateError } = await supabase
    .from("agent_trades")
    .update({
      status: "filled",
      filled_at: new Date().toISOString()
    })
    .or("status.is.null,status.eq.pending");

  if (updateError) {
    console.error("\n❌ Error updating trades:", updateError);
  } else {
    console.log(`\n✅ Fixed ${trades.length} trades - all marked as filled`);
  }
}

fixPendingTrades().catch(console.error);
